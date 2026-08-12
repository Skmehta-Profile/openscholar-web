import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken = authHeader.substring(7);

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

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
          error: "Subscription service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      Validate the browser access token using Supabase.
      Never trust a user_id sent by the browser.
    */
    const authSupabase = createClient(
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
    } = await authSupabase.auth.getUser(
      accessToken
    );

    if (
      userError ||
      !userData.user
    ) {
      return NextResponse.json(
        {
          error: "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    const userId =
      userData.user.id;

    /*
      Service role is server-only.

      It is used only after the caller's identity
      has been verified.
    */
    const adminSupabase = createClient(
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
    } = await adminSupabase
      .from("openscholar_subscriptions")
      .select(
        `
          plan,
          status,
          billing_cycle,
          provider,
          provider_subscription_id,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          cancelled_at
        `
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (subscriptionError) {
      console.error(
        "Unable to fetch subscription:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error: "Unable to fetch subscription.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      A user without a subscription row
      is treated as Free.
    */
    if (!subscription) {
      return NextResponse.json({
        plan: "free",
        status: "active",
        billingCycle: null,
        provider: null,
        providerSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      });
    }

    return NextResponse.json({
      plan: subscription.plan,
      status: subscription.status,

      billingCycle:
        subscription.billing_cycle,

      provider:
        subscription.provider,

      providerSubscriptionId:
        subscription.provider_subscription_id,

      currentPeriodStart:
        subscription.current_period_start,

      currentPeriodEnd:
        subscription.current_period_end,

      cancelAtPeriodEnd:
        subscription.cancel_at_period_end,

      cancelledAt:
        subscription.cancelled_at,
    });
  } catch (error) {
    console.error(
      "Unable to read subscription status:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to read subscription status.",
      },
      {
        status: 500,
      }
    );
  }
}