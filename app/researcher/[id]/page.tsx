"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Institution = {
  id: string;
  name: string;
  countryCode: string | null;
  type: string | null;
};

type ResearcherProfile = {
  id: string;
  openAlexUrl: string;
  name: string;
  alternativeNames: string[];
  orcid: string | null;
  verified: boolean;
  worksCount: number;
  citedByCount: number;
  hIndex: number;
  i10Index: number;
  twoYearMeanCitedness: number;
  affiliation: string;
  institutions: Institution[];
  topics: string[];
  updatedDate: string | null;
};

type Publication = {
  id: string;
  openAlexUrl: string;
  title: string;
  type: string;
  year: number | null;
  publicationDate: string | null;
  doi: string | null;
  citations: number;
  journal: string;
  authors: string;
  biblio: string;
  isOpenAccess: boolean;
  fullTextUrl: string | null;
  sourceUrl: string;
};

type ResearcherResponse = {
  profile: ResearcherProfile;
  latestPublications: Publication[];
  mostCitedPublications: Publication[];
};

type PublicationTab = "latest" | "cited";

type PublicationSort =
  | "tab-order"
  | "newest"
  | "oldest"
  | "most-cited"
  | "least-cited"
  | "title";

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function uniqueInstitutions(
  institutions: Institution[]
): Institution[] {
  const seen = new Set<string>();

  return institutions.filter((institution) => {
    const key = normalizeText(
      institution.id || institution.name
    );

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function PublicationCard({
  publication,
}: {
  publication: Publication;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold capitalize text-violet-700">
          {publication.type.replaceAll("-", " ")}
        </span>

        {publication.year && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {publication.year}
          </span>
        )}

        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          {publication.citations.toLocaleString()} citations
        </span>

        {publication.isOpenAccess && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            Open Access
          </span>
        )}
      </div>

      <h3 className="mt-4 text-xl font-black leading-8 text-slate-950">
        {publication.title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {publication.authors}
      </p>

      <p className="mt-3 font-bold text-slate-800">
        {publication.journal}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {publication.biblio}
      </p>

      {publication.publicationDate && (
        <p className="mt-2 text-xs font-semibold text-slate-400">
          Published {formatDate(publication.publicationDate)}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3 print:hidden">
        <a
          href={publication.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Open Source
        </a>

        {publication.fullTextUrl && (
          <a
            href={publication.fullTextUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Full Text
          </a>
        )}

        {publication.doi && (
          <a
            href={publication.doi}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
          >
            DOI
          </a>
        )}

        <a
          href={publication.openAlexUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          OpenAlex
        </a>
      </div>
    </article>
  );
}

export default function ResearcherPage() {
  const params = useParams<{ id: string }>();
  const researcherId = params.id;

  const [data, setData] =
    useState<ResearcherResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] =
    useState<PublicationTab>("latest");

  const [publicationQuery, setPublicationQuery] =
    useState("");

  const [publicationSort, setPublicationSort] =
    useState<PublicationSort>("tab-order");

  const [shareMessage, setShareMessage] =
    useState("");

  useEffect(() => {
    async function loadResearcher() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/researcher/${encodeURIComponent(
            researcherId
          )}`
        );

        const responseData =
          (await response.json()) as
            | ResearcherResponse
            | { error?: string };

        if (!response.ok) {
          setError(
            "error" in responseData
              ? responseData.error ||
                  "Unable to load researcher profile."
              : "Unable to load researcher profile."
          );

          return;
        }

        setData(responseData as ResearcherResponse);
      } catch (requestError) {
        console.error(
          "Researcher profile request failed:",
          requestError
        );

        setError(
          "Unable to load researcher profile. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    }

    if (researcherId) {
      loadResearcher();
    }
  }, [researcherId]);

  useEffect(() => {
    setPublicationQuery("");
    setPublicationSort("tab-order");
  }, [activeTab]);

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(
        window.location.href
      );

      setShareMessage("Profile link copied.");
    } catch {
      setShareMessage(
        "Unable to copy the profile link."
      );
    }

    window.setTimeout(() => {
      setShareMessage("");
    }, 2500);
  }

  async function shareProfile() {
    if (!data) {
      return;
    }

    const shareData = {
      title: `${data.profile.name} — OpenScholar Researcher Profile`,
      text: `View ${data.profile.name}'s researcher profile on OpenScholar.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await copyProfileLink();
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name === "AbortError"
      ) {
        return;
      }

      await copyProfileLink();
    }
  }

  const visiblePublications = useMemo(() => {
    if (!data) {
      return [];
    }

    const sourcePublications =
      activeTab === "latest"
        ? data.latestPublications
        : data.mostCitedPublications;

    const cleanQuery =
      publicationQuery.trim().toLowerCase();

    const filtered = sourcePublications.filter(
      (publication) => {
        if (!cleanQuery) {
          return true;
        }

        const searchableText = [
          publication.title,
          publication.authors,
          publication.journal,
          publication.year
            ? String(publication.year)
            : "",
          publication.doi || "",
          publication.type,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(cleanQuery);
      }
    );

    const sorted = [...filtered];

    switch (publicationSort) {
      case "newest":
        return sorted.sort(
          (a, b) => (b.year || 0) - (a.year || 0)
        );

      case "oldest":
        return sorted.sort(
          (a, b) => (a.year || 0) - (b.year || 0)
        );

      case "most-cited":
        return sorted.sort(
          (a, b) => b.citations - a.citations
        );

      case "least-cited":
        return sorted.sort(
          (a, b) => a.citations - b.citations
        );

      case "title":
        return sorted.sort((a, b) =>
          a.title.localeCompare(b.title)
        );

      default:
        return sorted;
    }
  }, [
    activeTab,
    data,
    publicationQuery,
    publicationSort,
  ]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />

          <p className="mt-5 font-semibold text-slate-500">
            Loading researcher profile...
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8">
          <h1 className="text-2xl font-black text-rose-900">
            Researcher profile unavailable
          </h1>

          <p className="mt-3 text-rose-700">
            {error ||
              "The researcher profile could not be loaded."}
          </p>

          <Link
            href="/search"
            className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            Return to Search
          </Link>
        </div>
      </main>
    );
  }

  const {
    profile,
    latestPublications,
    mostCitedPublications,
  } = data;

  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const institutions = uniqueInstitutions(
    profile.institutions
  );

  const displayedPublicationCount =
    activeTab === "latest"
      ? latestPublications.length
      : mostCitedPublications.length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 print:hidden">
        <Link
          href="/search"
          className="text-sm font-bold text-indigo-700 hover:underline"
        >
          ← Back to Search
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 shadow-sm">
        <div className="p-7 md:p-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-700 to-violet-600 text-4xl font-black text-white shadow-xl">
                {initials}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-4xl">
                    {profile.name}
                  </h1>

                  {profile.verified && (
                    <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700">
                      ORCID linked
                    </span>
                  )}
                </div>

                <p className="mt-4 text-lg font-bold text-slate-700">
                  {profile.affiliation}
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  OpenAlex ID: {profile.id}
                </p>

                {profile.alternativeNames.length >
                  0 && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Also indexed as:{" "}
                    {profile.alternativeNames
                      .slice(0, 6)
                      .join(", ")}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3 print:hidden">
                  <a
                    href={profile.openAlexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    OpenAlex Record
                  </a>

                  {profile.orcid && (
                    <a
                      href={profile.orcid}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      ORCID
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={shareProfile}
                className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
              >
                Share Profile
              </button>

              <button
                type="button"
                onClick={copyProfileLink}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Copy Link
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
              >
                Print Profile
              </button>
            </div>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ["h-index", profile.hIndex],
              [
                "Total Citations",
                profile.citedByCount.toLocaleString(),
              ],
              [
                "Publications",
                profile.worksCount.toLocaleString(),
              ],
              ["i10-index", profile.i10Index],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-600">
                  {label}
                </p>

                <p className="mt-3 text-3xl font-black text-slate-950">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {shareMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 shadow-xl print:hidden">
          {shareMessage}
        </div>
      )}

      {profile.topics.length > 0 && (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
                Expertise
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Research Areas
              </h2>
            </div>

            <span className="text-sm font-semibold text-slate-500">
              {profile.topics.length} research topics
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {profile.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700"
              >
                {topic}
              </span>
            ))}
          </div>
        </section>
      )}

      {institutions.length > 0 && (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            Institutional Affiliations
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {institutions.map((institution) => (
              <div
                key={institution.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="font-black text-slate-900">
                  {institution.name}
                </p>

                <p className="mt-2 text-sm capitalize text-slate-500">
                  {[
                    institution.countryCode,
                    institution.type,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-700">
              Publications
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Research Output
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Browse the researcher&apos;s latest and
              most-cited publications indexed by
              OpenAlex.
            </p>
          </div>

          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm print:hidden">
            <button
              type="button"
              onClick={() => setActiveTab("latest")}
              className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === "latest"
                  ? "bg-indigo-700 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Latest Publications
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cited")}
              className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === "cited"
                  ? "bg-indigo-700 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Most Cited
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_260px] print:hidden">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Search within publications
            </label>

            <input
              value={publicationQuery}
              onChange={(event) =>
                setPublicationQuery(
                  event.target.value
                )
              }
              placeholder="Search title, author, journal, year or DOI..."
              className="mt-2 w-full rounded-2xl border border-slate-300 px-5 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Sort publications
            </label>

            <select
              value={publicationSort}
              onChange={(event) =>
                setPublicationSort(
                  event.target
                    .value as PublicationSort
                )
              }
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="tab-order">
                Recommended order
              </option>
              <option value="newest">
                Newest first
              </option>
              <option value="oldest">
                Oldest first
              </option>
              <option value="most-cited">
                Most cited first
              </option>
              <option value="least-cited">
                Least cited first
              </option>
              <option value="title">
                Title A–Z
              </option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-600">
            Showing {visiblePublications.length} of{" "}
            {displayedPublicationCount} loaded publications
          </p>

          {publicationQuery && (
            <button
              type="button"
              onClick={() =>
                setPublicationQuery("")
              }
              className="text-sm font-bold text-indigo-700 hover:underline print:hidden"
            >
              Clear publication search
            </button>
          )}
        </div>

        {visiblePublications.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="font-black text-slate-900">
              No matching publications
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try another title, author, journal,
              year or DOI.
            </p>

            {publicationQuery && (
              <button
                type="button"
                onClick={() =>
                  setPublicationQuery("")
                }
                className="mt-5 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white print:hidden"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {visiblePublications.map(
              (publication) => (
                <PublicationCard
                  key={publication.id}
                  publication={publication}
                />
              )
            )}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
        <p className="font-bold text-slate-800">
          Data source and coverage
        </p>

        <p className="mt-2">
          Researcher identity, publication counts,
          citations, h-index, i10-index, research
          topics and publication records on this page
          are sourced from OpenAlex. Coverage and
          metrics may differ from Google Scholar,
          Crossref, ORCID and other scholarly
          databases.
        </p>

        {profile.updatedDate && (
          <p className="mt-2 text-xs font-semibold text-slate-500">
            OpenAlex record last updated:{" "}
            {formatDate(profile.updatedDate)}
          </p>
        )}
      </section>
    </main>
  );
}