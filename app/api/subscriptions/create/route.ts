import {
  NextResponse,
} from "next/server";

import Razorpay from "razorpay";

import {
  createClient,
} from "@supabase/supabase-js";

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

    if (
      !supabaseUrl ||
      !supabaseAnonKey
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
            persistSession: false,
            autoRefreshToken: false,
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
      billingCycle !== "monthly" &&
      billingCycle !== "annual"
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
      3. Load Razorpay
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
      4. Create the Razorpay
      subscription.

      We attach the authenticated
      Supabase user ID to Razorpay
      notes so the webhook can later
      identify which OpenScholar-Web
      account should receive Scholar
      access.
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
              user.email || "",
          },
        });

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