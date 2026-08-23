"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  useEffect(() => {
    async function finishLogin() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user && session.access_token) {
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
      }

      window.location.href = "/library";
    }

    finishLogin();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-black">Signing you in...</h1>
      <p className="mt-3 text-slate-500">Please wait.</p>
    </main>
  );
}