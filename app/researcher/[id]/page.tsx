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

type PublicationTab = "latest" | "cited";

type PublicationSort =
  | "tab-order"
  | "newest"
  | "oldest"
  | "most-cited"
  | "least-cited"
  | "title";

  type ExportFormat =
  | "csv"
  | "bibtex"
  | "ris"
  | "json"
  | "text";

type ExportScope = "all" | "current";

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function normaliseDoi(value: string | null) {
  if (!value) {
    return "";
  }

  return value
    .replace(/^https?:\/\/doi\.org\//i, "")
    .trim();
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeCsv(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

function escapeBibTeX(value: string) {
  return stripHtml(value)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/%/g, "\\%")
    .replace(/&/g, "\\&")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_");
}

function splitAuthors(value: string) {
  if (
    !value ||
    value === "Authors not available"
  ) {
    return [];
  }

  return value
    .split(",")
    .map((author) => author.trim())
    .filter(Boolean);
}

function createCitationKey(
  publication: Publication,
  index: number
) {
  const authors = splitAuthors(
    publication.authors
  );

  const firstAuthor =
    authors[0]
      ?.split(/\s+/)
      .filter(Boolean)
      .at(-1) || "publication";

  const year =
    publication.year || "nd";

  return safeFilename(
    `${firstAuthor}-${year}-${index + 1}`
  ).replace(/-/g, "");
}

function bibTeXEntryType(type: string) {
  const cleanType = type.toLowerCase();

  if (
    cleanType.includes("book-chapter") ||
    cleanType.includes("book chapter")
  ) {
    return "incollection";
  }

  if (cleanType.includes("book")) {
    return "book";
  }

  if (
    cleanType.includes("proceedings") ||
    cleanType.includes("conference")
  ) {
    return "inproceedings";
  }

  if (
    cleanType.includes("thesis") ||
    cleanType.includes("dissertation")
  ) {
    return "phdthesis";
  }

  return "article";
}

function risEntryType(type: string) {
  const cleanType = type.toLowerCase();

  if (
    cleanType.includes("book-chapter") ||
    cleanType.includes("book chapter")
  ) {
    return "CHAP";
  }

  if (cleanType.includes("book")) {
    return "BOOK";
  }

  if (
    cleanType.includes("conference") ||
    cleanType.includes("proceedings")
  ) {
    return "CPAPER";
  }

  if (
    cleanType.includes("thesis") ||
    cleanType.includes("dissertation")
  ) {
    return "THES";
  }

  return "JOUR";
}

function buildCsv(
  publications: Publication[]
) {
  const headers = [
    "Title",
    "Authors",
    "Journal",
    "Year",
    "Publication Date",
    "Type",
    "Citations",
    "DOI",
    "Open Access",
    "Full Text URL",
    "Source URL",
    "OpenAlex URL",
  ];

  const rows = publications.map(
    (publication) => [
      stripHtml(publication.title),
      publication.authors,
      publication.journal,
      publication.year || "",
      publication.publicationDate || "",
      publication.type,
      publication.citations,
      normaliseDoi(publication.doi),
      publication.isOpenAccess
        ? "Yes"
        : "No",
      publication.fullTextUrl || "",
      publication.sourceUrl,
      publication.openAlexUrl,
    ]
  );

  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) =>
      row.map(escapeCsv).join(",")
    ),
  ].join("\r\n");
}

function buildBibTeX(
  publications: Publication[]
) {
  return publications
    .map((publication, index) => {
      const key = createCitationKey(
        publication,
        index
      );

      const authors = splitAuthors(
        publication.authors
      )
        .map(escapeBibTeX)
        .join(" and ");

      const fields: string[] = [
        `  title = {${escapeBibTeX(
          publication.title
        )}}`,
      ];

      if (authors) {
        fields.push(
          `  author = {${authors}}`
        );
      }

      if (
        publication.journal &&
        publication.journal !==
          "Source not available"
      ) {
        fields.push(
          `  journal = {${escapeBibTeX(
            publication.journal
          )}}`
        );
      }

      if (publication.year) {
        fields.push(
          `  year = {${publication.year}}`
        );
      }

      const doi = normaliseDoi(
        publication.doi
      );

      if (doi) {
        fields.push(
          `  doi = {${escapeBibTeX(doi)}}`
        );
      }

      if (publication.sourceUrl) {
        fields.push(
          `  url = {${escapeBibTeX(
            publication.sourceUrl
          )}}`
        );
      }

      fields.push(
        `  note = {Citations: ${publication.citations}}`
      );

      return `@${bibTeXEntryType(
        publication.type
      )}{${key},\n${fields.join(
        ",\n"
      )}\n}`;
    })
    .join("\n\n");
}

