"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabaseClient";
import { getMyEntitlements } from "@/lib/entitlements";
import type { User } from "@supabase/supabase-js";
import AddPublicationDialog from "@/app/components/AddPublicationDialog";
import ResearcherPhotoUpload from "@/app/components/ResearcherPhotoUpload";

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

  // OpenScholar-curated publication fields
  manuallyAdded?: boolean;
  verificationSource?: string | null;
  metadataSource?: string | null;
};

type PublicationAddition = {
  id: string;

  title: string;

  doi: string | null;

  openalex_author_id: string;

  publication_year: number | null;

  publication_date: string | null;

  journal: string;

  authors: string;

  publication_type: string;

  citations: number;

  biblio: string;

  full_text_url: string | null;

  openalex_work_id: string | null;

  openalex_url: string | null;

  verification_source: string;

  metadata_source: string;

  verification_status: string;
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

type ClaimStatus =
  | "pending"
  | "verified"
  | "rejected";

type VerificationMethod =
  | "signed_in_email"
  | "institutional_email"
  | "orcid"
  | "administrator";

type ResearcherClaim = {
  id: string;
  user_id: string;
  openalex_author_id: string;
  researcher_name: string;
  affiliation: string | null;
  orcid: string | null;
  claim_status: ClaimStatus;
  verification_method:
    | VerificationMethod
    | null;
  verification_note: string | null;
  claimed_at: string;
  verified_at: string | null;
  updated_at: string;
  profile_photo_url: string | null;
};

type PublicationExclusion = {
  id: string;
  user_id: string;
  openalex_author_id: string;
  openalex_work_id: string;
  publication_title: string | null;
  reason:
    | "different_author"
    | "incorrect_assignment"
    | "duplicate"
    | "not_my_publication"
    | "other"
    | null;
  reason_note: string | null;
  created_at: string;
  updated_at: string;
};

type PublicExclusion = {
  openalex_work_id: string;
};

type AddedPublicationStatus =
  | "pending"
  | "verified"
  | "rejected";

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
  verification_status: AddedPublicationStatus;
  verification_source:
    | "doi"
    | "openalex"
    | "crossref"
    | "orcid"
    | "manual"
    | "administrator"
    | null;
  created_at: string;
  updated_at: string;
};

type YearAnalytics = {
  year: number;
  publications: number;
  citations: number;
};

type CountAnalytics = {
  label: string;
  count: number;
};

