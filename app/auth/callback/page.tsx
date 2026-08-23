"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    async function finishLogin() {
      try {
        const { data, error } = await supabase.auth.getSession();
        const session = data.session;

        if (error || !session?.user || !session.access_token) {
          setInvalidLink(true);
          return;
        }

        void fetch("/api/auth/funnel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            event_name: "sign_in_completed",
          }),
          keepalive: true,
        }).catch(() => undefined);

        window.location.href = "/library";
      } catch {
        setInvalidLink(true);
      }
    }

    finishLogin();
  }, []);

  if (invalidLink) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-3xl font-black text-slate-950">
            Sign-in link expired or invalid
          </h1>

          <p className="mt-4 leading-7 text-slate-500">
            This sign-in link may have expired or already been used. Please request a new sign-in link.
          </p>

          <Link
            href="/signin"
            className="mt-7 inline-flex rounded-2xl bg-indigo-700 px-6 py-4 font-bold text-white transition hover:bg-indigo-800"
          >
            Request New Sign-In Link
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-black">Signing you in...</h1>
      <p className="mt-3 text-slate-500">Please wait.</p>
    </main>
  );
}