import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json(
      {
        error: "Not available in production.",
      },
      {
        status: 404,
      }
    );
  }
  try {
    const keyId =
      process.env.RAZORPAY_KEY_ID;

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    const annualPlanId =
      process.env
        .RAZORPAY_SCHOLAR_ANNUAL_PLAN_ID;

    if (
      !keyId ||
      !keySecret ||
      !annualPlanId
    ) {
      return NextResponse.json(
        {
          error:
            "Razorpay environment variables are missing.",
          hasKeyId: Boolean(keyId),
          hasKeySecret:
            Boolean(keySecret),
          hasAnnualPlanId:
            Boolean(annualPlanId),
        },
        {
          status: 500,
        }
      );
    }

    const razorpay =
      new Razorpay({
        key_id: keyId,
        key_secret:
          keySecret,
      });

    const plan =
      await razorpay.plans.fetch(
        annualPlanId
      );

    return NextResponse.json({
      success: true,
      planId: plan.id,
      period: plan.period,
      interval: plan.interval,
      amount: plan.item?.amount,
      currency:
        plan.item?.currency,
      name: plan.item?.name,
    });
  } catch (error) {
    console.error(
      "Unable to fetch Razorpay plan:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to fetch Razorpay plan.",
      },
      {
        status: 500,
      }
    );
  }
}