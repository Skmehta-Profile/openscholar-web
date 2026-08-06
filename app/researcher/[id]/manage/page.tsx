"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type ManagerTab =
  | "all"
  | "openalex"
  | "curated"
  | "hidden";

type ManagerSort =
  | "newest"
  | "oldest"
  | "most-cited"
  | "least-cited"
  | "title";

type SourceFilter =
  | "all"
  | "openalex"
  | "crossref";

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

  manuallyAdded?: boolean;
  verificationSource?: string | null;
  metadataSource?: string | null;
};

type PublicationMeta = {
  profileWorksCount: number;
  apiWorksCount: number;
  loadedCount: number;
  requestsUsed: number;
  complete: boolean;
};

type ResearcherResponse = {
  profile: ResearcherProfile;
  publications: Publication[];
  publicationMeta: PublicationMeta;
};

type ResearcherClaim = {
  id: string;
  user_id: string;
  openalex_author_id: string;
  researcher_name: string;
  affiliation: string | null;
  orcid: string | null;
  claim_status:
    | "pending"
    | "verified"
    | "rejected";
  verification_method: string | null;
  verification_note: string | null;
  claimed_at: string;
  verified_at: string | null;
  updated_at: string;
};

type AddedPublication = {
  id: string;
  user_id: string;
  openalex_author_id: string;
  openalex_work_id: string | null;
  doi: string | null;
  title: string;
  authors: string;
  journal: string | null;
  publication_year: number | null;
  publication_date: string | null;
  publication_type: string | null;
  source_url: string | null;
  full_text_url: string | null;
  is_open_access: boolean;
  notes: string | null;
  verification_status:
    | "pending"
    | "verified"
    | "rejected";
  verification_source: string | null;
  created_at: string;
  updated_at: string;
};

type PublicationExclusion = {
  id: string;
  user_id: string;
  openalex_author_id: string;
  openalex_work_id: string;
  publication_title: string | null;
  reason: string | null;
  reason_note: string | null;
  created_at: string;
  updated_at: string;
};

