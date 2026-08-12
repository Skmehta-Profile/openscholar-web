import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  logSubscriptionAudit,
} from "@/lib/subscriptionAudit";

export async function POST(
  request: Request
) {
  try {
    /*
      1. Authenticate OpenScholar-Web user.
    */

    const authHeader =
      request.headers.get(
        "authorization"
      );

    if (
      !authHeader?.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authHeader.substring(7);

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "Supabase subscription configuration is missing."
      );

      return NextResponse.json(
        {
          error:
            "Subscription service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const authSupabase =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    const {
      data: userData,
      error: userError,
    } =
      await authSupabase.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    const userId =
      userData.user.id;

    /*
      2. Load this user's
      Razorpay subscription.
    */

    const adminSupabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    const {
      data: subscription,
      error: subscriptionError,
    } =
      await adminSupabase
        .from(
          "openscholar_subscriptions"
        )
        .select(
          `
            status,
            provider,
            provider_subscription_id,
            cancel_at_period_end,
            current_period_end
          `
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (
      subscriptionError
    ) {
      console.error(
        "Unable to load subscription for cancellation:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load subscription.",
        },
        {
          status: 500,
        }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "No Scholar subscription found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      subscription.provider !==
        "razorpay" ||
      !subscription
        .provider_subscription_id
    ) {
      return NextResponse.json(
        {
          error:
            "This subscription cannot be managed through Razorpay.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      subscription
        .cancel_at_period_end
    ) {
      return NextResponse.json({
        success: true,
        alreadyScheduled: true,
        currentPeriodEnd:
          subscription.current_period_end,
      });
    }

    if (
      subscription.status !==
      "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Only an active subscription can be cancelled.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      3. Cancel at end of current
      Razorpay billing cycle.

      Scholar access is NOT removed
      immediately.
    */

    const razorpayKeyId =
      process.env
        .RAZORPAY_KEY_ID;

    const razorpayKeySecret =
      process.env
        .RAZORPAY_KEY_SECRET;

    if (
      !razorpayKeyId ||
      !razorpayKeySecret
    ) {
      console.error(
        "Razorpay server credentials are missing."
      );

      return NextResponse.json(
        {
          error:
            "Payment service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const basicAuth =
      Buffer.from(
        `${razorpayKeyId}:${razorpayKeySecret}`
      ).toString("base64");

    const razorpayResponse =
      await fetch(
        `https://api.razorpay.com/v1/subscriptions/${subscription.provider_subscription_id}/cancel`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Basic ${basicAuth}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            cancel_at_cycle_end:
              true,
          }),

          cache: "no-store",
        }
      );

    const razorpayData =
      await razorpayResponse.json();

    if (
      !razorpayResponse.ok
    ) {
      console.error(
        "Razorpay cancellation failed:",
        razorpayData
      );

      return NextResponse.json(
        {
          error:
            razorpayData?.error
              ?.description ||
            "Unable to cancel subscription.",
        },
        {
          status:
            razorpayResponse.status,
        }
      );
    }

    /*
      4. Record that cancellation
      has been scheduled.

      Status stays ACTIVE until
      Razorpay later sends the
      subscription.cancelled webhook.
    */

    const {
      error: updateError,
    } =
      await adminSupabase
        .from(
          "openscholar_subscriptions"
        )
        .update({
          cancel_at_period_end:
            true,
        })
        .eq(
          "user_id",
          userId
        );

    if (updateError) {
      console.error(
        "Razorpay cancellation succeeded but local cancellation flag could not be updated:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Cancellation was accepted by Razorpay, but OpenScholar could not refresh the local subscription status.",
        },
        {
          status: 500,
        }
      );
    }

    await logSubscriptionAudit(
  adminSupabase,
  {
    userId,

    action:
      "cancellation_scheduled",

    source:
      "cancel",

    providerSubscriptionId:
      subscription
        .provider_subscription_id,

    previousStatus:
      subscription.status,

    newStatus:
      subscription.status,

    message:
      "Scholar subscription cancellation scheduled for the end of the current billing period.",

    metadata: {
      currentPeriodEnd:
        subscription
          .current_period_end,
    },
  }
);

    return NextResponse.json({
      success: true,

      scheduled: true,

      status:
        razorpayData.status,

      hasScheduledChanges:
        razorpayData
          .has_scheduled_changes ??
        null,

      scheduleChangeAt:
        razorpayData
          .schedule_change_at ??
        null,

      currentPeriodEnd:
        subscription
          .current_period_end,
    });
  } catch (error) {
    console.error(
      "Unable to cancel Scholar subscription:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to cancel subscription.",
      },
      {
        status: 500,
      }
    );
  }
}