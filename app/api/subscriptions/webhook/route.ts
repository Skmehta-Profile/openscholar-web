import crypto from "crypto";

import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

type RazorpaySubscriptionEntity = {
  id: string;

  status?: string;

  current_start?: number | null;
  current_end?: number | null;

  customer_id?: string | null;

  notes?: Record<
    string,
    string
  >;
};

type RazorpayPaymentEntity = {
  id?: string;
};

type RazorpayWebhookPayload = {
  event?: string;

  payload?: {
    subscription?: {
      entity?:
        RazorpaySubscriptionEntity;
    };

    payment?: {
      entity?:
        RazorpayPaymentEntity;
    };
  };
};

function unixToIso(
  value:
    | number
    | null
    | undefined
) {
  if (!value) {
    return null;
  }

  return new Date(
    value * 1000
  ).toISOString();
}

function mapSubscriptionStatus(
  razorpayStatus:
    | string
    | undefined
) {
  switch (
    razorpayStatus
  ) {
    case "active":
    case "authenticated":
      return "active";

    case "cancelled":
      return "cancelled";

    case "completed":
    case "expired":
      return "expired";

    case "pending":
  return "pending";

case "halted":
  return "past_due";

    default:
      return "past_due";
  }
}

export async function POST(
  request: Request
) {
  try {
    /*
      IMPORTANT:
      Razorpay requires signature
      verification against the
      RAW request body.
    */

    const rawBody =
      await request.text();

    const signature =
      request.headers.get(
        "x-razorpay-signature"
      );

    const webhookSecret =
      process.env
        .RAZORPAY_WEBHOOK_SECRET;

    if (
      !signature ||
      !webhookSecret
    ) {
      console.error(
        "Webhook signature or secret missing."
      );

      return NextResponse.json(
        {
          error:
            "Webhook verification unavailable.",
        },
        {
          status: 400,
        }
      );
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          webhookSecret
        )
        .update(rawBody)
        .digest("hex");

    const receivedBuffer =
      Buffer.from(
        signature,
        "utf8"
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8"
      );

    if (
      receivedBuffer.length !==
        expectedBuffer.length ||
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      console.error(
        "Invalid Razorpay webhook signature."
      );

      return NextResponse.json(
        {
          error:
            "Invalid webhook signature.",
        },
        {
          status: 401,
        }
      );
    }

    const event =
      JSON.parse(
        rawBody
      ) as RazorpayWebhookPayload;

    const eventName =
      event.event || "";

    const subscription =
      event.payload
        ?.subscription
        ?.entity;

    if (!subscription) {
      return NextResponse.json(
        {
          received: true,
          ignored:
            "No subscription entity.",
        },
        {
          status: 200,
        }
      );
    }

    const notes =
      subscription.notes ||
      {};

    const userId =
      notes
        .openscholar_user_id;

    const billingCycle =
      notes
        .billing_cycle;

    if (!userId) {
      console.error(
        "Razorpay subscription has no OpenScholar user ID.",
        subscription.id
      );

      return NextResponse.json(
        {
          error:
            "Subscription user mapping missing.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      billingCycle !==
        "monthly" &&
      billingCycle !==
        "annual"
    ) {
      console.error(
        "Invalid billing cycle in Razorpay notes:",
        billingCycle
      );

      return NextResponse.json(
        {
          error:
            "Invalid subscription billing cycle.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecret =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecret
    ) {
      console.error(
        "Supabase server credentials are missing."
      );

      return NextResponse.json(
        {
          error:
            "Subscription database is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const adminSupabase =
      createClient(
        supabaseUrl,
        supabaseSecret,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        }
      );

    const internalStatus =
      mapSubscriptionStatus(
        subscription.status
      );

    const paymentId =
      event.payload
        ?.payment
        ?.entity?.id ||
      null;

    /*
      Webhook events are authoritative.

      Active/renewed subscriptions
      grant Scholar.

      Cancelled, completed,
      expired or halted states
      remove Scholar access through
      the entitlement RPC.
    */

    const {
      error:
        subscriptionError,
    } =
      await adminSupabase
        .from(
          "openscholar_subscriptions"
        )
        .upsert(
          {
            user_id:
              userId,

            plan:
              "scholar",

            status:
              internalStatus,

            billing_cycle:
              billingCycle,

            provider:
              "razorpay",

            provider_customer_id:
              subscription.customer_id ||
              null,

            provider_subscription_id:
              subscription.id,

            provider_payment_id:
              paymentId,

            current_period_start:
              unixToIso(
                subscription.current_start
              ),

            current_period_end:
              unixToIso(
                subscription.current_end
              ),

            cancel_at_period_end:
              eventName ===
              "subscription.cancelled",

            cancelled_at:
              eventName ===
              "subscription.cancelled"
                ? new Date()
                    .toISOString()
                : null,
          },
          {
            onConflict:
              "user_id",
          }
        );

    if (
      subscriptionError
    ) {
      console.error(
        "Unable to update OpenScholar subscription:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error:
            "Unable to update subscription.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "Razorpay webhook processed:",
      {
        event:
          eventName,

        userId,

        subscriptionId:
          subscription.id,

        status:
          internalStatus,
      }
    );

    return NextResponse.json(
      {
        received: true,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Unable to process Razorpay webhook:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to process webhook.",
      },
      {
        status: 500,
      }
    );
  }
}