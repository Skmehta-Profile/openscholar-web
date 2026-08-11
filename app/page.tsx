"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const ANDROID_APP_URL =
  "https://play.google.com/store/apps/details?id=org.mzu.openscholar&pcampaignid=web_share";

const features = [
  {
    title: "Research Discovery",
    text: "Search scholarly literature across papers, authors, journals and DOI.",
    href: "/search",
    action: "Start discovering",
  },
  {
    title: "Open Access Focus",
    text: "Find accessible research papers and source links faster.",
    href: "/search",
    action: "Find papers",
  },
  {
    title: "Personal Library",
    text: "Save important papers and organize your reading workflow.",
    href: "/library",
    action: "Open library",
  },
  {
    title: "Citation Tools",
    text: "Create citations, copy BibTeX and export RIS for academic writing.",
    href: "/library",
    action: "Open citation tools",
  },
];

export default function Home() {
  const router = useRouter();

  const [query, setQuery] =
    useState("");

  const [searchMessage, setSearchMessage] =
    useState("");

  function submitHomepageSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanQuery =
      query.trim();

    if (cleanQuery.length < 2) {
      setSearchMessage(
        "Enter at least two characters to search."
      );
      return;
    }

    setSearchMessage("");

    router.push(
      `/search?q=${encodeURIComponent(
        cleanQuery
      )}`
    );
  }

  return (
    <main className="bg-slate-50">
      <section className="relative overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />

        <div className="absolute right-[-10%] top-[10%] h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              Built in India for scholars,
              faculty and researchers
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
              Discover research.
              <br />
              Build your library.
              <br />
              Cite with confidence.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              Search scholarly literature,
              evaluate papers, save useful
              research, organize collections
              and create citations from one
              academic workspace.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/search"
                className="rounded-2xl bg-indigo-700 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-800"
              >
                Start Searching
              </Link>

              <a
                href={ANDROID_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-slate-300 bg-white px-7 py-4 text-sm font-bold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                Download Android App
              </a>
            </div>

            <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
              <Link
                href="/search"
                className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
              >
                <p className="font-black text-slate-950 group-hover:text-indigo-700">
                  Papers
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Search and discover
                </p>

                <p className="mt-3 text-xs font-bold text-indigo-700">
                  Search papers →
                </p>
              </Link>

              <Link
                href="/library"
                className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
              >
                <p className="font-black text-slate-950 group-hover:text-indigo-700">
                  Library
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Save and organize
                </p>

                <p className="mt-3 text-xs font-bold text-indigo-700">
                  Open library →
                </p>
              </Link>

              <Link
                href="/library"
                className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
              >
                <p className="font-black text-slate-950 group-hover:text-indigo-700">
                  Citations
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  APA, MLA, BibTeX & RIS
                </p>

                <p className="mt-3 text-xs font-bold text-indigo-700">
                  Create citations →
                </p>
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200">
            <div className="rounded-[1.5rem] bg-slate-950 p-7 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">
                Literature Search
              </p>

              <h2 className="mt-5 text-3xl font-black leading-tight">
                Search papers, authors, DOI
                and journals
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Enter a topic, title, DOI or
                research keyword and start
                discovering literature.
              </p>

              <form
                onSubmit={
                  submitHomepageSearch
                }
                className="mt-7 rounded-2xl bg-white p-2"
              >
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(
                      event.target.value
                    );

                    if (searchMessage) {
                      setSearchMessage("");
                    }
                  }}
                  placeholder="Example: algal nanomaterials, cyanobacteria, DOI..."
                  aria-label="Search scholarly literature"
                  className="w-full rounded-xl px-4 py-4 text-slate-900 outline-none"
                />

                {searchMessage && (
                  <p className="px-4 pb-1 pt-2 text-xs font-bold text-rose-600">
                    {searchMessage}
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-2 w-full rounded-xl bg-emerald-500 py-4 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                >
                  Search Papers
                </button>
              </form>

              <div className="mt-6 grid gap-3">
                <Link
                  href="/search"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm transition hover:bg-white/15"
                >
                  <span>
                    Open access availability
                  </span>

                  <span className="font-bold text-emerald-300">
                    →
                  </span>
                </Link>

                <Link
                  href="/library"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm transition hover:bg-white/15"
                >
                  <span>
                    Citation workspace
                  </span>

                  <span className="font-bold text-emerald-300">
                    →
                  </span>
                </Link>

                <Link
                  href="/library"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm transition hover:bg-white/15"
                >
                  <span>
                    Personal research library
                  </span>

                  <span className="font-bold text-emerald-300">
                    →
                  </span>
                </Link>

                <Link
                  href="/library"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm transition hover:bg-white/15"
                >
                  <span>
                    Abstract & reading
                    workspace
                  </span>

                  <span className="font-bold text-emerald-300">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
  <div className="overflow-hidden rounded-[2rem] border border-indigo-200 bg-white shadow-sm">
    <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="p-8 md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-700">
          For Researchers
        </p>

        <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-slate-950 md:text-4xl">
          Build a research profile you control.
        </h2>

        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Find your scholarly identity, verify ownership,
          curate your publications, add missing research
          and share a professional OpenScholar profile.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
          >
            Build My Profile
          </Link>

          <Link
            href="/search"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            Find a Researcher
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-950 p-8 text-white lg:border-l lg:border-t-0 md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
          Researcher Profile
        </p>

        <div className="mt-5 space-y-3">
          {[
            "Verify profile ownership",
            "Curate your publication record",
            "Add missing publications",
            "Review research analytics",
            "Export publication records",
            "Share your public profile",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3"
            >
              <span className="font-black text-emerald-300">
                ✓
              </span>

              <span className="text-sm leading-6 text-slate-200">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-indigo-700">
            Platform Features
          </p>

          <h2 className="mt-3 text-4xl font-black text-slate-950">
            Built for academic workflows
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-500">
            Move from literature discovery
            to reading, organization and
            citation without switching
            between multiple tools.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map(
            ({
              title,
              text,
              href,
              action,
            }) => (
              <Link
                key={title}
                href={href}
                className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-black text-indigo-700 transition group-hover:bg-indigo-700 group-hover:text-white">
                  →
                </div>

                <h3 className="text-lg font-black text-slate-950">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {text}
                </p>

                <p className="mt-5 text-sm font-bold text-indigo-700">
                  {action} →
                </p>
              </Link>
            )
          )}
        </div>
      </section>
    </main>
  );
}