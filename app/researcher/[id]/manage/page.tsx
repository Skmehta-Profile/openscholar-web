"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  getMyEntitlements,
  type OpenScholarEntitlements,
} from "@/lib/entitlements";
import AddPublicationDialog, {
  type AddedPublication as SharedAddedPublication,
} from "@/app/components/AddPublicationDialog";

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

function verificationSourceLabel(
  value: string | null | undefined
) {
  if (!value) {
    return "Manual";
  }

  switch (value.toLowerCase()) {
    case "crossref":
      return "Crossref";

    case "openalex":
      return "OpenAlex";

    case "doi":
      return "DOI";

    case "orcid":
      return "ORCID";

    case "administrator":
      return "Administrator";

    case "manual":
      return "Manual";

    default:
      return publicationTypeLabel(value);
  }
}

export default function PublicationManagerPage() {
  const params = useParams<{ id: string }>();

  const researcherId =
    params.id?.toUpperCase() || "";

  const [user, setUser] =
    useState<User | null>(null);

  const [entitlements, setEntitlements] =
    useState<OpenScholarEntitlements | null>(null);

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

  const [busyRecordId, setBusyRecordId] =
  useState<string | null>(null);

const [
  publicationToHide,
  setPublicationToHide,
] = useState<ManagerPublication | null>(
  null
);

const [
  curatedPublicationToRemove,
  setCuratedPublicationToRemove,
] = useState<ManagerPublication | null>(
  null
);

const [
  curatedPublicationToEdit,
  setCuratedPublicationToEdit,
] = useState<ManagerPublication | null>(
  null
);

const [
  showAddPublicationDialog,
  setShowAddPublicationDialog,
] = useState(false);

const [editTitle, setEditTitle] =
  useState("");

const [editAuthors, setEditAuthors] =
  useState("");

const [editJournal, setEditJournal] =
  useState("");

const [editYear, setEditYear] =
  useState("");

const [editPublicationDate, setEditPublicationDate] =
  useState("");

const [editType, setEditType] =
  useState("article");

const [editDoi, setEditDoi] =
  useState("");

const [editSourceUrl, setEditSourceUrl] =
  useState("");

const [editFullTextUrl, setEditFullTextUrl] =
  useState("");

const [editOpenAccess, setEditOpenAccess] =
  useState(false);

const [editNotes, setEditNotes] =
  useState("");

const [editSubmitting, setEditSubmitting] =
  useState(false);

const [hideReason, setHideReason] =
  useState<
    | "different_author"
    | "incorrect_assignment"
    | "duplicate"
    | "not_my_publication"
    | "other"
  >("not_my_publication");

const [hideReasonNote, setHideReasonNote] =
  useState("");

const [managerMessage, setManagerMessage] =
  useState("");

const [managerError, setManagerError] =
  useState("");  

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
        console.log("Current user:", currentUser.id);

        const currentEntitlements =
          await getMyEntitlements();

        if (!mounted) {
          return;
        }

        setUser(currentUser);
        setEntitlements(currentEntitlements);

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

  const openAlexDois = useMemo(
  () =>
    openAlexPublications
      .map((publication) =>
        normalizeDoi(publication.doi)
      )
      .filter(Boolean),
  [openAlexPublications]
);

const addedDois = useMemo(
  () =>
    additions
      .map((publication) =>
        normalizeDoi(publication.doi)
      )
      .filter(Boolean),
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

  const pendingAdditionCount = useMemo(
  () =>
    additions.filter(
      (publication) =>
        publication.verification_status ===
        "pending"
    ).length,
  [additions]
);

const verifiedAdditionCount = useMemo(
  () =>
    additions.filter(
      (publication) =>
        publication.verification_status ===
        "verified"
    ).length,
  [additions]
);

const rejectedAdditionCount = useMemo(
  () =>
    additions.filter(
      (publication) =>
        publication.verification_status ===
        "rejected"
    ).length,
  [additions]
);

const reviewedAdditionCount =
  verifiedAdditionCount +
  rejectedAdditionCount;

const verificationProgress =
  additions.length > 0
    ? Math.round(
        (reviewedAdditionCount /
          additions.length) *
          100
      )
    : 0;

  function showManagerMessage(
  message: string
) {
  setManagerMessage(message);
  setManagerError("");

  window.setTimeout(() => {
    setManagerMessage("");
  }, 3500);
}

function showManagerError(
  message: string
) {
  setManagerError(message);
  setManagerMessage("");

  window.setTimeout(() => {
    setManagerError("");
  }, 4500);
}

function openCuratedEditDialog(
  publication: ManagerPublication
) {
  if (!canManagePublications) {
    showManagerError(
      "Publication curation is available with the OpenScholar-Web Scholar plan."
    );

    return;
  }

  if (
    publication.managerSource !== "crossref" ||
    !publication.additionId
  ) {
    return;
  }

  const original = additions.find(
    (item) =>
      item.id === publication.additionId
  );

  if (!original) {
    showManagerError(
      "Unable to locate the curated publication record."
    );
    return;
  }

  setCuratedPublicationToEdit(publication);

  setEditTitle(original.title || "");
  setEditAuthors(original.authors || "");
  setEditJournal(original.journal || "");

  setEditYear(
    original.publication_year
      ? String(original.publication_year)
      : ""
  );

  setEditPublicationDate(
    original.publication_date || ""
  );

  setEditType(
    original.publication_type || "article"
  );

  setEditDoi(
    normalizeDoi(original.doi)
  );

  setEditSourceUrl(
    original.source_url || ""
  );

  setEditFullTextUrl(
    original.full_text_url || ""
  );

  setEditOpenAccess(
    Boolean(original.is_open_access)
  );

  setEditNotes(
    original.notes || ""
  );
}

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

  async function hideOpenAlexPublication() {
  if (!canManagePublications) {
    showManagerError(
      "Publication curation is available with the OpenScholar-Web Scholar plan."
    );

    return;
  }

  if (
    !user ||
    !publicationToHide ||
    publicationToHide.managerSource !==
      "openalex"
  ) {
    return;
  }

  setBusyRecordId(publicationToHide.id);

  try {
    const payload = {
      user_id: user.id,
      openalex_author_id: researcherId,
      openalex_work_id:
        publicationToHide.id.toUpperCase(),
      publication_title: stripHtml(
        publicationToHide.title
      ),
      reason: hideReason,
      reason_note:
        hideReasonNote.trim() || null,
    };

    const {
      data: insertedExclusion,
      error: hideError,
    } = await supabase
      .from(
        "researcher_publication_exclusions"
      )
      .insert(payload)
      .select("*")
      .single();

    if (hideError) {
      throw hideError;
    }

    setExclusions((current) => [
      insertedExclusion as PublicationExclusion,
      ...current,
    ]);

    setPublicationToHide(null);
    setHideReason("not_my_publication");
    setHideReasonNote("");

    showManagerMessage(
      "Publication hidden from the public profile."
    );
  } catch (hideError) {
    console.error(
      "Unable to hide publication:",
      hideError
    );

    const message =
      hideError &&
      typeof hideError === "object" &&
      "message" in hideError
        ? String(hideError.message)
        : "Unable to hide this publication.";

    showManagerError(message);
  } finally {
    setBusyRecordId(null);
  }
}

async function restoreHiddenPublication(
  exclusion: PublicationExclusion
) {
  if (!canManagePublications) {
    showManagerError(
      "Publication curation is available with the OpenScholar-Web Scholar plan."
    );

    return;
  }

  const confirmed = window.confirm(
    "Restore this publication to the public profile?"
  );

  if (!confirmed) {
    return;
  }

  setBusyRecordId(exclusion.id);

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

    setExclusions((current) =>
      current.filter(
        (item) =>
          item.id !== exclusion.id
      )
    );

    showManagerMessage(
      "Publication restored to the public profile."
    );
  } catch (restoreError) {
    console.error(
      "Unable to restore publication:",
      restoreError
    );

    showManagerError(
      "Unable to restore this publication."
    );
  } finally {
    setBusyRecordId(null);
  }
}

async function removeCuratedPublication() {
  if (!canManagePublications) {
    showManagerError(
      "Publication curation is available with the OpenScholar-Web Scholar plan."
    );

    return;
  }

  if (
    !curatedPublicationToRemove ||
    !curatedPublicationToRemove.additionId
  ) {
    return;
  }

  setBusyRecordId(
    curatedPublicationToRemove.id
  );

  try {
    const { error: removeError } =
      await supabase
        .from(
          "researcher_publication_additions"
        )
        .delete()
        .eq(
          "id",
          curatedPublicationToRemove.additionId
        );

    if (removeError) {
      throw removeError;
    }

    setAdditions((current) =>
      current.filter(
        (item) =>
          item.id !==
          curatedPublicationToRemove.additionId
      )
    );

    setCuratedPublicationToRemove(null);

    showManagerMessage(
      "Curated publication removed from the profile."
    );
  } catch (removeError) {
    console.error(
      "Unable to remove curated publication:",
      removeError
    );

    const message =
      removeError &&
      typeof removeError === "object" &&
      "message" in removeError
        ? String(removeError.message)
        : "Unable to remove this publication.";

    showManagerError(message);
  } finally {
    setBusyRecordId(null);
  }
}

async function updateCuratedPublication() {
  if (!canManagePublications) {
    showManagerError(
      "Publication curation is available with the OpenScholar-Web Scholar plan."
    );

    return;
  }

  if (
    !curatedPublicationToEdit ||
    !curatedPublicationToEdit.additionId
  ) {
    return;
  }

  const cleanTitle =
    editTitle.trim();

  const cleanAuthors =
    editAuthors.trim();

  if (!cleanTitle) {
    showManagerError(
      "Publication title is required."
    );
    return;
  }

  if (!cleanAuthors) {
    showManagerError(
      "Authors are required."
    );
    return;
  }

  const parsedYear =
    editYear.trim()
      ? Number(editYear)
      : null;

  if (
    parsedYear !== null &&
    (
      !Number.isInteger(parsedYear) ||
      parsedYear < 1000 ||
      parsedYear > 2200
    )
  ) {
    showManagerError(
      "Enter a valid publication year."
    );
    return;
  }

  setEditSubmitting(true);

  try {
    const original = additions.find(
      (item) =>
        item.id ===
        curatedPublicationToEdit.additionId
    );

    if (!original) {
      throw new Error(
        "Original curated publication was not found."
      );
    }

    const cleanDoi =
      normalizeDoi(editDoi);

    const metadataChanged =
      cleanTitle !== original.title ||
      cleanAuthors !== original.authors ||
      editJournal.trim() !==
        (original.journal || "") ||
      parsedYear !==
        original.publication_year ||
      editPublicationDate.trim() !==
        (original.publication_date || "") ||
      editType !==
        (original.publication_type ||
          "article") ||
      cleanDoi !==
        normalizeDoi(original.doi) ||
      editSourceUrl.trim() !==
        (original.source_url || "") ||
      editFullTextUrl.trim() !==
        (original.full_text_url || "") ||
      editOpenAccess !==
        Boolean(original.is_open_access);

    const nextVerificationStatus =
      original.verification_status ===
        "verified" &&
      metadataChanged
        ? "pending"
        : original.verification_status;

    const updatePayload = {
      title: cleanTitle,
      authors: cleanAuthors,

      journal:
        editJournal.trim() || null,

      publication_year:
        parsedYear,

      publication_date:
        editPublicationDate.trim() ||
        null,

      publication_type:
        editType || "article",

      doi:
        cleanDoi || null,

      source_url:
        editSourceUrl.trim() || null,

      full_text_url:
        editFullTextUrl.trim() || null,

      is_open_access:
        editOpenAccess,

      notes:
        editNotes.trim() || null,

      verification_status:
        nextVerificationStatus,

      updated_at:
        new Date().toISOString(),
    };

    const {
      data: updatedRecord,
      error: updateError,
    } = await supabase
      .from(
        "researcher_publication_additions"
      )
      .update(updatePayload)
      .eq(
        "id",
        curatedPublicationToEdit.additionId
      )
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    setAdditions((current) =>
      current.map((item) =>
        item.id === updatedRecord.id
          ? (updatedRecord as AddedPublication)
          : item
      )
    );

    setCuratedPublicationToEdit(null);

    showManagerMessage(
      nextVerificationStatus === "pending" &&
        original.verification_status ===
          "verified"
        ? "Publication updated and returned to pending verification."
        : "Curated publication updated successfully."
    );
  } catch (updateError) {
    console.error(
      "Unable to update curated publication:",
      updateError
    );

    const message =
      updateError &&
      typeof updateError === "object" &&
      "message" in updateError
        ? String(updateError.message)
        : "Unable to update this publication.";

    showManagerError(message);
  } finally {
    setEditSubmitting(false);
  }
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

  const canManagePublications =
    entitlements?.can_manage_publications === true;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
    {managerMessage && (
  <div className="fixed bottom-6 left-1/2 z-[150] -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-800 shadow-2xl">
    {managerMessage}
  </div>
)}

{managerError && (
  <div className="fixed bottom-6 left-1/2 z-[150] -translate-x-1/2 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm font-bold text-rose-800 shadow-2xl">
    {managerError}
  </div>
)}

{!canManagePublications && (
  <div className="mb-6 rounded-3xl border border-indigo-200 bg-indigo-50 px-6 py-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">
          Free Research Profile
        </p>

        <h2 className="mt-2 text-lg font-black text-slate-950">
          Your complete publication record remains visible
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          OpenAlex publications and basic research information remain free.
          Upgrade to Scholar to add missing publications, hide incorrect
          records, edit curated publications and manage your research profile.
        </p>
      </div>

      <span className="shrink-0 rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs font-black text-indigo-700">
        Scholar features locked
      </span>
    </div>
  </div>
)}

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

            <div className="flex flex-wrap gap-3">
  <button
    type="button"
    onClick={() => {
      if (!canManagePublications) {
        showManagerError(
          "Adding publications is available with the OpenScholar-Web Scholar plan."
        );
        return;
      }

      setShowAddPublicationDialog(true);
    }}
    className={`inline-flex w-fit items-center rounded-xl px-5 py-3 text-sm font-bold transition ${
      canManagePublications
        ? "bg-indigo-700 text-white hover:bg-indigo-800"
        : "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
    }`}
  >
    {canManagePublications
      ? "+ Add Publication"
      : "🔒 Add Publication"}
  </button>

  <Link
    href={`/researcher/${researcherId}`}
    className="inline-flex w-fit rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
  >
    View Public Profile
  </Link>
</div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
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
      "Verified",
      verifiedAdditionCount,
    ],
    [
      "Pending Review",
      pendingAdditionCount,
    ],
    [
      "Rejected",
      rejectedAdditionCount,
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
          {additions.length > 0 && (
  <div className="mt-6 rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-sm">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
          Curated Record Verification
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          Verification Progress
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {reviewedAdditionCount} of{" "}
          {additions.length} researcher-added{" "}
          {additions.length === 1
            ? "publication has"
            : "publications have"}{" "}
          completed review.
        </p>
      </div>

      <div className="shrink-0 text-left sm:text-right">
        <p className="text-3xl font-black text-indigo-700">
          {verificationProgress}%
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-400">
          reviewed
        </p>
      </div>
    </div>

    <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-indigo-600 transition-all"
        style={{
          width: `${verificationProgress}%`,
        }}
      />
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-emerald-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          Verified
        </p>

        <p className="mt-2 text-2xl font-black text-emerald-900">
          {verifiedAdditionCount}
        </p>
      </div>

      <div className="rounded-2xl bg-amber-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
          Pending
        </p>

        <p className="mt-2 text-2xl font-black text-amber-900">
          {pendingAdditionCount}
        </p>
      </div>

      <div className="rounded-2xl bg-rose-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
          Rejected
        </p>

        <p className="mt-2 text-2xl font-black text-rose-900">
          {rejectedAdditionCount}
        </p>
      </div>
    </div>
  </div>
)}
{additions.length > 0 && (
  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-6 text-slate-600">
    <strong className="text-slate-800">
      Verification status:
    </strong>{" "}
    Verified records can become part of the
    trusted public profile. Pending records are
    awaiting review. Rejected records remain in
    Publication Manager so they can be corrected
    or removed.
  </div>
)}
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

                  <button
  type="button"
  onClick={() =>
    restoreHiddenPublication(
      exclusion
    )
  }
  disabled={
    busyRecordId === exclusion.id
  }
  className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
>
  {busyRecordId === exclusion.id
    ? "Restoring..."
    : "Restore"}
</button>
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
    className={`rounded-full px-3 py-1 text-xs font-bold ${
      publication.additionStatus ===
      "verified"
        ? "bg-emerald-100 text-emerald-700"
        : publication.additionStatus ===
          "pending"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-700"
    }`}
  >
    {publication.additionStatus ===
    "verified"
      ? "Verified"
      : publication.additionStatus ===
        "pending"
      ? "Pending Review"
      : "Rejected"}
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
                          {publication.managerSource ===
  "crossref" && (
  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
    <span>
      Added via{" "}
      <strong className="text-slate-700">
        {verificationSourceLabel(
          publication.verificationSource
        )}
      </strong>
    </span>

    {publication.addedAt && (
      <span>
        Submitted{" "}
        <strong className="text-slate-700">
          {formatDate(
            publication.addedAt
          )}
        </strong>
      </span>
    )}
  </div>
)}
{publication.managerSource ===
  "crossref" &&
  publication.additionStatus ===
    "pending" && (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
      This researcher-added publication is
      awaiting verification. It is available
      in Publication Manager but is not yet
      included in the verified public
      publication record.
    </div>
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

                          {publication.managerSource ===
"openalex" ? (
  <button
    type="button"
    onClick={() => {
      setHideReason(
        "not_my_publication"
      );
      setHideReasonNote("");
      setPublicationToHide(
        publication
      );
    }}
    disabled={
      busyRecordId === publication.id
    }
    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {busyRecordId === publication.id
      ? "Hiding..."
      : "Hide"}
  </button>
) : (
  <>
    <button
      type="button"
      onClick={() =>
        openCuratedEditDialog(
          publication
        )
      }
      disabled={
        busyRecordId === publication.id
      }
      className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Edit
    </button>

    <button
      type="button"
      onClick={() =>
        setCuratedPublicationToRemove(
          publication
        )
      }
      disabled={
        busyRecordId === publication.id
      }
      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busyRecordId === publication.id
        ? "Removing..."
        : "Remove"}
    </button>
  </>
)}
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
      {publicationToHide && (
  <div
    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-5 py-8"
    role="dialog"
    aria-modal="true"
    aria-labelledby="manager-hide-title"
    onClick={() =>
      setPublicationToHide(null)
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
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">
            Publication Curation
          </p>

          <h2
            id="manager-hide-title"
            className="mt-2 text-2xl font-black text-slate-950"
          >
            Hide Publication
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            This hides the record from the
            OpenScholar public profile without
            modifying OpenAlex.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setPublicationToHide(null)
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500"
        >
          ×
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
        <p className="font-black leading-6 text-slate-950">
          {stripHtml(
            publicationToHide.title
          )}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {publicationToHide.journal}
          {publicationToHide.year
            ? ` · ${publicationToHide.year}`
            : ""}
        </p>
      </div>

      <div className="mt-5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Reason
        </label>

        <select
          value={hideReason}
          onChange={(event) =>
            setHideReason(
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
            Different author with a similar name
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
          value={hideReasonNote}
          onChange={(event) =>
            setHideReasonNote(
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
            setPublicationToHide(null)
          }
          disabled={
            busyRecordId ===
            publicationToHide.id
          }
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={
            hideOpenAlexPublication
          }
          disabled={
            busyRecordId ===
            publicationToHide.id
          }
          className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
        >
          {busyRecordId ===
          publicationToHide.id
            ? "Hiding..."
            : "Hide Publication"}
        </button>
      </div>
    </div>
  </div>
)}

{curatedPublicationToRemove && (
  <div
    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-5 py-8"
    role="dialog"
    aria-modal="true"
    aria-labelledby="manager-remove-title"
    onClick={() =>
      setCuratedPublicationToRemove(
        null
      )
    }
  >
    <div
      className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">
        Curated Publication
      </p>

      <h2
        id="manager-remove-title"
        className="mt-2 text-2xl font-black text-slate-950"
      >
        Remove Curated Record
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        This permanently removes the
        researcher-added record from OpenScholar.
        The Crossref or DOI source record is not
        modified.
      </p>

      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
        <p className="font-black leading-6 text-slate-950">
          {stripHtml(
            curatedPublicationToRemove.title
          )}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {
            curatedPublicationToRemove.journal
          }
          {curatedPublicationToRemove.year
            ? ` · ${curatedPublicationToRemove.year}`
            : ""}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            setCuratedPublicationToRemove(
              null
            )
          }
          disabled={
            busyRecordId ===
            curatedPublicationToRemove.id
          }
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={
            removeCuratedPublication
          }
          disabled={
            busyRecordId ===
            curatedPublicationToRemove.id
          }
          className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
        >
          {busyRecordId ===
          curatedPublicationToRemove.id
            ? "Removing..."
            : "Remove Record"}
        </button>
      </div>
    </div>
  </div>
)}

{curatedPublicationToEdit && (
  <div
    className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-slate-950/55 px-5 py-8"
    role="dialog"
    aria-modal="true"
    aria-labelledby="manager-edit-title"
    onClick={() => {
      if (!editSubmitting) {
        setCuratedPublicationToEdit(
          null
        );
      }
    }}
  >
    <div
      className="my-auto w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
            Curated Publication
          </p>

          <h2
            id="manager-edit-title"
            className="mt-2 text-2xl font-black text-slate-950"
          >
            Edit Publication
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Correct the metadata for this
            researcher-added publication.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setCuratedPublicationToEdit(
              null
            )
          }
          disabled={editSubmitting}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 disabled:opacity-50"
          aria-label="Close edit publication"
        >
          ×
        </button>
      </div>

      <div className="mt-7 grid gap-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Publication Title *
          </label>

          <input
            type="text"
            value={editTitle}
            onChange={(event) =>
              setEditTitle(
                event.target.value
              )
            }
            disabled={editSubmitting}
            placeholder="Publication title"
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Authors *
          </label>

          <textarea
            value={editAuthors}
            onChange={(event) =>
              setEditAuthors(
                event.target.value
              )
            }
            disabled={editSubmitting}
            rows={3}
            placeholder="Author names"
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Journal / Source
            </label>

            <input
              type="text"
              value={editJournal}
              onChange={(event) =>
                setEditJournal(
                  event.target.value
                )
              }
              disabled={editSubmitting}
              placeholder="Journal or source title"
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Publication Type
            </label>

            <select
              value={editType}
              onChange={(event) =>
                setEditType(
                  event.target.value
                )
              }
              disabled={editSubmitting}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
            >
              <option value="article">
                Article
              </option>

              <option value="review">
                Review
              </option>

              <option value="book">
                Book
              </option>

              <option value="book-chapter">
                Book Chapter
              </option>

              <option value="conference-paper">
                Conference Paper
              </option>

              <option value="editorial">
                Editorial
              </option>

              <option value="letter">
                Letter
              </option>

              <option value="preprint">
                Preprint
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Publication Year
            </label>

            <input
              type="number"
              min="1000"
              max="2200"
              value={editYear}
              onChange={(event) =>
                setEditYear(
                  event.target.value
                )
              }
              disabled={editSubmitting}
              placeholder="e.g. 2026"
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Publication Date
            </label>

            <input
              type="date"
              value={editPublicationDate}
              onChange={(event) =>
                setEditPublicationDate(
                  event.target.value
                )
              }
              disabled={editSubmitting}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            DOI
          </label>

          <div className="mt-2 flex overflow-hidden rounded-2xl border border-slate-300 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-100">
            <span className="flex items-center bg-slate-50 px-4 text-sm font-semibold text-slate-500">
              https://doi.org/
            </span>

            <input
              type="text"
              value={editDoi}
              onChange={(event) =>
                setEditDoi(
                  event.target.value
                )
              }
              disabled={editSubmitting}
              placeholder="10.xxxx/xxxxx"
              className="min-w-0 flex-1 border-0 px-4 py-3 text-sm outline-none disabled:bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Source URL
          </label>

          <input
            type="url"
            value={editSourceUrl}
            onChange={(event) =>
              setEditSourceUrl(
                event.target.value
              )
            }
            disabled={editSubmitting}
            placeholder="https://..."
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Full Text URL
          </label>

          <input
            type="url"
            value={editFullTextUrl}
            onChange={(event) =>
              setEditFullTextUrl(
                event.target.value
              )
            }
            disabled={editSubmitting}
            placeholder="https://..."
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <input
            type="checkbox"
            checked={editOpenAccess}
            onChange={(event) =>
              setEditOpenAccess(
                event.target.checked
              )
            }
            disabled={editSubmitting}
            className="mt-1"
          />

          <span>
            <span className="block text-sm font-bold text-emerald-800">
              Open Access
            </span>

            <span className="mt-1 block text-xs leading-5 text-emerald-700">
              Mark this publication as
              openly accessible when a
              legitimate open-access version
              is available.
            </span>
          </span>
        </label>

        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Notes
          </label>

          <textarea
            value={editNotes}
            onChange={(event) =>
              setEditNotes(
                event.target.value
              )
            }
            disabled={editSubmitting}
            rows={4}
            maxLength={1000}
            placeholder="Optional notes about this publication..."
            className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
          />
        </div>
      </div>

      {curatedPublicationToEdit.additionStatus ===
        "verified" && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            Verification notice
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-700">
            If verified publication metadata
            is changed, the record will return
            to pending verification.
          </p>
        </div>
      )}

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            setCuratedPublicationToEdit(
              null
            )
          }
          disabled={editSubmitting}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={
            updateCuratedPublication
          }
          disabled={editSubmitting}
          className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {editSubmitting
            ? "Saving Changes..."
            : "Save Changes"}
        </button>
      </div>
    </div>
  </div>
)}
{showAddPublicationDialog && user && (
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
      setAdditions((current) => [
        publication as SharedAddedPublication as AddedPublication,
        ...current,
      ]);

      setActiveTab("curated");

      showManagerMessage(
        "Publication added and submitted for verification."
      );
    }}
  />
)}
    </main>
  );
}