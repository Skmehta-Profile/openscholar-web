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

type ProcessingStatus =
  | "received"
  | "processed"
  | "ignored"
  | "failed";

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
  /*
    Keep these outside try so that
    failure handling can update the
    webhook audit row when possible.
  */

  let eventId:
    | string
    | null = null;

  let adminSupabase:
  | ReturnType<typeof createClient<any>>
  | null = null;

  try {
    /*
      1. READ RAW BODY

      Razorpay signature verification
      must use the exact raw request
      body.
    */

    const rawBody =
      await request.text();

    const signature =
      request.headers.get(
        "x-razorpay-signature"
      );

    eventId =
      request.headers.get(
        "x-razorpay-event-id"
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

    /*
      2. VERIFY RAZORPAY SIGNATURE

      Do this BEFORE trusting the event
      ID, payload or writing anything
      to the database.
    */

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

    /*
      Razorpay provides a unique
      event ID for webhook
      deduplication.
    */

    if (!eventId) {
      console.error(
        "Razorpay webhook event ID is missing."
      );

      return NextResponse.json(
        {
          error:
            "Webhook event ID is missing.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      3. PARSE VERIFIED PAYLOAD
    */

    const event =
      JSON.parse(
        rawBody
      ) as RazorpayWebhookPayload;

    const eventName =
      event.event ||
      "unknown";

    const subscription =
      event.payload
        ?.subscription
        ?.entity;

    const paymentId =
      event.payload
        ?.payment
        ?.entity?.id ||
      null;

    const subscriptionId =
      subscription?.id ||
      null;

    /*
      4. CREATE SERVER-SIDE
      SUPABASE CLIENT
    */

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

    adminSupabase =
  createClient<any>(
    supabaseUrl,
    supabaseSecret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

    /*
      5. IDEMPOTENCY GATE

      Try to create the event audit
      record first.

      event_id has a UNIQUE constraint.

      Only the process that successfully
      inserts the event is allowed to
      perform the subscription mutation.
    */

    const {
      error:
        eventInsertError,
    } =
      await adminSupabase
        .from(
          "razorpay_webhook_events"
        )
        .insert({
          event_id:
            eventId,

          event_name:
            eventName,

          provider:
            "razorpay",

          subscription_id:
            subscriptionId,

          payment_id:
            paymentId,

          processing_status:
            "received",
        });

    if (eventInsertError) {
      /*
        PostgreSQL 23505 =
        unique violation.

        This means Razorpay has
        delivered the same event ID
        before.
      */

      if (
        eventInsertError.code ===
        "23505"
      ) {
        const {
          data:
            existingEvent,
          error:
            existingEventError,
        } =
          await adminSupabase
            .from(
              "razorpay_webhook_events"
            )
            .select(
              `
                processing_status,
                error_message
              `
            )
            .eq(
              "event_id",
              eventId
            )
            .maybeSingle();

        if (
          existingEventError
        ) {
          console.error(
            "Unable to inspect duplicate Razorpay event:",
            existingEventError
          );

          return NextResponse.json(
            {
              error:
                "Unable to inspect webhook event.",
            },
            {
              status: 500,
            }
          );
        }

        /*
          Already completed:
          acknowledge Razorpay and do
          NOT process it again.
        */

        if (
          existingEvent
            ?.processing_status ===
              "processed" ||
          existingEvent
            ?.processing_status ===
              "ignored"
        ) {
          console.log(
            "Duplicate Razorpay webhook ignored:",
            {
              eventId,
              event:
                eventName,
              status:
                existingEvent
                  .processing_status,
            }
          );

          return NextResponse.json(
            {
              received:
                true,

              duplicate:
                true,

              eventId,
            },
            {
              status: 200,
            }
          );
        }

        /*
          Another invocation may already
          be processing this event.

          Return 200 so the duplicate
          delivery does not mutate the
          subscription concurrently.
        */

        if (
          existingEvent
            ?.processing_status ===
          "received"
        ) {
          console.log(
            "Razorpay webhook already being processed:",
            {
              eventId,
              event:
                eventName,
            }
          );

          return NextResponse.json(
            {
              received:
                true,

              duplicate:
                true,

              processing:
                true,

              eventId,
            },
            {
              status: 200,
            }
          );
        }

        /*
          A previous attempt failed.

          Allow Razorpay's retry of the
          SAME event to attempt processing
          again.
        */

        if (
          existingEvent
            ?.processing_status ===
          "failed"
        ) {
          const {
            error:
              retryResetError,
          } =
            await adminSupabase
              .from(
                "razorpay_webhook_events"
              )
              .update({
                processing_status:
                  "received",

                error_message:
                  null,

                processed_at:
                  null,
              })
              .eq(
                "event_id",
                eventId
              );

          if (
            retryResetError
          ) {
            console.error(
              "Unable to reset failed Razorpay webhook for retry:",
              retryResetError
            );

            return NextResponse.json(
              {
                error:
                  "Unable to retry webhook event.",
              },
              {
                status: 500,
              }
            );
          }

          console.log(
            "Retrying previously failed Razorpay webhook:",
            {
              eventId,
              event:
                eventName,
            }
          );
        } else {
          /*
            Unexpected audit state.
            Safest option is to
            acknowledge the duplicate
            without repeating mutation.
          */

          return NextResponse.json(
            {
              received:
                true,

              duplicate:
                true,

              eventId,
            },
            {
              status: 200,
            }
          );
        }
      } else {
        /*
          Logging is part of our
          idempotency protection.

          If we cannot establish the
          event record, do NOT process
          the subscription mutation.
        */

        console.error(
          "Unable to create Razorpay webhook audit event:",
          eventInsertError
        );

        return NextResponse.json(
          {
            error:
              "Unable to register webhook event.",
          },
          {
            status: 500,
          }
        );
      }
    }

    /*
      Helper for updating the audit row.
    */

    async function updateEventStatus(
      status:
        ProcessingStatus,

      errorMessage:
        string | null = null,

      userId:
        string | null = null
    ) {
      if (
        !adminSupabase ||
        !eventId
      ) {
        return;
      }

      const update: {
        processing_status:
          ProcessingStatus;

        error_message:
          string | null;

        processed_at:
          string | null;

        user_id?:
          string;
      } = {
        processing_status:
          status,

        error_message:
          errorMessage,

        processed_at:
          status ===
            "received"
            ? null
            : new Date()
                .toISOString(),
      };

      if (userId) {
        update.user_id =
          userId;
      }

      const {
        error:
          auditUpdateError,
      } =
        await adminSupabase
          .from(
            "razorpay_webhook_events"
          )
          .update(
            update
          )
          .eq(
            "event_id",
            eventId
          );

      if (
        auditUpdateError
      ) {
        console.error(
          "Unable to update Razorpay webhook audit row:",
          auditUpdateError
        );
      }
    }

    /*
      6. IGNORE EVENTS THAT DO NOT
      CONTAIN A SUBSCRIPTION ENTITY
    */

    if (!subscription) {
      await updateEventStatus(
        "ignored",
        "No subscription entity."
      );

      console.log(
        "Razorpay webhook ignored:",
        {
          eventId,
          event:
            eventName,
          reason:
            "No subscription entity.",
        }
      );

      return NextResponse.json(
        {
          received:
            true,

          ignored:
            "No subscription entity.",
        },
        {
          status: 200,
        }
      );
    }

    /*
      7. MAP SUBSCRIPTION TO THE
      AUTHENTICATED OPENSCHOLAR USER

      The user ID was stored in
      Razorpay notes when the
      subscription was created.
    */

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
      await updateEventStatus(
        "failed",
        "Subscription user mapping missing."
      );

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
      await updateEventStatus(
        "failed",
        "Invalid subscription billing cycle.",
        userId
      );

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

    /*
      8. MAP RAZORPAY STATE TO
      OPENSCHOLAR ENTITLEMENT STATE
    */

    const internalStatus =
      mapSubscriptionStatus(
        subscription.status
      );

    /*
      9. AUTHORITATIVE SUBSCRIPTION
      UPDATE

      Razorpay webhook state controls
      paid entitlement state.

      Note:
      Normal charged/activated events
      do NOT overwrite
      cancel_at_period_end.

      That preserves a cancellation
      already scheduled through the
      OpenScholar cancellation API.
    */

    const subscriptionUpdate: {
      user_id:
        string;

      plan:
        string;

      status:
        string;

      billing_cycle:
        string;

      provider:
        string;

      provider_customer_id:
        string | null;

      provider_subscription_id:
        string;

      provider_payment_id:
        string | null;

      current_period_start:
        string | null;

      current_period_end:
        string | null;

      cancelled_at?:
        string;

      cancel_at_period_end?:
        boolean;
    } = {
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
    };

    /*
      Keep the existing behaviour
      for an actual Razorpay
      cancellation event.

      Other events do not clear an
      already scheduled cancellation.
    */

    if (
      eventName ===
      "subscription.cancelled"
    ) {
      subscriptionUpdate
        .cancel_at_period_end =
        true;

      subscriptionUpdate
        .cancelled_at =
        new Date()
          .toISOString();
    }

    const {
      error:
        subscriptionError,
    } =
      await adminSupabase
        .from(
          "openscholar_subscriptions"
        )
        .upsert(
          subscriptionUpdate,
          {
            onConflict:
              "user_id",
          }
        );

    if (
      subscriptionError
    ) {
      const errorMessage =
        subscriptionError
          .message ||
        "Unable to update OpenScholar subscription.";

      await updateEventStatus(
        "failed",
        errorMessage,
        userId
      );

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

    /*
      10. MARK EVENT SUCCESSFULLY
      PROCESSED
    */

    await updateEventStatus(
      "processed",
      null,
      userId
    );

    console.log(
      "Razorpay webhook processed:",
      {
        eventId,

        event:
          eventName,

        userId,

        subscriptionId:
          subscription.id,

        paymentId,

        status:
          internalStatus,
      }
    );

    return NextResponse.json(
      {
        received:
          true,

        eventId,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process webhook.";

    /*
      If the event audit row was
      already established, record
      unexpected processing failures
      so a later Razorpay retry can
      safely retry it.
    */

    if (
      adminSupabase &&
      eventId
    ) {
      const {
        error:
          failureLogError,
      } =
        await adminSupabase
          .from(
            "razorpay_webhook_events"
          )
          .update({
            processing_status:
              "failed",

            error_message:
              message,

            processed_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "event_id",
            eventId
          );

      if (
        failureLogError
      ) {
        console.error(
          "Unable to record Razorpay webhook failure:",
          failureLogError
        );
      }
    }

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