import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

import AuthButton from "./components/AuthButton";
import AdminNavLink from "./components/AdminNavLink";
import MainNavLinks from "./components/MainNavLinks";

export const metadata: Metadata = {
  title: "OpenScholar-Web",
  description: "Research Discovery Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#f7f9fc] text-slate-950">
        <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <Image
                src="/openscholar-logo.png"
                alt="OpenScholar"
                width={50}
                height={50}
                className="rounded-xl"
              />

              <div>
                <h1 className="text-xl font-black tracking-tight">
                  OpenScholar-Web
                </h1>

                <p className="text-xs font-medium text-slate-500">
                  Research Discovery Platform
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
              <MainNavLinks />

              <AdminNavLink />

              <AuthButton />
            </div>
          </div>
        </nav>

        {children}

        <footer className="border-t border-slate-200 bg-white px-6 py-8 text-sm text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center md:text-left">
              OpenScholar-Web · Built in India · DVS Analytik
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-semibold">
              <Link
                href="/terms"
                className="transition hover:text-indigo-700"
              >
                Terms of Service
              </Link>

              <Link
                href="/refund-policy"
                className="transition hover:text-indigo-700"
              >
                Cancellation &amp; Refund Policy
              </Link>

              <Link
                href="/privacy"
                className="transition hover:text-indigo-700"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}