type ManagerPublication = Publication & {
  managerSource: "openalex" | "crossref";
  additionStatus?: "pending" | "verified" | "rejected";
  additionId?: string;
  addedAt?: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normalizeDoi(value: string | null) {
  if (!value) {
    return "";
  }

  return value
    .replace(
      /^https?:\/\/(?:dx\.)?doi\.org\//i,
      ""
    )
    .replace(/^doi:\s*/i, "")
    .trim();
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

function mapAddedPublication(
  item: AddedPublication
): ManagerPublication {
  const cleanDoi = normalizeDoi(item.doi);

  const sourceUrl =
    item.source_url ||
    (cleanDoi
      ? `https://doi.org/${cleanDoi}`
      : "");

  return {
    id: `addition-${item.id}`,
    openAlexUrl: item.openalex_work_id
      ? `https://openalex.org/${item.openalex_work_id}`
      : "",
    title: item.title,
    type:
      item.publication_type || "article",
    year: item.publication_year,
    publicationDate:
      item.publication_date,
    doi: cleanDoi
      ? `https://doi.org/${cleanDoi}`
      : null,
    citations: 0,
    journal:
      item.journal ||
      "Source not available",
    authors: item.authors,
    biblio: [
      item.publication_year
        ? String(item.publication_year)
        : "",
      item.journal || "",
    ]
      .filter(Boolean)
      .join(" · "),
    isOpenAccess: item.is_open_access,
    fullTextUrl: item.full_text_url,
    sourceUrl,
    manuallyAdded: true,
    verificationSource:
      item.verification_source,
    metadataSource:
      item.verification_source,

    managerSource: "crossref",
    additionStatus:
      item.verification_status,
    additionId: item.id,
    addedAt: item.created_at,
  };
}

function publicationTypeLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default function PublicationManagerPage() {
  const params = useParams<{ id: string }>();

  const researcherId =
    params.id?.toUpperCase() || "";

  const [user, setUser] =
    useState<User | null>(null);

  const [claim, setClaim] =
    useState<ResearcherClaim | null>(null);

  const [researcherData, setResearcherData] =
    useState<ResearcherResponse | null>(null);

  const [additions, setAdditions] =
    useState<AddedPublication[]>([]);

  const [exclusions, setExclusions] =
    useState<PublicationExclusion[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<ManagerTab>("all");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [sourceFilter, setSourceFilter] =
    useState<SourceFilter>("all");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [yearFilter, setYearFilter] =
    useState("all");

  const [openAccessOnly, setOpenAccessOnly] =
    useState(false);

  const [sort, setSort] =
    useState<ManagerSort>("newest");

  useEffect(() => {
    let mounted = true;

    async function loadManager() {
      if (!researcherId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authData.user) {
          if (mounted) {
            setError(
              "Sign in to access the Publication Manager."
            );
            setLoading(false);
          }

          return;
        }

        const currentUser = authData.user;

        if (!mounted) {
          return;
        }

        setUser(currentUser);

        const [
          researcherResponse,
          claimResult,
        ] = await Promise.all([
          fetch(
            `/api/researcher/${encodeURIComponent(
              researcherId
            )}`
          ),

          supabase
            .from(
              "researcher_profile_claims"
            )
            .select("*")
            .eq("user_id", currentUser.id)
            .eq(
              "openalex_author_id",
              researcherId
            )
            .maybeSingle(),
        ]);

        const researcherJson =
          (await researcherResponse.json()) as
            | ResearcherResponse
            | { error?: string };

        if (!researcherResponse.ok) {
          throw new Error(
            "error" in researcherJson
              ? researcherJson.error ||
                  "Unable to load researcher."
              : "Unable to load researcher."
          );
        }

        if (claimResult.error) {
          throw claimResult.error;
        }

        const ownerClaim =
          claimResult.data as
            | ResearcherClaim
            | null;

        if (
          !ownerClaim ||
          ownerClaim.claim_status !==
            "verified"
        ) {
          if (mounted) {
            setError(
              "Only the verified profile owner can access this Publication Manager."
            );
            setClaim(ownerClaim);
            setResearcherData(
              researcherJson as ResearcherResponse
            );
            setLoading(false);
          }

          return;
        }

        const [
          additionsResult,
          exclusionsResult,
        ] = await Promise.all([
          supabase
            .from(
              "researcher_publication_additions"
            )
            .select("*")
            .eq(
              "user_id",
              currentUser.id
            )
            .eq(
              "openalex_author_id",
              researcherId
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from(
              "researcher_publication_exclusions"
            )
            .select("*")
            .eq(
              "user_id",
              currentUser.id
            )
            .eq(
              "openalex_author_id",
              researcherId
            )
            .order("created_at", {
              ascending: false,
            }),
        ]);

        if (additionsResult.error) {
          throw additionsResult.error;
        }

        if (exclusionsResult.error) {
          throw exclusionsResult.error;
        }

        if (!mounted) {
          return;
        }

        setClaim(ownerClaim);

        setResearcherData(
          researcherJson as ResearcherResponse
        );

        setAdditions(
          (additionsResult.data ||
            []) as AddedPublication[]
        );

        setExclusions(
          (exclusionsResult.data ||
            []) as PublicationExclusion[]
        );
      } catch (loadError) {
        console.error(
          "Publication Manager loading failed:",
          loadError
        );

        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the Publication Manager."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadManager();

    return () => {
      mounted = false;
    };
  }, [researcherId]);

  const excludedIds = useMemo(
    () =>
      new Set(
        exclusions.map((item) =>
          item.openalex_work_id.toUpperCase()
        )
      ),
    [exclusions]
  );

  const openAlexPublications =
    useMemo<ManagerPublication[]>(() => {
      if (!researcherData) {
        return [];
      }

      return researcherData.publications
        .filter(
          (publication) =>
            !excludedIds.has(
              publication.id.toUpperCase()
            )
        )
        .map((publication) => ({
          ...publication,
          managerSource: "openalex",
        }));
    }, [excludedIds, researcherData]);

  const curatedPublications =
    useMemo<ManagerPublication[]>(
      () => additions.map(mapAddedPublication),
      [additions]
    );

  const verifiedCuratedPublications =
    useMemo(
      () =>
        curatedPublications.filter(
          (publication) =>
            publication.additionStatus ===
            "verified"
        ),
      [curatedPublications]
    );

  const allVisiblePublications =
    useMemo(
      () => [
        ...openAlexPublications,
        ...verifiedCuratedPublications,
      ],
      [
        openAlexPublications,
        verifiedCuratedPublications,
      ]
    );

  const publicationTypes = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...allVisiblePublications,
            ...curatedPublications,
          ]
            .map(
              (publication) =>
                publication.type
            )
            .filter(Boolean)
        )
      ).sort(),
    [
      allVisiblePublications,
      curatedPublications,
    ]
  );

  const publicationYears = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...allVisiblePublications,
            ...curatedPublications,
          ]
            .map(
              (publication) =>
                publication.year
            )
            .filter(
              (year): year is number =>
                typeof year === "number"
            )
        )
      ).sort((a, b) => b - a),
    [
      allVisiblePublications,
      curatedPublications,
    ]
  );

  const tabPublications = useMemo(() => {
    switch (activeTab) {
      case "openalex":
        return openAlexPublications;

      case "curated":
        return curatedPublications;

      case "all":
      default:
        return allVisiblePublications;
    }
  }, [
    activeTab,
    allVisiblePublications,
    curatedPublications,
    openAlexPublications,
  ]);

  const filteredPublications = useMemo(
    () => {
      if (activeTab === "hidden") {
        return [];
      }

      const cleanQuery =
        searchQuery.trim().toLowerCase();

      const filtered =
        tabPublications.filter(
          (publication) => {
            if (
              sourceFilter !== "all" &&
              publication.managerSource !==
                sourceFilter
            ) {
              return false;
            }

            if (
              typeFilter !== "all" &&
              publication.type !== typeFilter
            ) {
              return false;
            }

            if (
              yearFilter !== "all" &&
              publication.year !==
                Number(yearFilter)
            ) {
              return false;
            }

            if (
              openAccessOnly &&
              !publication.isOpenAccess
            ) {
              return false;
            }

            if (!cleanQuery) {
              return true;
            }

            const searchable = [
              publication.title,
              publication.authors,
              publication.journal,
              publication.year
                ? String(publication.year)
                : "",
              publication.doi || "",
              publication.type,
              publication.managerSource,
              publication.additionStatus ||
                "",
            ]
              .join(" ")
              .toLowerCase();

            return searchable.includes(
              cleanQuery
            );
          }
        );

      const sorted = [...filtered];

      switch (sort) {
        case "oldest":
          return sorted.sort(
            (a, b) =>
              (a.year || 0) -
              (b.year || 0)
          );

        case "most-cited":
          return sorted.sort(
            (a, b) =>
              b.citations -
              a.citations
          );

        case "least-cited":
          return sorted.sort(
            (a, b) =>
              a.citations -
              b.citations
          );

        case "title":
          return sorted.sort((a, b) =>
            a.title.localeCompare(b.title)
          );

        case "newest":
        default:
          return sorted.sort(
            (a, b) =>
              (b.publicationDate ||
                `${b.year || 0}`)
                .localeCompare(
                  a.publicationDate ||
                    `${a.year || 0}`
                )
          );
      }
    },
    [
      activeTab,
      openAccessOnly,
      searchQuery,
      sort,
      sourceFilter,
      tabPublications,
      typeFilter,
      yearFilter,
    ]
  );

  const openAccessCount = useMemo(
    () =>
      allVisiblePublications.filter(
        (publication) =>
          publication.isOpenAccess
      ).length,
    [allVisiblePublications]
  );

  function clearFilters() {
    setSearchQuery("");
    setSourceFilter("all");
    setTypeFilter("all");
    setYearFilter("all");
    setOpenAccessOnly(false);
    setSort("newest");
  }

  async function copyDoi(
    publication: ManagerPublication
  ) {
    const doi = normalizeDoi(
      publication.doi
    );

    if (!doi) {
      return;
    }

    await navigator.clipboard.writeText(
      doi
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />

          <p className="mt-5 font-semibold text-slate-500">
            Loading Publication Manager...
          </p>
        </div>
      </main>
    );
  }

  if (
    error ||
    !user ||
    !claim ||
    claim.claim_status !== "verified" ||
    !researcherData
  ) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8">
          <h1 className="text-2xl font-black text-rose-950">
            Publication Manager unavailable
          </h1>

          <p className="mt-3 leading-6 text-rose-700">
            {error ||
              "A verified profile claim is required."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/researcher/${researcherId}`}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            >
              Return to Profile
            </Link>

            {!user && (
              <Link
                href={`/signin?next=${encodeURIComponent(
                  `/researcher/${researcherId}/manage`
                )}`}
                className="rounded-xl border border-rose-300 bg-white px-5 py-3 text-sm font-bold text-rose-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  const profile = researcherData.profile;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/researcher/${researcherId}`}
          className="text-sm font-bold text-indigo-700 hover:underline"
        >
          ← Back to Public Profile
        </Link>

        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
          ✓ Verified profile owner
        </span>
      </div>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 shadow-sm">
        <div className="p-7 md:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-700">
            Researcher Workspace
          </p>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-950 md:text-4xl">
                Publication Manager
              </h1>

              <p className="mt-3 text-lg font-bold text-slate-700">
                {profile.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {profile.affiliation}
              </p>
            </div>

            <Link
              href={`/researcher/${researcherId}`}
              className="inline-flex w-fit rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            >
              View Public Profile
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              [
                "Total Visible",
                allVisiblePublications.length,
              ],
              [
                "OpenAlex",
                openAlexPublications.length,
              ],
              [
                "Curated",
                curatedPublications.length,
              ],
              [
                "Hidden",
                exclusions.length,
              ],
              [
                "Open Access",
                openAccessCount,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {label}
                </p>

                <p className="mt-3 text-3xl font-black text-slate-950">
                  {Number(
                    value
                  ).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            [
              "all",
              "All",
              allVisiblePublications.length,
            ],
            [
              "openalex",
              "OpenAlex",
              openAlexPublications.length,
            ],
            [
              "curated",
              "Curated",
              curatedPublications.length,
            ],
            [
              "hidden",
              "Hidden",
              exclusions.length,
            ],
          ].map(([tab, label, count]) => (
            <button
              key={String(tab)}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab as ManagerTab
                )
              }
              className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === tab
                  ? "bg-indigo-700 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {activeTab !== "hidden" && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-6">
            <input
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Search title, author, journal, DOI or year..."
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 lg:col-span-2"
            />

            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(
                  event.target
                    .value as SourceFilter
                )
              }
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
            >
              <option value="all">
                All sources
              </option>
              <option value="openalex">
                OpenAlex
              </option>
              <option value="crossref">
                Crossref
              </option>
            </select>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
            >
              <option value="all">
                All types
              </option>

              {publicationTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {publicationTypeLabel(
                      type
                    )}
                  </option>
                )
              )}
            </select>

            <select
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(
                  event.target.value
                )
              }
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
            >
              <option value="all">
                All years
              </option>

              {publicationYears.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target
                    .value as ManagerSort
                )
              }
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
            >
              <option value="newest">
                Newest
              </option>
              <option value="oldest">
                Oldest
              </option>
              <option value="most-cited">
                Most cited
              </option>
              <option value="least-cited">
                Least cited
              </option>
              <option value="title">
                Title A–Z
              </option>
            </select>
          </div>
        )}

        {activeTab !== "hidden" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={openAccessOnly}
                onChange={(event) =>
                  setOpenAccessOnly(
                    event.target.checked
                  )
                }
              />
              Open access only
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-bold text-indigo-700 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {activeTab === "hidden" ? (
        <section className="mt-6 space-y-4">
          {exclusions.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-black text-slate-900">
                No hidden publications
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Publications hidden from the public
                profile will appear here.
              </p>
            </div>
          ) : (
            exclusions.map((exclusion) => (
              <article
                key={exclusion.id}
                className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      Hidden OpenAlex record
                    </span>

                    <h2 className="mt-4 text-xl font-black leading-8 text-slate-950">
                      {exclusion.publication_title ||
                        exclusion.openalex_work_id}
                    </h2>

                    <p className="mt-3 text-sm font-semibold capitalize text-slate-500">
                      Reason:{" "}
                      {exclusion.reason
                        ?.replaceAll("_", " ") ||
                        "Not provided"}
                    </p>

                    {exclusion.reason_note && (
                      <p className="mt-2 text-sm text-slate-500">
                        {exclusion.reason_note}
                      </p>
                    )}

                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      Hidden{" "}
                      {formatDate(
                        exclusion.created_at
                      )}
                    </p>
                  </div>

                  <Link
                    href={`/researcher/${researcherId}`}
                    className="shrink-0 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700"
                  >
                    Manage on Profile
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>
      ) : (
        <section className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              Showing{" "}
              {filteredPublications.length.toLocaleString()}{" "}
              publication
              {filteredPublications.length === 1
                ? ""
                : "s"}
            </p>

            <p className="text-xs text-slate-500">
              Active tab:{" "}
              {activeTab
                .charAt(0)
                .toUpperCase() +
                activeTab.slice(1)}
            </p>
          </div>

          {filteredPublications.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-xl font-black text-slate-900">
                No matching publications
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Change the search term or clear the
                current filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPublications.map(
                (publication) => {
                  const doi = normalizeDoi(
                    publication.doi
                  );

                  return (
                    <article
                      key={publication.id}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold capitalize text-violet-700">
                              {publicationTypeLabel(
                                publication.type
                              )}
                            </span>

                            {publication.year && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {publication.year}
                              </span>
                            )}

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                publication.managerSource ===
                                "openalex"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {publication.managerSource ===
                              "openalex"
                                ? "OpenAlex"
                                : "Curated Record"}
                            </span>

                            {publication.additionStatus && (
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                                  publication.additionStatus ===
                                  "verified"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : publication.additionStatus ===
                                      "pending"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {
                                  publication.additionStatus
                                }
                              </span>
                            )}

                            {publication.isOpenAccess && (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                Open Access
                              </span>
                            )}
                          </div>

                          <h2 className="mt-4 text-xl font-black leading-8 text-slate-950">
                            {stripHtml(
                              publication.title
                            )}
                          </h2>

                          <p className="mt-3 text-sm leading-6 text-slate-500">
                            {publication.authors}
                          </p>

                          <p className="mt-3 font-bold text-slate-800">
                            {publication.journal}
                          </p>

                          {publication.biblio && (
                            <p className="mt-1 text-sm text-slate-500">
                              {publication.biblio}
                            </p>
                          )}

                          {doi && (
                            <p className="mt-3 break-all text-xs font-semibold text-indigo-700">
                              DOI: {doi}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-72 lg:justify-end">
                          {publication.sourceUrl && (
                            <a
                              href={
                                publication.sourceUrl
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                            >
                              View
                            </a>
                          )}

                          {doi && (
                            <button
                              type="button"
                              onClick={() =>
                                copyDoi(
                                  publication
                                )
                              }
                              className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700"
                            >
                              Copy DOI
                            </button>
                          )}

                          <Link
                            href={`/researcher/${researcherId}`}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                          >
                            Manage
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}