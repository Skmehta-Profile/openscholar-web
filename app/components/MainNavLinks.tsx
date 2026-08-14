"use client";

import Link from "next/link";
import {
  usePathname,
} from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  {
    href: "/search",
    label: "Search",
  },
  {
    href: "/library",
    label: "Library",
  },
  {
    href: "/collections",
    label: "Collections",
  },
  {
    href: "/profile",
    label: "Profile",
  },
  {
    href: "/alerts",
    label: "Alerts",
  },
  {
    href: "/pricing",
    label: "Pricing",
  },
  {
    href: "/about",
    label: "About",
  },
];

function isActivePath(
  pathname: string,
  href: string
) {
  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(
    `${href}/`
  );
}

export default function MainNavLinks() {
  const pathname =
    usePathname();

  return (
    <>
      {navItems.map(
        ({
          href,
          label,
        }) => {
          const active =
            isActivePath(
              pathname,
              href
            );

          return (
            <Link
              key={href}
              href={href}
              className={`transition ${
                active
                  ? "font-bold text-indigo-700"
                  : "text-slate-600 hover:text-indigo-600"
              }`}
            >
              {label}
            </Link>
          );
        }
      )}
    </>
  );
}