import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

import AuthButton from "./components/AuthButton";
import AdminNavLink from "./components/AdminNavLink";
import BrowserStorageNotice from "./components/BrowserStorageNotice";
import MainNavLinks from "./components/MainNavLinks";

export const metadata: Metadata = {
  metadataBase: new URL("https://openscholar.dvsanalytik.com"),
  title: {
    default: "OpenScholar-Web | Research Discovery Platform",
    template: "%s | OpenScholar-Web",
  },
  description:
    "Search scholarly literature, discover researchers, save papers, organize collections, manage research workflows, and track new research with OpenScholar-Web.",
  verification: {
    google:
      "j_xfNSi5Mh2VRFvdQv8RHe3JTnBIQUqXmPr_l8tAMBg",
  },
  openGraph: {
    type: "website",
    siteName: "OpenScholar-Web",
    title: "OpenScholar-Web | Research Discovery Platform",
    description:
      "Search scholarly literature, discover researchers, save papers, organize collections, manage research workflows, and track new research with OpenScholar-Web.",
    url: "https://openscholar.dvsanalytik.com",
    images: [
      {
        url: "/openscholar-logo.png",
        alt: "OpenScholar-Web logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenScholar-Web | Research Discovery Platform",
    description:
      "Search scholarly literature, discover researchers, save papers, organize collections, manage research workflows, and track new research with OpenScholar-Web.",
    images: ["/openscholar-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#f7f9fc] text-slate-950">
        <BrowserStorageNotice />

        <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl print:hidden">
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

        <footer className="border-t border-slate-200 bg-white px-6 py-8 text-sm text-slate-500 print:hidden">
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