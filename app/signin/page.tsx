"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMagicLink() {
    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setMessage(
      error
        ? error.message
        : "Sign-in link sent. Check your inbox for an email from OpenScholar. If you don't see it within a minute, please check your Spam or Junk folder."
    );

    setLoading(false);
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-700">
          OpenScholar Account
        </p>

        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Sign in with Email
        </h1>

        <p className="mt-3 leading-7 text-slate-500">
          Enter your email. OpenScholar will send a secure sign-in link.
        </p>

        <div className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@university.ac.in"
            className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          />

          <button
            onClick={sendMagicLink}
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-700 px-6 py-4 font-bold text-white transition hover:bg-indigo-800 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Sign-In Link"}
          </button>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}