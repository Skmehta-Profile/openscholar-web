import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  logSubscriptionAudit,
} from "@/lib/subscriptionAudit";

type RazorpaySubscription = {
  id: string;
  status: string;

  customer_id?: string | null;

  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;

  has_scheduled_changes?: boolean;
  schedule_change_at?: string | null;

  notes?: Record<string, string>;
};

function unixToIso(
  value: number | null | undefined
) {
  if (!value) {
    return null;
  }

  return new Date(
    value * 1000
  ).toISOString();
}

function mapRazorpayStatus(
  status: string
) {
  switch (status) {
    case "active":
    case "authenticated":
      return "active";

    case "pending":
      return "pending";

    case "halted":
      return "past_due";

    case "cancelled":
      return "cancelled";

    case "completed":
    case "expired":
      return "expired";

    default:
      return "past_due";
  }
}

export async function POST(
  request: Request
) {
  try {
    /*
      1. Authenticate user.
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
      2. Load the local subscription.
    */

    const adminSupabase =
      createClient<any>(
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
      data: localSubscription,
      error: localError,
    } =
      await adminSupabase
        .from(
          "openscholar_subscriptions"
        )
        .select(
          `
            plan,
            status,
            billing_cycle,
            provider,
            provider_subscription_id,
            cancel_at_period_end
          `
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (localError) {
      console.error(
        "Unable to load local subscription:",
        localError
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

    if (
      !localSubscription ||
      localSubscription.provider !==
        "razorpay" ||
      !localSubscription
        .provider_subscription_id
    ) {
      return NextResponse.json({
        success: true,
        reconciled: false,
        reason:
          "No Razorpay subscription to reconcile.",
      });
    }

    /*
      3. Fetch authoritative state
      from Razorpay.
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

    const auth =
      Buffer.from(
        `${razorpayKeyId}:${razorpayKeySecret}`
      ).toString("base64");

    const razorpayResponse =
      await fetch(
        `https://api.razorpay.com/v1/subscriptions/${localSubscription.provider_subscription_id}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Basic ${auth}`,
          },

          cache: "no-store",
        }
      );

    const razorpayData =
      (await razorpayResponse.json()) as
        RazorpaySubscription & {
          error?: {
            description?: string;
          };
        };

    if (!razorpayResponse.ok) {
      console.error(
        "Unable to fetch Razorpay subscription:",
        razorpayData
      );

      return NextResponse.json(
        {
          error:
            razorpayData?.error
              ?.description ||
            "Unable to verify subscription with Razorpay.",
        },
        {
          status:
            razorpayResponse.status,
        }
      );
    }

    /*
      4. Security check.

      The subscription must still belong
      to the same OpenScholar user.
    */

    const razorpayUserId =
      razorpayData.notes
        ?.openscholar_user_id;

    if (
      razorpayUserId &&
      razorpayUserId !==
        userId
    ) {
      console.error(
        "Razorpay subscription user mismatch."
      );

      return NextResponse.json(
        {
          error:
            "Subscription ownership verification failed.",
        },
        {
          status: 403,
        }
      );
    }

    const mappedStatus =
      mapRazorpayStatus(
        razorpayData.status
      );

    /*
      For an end-of-cycle cancellation,
      Razorpay remains active until the
      cycle ends.

      has_scheduled_changes is therefore
      useful for restoring the local
      cancellation-scheduled flag.
    */

    const cancelAtPeriodEnd =
      mappedStatus === "cancelled"
        ? true
        : razorpayData
            .has_scheduled_changes ===
          true
          ? true
          : localSubscription
              .cancel_at_period_end ??
            false;

    const cancelledAt =
      mappedStatus === "cancelled"
        ? unixToIso(
            razorpayData.ended_at
          ) ||
          new Date().toISOString()
        : null;

    /*
      5. Repair local state.
    */

    const {
      error: updateError,
    } =
      await adminSupabase
        .from(
          "openscholar_subscriptions"
        )
        .update({
          status:
            mappedStatus,

          provider_customer_id:
            razorpayData.customer_id ||
            null,

          current_period_start:
            unixToIso(
              razorpayData.current_start
            ),

          current_period_end:
            unixToIso(
              razorpayData.current_end
            ),

          cancel_at_period_end:
            cancelAtPeriodEnd,

          cancelled_at:
            cancelledAt,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "user_id",
          userId
        );

    if (updateError) {
      console.error(
        "Unable to reconcile local subscription:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to update subscription state.",
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
      "subscription_reconciled",

    source:
      "reconcile",

    providerSubscriptionId:
      razorpayData.id,

    previousStatus:
      localSubscription.status,

    newStatus:
      mappedStatus,

    billingCycle:
      localSubscription
        .billing_cycle,

    message:
      "Local subscription state reconciled with Razorpay.",

    metadata: {
      razorpayStatus:
        razorpayData.status,

      cancelAtPeriodEnd,
    },
  }
);

    return NextResponse.json({
      success: true,
      reconciled: true,

      localStatusBefore:
        localSubscription.status,

      razorpayStatus:
        razorpayData.status,

      status:
        mappedStatus,

      subscriptionId:
        razorpayData.id,

      currentPeriodStart:
        unixToIso(
          razorpayData.current_start
        ),

      currentPeriodEnd:
        unixToIso(
          razorpayData.current_end
        ),

      cancelAtPeriodEnd,
    });
  } catch (error) {
    console.error(
      "Unable to reconcile Scholar subscription:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to reconcile subscription.",
      },
      {
        status: 500,
      }
    );
  }
}