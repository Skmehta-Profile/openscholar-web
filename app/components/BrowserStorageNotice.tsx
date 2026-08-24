"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export const ADVERTISING_CONSENT_KEY = "openscholar_advertising_consent";
export const ADVERTISING_CONSENT_EVENT = "openscholar-advertising-consent";

export default function BrowserStorageNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined" || !("localStorage" in window)) {
        setVisible(true);
        return;
      }

      setVisible(
        !window.localStorage.getItem(ADVERTISING_CONSENT_KEY),
      );
    } catch {
      setVisible(true);
    }
  }, []);

  function chooseConsent(value: "granted" | "denied") {
    try {
      if (typeof window !== "undefined" && "localStorage" in window) {
        window.localStorage.setItem(ADVERTISING_CONSENT_KEY, value);
        window.dispatchEvent(new Event(ADVERTISING_CONSENT_EVENT));
      }
    } catch {
      // Keep the choice in memory when browser storage is unavailable.
    }

    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm leading-6 text-slate-700">
          OpenScholar uses essential browser storage to keep you signed in and
          support features such as recent searches and recently viewed papers.
          Payment processing is handled securely by Razorpay. With your
          permission, we may also use Google Ads cookies to measure advertising
          performance. See our Privacy Policy for details.
        </p>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/privacy"
            className="text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Learn more
          </Link>

          <button
            type="button"
            onClick={() => chooseConsent("denied")}
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="Decline advertising cookies"
          >
            Decline
          </button>

          <button
            type="button"
            onClick={() => chooseConsent("granted")}
            className="rounded-full bg-indigo-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Allow advertising cookies
          </button>
        </div>
      </div>
    </div>
  );
}
