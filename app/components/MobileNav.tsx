"use client";

import { useState } from "react";
import AdminNavLink from "./AdminNavLink";
import AuthButton from "./AuthButton";
import MainNavLinks from "./MainNavLinks";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-controls="mobile-navigation"
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
      >
        {open ? "Close" : "Menu"}
      </button>

      {open && (
        <div
          id="mobile-navigation"
          className="absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-3rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
        >
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col gap-4"
          >
            <MainNavLinks
              containerClassName="flex flex-col gap-4"
              onNavigate={closeMenu}
            />

            <AdminNavLink onNavigate={closeMenu} />
          </nav>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <AuthButton onNavigate={closeMenu} />
          </div>
        </div>
      )}
    </div>
  );
}
