import "server-only";

type RazorpayMode =
  | "test"
  | "live"
  | "unknown";

export type SubscriptionConfig = {
  keyId: string;
  keySecret: string;
  monthlyPlanId: string | null;
  annualPlanId: string | null;
  webhookSecret: string | null;
  mode: RazorpayMode;
};

function detectRazorpayMode(
  keyId: string
): RazorpayMode {
  if (
    keyId.startsWith(
      "rzp_test_"
    )
  ) {
    return "test";
  }

  if (
    keyId.startsWith(
      "rzp_live_"
    )
  ) {
    return "live";
  }

  return "unknown";
}

export function getSubscriptionConfig():
  SubscriptionConfig {
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
    throw new Error(
      "Razorpay credentials are not configured."
    );
  }

  const mode =
    detectRazorpayMode(
      keyId
    );

  if (
    mode === "unknown"
  ) {
    throw new Error(
      "Invalid Razorpay key configuration."
    );
  }

  return {
    keyId,

    keySecret,

    monthlyPlanId:
      process.env
        .RAZORPAY_SCHOLAR_MONTHLY_PLAN_ID ||
      null,

    annualPlanId:
      process.env
        .RAZORPAY_SCHOLAR_ANNUAL_PLAN_ID ||
      null,

    webhookSecret:
      process.env
        .RAZORPAY_WEBHOOK_SECRET ||
      null,

    mode,
  };
}