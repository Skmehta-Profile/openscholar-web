"use client";

import { supabase } from "@/lib/supabaseClient";
import {
  useState,
} from "react";

type BillingCycle =
  | "monthly"
  | "annual";

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: (
    response: RazorpaySuccessResponse
  ) => void;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay: new (
      options: RazorpayOptions
    ) => RazorpayInstance;
  }
}

async function loadRazorpayScript() {
  if (window.Razorpay) {
    return true;
  }

  return new Promise<boolean>(
    (resolve) => {
      const script =
        document.createElement(
          "script"
        );

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () =>
        resolve(true);

      script.onerror = () =>
        resolve(false);

      document.body.appendChild(
        script
      );
    }
  );
}

export default function ScholarCheckoutButton() {
  const [
    billingCycle,
    setBillingCycle,
  ] =
    useState<BillingCycle>(
      "monthly"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  async function startCheckout() {
  if (loading) {
    return;
  }

  setLoading(true);
  setMessage("");

  try {
    const loaded =
      await loadRazorpayScript();

    if (!loaded) {
      setMessage(
        "Unable to load the secure payment window. Please try again."
      );

      return;
    }

    const {
      data: sessionData,
      error: sessionError,
    } =
      await supabase.auth.getSession();

    const accessToken =
      sessionData.session?.access_token;

    if (
      sessionError ||
      !accessToken
    ) {
      setMessage(
        "Please sign in before upgrading to Scholar."
      );

      return;
    }

    const response =
      await fetch(
        "/api/subscriptions/create",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            billingCycle,
          }),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.subscriptionId ||
      !data.keyId
    ) {
      throw new Error(
        data.error ||
          "Unable to create subscription."
      );
    }

    const options: RazorpayOptions =
      {
        key: data.keyId,

        subscription_id:
          data.subscriptionId,

        name:
          "OpenScholar-Web",

        description:
          billingCycle ===
          "monthly"
            ? "OpenScholar Scholar — Monthly"
            : "OpenScholar Scholar — Annual",

        handler: (
          paymentResponse
        ) => {
          console.log(
            "Razorpay checkout completed:",
            paymentResponse
          );

          setMessage(
            "Payment completed. We are verifying your Scholar subscription."
          );

          /*
            IMPORTANT:

            Do not unlock Scholar here.

            The browser callback is not
            authoritative.

            6C.3.4 will verify Razorpay
            webhook events and update
            openscholar_subscriptions
            securely.
          */
        },

        modal: {
          ondismiss: () => {
            setMessage(
              "Payment window closed. No changes were made to your plan."
            );
          },
        },
      };

    const razorpay =
      new window.Razorpay(
        options
      );

    razorpay.open();
 } catch (error) {
  console.error(
    "Unable to start Razorpay checkout:",
    error
  );

  setMessage(
    error instanceof Error
      ? error.message
      : "Unable to start payment. Please try again."
  );
} finally {
    setLoading(false);
  }
}

  return (
    <div className="mt-9">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() =>
            setBillingCycle(
              "monthly"
            )
          }
          className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
            billingCycle ===
            "monthly"
              ? "border-indigo-400 bg-indigo-500 text-white"
              : "border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          ₹199 Monthly
        </button>

        <button
          type="button"
          onClick={() =>
            setBillingCycle(
              "annual"
            )
          }
          className={`rounded-xl border px-4 py-3 text-sm font-black transition ${
            billingCycle ===
            "annual"
              ? "border-emerald-400 bg-emerald-500 text-slate-950"
              : "border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          ₹1,999 Annual
        </button>
      </div>

      <button
        type="button"
        onClick={
          startCheckout
        }
        disabled={loading}
        className="mt-4 flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-4 text-sm font-black text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Preparing secure checkout..."
          : `Upgrade to Scholar — ${
              billingCycle ===
              "monthly"
                ? "₹199/month"
                : "₹1,999/year"
            }`}
      </button>

      <p className="mt-3 text-center text-xs font-semibold text-slate-400">
        Secure payment powered by
        Razorpay.
      </p>

      {message && (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs font-semibold leading-5 text-slate-300">
          {message}
        </p>
      )}
    </div>
  );
}