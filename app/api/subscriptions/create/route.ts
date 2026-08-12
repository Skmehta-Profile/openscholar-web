import {
  NextResponse,
} from "next/server";

import Razorpay from "razorpay";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  logSubscriptionAudit,
} from "@/lib/subscriptionAudit";

type BillingCycle =
  | "monthly"
  | "annual";

export async function POST(
  request: Request
) {
  try {
    /*
      1. Authenticate the
      OpenScholar-Web user.
    */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
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
      authorization.slice(
        "Bearer ".length
      );

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
        "Supabase environment variables are missing."
      );

      return NextResponse.json(
        {
          error:
            "Authentication service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const authClient =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        }
      );

    const {
      data: authData,
      error: authError,
    } =
      await authClient.auth.getUser(
        accessToken
      );

    if (
      authError ||
      !authData.user
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

    const user =
      authData.user;

    /*
      2. Validate requested
      billing cycle.
    */

    const body =
      await request.json();

    const billingCycle =
      body?.billingCycle as
        | BillingCycle
        | undefined;

    if (
      billingCycle !==
        "monthly" &&
      billingCycle !==
        "annual"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid billing cycle.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      3. DUPLICATE SUBSCRIPTION
      PROTECTION

      Never trust the browser to
      decide whether another paid
      subscription can be created.

      The server checks the current
      OpenScholar subscription state.
    */

    const adminSupabase =
      createClient<any>(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        }
      );

    const {
      data:
        existingSubscription,
      error:
        existingSubscriptionError,
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
            current_period_end,
            cancel_at_period_end
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      existingSubscriptionError
    ) {
      console.error(
        "Unable to check existing subscription:",
        existingSubscriptionError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your current subscription.",
        },
        {
          status: 500,
        }
      );
    }

    const existingStatus =
      existingSubscription
        ?.status;

    const hasBlockingSubscription =
      existingSubscription
        ?.plan ===
        "scholar" &&
      (
        existingStatus ===
          "active" ||
        existingStatus ===
          "pending" ||
        existingStatus ===
          "past_due"
      );

    if (
      hasBlockingSubscription
    ) {
      let message =
        "You already have a Scholar subscription.";

      if (
        existingStatus ===
        "pending"
      ) {
        message =
          "Your Scholar payment is currently being retried. Please manage the existing subscription instead of creating another one.";
      }

      if (
        existingStatus ===
        "past_due"
      ) {
        message =
          "Your existing Scholar subscription has a payment issue. Please resolve or cancel it before starting another subscription.";
      }

      if (
        existingSubscription
          ?.cancel_at_period_end
      ) {
        message =
          "Your Scholar subscription is still active and cancellation is scheduled for the end of the current billing period. A new subscription cannot be started until the current one ends.";
      }

      return NextResponse.json(
        {
          error:
            message,

          code:
            "SUBSCRIPTION_ALREADY_EXISTS",

          subscription: {
            status:
              existingStatus,

            billingCycle:
              existingSubscription
                ?.billing_cycle,

            providerSubscriptionId:
              existingSubscription
                ?.provider_subscription_id,

            currentPeriodEnd:
              existingSubscription
                ?.current_period_end,

            cancelAtPeriodEnd:
              existingSubscription
                ?.cancel_at_period_end ??
              false,
          },
        },
        {
          status: 409,
        }
      );
    }

    /*
      4. Load Razorpay
      server credentials.
    */

    const keyId =
      process.env
        .RAZORPAY_KEY_ID;

    const keySecret =
      process.env
        .RAZORPAY_KEY_SECRET;

    if (
      !keyId ||
      !keySecret
    ) {
      console.error(
        "Razorpay credentials are missing."
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

    const monthlyPlanId =
      process.env
        .RAZORPAY_SCHOLAR_MONTHLY_PLAN_ID;

    const annualPlanId =
      process.env
        .RAZORPAY_SCHOLAR_ANNUAL_PLAN_ID;

    const planId =
      billingCycle ===
      "monthly"
        ? monthlyPlanId
        : annualPlanId;

    if (!planId) {
      console.error(
        `Razorpay plan ID missing for ${billingCycle}.`
      );

      return NextResponse.json(
        {
          error:
            "Subscription plan is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      5. Create Razorpay
      subscription.
    */

    const razorpay =
      new Razorpay({
        key_id:
          keyId,

        key_secret:
          keySecret,
      });

    const totalCount =
      billingCycle ===
      "monthly"
        ? 60
        : 10;

    const subscription =
      await razorpay
        .subscriptions
        .create({
          plan_id:
            planId,

          total_count:
            totalCount,

          quantity:
            1,

          customer_notify:
            1,

          notes: {
            product:
              "OpenScholar-Web",

            plan:
              "scholar",

            billing_cycle:
              billingCycle,

            openscholar_user_id:
              user.id,

            openscholar_email:
              user.email ||
              "",
          },
        });

        await logSubscriptionAudit(
  adminSupabase,
  {
    userId:
      user.id,

    action:
      "subscription_created",

    source:
      "checkout",

    providerSubscriptionId:
      subscription.id,

    previousStatus:
      existingSubscription
        ?.status ??
      null,

    newStatus:
      subscription.status ??
      "created",

    billingCycle,

    message:
      "Razorpay Scholar subscription created.",

    metadata: {
      planId,
    },
  }
);

    return NextResponse.json(
      {
        subscriptionId:
          subscription.id,

        status:
          subscription.status,

        planId:
          subscription.plan_id,

        billingCycle,

        keyId,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Unable to create Razorpay subscription:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create subscription.",
      },
      {
        status: 500,
      }
    );
  }
}