function buildRis(
  publications: Publication[]
) {
  return publications
    .map((publication) => {
      const lines: string[] = [
        `TY  - ${risEntryType(
          publication.type
        )}`,
        `TI  - ${stripHtml(
          publication.title
        )}`,
      ];

      splitAuthors(
        publication.authors
      ).forEach((author) => {
        lines.push(`AU  - ${author}`);
      });

      if (
        publication.journal &&
        publication.journal !==
          "Source not available"
      ) {
        lines.push(
          `JO  - ${publication.journal}`
        );
      }

      if (publication.year) {
        lines.push(
          `PY  - ${publication.year}`
        );
      }

      if (publication.publicationDate) {
        lines.push(
          `DA  - ${publication.publicationDate}`
        );
      }

      const doi = normaliseDoi(
        publication.doi
      );

      if (doi) {
        lines.push(`DO  - ${doi}`);
      }

      if (publication.sourceUrl) {
        lines.push(
          `UR  - ${publication.sourceUrl}`
        );
      }

      lines.push(
        `N1  - Citations: ${publication.citations}`
      );

      lines.push("ER  -");

      return lines.join("\r\n");
    })
    .join("\r\n\r\n");
}

function buildTextList(
  publications: Publication[],
  researcherName: string
) {
  const heading = [
    `${researcherName} — Publication List`,
    `Total publications exported: ${publications.length}`,
    `Generated: ${new Date().toLocaleString(
      "en-IN"
    )}`,
    "",
  ];

  const entries = publications.map(
    (publication, index) => {
      const doi = normaliseDoi(
        publication.doi
      );

      return [
        `${index + 1}. ${stripHtml(
          publication.title
        )}`,
        `   Authors: ${publication.authors}`,
        `   Source: ${publication.journal}`,
        `   Year: ${
          publication.year || "Not available"
        }`,
        `   Citations: ${publication.citations}`,
        doi ? `   DOI: ${doi}` : "",
        `   URL: ${publication.sourceUrl}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
  );

  return [...heading, ...entries].join(
    "\n\n"
  );
}

function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], {
    type: `${mimeType};charset=utf-8`,
  });

  const url = URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
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

  const [exportFormat, setExportFormat] =
  useState<ExportFormat>("csv");

const [exportMessage, setExportMessage] =
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

function exportPublications(
  scope: ExportScope
) {
  if (!data) {
    return;
  }

  const completeSortedList = [
    ...data.publications,
  ].sort(
    activeTab === "latest"
      ? (a, b) => {
          const dateA =
            a.publicationDate ||
            `${a.year || 0}`;

          const dateB =
            b.publicationDate ||
            `${b.year || 0}`;

          return dateB.localeCompare(
            dateA
          );
        }
      : (a, b) =>
          b.citations - a.citations
  );

  const publicationsToExport =
    scope === "current"
      ? visiblePublications
      : completeSortedList;

  if (publicationsToExport.length === 0) {
    setExportMessage(
      "There are no publications to export."
    );

    window.setTimeout(() => {
      setExportMessage("");
    }, 2500);

    return;
  }

  const baseFilename =
    safeFilename(
      `${data.profile.name}-publications`
    ) || "researcher-publications";

  let content = "";
  let extension = "";
  let mimeType = "text/plain";

  switch (exportFormat) {
    case "csv":
      content = buildCsv(
        publicationsToExport
      );
      extension = "csv";
      mimeType = "text/csv";
      break;

    case "bibtex":
      content = buildBibTeX(
        publicationsToExport
      );
      extension = "bib";
      mimeType =
        "application/x-bibtex";
      break;

    case "ris":
      content = buildRis(
        publicationsToExport
      );
      extension = "ris";
      mimeType =
        "application/x-research-info-systems";
      break;

    case "json":
      content = JSON.stringify(
        {
          researcher: {
            id: data.profile.id,
            name: data.profile.name,
            affiliation:
              data.profile.affiliation,
            orcid: data.profile.orcid,
            openAlexUrl:
              data.profile.openAlexUrl,
          },
          exportedAt:
            new Date().toISOString(),
          publicationCount:
            publicationsToExport.length,
          publications:
            publicationsToExport,
        },
        null,
        2
      );
      extension = "json";
      mimeType = "application/json";
      break;

    case "text":
      content = buildTextList(
        publicationsToExport,
        data.profile.name
      );
      extension = "txt";
      mimeType = "text/plain";
      break;
  }

  const scopeSuffix =
    scope === "current"
      ? "-current-results"
      : "-all";

  downloadTextFile(
    content,
    `${baseFilename}${scopeSuffix}.${extension}`,
    mimeType
  );

  setExportMessage(
    `${publicationsToExport.length} publications exported as ${exportFormat.toUpperCase()}.`
  );

  window.setTimeout(() => {
    setExportMessage("");
  }, 3000);
}

  const visiblePublications = useMemo(() => {
    if (!data) {
      return [];
    }

    const cleanQuery =
      publicationQuery.trim().toLowerCase();

    const filtered = data.publications.filter(
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
          (a, b) =>
            (b.year || 0) - (a.year || 0)
        );

      case "oldest":
        return sorted.sort(
          (a, b) =>
            (a.year || 0) - (b.year || 0)
        );

      case "most-cited":
        return sorted.sort(
          (a, b) =>
            b.citations - a.citations
        );

      case "least-cited":
        return sorted.sort(
          (a, b) =>
            a.citations - b.citations
        );

      case "title":
        return sorted.sort((a, b) =>
          a.title.localeCompare(b.title)
        );

      default:
        return sorted.sort(
          activeTab === "latest"
            ? (a, b) => {
                const dateA =
                  a.publicationDate ||
                  `${a.year || 0}`;

                const dateB =
                  b.publicationDate ||
                  `${b.year || 0}`;

                return dateB.localeCompare(
                  dateA
                );
              }
            : (a, b) =>
                b.citations - a.citations
        );
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
            Loading complete researcher profile...
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
    publications,
    publicationMeta,
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
    publications.length;

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

      {exportMessage && (
  <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-indigo-200 bg-white px-6 py-4 text-sm font-bold text-indigo-700 shadow-xl print:hidden">
    {exportMessage}
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
              Browse the researcher&apos;s complete
              OpenAlex publication record.
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

        <div className="mt-4 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 p-5 shadow-sm print:hidden">
  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
        Publication Export
      </p>

      <h3 className="mt-2 text-xl font-black text-slate-950">
        Download publication records
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Export the complete profile or only the
        publications matching the current search.
      </p>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Export format
        </label>

        <select
          value={exportFormat}
          onChange={(event) =>
            setExportFormat(
              event.target
                .value as ExportFormat
            )
          }
          className="mt-2 w-full min-w-48 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="csv">
            CSV — Excel and reporting
          </option>

          <option value="bibtex">
            BibTeX — LaTeX and Zotero
          </option>

          <option value="ris">
            RIS — EndNote and Mendeley
          </option>

          <option value="json">
            JSON — Data backup
          </option>

          <option value="text">
            Plain Text — Publication list
          </option>
        </select>
      </div>

      <button
        type="button"
        onClick={() =>
          exportPublications("all")
        }
        className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
      >
        Export All (
        {data.publications.length})
      </button>

      <button
        type="button"
        onClick={() =>
          exportPublications("current")
        }
        className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
      >
        Export Current (
        {visiblePublications.length})
      </button>
    </div>
  </div>
</div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Showing{" "}
              {visiblePublications.length.toLocaleString()}{" "}
              of{" "}
              {displayedPublicationCount.toLocaleString()}{" "}
              publications
            </p>

            <p className="mt-1 text-xs text-slate-500">
              OpenAlex profile count:{" "}
              {publicationMeta.profileWorksCount.toLocaleString()}
              {" · "}
              API records found:{" "}
              {publicationMeta.apiWorksCount.toLocaleString()}
            </p>
          </div>

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

        {!publicationMeta.complete && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
            This researcher has an exceptionally
            large publication record. OpenScholar
            loaded{" "}
            {publicationMeta.loadedCount.toLocaleString()}{" "}
            publications in this session.
          </div>
        )}

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

        <p className="mt-2">
          OpenScholar loaded{" "}
          {publicationMeta.loadedCount.toLocaleString()}{" "}
          publication records through{" "}
          {publicationMeta.requestsUsed.toLocaleString()}{" "}
          OpenAlex API request
          {publicationMeta.requestsUsed === 1
            ? ""
            : "s"}.
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