type CollaboratorAnalytics = {
  name: string;
  publications: number;
};

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function formatPublicationType(type: string) {
  const normalized = type
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .trim();

  return normalized.replace(
    /\b\w/g,
    (character) => character.toUpperCase()
  );
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

function cleanDoiInput(value: string) {
  return value
    .trim()
    .replace(
      /^https?:\/\/(?:dx\.)?doi\.org\//i,
      ""
    )
    .replace(/^doi:\s*/i, "")
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

function AnalyticsBar({
  label,
  value,
  maximum,
  detail,
}: {
  label: string;
  value: number;
  maximum: number;
  detail?: string;
}) {
  const percentage =
    maximum > 0
      ? Math.max(
          3,
          Math.round((value / maximum) * 100)
        )
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="min-w-0 truncate font-semibold text-slate-700">
          {label}
        </span>

        <span className="shrink-0 font-black text-slate-950">
          {value.toLocaleString()}
          {detail ? (
            <span className="ml-1 font-medium text-slate-400">
              {detail}
            </span>
          ) : null}
        </span>
      </div>

      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function PublicationCard({
  publication,
  canCurate = false,
  curationBusy = false,
  onExclude,
}: {
  publication: Publication;
  canCurate?: boolean;
  curationBusy?: boolean;
  onExclude?: (
    publication: Publication
  ) => void;
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

{publication.manuallyAdded && (
  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
    Curated Record
  </span>
)}

{publication.verificationSource && (
  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
    Verified via{" "}
    {publication.verificationSource
      .charAt(0)
      .toUpperCase() +
      publication.verificationSource.slice(1)}
  </span>
)}

</div>

      <h3 className="mt-4 text-xl font-black leading-8 text-slate-950">
  {stripHtml(publication.title)}
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
  View Source
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

        {publication.openAlexUrl && (
  <a
    href={publication.openAlexUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
  >
    OpenAlex
  </a>
)}

{canCurate && onExclude && (
  <button
    type="button"
    onClick={() => onExclude(publication)}
    disabled={curationBusy}
    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {curationBusy
      ? "Hiding..."
      : "Hide from Profile"}
  </button>
)}

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

const [showShareMenu, setShowShareMenu] =
  useState(false);
const [showQrDialog, setShowQrDialog] =
  useState(false);
  const [exportFormat, setExportFormat] =
  useState<ExportFormat>("csv");

const [exportMessage, setExportMessage] =
  useState("");
  
const [canBulkExport, setCanBulkExport] =
  useState(false);

const [exportEntitlementsLoading, setExportEntitlementsLoading] =
  useState(true);  

const [user, setUser] =
  useState<User | null>(null);

const [claim, setClaim] =
  useState<ResearcherClaim | null>(null);

const [claimLoading, setClaimLoading] =
  useState(true);

const [showClaimDialog, setShowClaimDialog] =
  useState(false);

const [
  verificationMethod,
  setVerificationMethod,
] = useState<VerificationMethod>(
  "signed_in_email"
);

const [verificationNote, setVerificationNote] =
  useState("");

const [claimSubmitting, setClaimSubmitting] =
  useState(false);

const [claimMessage, setClaimMessage] =
  useState("");

  const [excludedWorkIds, setExcludedWorkIds] =
  useState<Set<string>>(new Set());

const [ownerExclusions, setOwnerExclusions] =
  useState<PublicationExclusion[]>([]);

const [verifiedAdditions, setVerifiedAdditions] =
  useState<Publication[]>([]);

const [exclusionsLoading, setExclusionsLoading] =
  useState(true);

const [exclusionBusyId, setExclusionBusyId] =
  useState<string | null>(null);

const [
  showHiddenPublications,
  setShowHiddenPublications,
] = useState(false);

const [
  publicationToExclude,
  setPublicationToExclude,
] = useState<Publication | null>(null);

const [exclusionReason, setExclusionReason] =
  useState<
    | "different_author"
    | "incorrect_assignment"
    | "duplicate"
    | "not_my_publication"
    | "other"
  >("not_my_publication");

const [exclusionNote, setExclusionNote] =
  useState("");

const [curationMessage, setCurationMessage] =
  useState("");

  const [
  showAddPublicationDialog,
  setShowAddPublicationDialog,
] = useState(false);



const [
  ownerAddedPublications,
  setOwnerAddedPublications,
] = useState<AddedPublication[]>([]);

const [
  additionsLoading,
  setAdditionsLoading,
] = useState(false);

const [additionMessage, setAdditionMessage] =
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
  let mounted = true;

  async function loadAuthenticatedUser() {
    const { data, error: authError } =
      await supabase.auth.getUser();

    if (!mounted) {
      return;
    }

    if (authError) {
      console.error(
        "Unable to load authenticated user:",
        authError
      );

      setUser(null);
      return;
    }

    setUser(data.user);
  }

  loadAuthenticatedUser();

  const { data: authListener } =
    supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) {
          return;
        }

        setUser(session?.user ?? null);
      }
    );

  return () => {
    mounted = false;
    authListener.subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  let mounted = true;

  async function loadExportEntitlements() {
    setExportEntitlementsLoading(true);

    if (!user) {
      if (mounted) {
        setCanBulkExport(false);
        setExportEntitlementsLoading(false);
      }

      return;
    }

    try {
      const entitlements =
        await getMyEntitlements();

      if (!mounted) {
        return;
      }

      setCanBulkExport(
        entitlements.can_bulk_export === true
      );
    } catch (error) {
      console.error(
        "Unable to load export entitlements:",
        error
      );

      if (mounted) {
        setCanBulkExport(false);
      }
    } finally {
      if (mounted) {
        setExportEntitlementsLoading(false);
      }
    }
  }

  loadExportEntitlements();

  return () => {
    mounted = false;
  };
}, [user]);

useEffect(() => {
  let mounted = true;

  async function loadClaim() {
    if (!user || !researcherId) {
      if (mounted) {
        setClaim(null);
        setClaimLoading(false);
      }

      return;
    }

    setClaimLoading(true);

    const { data: claimData, error: claimError } =
      await supabase
        .from("researcher_profile_claims")
        .select("*")
        .eq("user_id", user.id)
        .eq(
          "openalex_author_id",
          researcherId.toUpperCase()
        )
        .maybeSingle();

    if (!mounted) {
      return;
    }

    if (claimError) {
      console.error(
        "Unable to load researcher claim:",
        claimError
      );

      setClaim(null);
      setClaimLoading(false);
      return;
    }

    setClaim(
      (claimData as ResearcherClaim | null) ||
        null
    );

    setClaimLoading(false);
  }

  loadClaim();

  return () => {
    mounted = false;
  };
}, [researcherId, user]);

useEffect(() => {
  let mounted = true;

  async function loadPublicExclusions() {
    if (!researcherId) {
      return;
    }

    setExclusionsLoading(true);

    const {
      data: exclusionData,
      error: exclusionError,
    } = await supabase.rpc(
      "get_researcher_publication_exclusions",
      {
        p_openalex_author_id:
          researcherId.toUpperCase(),
      }
    );

    if (!mounted) {
      return;
    }

    if (exclusionError) {
      console.error(
        "Unable to load publication exclusions:",
        exclusionError
      );

      setExcludedWorkIds(new Set());
      setExclusionsLoading(false);
      return;
    }

    const exclusionIds = new Set(
      (
        (exclusionData ?? []) as PublicExclusion[]
      ).map((item) =>
        item.openalex_work_id.toUpperCase()
      )
    );

    setExcludedWorkIds(exclusionIds);
    setExclusionsLoading(false);
  }

  loadPublicExclusions();

  return () => {
    mounted = false;
  };
}, [researcherId]);

useEffect(() => {
  let mounted = true;

  async function loadOwnerExclusions() {
    if (
      !user ||
      !claim ||
      claim.claim_status !== "verified"
    ) {
      if (mounted) {
        setOwnerExclusions([]);
      }
      return;
    }

    const {
      data: ownerExclusionData,
      error: ownerExclusionError,
    } = await supabase
      .from(
        "researcher_publication_exclusions"
      )
      .select("*")
      .eq("user_id", user.id)
      .eq(
        "openalex_author_id",
        researcherId.toUpperCase()
      )
      .order("created_at", {
        ascending: false,
      });

    if (!mounted) {
      return;
    }

    if (ownerExclusionError) {
      console.error(
        "Unable to load owner exclusions:",
        ownerExclusionError
      );

      setOwnerExclusions([]);
      return;
    }

    setOwnerExclusions(
      (ownerExclusionData ??
        []) as PublicationExclusion[]
    );
  }

  loadOwnerExclusions();

  return () => {
    mounted = false;
  };
}, [claim, researcherId, user]);

useEffect(() => {
  let mounted = true;

  async function loadOwnerAdditions() {
    if (
      !user ||
      !claim ||
      claim.claim_status !== "verified"
    ) {
      if (mounted) {
        setOwnerAddedPublications([]);
        setAdditionsLoading(false);
      }

      return;
    }

    setAdditionsLoading(true);

    const {
      data: additionData,
      error: additionError,
    } = await supabase
      .from(
        "researcher_publication_additions"
      )
      .select("*")
      .eq("user_id", user.id)
      .eq(
        "openalex_author_id",
        researcherId.toUpperCase()
      )
      .order("created_at", {
        ascending: false,
      });

    if (!mounted) {
      return;
    }

    if (additionError) {
      console.error(
        "Unable to load added publications:",
        additionError
      );

      setOwnerAddedPublications([]);
      setAdditionsLoading(false);
      return;
    }

    setOwnerAddedPublications(
      (additionData || []) as AddedPublication[]
    );

    setAdditionsLoading(false);
  }

  loadOwnerAdditions();

  return () => {
    mounted = false;
  };
}, [claim, researcherId, user]);

useEffect(() => {
  async function loadVerifiedAdditions() {
    if (!researcherId) return;

    const { data, error } = await supabase
      .from("researcher_publication_additions")
      .select("*")
      .eq(
        "openalex_author_id",
        researcherId.toUpperCase()
      )
      .eq(
        "verification_status",
        "verified"
      );

    if (error) {
      console.error(error);
      return;
    }

    const additions =
      (data as PublicationAddition[]).map(
        (item) => ({
          id: item.id,

          openAlexUrl:
            item.openalex_url || "",

          title: item.title,

          type:
            item.publication_type ||
            "article",

          year:
            item.publication_year,

          publicationDate:
            item.publication_date,

          doi: item.doi
            ? `https://doi.org/${item.doi}`
            : null,

          citations:
            item.citations || 0,

          journal:
            item.journal,

          authors:
            item.authors,

          biblio:
            item.biblio,

          isOpenAccess: Boolean(
            item.full_text_url
          ),

          fullTextUrl:
            item.full_text_url,

          sourceUrl:
            item.doi
              ? `https://doi.org/${item.doi}`
              : "",

          metadataSource:
            item.metadata_source,

          verificationSource:
            item.verification_source,

          manuallyAdded: true,
        })
      );

    setVerifiedAdditions(additions);
  }

  loadVerifiedAdditions();
}, [researcherId]);

  function getShareableProfileUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return `https://openscholar.dvsanalytik.com/researcher/${researcherId}`;
  }

  return window.location.href;
}

  async function copyProfileLink() {
  try {
    await navigator.clipboard.writeText(
      getShareableProfileUrl()
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
      url: getShareableProfileUrl(),
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

function openShareWindow(url: string) {
  window.open(
    url,
    "_blank",
    "noopener,noreferrer,width=720,height=640"
  );
}

function shareByEmail() {
  if (!data) {
    return;
  }

  const subject = encodeURIComponent(
    `${data.profile.name} — OpenScholar Researcher Profile`
  );

  const body = encodeURIComponent(
    `View ${data.profile.name}'s researcher profile on OpenScholar:\n\n${getShareableProfileUrl()}`
  );

  window.location.href =
    `mailto:?subject=${subject}&body=${body}`;

  setShowShareMenu(false);
}

function shareOnLinkedIn() {
  const url = encodeURIComponent(
    getShareableProfileUrl()
  );

  openShareWindow(
    `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
  );

  setShowShareMenu(false);
}

function shareOnX() {
  if (!data) {
    return;
  }

  const text = encodeURIComponent(
    `View ${data.profile.name}'s researcher profile on OpenScholar`
  );

  const url = encodeURIComponent(
    getShareableProfileUrl()
  );

  openShareWindow(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}`
  );

  setShowShareMenu(false);
}

function shareOnFacebook() {
  const url = encodeURIComponent(
    getShareableProfileUrl()
  );

  openShareWindow(
    `https://www.facebook.com/sharer/sharer.php?u=${url}`
  );

  setShowShareMenu(false);
}

function downloadProfileQrCode() {
  const svg =
    document.querySelector(
      "#profile-qr-code svg"
    );

  if (!(svg instanceof SVGElement)) {
    setShareMessage(
      "Unable to download the QR code."
    );

    return;
  }

  const serializer = new XMLSerializer();

  const svgContent =
    serializer.serializeToString(svg);

  const completeSvg = svgContent.includes(
    'xmlns="http://www.w3.org/2000/svg"'
  )
    ? svgContent
    : svgContent.replace(
        "<svg",
        '<svg xmlns="http://www.w3.org/2000/svg"'
      );

  const blob = new Blob([completeSvg], {
    type: "image/svg+xml;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;

  anchor.download =
    `${
      safeFilename(
        `${data?.profile.name || "researcher"}-profile-qr`
      ) || "researcher-profile-qr"
    }.svg`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);

  setShareMessage(
    "Profile QR code downloaded."
  );

  window.setTimeout(() => {
    setShareMessage("");
  }, 2500);
}

async function submitProfileClaim() {
  if (!data) {
    return;
  }

  if (!user) {
    window.location.href =
      `/signin?next=${encodeURIComponent(
        `/researcher/${researcherId}`
      )}`;

    return;
  }

  setClaimSubmitting(true);
  setClaimMessage("");

  try {
    const claimPayload = {
      user_id: user.id,
      openalex_author_id:
        data.profile.id.toUpperCase(),
      researcher_name:
        data.profile.name,
      affiliation:
        data.profile.affiliation || null,
      orcid:
        data.profile.orcid || null,
      claim_status: "pending" as const,
      verification_method:
        verificationMethod,
      verification_note:
        verificationNote.trim() || null,
    };

    const { data: insertedClaim, error } =
      await supabase
        .from("researcher_profile_claims")
        .insert(claimPayload)
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    setClaim(
      insertedClaim as ResearcherClaim
    );

    setShowClaimDialog(false);
    setVerificationNote("");

    setClaimMessage(
      "Profile claim submitted successfully."
    );
  } catch (claimError) {
    console.error(
      "Profile claim submission failed:",
      claimError
    );

    const errorMessage =
      claimError &&
      typeof claimError === "object" &&
      "message" in claimError
        ? String(claimError.message)
        : "Unable to submit the profile claim.";

    setClaimMessage(errorMessage);
  } finally {
    setClaimSubmitting(false);

    window.setTimeout(() => {
      setClaimMessage("");
    }, 4000);
  }
}

async function withdrawProfileClaim() {
  if (!claim || claim.claim_status !== "pending") {
    return;
  }

  const confirmed = window.confirm(
    "Withdraw this pending profile claim?"
  );

  if (!confirmed) {
    return;
  }

  setClaimSubmitting(true);
  setClaimMessage("");

  try {
    const { error } = await supabase
      .from("researcher_profile_claims")
      .delete()
      .eq("id", claim.id);

    if (error) {
      throw error;
    }

    setClaim(null);

    setClaimMessage(
      "Profile claim withdrawn."
    );
  } catch (claimError) {
    console.error(
      "Unable to withdraw profile claim:",
      claimError
    );

    setClaimMessage(
      "Unable to withdraw the profile claim."
    );
  } finally {
    setClaimSubmitting(false);

    window.setTimeout(() => {
      setClaimMessage("");
    }, 3500);
  }
}

async function excludePublication() {
  if (
    !user ||
    !claim ||
    claim.claim_status !== "verified" ||
    !publicationToExclude
  ) {
    return;
  }

  setExclusionBusyId(
    publicationToExclude.id
  );

  setCurationMessage("");

  try {
    const payload = {
      user_id: user.id,
      openalex_author_id:
        researcherId.toUpperCase(),
      openalex_work_id:
        publicationToExclude.id.toUpperCase(),
      publication_title:
        stripHtml(
          publicationToExclude.title
        ),
      reason: exclusionReason,
      reason_note:
        exclusionNote.trim() || null,
    };

    const {
      data: insertedExclusion,
      error: exclusionError,
    } = await supabase
      .from(
        "researcher_publication_exclusions"
      )
      .insert(payload)
      .select("*")
      .single();

    if (exclusionError) {
      throw exclusionError;
    }

    const exclusion =
      insertedExclusion as PublicationExclusion;

    setOwnerExclusions((current) => [
      exclusion,
      ...current,
    ]);

    setExcludedWorkIds((current) => {
      const next = new Set(current);

      next.add(
        exclusion.openalex_work_id.toUpperCase()
      );

      return next;
    });

    setPublicationToExclude(null);
    setExclusionReason(
      "not_my_publication"
    );
    setExclusionNote("");

    setCurationMessage(
      "Publication hidden from the profile."
    );
  } catch (exclusionError) {
    console.error(
      "Unable to exclude publication:",
      exclusionError
    );

    setCurationMessage(
      "Unable to hide this publication."
    );
  } finally {
    setExclusionBusyId(null);

    window.setTimeout(() => {
      setCurationMessage("");
    }, 3500);
  }
}

async function restorePublication(
  exclusion: PublicationExclusion
) {
  if (
    !user ||
    !claim ||
    claim.claim_status !== "verified"
  ) {
    return;
  }

  const confirmed = window.confirm(
    "Restore this publication to the public profile?"
  );

  if (!confirmed) {
    return;
  }

  setExclusionBusyId(
    exclusion.openalex_work_id
  );

  setCurationMessage("");

  try {
    const { error: restoreError } =
      await supabase
        .from(
          "researcher_publication_exclusions"
        )
        .delete()
        .eq("id", exclusion.id);

    if (restoreError) {
      throw restoreError;
    }

    setOwnerExclusions((current) =>
      current.filter(
        (item) =>
          item.id !== exclusion.id
      )
    );

    setExcludedWorkIds((current) => {
      const next = new Set(current);

      next.delete(
        exclusion.openalex_work_id.toUpperCase()
      );

      return next;
    });

    setCurationMessage(
      "Publication restored to the profile."
    );
  } catch (restoreError) {
    console.error(
      "Unable to restore publication:",
      restoreError
    );

    setCurationMessage(
      "Unable to restore this publication."
    );
  } finally {
    setExclusionBusyId(null);

    window.setTimeout(() => {
      setCurationMessage("");
    }, 3500);
  }
}


function exportPublications(
  scope: ExportScope
) {
  if (!data) {
    return;
  }

  if (!user) {
    setExportMessage(
      "Sign in to export publication records."
    );

    window.setTimeout(() => {
      setExportMessage("");
    }, 3000);

    return;
  }

  if (!canBulkExport) {
    setExportMessage(
      "Bulk publication export is available with the OpenScholar-Web Scholar plan."
    );

    window.setTimeout(() => {
      setExportMessage("");
    }, 3500);

    return;
  }

  const completeSortedList = [
  ...curatedPublications,
  ...verifiedAdditions,
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

const curatedPublications = useMemo(() => {
  if (!data) {
    return [];
  }

  return data.publications.filter(
    (publication) =>
      !excludedWorkIds.has(
        publication.id.toUpperCase()
      )
  );
}, [data, excludedWorkIds]);

const openAlexDois = useMemo(
  () =>
    data?.publications
      .map((publication) =>
        normaliseDoi(publication.doi)
      )
      .filter(Boolean) || [],
  [data]
);

const addedDois = useMemo(
  () =>
    ownerAddedPublications
      .map((publication) =>
        normaliseDoi(publication.doi)
      )
      .filter(Boolean),
  [ownerAddedPublications]
);

const analyticsPublications = useMemo(
  () => [
    ...curatedPublications,
    ...verifiedAdditions,
  ],
  [curatedPublications, verifiedAdditions]
);

  const visiblePublications = useMemo(() => {
  if (!data) {
    return [];
  }

  const allPublications = [
    ...curatedPublications,
    ...verifiedAdditions,
  ];

  const cleanQuery =
    publicationQuery.trim().toLowerCase();

const filtered = allPublications.filter(
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
  },
[
 activeTab,
 data,
 verifiedAdditions,
 publicationQuery,
 publicationSort
]);

const analytics = useMemo(() => {
  const emptyAnalytics = {
    firstPublicationYear: null as number | null,
    latestPublicationYear: null as number | null,
    activeYears: 0,
    byYear: [] as YearAnalytics[],
    publicationTypes: [] as CountAnalytics[],
    topJournals: [] as CountAnalytics[],
    topCollaborators:
      [] as CollaboratorAnalytics[],
    topCitedPublications: [] as Publication[],
    openAccessCount: 0,
    closedAccessCount: 0,
    openAccessRate: 0,
    highestCitedPaper: null as Publication | null,
  };

  if (!data) {
    return emptyAnalytics;
  }

  const profileName = data.profile.name;
  const allPublications =
  analyticsPublications;

  const researcherNameVariants = new Set(
  [
    profileName,
    ...data.profile.alternativeNames,
  ].map((name) => normalizeText(name))
);

  const validYears = allPublications
    .map((publication) => publication.year)
    .filter(
      (year): year is number =>
        typeof year === "number" &&
        Number.isFinite(year)
    );

  const firstPublicationYear =
    validYears.length > 0
      ? Math.min(...validYears)
      : null;

  const latestPublicationYear =
    validYears.length > 0
      ? Math.max(...validYears)
      : null;

  const activeYears =
    firstPublicationYear !== null &&
    latestPublicationYear !== null
      ? latestPublicationYear -
        firstPublicationYear +
        1
      : 0;

  const yearMap = new Map<
    number,
    {
      publications: number;
      citations: number;
    }
  >();

  const typeMap = new Map<string, number>();
  const journalMap = new Map<string, number>();
  const collaboratorMap =
    new Map<string, number>();

  let openAccessCount = 0;

  allPublications.forEach((publication) => {
    if (publication.year) {
      const currentYearData =
        yearMap.get(publication.year) || {
          publications: 0,
          citations: 0,
        };

      currentYearData.publications += 1;
      currentYearData.citations +=
        publication.citations;

      yearMap.set(
        publication.year,
        currentYearData
      );
    }

    const publicationType =
      formatPublicationType(
        publication.type || "Other"
      );

    typeMap.set(
      publicationType,
      (typeMap.get(publicationType) || 0) + 1
    );

    if (
      publication.journal &&
      publication.journal !==
        "Source not available"
    ) {
      journalMap.set(
        publication.journal,
        (journalMap.get(
          publication.journal
        ) || 0) + 1
      );
    }

    if (publication.isOpenAccess) {
      openAccessCount += 1;
    }

    splitAuthors(publication.authors).forEach(
      (author) => {
        if (
  researcherNameVariants.has(
    normalizeText(author)
  )
) {
  return;
}

        collaboratorMap.set(
          author,
          (collaboratorMap.get(author) ||
            0) + 1
        );
      }
    );
  });

  const byYear: YearAnalytics[] =
    Array.from(yearMap.entries())
      .map(([year, values]) => ({
        year,
        publications:
          values.publications,
        citations: values.citations,
      }))
      .sort((a, b) => a.year - b.year);

  const publicationTypes: CountAnalytics[] =
    Array.from(typeMap.entries())
      .map(([label, count]) => ({
        label,
        count,
      }))
      .sort((a, b) => b.count - a.count);

  const topJournals: CountAnalytics[] =
    Array.from(journalMap.entries())
      .map(([label, count]) => ({
        label,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

  const topCollaborators: CollaboratorAnalytics[] =
    Array.from(
      collaboratorMap.entries()
    )
      .map(([name, publications]) => ({
        name,
        publications,
      }))
      .sort(
        (a, b) =>
          b.publications -
          a.publications
      )
      .slice(0, 10);

  const topCitedPublications = [
    ...allPublications,
  ]
    .sort(
      (a, b) =>
        b.citations - a.citations
    )
    .slice(0, 10);

  const closedAccessCount =
    Math.max(
      0,
      allPublications.length -
        openAccessCount
    );

  const openAccessRate =
    allPublications.length > 0
      ? (openAccessCount /
          allPublications.length) *
        100
      : 0;

  const highestCitedPaper =
    topCitedPublications[0] || null;

  return {
    firstPublicationYear,
    latestPublicationYear,
    activeYears,
    byYear,
    publicationTypes,
    topJournals,
    topCollaborators,
    topCitedPublications,
    openAccessCount,
    closedAccessCount,
    openAccessRate,
    highestCitedPaper,
  };
}, [analyticsPublications, data]);

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

 const openAlexVisibleCount =
  curatedPublications.length;

const researcherAddedCount =
  verifiedAdditions.length;

const displayedPublicationCount =
  openAlexVisibleCount +
  researcherAddedCount;

const hiddenPublicationCount =
  excludedWorkIds.size;

  const averageCitations =
  profile.worksCount > 0
    ? profile.citedByCount /
      profile.worksCount
    : 0;

const alternativeNames =
  Array.from(
    new Set(
      profile.alternativeNames
        .map((name) => name.trim())
        .filter(
          (name) =>
            name &&
            normalizeText(name) !==
              normalizeText(profile.name)
        )
    )
  ).slice(0, 6);  

  

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

      <section className="relative overflow-visible rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 shadow-sm">
  <div className="p-7 md:p-10">
    <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 to-violet-600 shadow-xl">
          {claim?.profile_photo_url ? (
            <img
              src={claim.profile_photo_url}
              alt={profile.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white">
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-4xl">
              {profile.name}
            </h1>

            {profile.verified && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700">
                <span aria-hidden="true">
                  ✓
                </span>
                ORCID verified
              </span>
            )}
          </div>

          <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
            Researcher Profile
          </p>

          <p className="mt-3 text-lg font-bold text-slate-700">
            {profile.affiliation}
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            OpenAlex ID: {profile.id}
          </p>

          {alternativeNames.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Also indexed as
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {alternativeNames.map(
                  (name) => (
                    <span
                      key={name}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {name}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3 print:hidden">
  <a
    href={profile.openAlexUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
  >
    OpenAlex
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

  {claimLoading ? (
    <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-400">
      Checking claim...
    </span>
  ) : !user ? (
    <button
      type="button"
      onClick={() => {
        window.location.href =
          `/signin?next=${encodeURIComponent(
            `/researcher/${researcherId}`
          )}`;
      }}
      className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
    >
      Sign in to Claim
    </button>
  ) : !claim ? (
    <button
      type="button"
      onClick={() =>
        setShowClaimDialog(true)
      }
      className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
    >
      Claim this Profile
    </button>
  ) : claim.claim_status === "pending" ? (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
        Claim under review
      </span>

      <button
        type="button"
        onClick={withdrawProfileClaim}
        disabled={claimSubmitting}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Withdraw
      </button>
    </div>
  ) : claim.claim_status === "verified" ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
          ✓ Profile owner
        </span>

        <Link
          href={`/researcher/${researcherId}/manage`}
          className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
        >
          Publication Manager
        </Link>
      </div>

      {user && claim && (
        <ResearcherPhotoUpload
          user={user}
          claimId={claim.id}
          currentPhotoUrl={claim.profile_photo_url}
          onPhotoUpdated={(newUrl) => {
            setClaim({
              ...claim,
              profile_photo_url: newUrl,
            });
          }}
        />
      )}
    </div>
  ) : (
    <button
      type="button"
      onClick={() =>
        setShowClaimDialog(true)
      }
      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
    >
      Claim rejected — Submit again
    </button>
  )}
</div>
        </div>
      </div>

      <div className="relative flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={() =>
            setShowShareMenu(
              (current) => !current
            )
          }
          aria-expanded={showShareMenu}
          className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
        >
          Share
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

        {showShareMenu && (
          <div className="absolute right-0 top-full z-40 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Share researcher profile
            </p>

            <button
              type="button"
              onClick={async () => {
                await copyProfileLink();
                setShowShareMenu(false);
              }}
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Copy profile link
            </button>

            <button
  type="button"
  onClick={() => {
    setShowQrDialog(true);
    setShowShareMenu(false);
  }}
  className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
>
  Show profile QR code
</button>

            <button
              type="button"
              onClick={shareByEmail}
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Share by email
            </button>

            <button
              type="button"
              onClick={shareOnLinkedIn}
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Share on LinkedIn
            </button>

            <button
              type="button"
              onClick={shareOnX}
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Share on X
            </button>

            <button
              type="button"
              onClick={shareOnFacebook}
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Share on Facebook
            </button>

            {typeof navigator !==
              "undefined" &&
              "share" in navigator && (
                <button
                  type="button"
                  onClick={async () => {
                    await shareProfile();
                    setShowShareMenu(false);
                  }}
                  className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                >
                  More sharing options
                </button>
              )}
          </div>
        )}
      </div>
    </div>

    <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {[
        ["h-index", profile.hIndex],
        [
          "Publications",
          profile.worksCount.toLocaleString(),
        ],
        [
          "Total Citations",
          profile.citedByCount.toLocaleString(),
        ],
        [
          "Average Citations",
          averageCitations.toFixed(1),
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

    {profile.topics.length > 0 && (
      <div className="mt-8 border-t border-indigo-100 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
              Expertise
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Research Areas
            </h2>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {profile.topics.length} topics
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {profile.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
</section>

{claimMessage && (
  <div className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-2xl border border-indigo-200 bg-white px-6 py-4 text-sm font-bold text-indigo-700 shadow-2xl print:hidden">
    {claimMessage}
  </div>
)}

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

{curationMessage && (
  <div className="fixed bottom-6 left-1/2 z-[130] -translate-x-1/2 rounded-2xl border border-indigo-200 bg-white px-6 py-4 text-sm font-bold text-indigo-700 shadow-2xl print:hidden">
    {curationMessage}
  </div>
)}

{additionMessage && (
  <div className="fixed bottom-6 left-1/2 z-[135] -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-800 shadow-2xl print:hidden">
    {additionMessage}
  </div>
)}

{showClaimDialog && data && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-5 py-8 print:hidden"
    role="dialog"
    aria-modal="true"
    aria-labelledby="claim-profile-title"
    onClick={() =>
      setShowClaimDialog(false)
    }
  >
    <div
      className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
            Profile Ownership
          </p>

          <h2
            id="claim-profile-title"
            className="mt-2 text-2xl font-black text-slate-950"
          >
            Claim Researcher Profile
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Submit a request to manage this
            researcher&apos;s OpenScholar profile.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowClaimDialog(false)
          }
          aria-label="Close profile claim dialog"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-slate-50"
        >
          ×
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
        <p className="font-black text-slate-950">
          {data.profile.name}
        </p>

        <p className="mt-1 text-sm text-slate-600">
          {data.profile.affiliation}
        </p>

        <p className="mt-2 text-xs font-semibold text-slate-500">
          OpenAlex ID: {data.profile.id}
        </p>

        {data.profile.orcid && (
          <p className="mt-1 text-xs font-semibold text-emerald-700">
            ORCID:{" "}
            {data.profile.orcid.replace(
              "https://orcid.org/",
              ""
            )}
          </p>
        )}
      </div>

      <div className="mt-6">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Verification method
        </label>

        <select
          value={verificationMethod}
          onChange={(event) =>
            setVerificationMethod(
              event.target
                .value as VerificationMethod
            )
          }
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="signed_in_email">
            Signed-in email
          </option>

          <option value="institutional_email">
            Institutional email
          </option>

          {data.profile.orcid && (
            <option value="orcid">
              ORCID associated with profile
            </option>
          )}

          <option value="administrator">
            Manual administrator review
          </option>
        </select>
      </div>

      <div className="mt-5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Supporting note
        </label>

        <textarea
          value={verificationNote}
          onChange={(event) =>
            setVerificationNote(
              event.target.value
            )
          }
          rows={5}
          maxLength={1000}
          placeholder="Explain why this profile belongs to you. You may mention your institutional email, department, ORCID or other identifying academic information."
          className="mt-2 w-full resize-y rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
        />

        <p className="mt-2 text-right text-xs text-slate-400">
          {verificationNote.length}/1000
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        Submitting this request does not immediately
        grant editing access. The claim must be
        verified before publication editing is
        enabled.
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            setShowClaimDialog(false)
          }
          disabled={claimSubmitting}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={submitProfileClaim}
          disabled={claimSubmitting}
          className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {claimSubmitting
            ? "Submitting..."
            : "Submit Claim"}
        </button>
      </div>
    </div>
  </div>
)}

{publicationToExclude && (
  <div
    className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 px-5 py-8 print:hidden"
    role="dialog"
    aria-modal="true"
    aria-labelledby="exclude-publication-title"
    onClick={() =>
      setPublicationToExclude(null)
    }
  >
    <div
      className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <h2
        id="exclude-publication-title"
        className="text-2xl font-black text-slate-950"
      >
        Hide Publication from Profile
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        This does not delete or modify the OpenAlex
        record. It only removes the publication from
        this OpenScholar profile.
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 p-5">
        <p className="font-black leading-6 text-slate-900">
          {stripHtml(
            publicationToExclude.title
          )}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {publicationToExclude.journal}
          {publicationToExclude.year
            ? ` · ${publicationToExclude.year}`
            : ""}
        </p>
      </div>

      <div className="mt-5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Reason
        </label>

        <select
          value={exclusionReason}
          onChange={(event) =>
            setExclusionReason(
              event.target.value as
                | "different_author"
                | "incorrect_assignment"
                | "duplicate"
                | "not_my_publication"
                | "other"
            )
          }
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="not_my_publication">
            This publication is not mine
          </option>

          <option value="different_author">
            Different author with similar name
          </option>

          <option value="incorrect_assignment">
            Incorrect database assignment
          </option>

          <option value="duplicate">
            Duplicate publication
          </option>

          <option value="other">
            Other reason
          </option>
        </select>
      </div>

      <div className="mt-5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Additional note
        </label>

        <textarea
          value={exclusionNote}
          onChange={(event) =>
            setExclusionNote(
              event.target.value
            )
          }
          rows={4}
          maxLength={500}
          placeholder="Optional explanation..."
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            setPublicationToExclude(null)
          }
          disabled={
            exclusionBusyId ===
            publicationToExclude.id
          }
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={excludePublication}
          disabled={
            exclusionBusyId ===
            publicationToExclude.id
          }
          className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
        >
          {exclusionBusyId ===
          publicationToExclude.id
            ? "Hiding..."
            : "Hide Publication"}
        </button>
      </div>
    </div>
  </div>
)}

{showHiddenPublications && (
  <div
    className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 px-5 py-8 print:hidden"
    role="dialog"
    aria-modal="true"
    aria-labelledby="hidden-publications-title"
    onClick={() =>
      setShowHiddenPublications(false)
    }
  >
    <div
      className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
            Profile Curation
          </p>

          <h2
            id="hidden-publications-title"
            className="mt-2 text-2xl font-black text-slate-950"
          >
            Hidden Publications
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Restore any publication that was hidden
            by mistake.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowHiddenPublications(false)
          }
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500"
        >
          ×
        </button>
      </div>

      {ownerExclusions.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
          No publications are hidden.
        </div>
      ) : (
        <div className="mt-6 divide-y divide-slate-100">
          {ownerExclusions.map(
            (exclusion) => (
              <div
                key={exclusion.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-black leading-6 text-slate-900">
                    {exclusion.publication_title ||
                      exclusion.openalex_work_id}
                  </p>

                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {exclusion.reason
                      ?.replaceAll("_", " ") ||
                      "No reason provided"}
                  </p>

                  {exclusion.reason_note && (
                    <p className="mt-2 text-sm text-slate-500">
                      {exclusion.reason_note}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    restorePublication(
                      exclusion
                    )
                  }
                  disabled={
                    exclusionBusyId ===
                    exclusion.openalex_work_id
                  }
                  className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  {exclusionBusyId ===
                  exclusion.openalex_work_id
                    ? "Restoring..."
                    : "Restore"}
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  </div>
)}

{showAddPublicationDialog &&
  user &&
  claim?.claim_status === "verified" && (
    <AddPublicationDialog
      open={showAddPublicationDialog}
      user={user}
      researcherId={researcherId}
      existingOpenAlexDois={openAlexDois}
      existingAddedDois={addedDois}
      onClose={() =>
        setShowAddPublicationDialog(false)
      }
      onSaved={(publication) => {
        setOwnerAddedPublications(
          (current) => [
            publication as AddedPublication,
            ...current,
          ]
        );

        setAdditionMessage(
          "Missing publication submitted successfully."
        );

        window.setTimeout(() => {
          setAdditionMessage("");
        }, 4000);
      }}
    />
  )}

{showQrDialog && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-5 py-8 print:hidden"
    role="dialog"
    aria-modal="true"
    aria-labelledby="profile-qr-title"
    onClick={() =>
      setShowQrDialog(false)
    }
  >
    <div
      className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
            OpenScholar Profile
          </p>

          <h2
            id="profile-qr-title"
            className="mt-2 text-2xl font-black text-slate-950"
          >
            Profile QR Code
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Scan to open the researcher profile.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowQrDialog(false)
          }
          aria-label="Close QR code dialog"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-slate-50"
        >
          ×
        </button>
      </div>

      <div className="mt-7 flex justify-center">
        <div
          id="profile-qr-code"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <QRCodeSVG
            value={getShareableProfileUrl()}
            title={`${profile.name} — OpenScholar Researcher Profile`}
            size={240}
            level="H"
            marginSize={2}
          />
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
        <p className="font-bold text-slate-900">
          {profile.name}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {profile.affiliation}
        </p>

        <p className="mt-3 break-all text-xs font-semibold text-indigo-700">
          {getShareableProfileUrl()}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={copyProfileLink}
          className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
        >
          Copy Profile Link
        </button>

        <button
          type="button"
          onClick={downloadProfileQrCode}
          className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
        >
          Download QR Code
        </button>
      </div>

      <button
        type="button"
        onClick={() =>
          setShowQrDialog(false)
        }
        className="mt-3 w-full rounded-xl px-5 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
      >
        Close
      </button>
    </div>
  </div>
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

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
        Profile Integrity
      </p>

      <h2 className="mt-2 text-2xl font-black text-slate-950">
        Profile Curation
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        This profile combines OpenAlex-indexed
        publications with verified researcher
        additions. Incorrectly attributed records
        may be hidden without modifying the original
        source database.
      </p>
    </div>

    {claim?.claim_status === "verified" && (
      <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
        ✓ Researcher managed
      </span>
    )}
  </div>

  <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        OpenAlex Visible
      </p>

      <p className="mt-3 text-3xl font-black text-slate-950">
        {openAlexVisibleCount.toLocaleString()}
      </p>
    </div>

    <div className="rounded-2xl bg-indigo-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
        Curated Additions
      </p>

      <p className="mt-3 text-3xl font-black text-indigo-950">
        {researcherAddedCount.toLocaleString()}
      </p>
    </div>

    <div className="rounded-2xl bg-amber-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
        Hidden Records
      </p>

      <p className="mt-3 text-3xl font-black text-amber-950">
        {excludedWorkIds.size.toLocaleString()}
      </p>
    </div>

    <div className="rounded-2xl bg-emerald-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
        Public Profile Total
      </p>

      <p className="mt-3 text-3xl font-black text-emerald-950">
        {displayedPublicationCount.toLocaleString()}
      </p>
    </div>
  </div>

  <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-5 py-4 text-xs leading-5 text-slate-600">
    Citation metrics such as total citations,
    h-index and i10-index remain sourced from
    OpenAlex. Researcher-added records are included
    in the visible publication list, profile
    analytics and exports, but do not automatically
    alter OpenAlex citation metrics.
  </div>
</section>

      <section
  id="research-analytics"
  className="mt-8"
>
  <div className="rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-7 text-white shadow-xl md:p-9">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-300">
          Research Intelligence
        </p>

        <h2 className="mt-3 text-3xl font-black">
          Research Analytics Dashboard
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Analytics are calculated from the complete
          OpenAlex publication list currently loaded
          for this researcher.
        </p>
      </div>

      <a
        href="#research-output"
        className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/20 print:hidden"
      >
        Browse Publications
      </a>
    </div>

    <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[
        [
          "Career Span",
          analytics.activeYears
            ? `${analytics.activeYears} years`
            : "Not available",
        ],
        [
          "Open Access",
          `${analytics.openAccessRate.toFixed(
            1
          )}%`,
        ],
        [
          "Top Paper",
          analytics.highestCitedPaper
            ? `${analytics.highestCitedPaper.citations.toLocaleString()} citations`
            : "Not available",
        ],
        [
          "Publication Types",
          analytics.publicationTypes.length.toLocaleString(),
        ],
      ].map(([label, value]) => (
        <div
          key={label}
          className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-300">
            {label}
          </p>

          <p className="mt-3 text-2xl font-black text-white">
            {value}
          </p>
        </div>
      ))}
    </div>

    {analytics.firstPublicationYear &&
      analytics.latestPublicationYear && (
        <p className="mt-5 text-sm font-semibold text-slate-300">
          Publication record spans{" "}
          {analytics.firstPublicationYear}–
          {analytics.latestPublicationYear}.
        </p>
      )}
  </div>

  <div className="mt-6 grid gap-6 xl:grid-cols-2">
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
          Timeline
        </p>

        <h3 className="mt-2 text-2xl font-black text-slate-950">
          Publications by Year
        </h3>
      </div>

      {analytics.byYear.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Publication-year information is not
          available.
        </p>
      ) : (
        <div className="mt-6 max-h-[420px] space-y-4 overflow-y-auto pr-2">
          {analytics.byYear
            .slice()
            .reverse()
            .map((item) => (
              <AnalyticsBar
                key={item.year}
                label={String(item.year)}
                value={item.publications}
                maximum={Math.max(
                  ...analytics.byYear.map(
                    (year) =>
                      year.publications
                  )
                )}
              />
            ))}
        </div>
      )}
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
          Citation Distribution
        </p>

        <h3 className="mt-2 text-2xl font-black text-slate-950">
          Citations by Publication Year
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          These values group each publication&apos;s
          current citation count by its publication
          year. They are not citations received
          during that year.
        </p>
      </div>

      {analytics.byYear.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Citation-year information is not
          available.
        </p>
      ) : (
        <div className="mt-6 max-h-[420px] space-y-4 overflow-y-auto pr-2">
          {analytics.byYear
            .slice()
            .reverse()
            .map((item) => (
              <AnalyticsBar
                key={item.year}
                label={String(item.year)}
                value={item.citations}
                maximum={Math.max(
                  ...analytics.byYear.map(
                    (year) =>
                      year.citations
                  ),
                  1
                )}
              />
            ))}
        </div>
      )}
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
        Output Composition
      </p>

      <h3 className="mt-2 text-2xl font-black text-slate-950">
        Publication Types
      </h3>

      <div className="mt-6 space-y-4">
        {analytics.publicationTypes.map(
          (item) => (
            <AnalyticsBar
              key={item.label}
              label={item.label}
              value={item.count}
              maximum={Math.max(
                ...analytics.publicationTypes.map(
                  (type) => type.count
                ),
                1
              )}
              detail={`(${(
                (item.count /
                  Math.max(
                    publications.length,
                    1
                  )) *
                100
              ).toFixed(1)}%)`}
            />
          )
        )}
      </div>
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
        Accessibility
      </p>

      <h3 className="mt-2 text-2xl font-black text-slate-950">
        Open Access Coverage
      </h3>

      <div className="mt-7 grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-emerald-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Open Access
          </p>

          <p className="mt-3 text-3xl font-black text-emerald-900">
            {analytics.openAccessCount}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-100 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Other Access
          </p>

          <p className="mt-3 text-3xl font-black text-slate-900">
            {analytics.closedAccessCount}
          </p>
        </div>
      </div>

      <div className="mt-6 h-5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{
            width: `${analytics.openAccessRate}%`,
          }}
        />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-600">
        {analytics.openAccessRate.toFixed(
          1
        )}
        % of loaded publications are identified as
        open access.
      </p>
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
        Publication Sources
      </p>

      <h3 className="mt-2 text-2xl font-black text-slate-950">
        Top Journals and Sources
      </h3>

      {analytics.topJournals.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Journal information is not available.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {analytics.topJournals.map(
            (journal) => (
              <AnalyticsBar
                key={journal.label}
                label={journal.label}
                value={journal.count}
                maximum={Math.max(
                  ...analytics.topJournals.map(
                    (item) => item.count
                  ),
                  1
                )}
              />
            )
          )}
        </div>
      )}
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
        Collaboration
      </p>

      <h3 className="mt-2 text-2xl font-black text-slate-950">
        Top Collaborators
      </h3>

      {analytics.topCollaborators.length ===
      0 ? (
        <p className="mt-6 text-sm text-slate-500">
          Collaborator information is not
          available.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {analytics.topCollaborators.map(
            (collaborator) => (
              <AnalyticsBar
                key={collaborator.name}
                label={collaborator.name}
                value={
                  collaborator.publications
                }
                maximum={Math.max(
                  ...analytics.topCollaborators.map(
                    (item) =>
                      item.publications
                  ),
                  1
                )}
                detail="papers"
              />
            )
          )}
        </div>
      )}
    </div>
  </div>

  <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
      Research Highlights
    </p>

    <h3 className="mt-2 text-2xl font-black text-slate-950">
      Top 10 Most-Cited Publications
    </h3>

    <div className="mt-6 divide-y divide-slate-100">
      {analytics.topCitedPublications.map(
        (publication, index) => (
          <div
            key={publication.id}
            className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 font-black text-amber-700">
              {index + 1}
            </div>

            <div className="min-w-0 flex-1">
              <a
  href={publication.sourceUrl}
  target="_blank"
  rel="noopener noreferrer"
  className="font-black leading-6 text-slate-900 transition hover:text-indigo-700"
>
  {stripHtml(publication.title)}
</a>

              <p className="mt-2 text-sm text-slate-500">
                {publication.journal}
                {publication.year
                  ? ` · ${publication.year}`
                  : ""}
              </p>
            </div>

            <div className="shrink-0 rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
              {publication.citations.toLocaleString()}{" "}
              citations
            </div>
          </div>
        )
      )}
    </div>
  </div>

  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
    <strong>Analytics note:</strong>{" "}
    Publication and citation figures are derived
    from the OpenAlex records loaded by OpenScholar.
    Citation totals grouped by publication year do
    not represent annual citation-receipt history.
  </div>
</section>

      <section
  id="research-output"
  className="mt-8"
>
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
  disabled={exportEntitlementsLoading}
  className={`rounded-xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
    canBulkExport
      ? "bg-indigo-700 text-white hover:bg-indigo-800"
      : "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
  }`}
>
  {exportEntitlementsLoading
    ? "Checking..."
    : canBulkExport
      ? `Export All (${displayedPublicationCount})`
      : "🔒 Export All"}
</button>

<button
  type="button"
  onClick={() =>
    exportPublications("current")
  }
  disabled={exportEntitlementsLoading}
  className={`rounded-xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
    canBulkExport
      ? "border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
      : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
  }`}
>
  {exportEntitlementsLoading
    ? "Checking..."
    : canBulkExport
      ? `Export Current (${visiblePublications.length})`
      : "🔒 Export Current"}
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

          <div className="flex flex-wrap items-center gap-3">

  {claim?.claim_status === "verified" && (
  <>
    <button
  type="button"
  onClick={() =>
    setShowAddPublicationDialog(true)
  }
  className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800 print:hidden"
>
  + Add Publication
</button>

    <button
      type="button"
      onClick={() =>
        setShowHiddenPublications(true)
      }
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100 print:hidden"
    >
      Hidden Publications (
      {ownerExclusions.length})
    </button>
  </>
)}

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
  canCurate={
    claim?.claim_status === "verified"
  }
  curationBusy={
    exclusionBusyId === publication.id
  }
  onExclude={(selectedPublication) =>
    setPublicationToExclude(
      selectedPublication
    )
  }
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