"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import {
  ADVERTISING_CONSENT_EVENT,
  ADVERTISING_CONSENT_KEY,
} from "./BrowserStorageNotice";

const GOOGLE_ADS_TAG_ID = "AW-11127061553";

export default function GoogleAdsTag() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    function syncConsent() {
      setConsentGranted(
        window.localStorage.getItem(ADVERTISING_CONSENT_KEY) === "granted",
      );
    }

    syncConsent();
    window.addEventListener(ADVERTISING_CONSENT_EVENT, syncConsent);

    return () => {
      window.removeEventListener(ADVERTISING_CONSENT_EVENT, syncConsent);
    };
  }, []);

  if (process.env.NODE_ENV !== "production" || !consentGranted) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_TAG_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-base-tag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_TAG_ID}');`}
      </Script>
    </>
  );
}