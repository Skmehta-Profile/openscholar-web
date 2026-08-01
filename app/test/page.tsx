"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestPage() {
  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");

      console.log("DATA:", data);
      console.log("ERROR:", error);
    }

    test();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-black">Supabase Test</h1>
      <p className="mt-3 text-slate-500">
        Open browser console to check connection.
      </p>
    </main>
  );
}