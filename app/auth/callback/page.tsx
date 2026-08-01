"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  useEffect(() => {
    async function finishLogin() {
      await supabase.auth.getSession();
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