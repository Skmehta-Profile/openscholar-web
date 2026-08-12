import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export type SubscriptionAuditSource =
  | "checkout"
  | "webhook"
  | "reconcile"
  | "cancel"
  | "admin"
  | "system";

type SubscriptionAuditInput = {
  userId?: string | null;

  action: string;

  source:
    SubscriptionAuditSource;

  provider?: string;

  providerSubscriptionId?:
    string | null;

  providerPaymentId?:
    string | null;

  previousStatus?:
    string | null;

  newStatus?:
    string | null;

  billingCycle?:
    string | null;

  message?:
    string | null;

  metadata?:
    Record<string, unknown>;
};

export async function logSubscriptionAudit(
  supabase:
    SupabaseClient<any>,

  input:
    SubscriptionAuditInput
) {
  try {
    const {
      error,
    } =
      await supabase
        .from(
          "openscholar_subscription_audit"
        )
        .insert({
          user_id:
            input.userId ??
            null,

          action:
            input.action,

          source:
            input.source,

          provider:
            input.provider ??
            "razorpay",

          provider_subscription_id:
            input.providerSubscriptionId ??
            null,

          provider_payment_id:
            input.providerPaymentId ??
            null,

          previous_status:
            input.previousStatus ??
            null,

          new_status:
            input.newStatus ??
            null,

          billing_cycle:
            input.billingCycle ??
            null,

          message:
            input.message ??
            null,

          metadata:
            input.metadata ??
            {},
        });

    if (error) {
      console.error(
        "Unable to write subscription audit log:",
        error
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Subscription audit logging failed:",
      error
    );

    return false;
  }
}