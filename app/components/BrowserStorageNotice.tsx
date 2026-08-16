"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "openscholar_storage_notice_dismissed";

export default function BrowserStorageNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined" || !("localStorage" in window)) {
        setVisible(true);
        return;
      }

      const dismissed =
        window.localStorage.getItem(STORAGE_KEY) === "true";

      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismissNotice() {
    try {
      if (typeof window !== "undefined" && "localStorage" in window) {
        window.localStorage.setItem(STORAGE_KEY, "true");
      }
    } catch {
      // Ignore storage errors and dismiss in-memory only.
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
          Payment processing is handled securely by Razorpay. We do not
          currently use advertising or behavioural-tracking cookies.
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
            onClick={dismissNotice}
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="Dismiss browser storage notice"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
