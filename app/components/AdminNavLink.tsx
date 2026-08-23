"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminNavLink({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const [isAdmin, setIsAdmin] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (
          authError ||
          !authData.user ||
          !mounted
        ) {
          if (mounted) {
            setIsAdmin(false);
          }

          return;
        }

        const {
          data: adminAccess,
          error: adminError,
        } =
          await supabase.rpc(
            "is_openscholar_admin"
          );

        if (
          adminError ||
          !mounted
        ) {
          if (mounted) {
            setIsAdmin(false);
          }

          return;
        }

        setIsAdmin(
          adminAccess === true
        );
      } catch (error) {
        console.error(
          "Unable to check admin access:",
          error
        );

        if (mounted) {
          setIsAdmin(false);
        }
      }
    }

    checkAdmin();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        () => {
          checkAdmin();
        }
      );

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!isAdmin) {
    return null;
  }

  return (
    <Link
      href="/admin"
      onClick={onNavigate}
      className="font-bold text-indigo-700 transition hover:text-indigo-900"
    >
      Admin
    </Link>
  );
}