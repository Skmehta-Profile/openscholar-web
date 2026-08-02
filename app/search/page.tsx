"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SearchResult = {
  id: string;
  title: string;
  type: string;
  year: number | null;
  doi: string | null;
  journal: string;
  biblio: string;
  authors: string;
  authorList: string[];
  institutions: string;
  institutionList: string[];
  authorCount: number;
  institutionCount: number;
  abstract: string;
  keywords: string[];
  citations: number;
  isOpenAccess: boolean;
  openAccessUrl: string | null;
  sourceUrl: string;
};

type SearchHistoryItem = {
  id: string;
  query: string;
  searchMode: string;
  workType: string;
  institution: string;
  sort: string;
  year: string;
  openAccessOnly: boolean;
  searchedAt: string;
};

type RecentlyViewedItem = SearchResult & {
  viewedAt: string;
};

type AuthorInstitution = {
  id: string;
  name: string;
  countryCode: string | null;
  type: string | null;
};

type AuthorResult = {
  id: string;
  openAlexUrl: string;
  name: string;
  orcid: string | null;
  verified: boolean;
  worksCount: number;
  citedByCount: number;
  hIndex: number;
  i10Index: number;
  twoYearMeanCitedness: number;
  affiliation: string;
  institutions: AuthorInstitution[];
  topics: string[];
};

const GENERIC_RECOMMENDATION_TOPICS = new Set([
  "biology",
  "botany",
  "plants",
  "plant",
  "science",
  "research",
  "article",
  "review",
  "ecology",
  "chemistry",
  "medicine",
  "environment",
  "environmental science",
  "organism",
  "species",
  "growth",
  "metabolism",
]);

function normalizeRecommendationTopic(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulRecommendationTopic(value: string) {
  const normalized = normalizeRecommendationTopic(value);
  const lower = normalized.toLowerCase();

  if (!normalized || normalized.length < 4) {
    return false;
  }

  if (GENERIC_RECOMMENDATION_TOPICS.has(lower)) {
    return false;
  }

  return true;
}

function findRecommendationReasons(
  paper: SearchResult,
  preferredTopics: string[]
) {
  const searchableText = [
    paper.title,
    paper.abstract,
    ...paper.keywords,
  ]
    .join(" ")
    .toLowerCase();

  return preferredTopics
    .filter((topic) =>
      searchableText.includes(topic.toLowerCase())
    )
    .slice(0, 3);
}



export default function SearchPage() {
  const [query, setQuery] = useState("");
const [searchMode, setSearchMode] = useState("keyword");
const [workType, setWorkType] = useState("any");
const [institution, setInstitution] = useState("");
const [sort, setSort] = useState("relevance");
const [year, setYear] = useState("any");
const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<SearchResult | null>(null);
  const [previewPaper, setPreviewPaper] = useState<SearchResult | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
 const [searchMessage, setSearchMessage] = useState("");
 const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(0);
const [totalResults, setTotalResults] = useState(0);
const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
const [showSearchHistory, setShowSearchHistory] = useState(false);
const [recentlyViewed, setRecentlyViewed] =
  useState<RecentlyViewedItem[]>([]);

const [showRecentlyViewed, setShowRecentlyViewed] =
  useState(false);

  const [recommendations, setRecommendations] =
  useState<SearchResult[]>([]);

const [showRecommendations, setShowRecommendations] =
  useState(false);

const [recommendationsLoading, setRecommendationsLoading] =
  useState(false);

const [recommendationMessage, setRecommendationMessage] =
  useState("");

const [recommendationBasis, setRecommendationBasis] =
  useState<string[]>([]);

const [recommendationReasons, setRecommendationReasons] =
  useState<Record<string, string[]>>({});
  
const [authorResults, setAuthorResults] =
  useState<AuthorResult[]>([]);

const [authorMessage, setAuthorMessage] =
  useState("");  

const [
  showAllAuthorResults,
  setShowAllAuthorResults,
] = useState(false);

useEffect(() => {
  try {
    const savedHistory = localStorage.getItem(
      "openscholar_search_history"
    );

    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);

      if (Array.isArray(parsedHistory)) {
        setSearchHistory(parsedHistory);
      }
    }

    const savedRecentlyViewed = localStorage.getItem(
      "openscholar_recently_viewed"
    );

    if (savedRecentlyViewed) {
      const parsedRecentlyViewed = JSON.parse(
        savedRecentlyViewed
      );

      if (Array.isArray(parsedRecentlyViewed)) {
        setRecentlyViewed(parsedRecentlyViewed);
      }
    }
  } catch (error) {
    console.error(
      "Failed to load local OpenScholar data:",
      error
    );
  }
}, []);

function saveSearchToHistory() {
  const cleanQuery = query.trim();

  if (cleanQuery.length < 2) {
    return;
  }

  const newItem: SearchHistoryItem = {
    id: crypto.randomUUID(),
    query: cleanQuery,
    searchMode,
    workType,
    institution:
      searchMode === "author"
        ? institution.trim()
        : "",
    sort,
    year,
    openAccessOnly,
    searchedAt: new Date().toISOString(),
  };

  setSearchHistory((currentHistory) => {
    const historyWithoutDuplicate = currentHistory.filter(
      (item) =>
        !(
          item.query.toLowerCase() === cleanQuery.toLowerCase() &&
          item.searchMode === searchMode &&
          item.workType === workType &&
          item.institution.toLowerCase() ===
            newItem.institution.toLowerCase() &&
          item.sort === sort &&
          item.year === year &&
          item.openAccessOnly === openAccessOnly
        )
    );

    const updatedHistory = [
      newItem,
      ...historyWithoutDuplicate,
    ].slice(0, 10);

    localStorage.setItem(
      "openscholar_search_history",
      JSON.stringify(updatedHistory)
    );

    return updatedHistory;
  });
}

function clearSearchHistory() {
  localStorage.removeItem("openscholar_search_history");
  setSearchHistory([]);
  setShowSearchHistory(false);
}

function removeSearchHistoryItem(id: string) {
  setSearchHistory((currentHistory) => {
    const updatedHistory = currentHistory.filter(
      (item) => item.id !== id
    );

    localStorage.setItem(
      "openscholar_search_history",
      JSON.stringify(updatedHistory)
    );

    return updatedHistory;
  });
}

function addToRecentlyViewed(paper: SearchResult) {
  const viewedPaper: RecentlyViewedItem = {
    ...paper,
    viewedAt: new Date().toISOString(),
  };

  setRecentlyViewed((currentItems) => {
    const withoutDuplicate = currentItems.filter(
      (item) => item.id !== paper.id
    );

    const updatedItems = [
      viewedPaper,
      ...withoutDuplicate,
    ].slice(0, 10);

    localStorage.setItem(
      "openscholar_recently_viewed",
      JSON.stringify(updatedItems)
    );

    return updatedItems;
  });
}

function openPaperDetails(paper: SearchResult) {
  addToRecentlyViewed(paper);
  setSelectedPaper(paper);
}

function clearRecentlyViewed() {
  localStorage.removeItem(
    "openscholar_recently_viewed"
  );

  setRecentlyViewed([]);
  setShowRecentlyViewed(false);
}

function removeRecentlyViewedItem(id: string) {
  setRecentlyViewed((currentItems) => {
    const updatedItems = currentItems.filter(
      (item) => item.id !== id
    );

    localStorage.setItem(
      "openscholar_recently_viewed",
      JSON.stringify(updatedItems)
    );

    return updatedItems;
  });
}

function reopenRecentlyViewed(
  paper: RecentlyViewedItem
) {
  addToRecentlyViewed(paper);
  setSelectedPaper(paper);
  setShowRecentlyViewed(false);
}

async function loadSmartRecommendations() {
  setShowSearchHistory(false);
  setShowRecentlyViewed(false);
  setShowRecommendations(true);
  setRecommendationMessage("");

  if (recentlyViewed.length === 0) {
    setRecommendations([]);
    setRecommendationReasons({});
    setRecommendationBasis([]);
    setRecommendationMessage(
      "View a few papers first. OpenScholar will use their topics to recommend related research."
    );
    return;
  }

  setRecommendationsLoading(true);

  try {
    const sourcePapers = recentlyViewed.slice(0, 5);

    const topicFrequency = new Map<string, number>();

sourcePapers.forEach((paper) => {
  const paperTopics = new Set<string>();

  paper.keywords
    .filter(isUsefulRecommendationTopic)
    .slice(0, 8)
    .forEach((topic) => {
      paperTopics.add(
        normalizeRecommendationTopic(topic)
      );
    });

  const importantTitlePhrases = paper.title
    .split(/[:;,–—]/)
    .map(normalizeRecommendationTopic)
    .filter(
      (phrase) =>
        isUsefulRecommendationTopic(phrase) &&
        phrase.split(" ").length >= 2 &&
        phrase.length <= 70
    )
    .slice(0, 2);

  importantTitlePhrases.forEach((phrase) =>
    paperTopics.add(phrase)
  );

  paperTopics.forEach((topic) => {
  const key = topic.toLowerCase();

  topicFrequency.set(
    key,
    (topicFrequency.get(key) || 0) + 1
  );
});
});

const repeatedTopics = Array.from(
  topicFrequency.entries()
)
  .filter(([, frequency]) => frequency > 1)
  .sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }

    return b[0].length - a[0].length;
  })
  .map(([topic]) => topic);

const specificSingleTopics = Array.from(
  topicFrequency.entries()
)
  .filter(([, frequency]) => frequency === 1)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([topic]) => topic);

const uniqueTopics = [
  ...repeatedTopics,
  ...specificSingleTopics,
].slice(0, 6);

    if (uniqueTopics.length === 0) {
      setRecommendations([]);
      setRecommendationBasis(
        sourcePapers.slice(0, 3).map((paper) => paper.title)
      );
      setRecommendationMessage(
        "OpenScholar could not identify enough research topics from your recently viewed papers."
      );
      return;
    }

    const recommendationQuery = uniqueTopics
  .map((topic) =>
    topic.includes(" ") ? `"${topic}"` : topic
  )
  .join(" ");

    const params = new URLSearchParams({
      q: recommendationQuery,
      mode: "keyword",
      type: "any",
      institution: "",
      sort: "relevance",
      year: "any",
      oa: "false",
      page: "1",
    });

    const response = await fetch(
      `/api/search?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      setRecommendations([]);
      setRecommendationReasons({});
      setRecommendationMessage(
        data.error ||
          "Unable to load recommendations. Please try again."
      );
      return;
    }

    const viewedIds = new Set(
      recentlyViewed.map((paper) => paper.id)
    );

    const dismissedIds = new Set<string>(
      JSON.parse(
        localStorage.getItem(
          "openscholar_dismissed_recommendations"
        ) || "[]"
      )
    );

    const filteredRecommendations = (
  data.results || []
)
  .filter(
    (paper: SearchResult) =>
      !viewedIds.has(paper.id) &&
      !dismissedIds.has(paper.id)
  )
  .map((paper: SearchResult) => ({
    paper,
    reasons: findRecommendationReasons(
      paper,
      uniqueTopics
    ),
  }))
  .sort(
  (
    a: { paper: SearchResult; reasons: string[] },
    b: { paper: SearchResult; reasons: string[] }
  ) => {
    if (b.reasons.length !== a.reasons.length) {
      return b.reasons.length - a.reasons.length;
    }

    return b.paper.citations - a.paper.citations;
  }
)
  .slice(0, 6);

const recommendedPapers =
  filteredRecommendations.map(
    (
      item: {
        paper: SearchResult;
        reasons: string[];
      }
    ) => item.paper
  );

const reasonsByPaper = Object.fromEntries(
  filteredRecommendations.map(
    (
      item: {
        paper: SearchResult;
        reasons: string[];
      }
    ) => [
      item.paper.id,
      item.reasons,
    ]
  )
);

setRecommendations(recommendedPapers);
setRecommendationReasons(reasonsByPaper);

    setRecommendationBasis(
      sourcePapers.slice(0, 3).map((paper) => paper.title)
    );

    if (recommendedPapers.length === 0) {
      setRecommendationMessage(
        "No new recommendations were found. View more papers or refresh recommendations later."
      );
    }
  } catch (error) {
    console.error(
      "Recommendation request failed:",
      error
    );

    setRecommendations([]);
    setRecommendationReasons({});
    setRecommendationMessage(
      "Unable to load recommendations. Please check your connection and try again."
    );
  } finally {
    setRecommendationsLoading(false);
  }
}

function dismissRecommendation(paperId: string) {
  try {
    const storedIds: string[] = JSON.parse(
      localStorage.getItem(
        "openscholar_dismissed_recommendations"
      ) || "[]"
    );

    const updatedIds = Array.from(
      new Set([paperId, ...storedIds])
    ).slice(0, 100);

    localStorage.setItem(
      "openscholar_dismissed_recommendations",
      JSON.stringify(updatedIds)
    );

    setRecommendations((current) =>
      current.filter((paper) => paper.id !== paperId)
    );
  } catch (error) {
    console.error(
      "Unable to dismiss recommendation:",
      error
    );
  }
}

function clearDismissedRecommendations() {
  localStorage.removeItem(
    "openscholar_dismissed_recommendations"
  );

  loadSmartRecommendations();
}

function runHistorySearch(item: SearchHistoryItem) {
  setQuery(item.query);
  setSearchMode(item.searchMode);
  setWorkType(item.workType);
  setInstitution(item.institution);
  setSort(item.sort);
  setYear(item.year);
  setOpenAccessOnly(item.openAccessOnly);
  setShowSearchHistory(false);

  searchPapers(1, item);
}

async function searchResearchers(
  authorQuery: string,
  authorInstitution: string
) {
  setAuthorMessage("");
  setShowAllAuthorResults(false);

  if (authorQuery.trim().length < 2) {
    setAuthorResults([]);
    return;
  }

  try {
    const params = new URLSearchParams({
      q: authorQuery.trim(),
    });

    if (authorInstitution.trim()) {
      params.set(
        "institution",
        authorInstitution.trim()
      );
    }

    const response = await fetch(
      `/api/authors?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Researcher search failed:",
        data
      );

      setAuthorResults([]);
      setAuthorMessage(
        data.error ||
          "Unable to search researchers."
      );

      return;
    }

    setAuthorResults(data.authors || []);
    setAuthorMessage(data.message || "");
  } catch (error) {
    console.error(
      "Researcher request failed:",
      error
    );

    setAuthorResults([]);
    setAuthorMessage(
      "Unable to search researchers. Publication results are still shown below."
    );
  }
}

 async function searchPapers(
  page = 1,
  historyItem?: SearchHistoryItem
) {
  const activeQuery =
    historyItem?.query ?? query.trim();

  const activeSearchMode =
    historyItem?.searchMode ?? searchMode;

  const activeWorkType =
    historyItem?.workType ?? workType;

  const activeInstitution =
    historyItem?.institution ?? institution.trim();

  const activeSort =
    historyItem?.sort ?? sort;

  const activeYear =
    historyItem?.year ?? year;

  const activeOpenAccessOnly =
    historyItem?.openAccessOnly ?? openAccessOnly;

  if (activeQuery.length < 2) {
    setSearchMessage(
      "Please enter at least two characters."
    );
    return;
  }

  setLoading(true);
setSearchMessage("");
setResults([]);

if (activeSearchMode !== "author") {
  setAuthorResults([]);
  setAuthorMessage("");
}

if (page === 1 && activeSearchMode === "author") {
  setAuthorResults([]);
  setAuthorMessage("");

  await searchResearchers(
    activeQuery,
    activeInstitution
  );
}

if (page === 1 && !historyItem) {
  saveSearchToHistory();
}

  try {
    const params = new URLSearchParams({
  q: activeQuery,
  mode: activeSearchMode,
  type: activeWorkType,
  institution:
    activeSearchMode === "author"
      ? activeInstitution
      : "",
  sort: activeSort,
  year: activeYear,
  oa: String(activeOpenAccessOnly),
  page: String(page),
});

    const response = await fetch(
      `/api/search?${params.toString()}`
    );

    const data = await response.json();

    if (!response.ok) {
      setSearchMessage(
        data.error ||
          "Search failed. Please try again."
      );
      return;
    }

    setResults(data.results || []);
setSearchMessage(data.message || "");

setCurrentPage(data.pagination?.page || page);
setTotalPages(data.pagination?.totalPages || 0);
setTotalResults(data.pagination?.totalResults || 0);
  } catch (error) {
    console.error("Search request failed:", error);

    setSearchMessage(
      "Search failed. Please check your connection and try again."
    );
  } finally {
    setLoading(false);
  }
}

  async function searchRelatedPapers(paper: SearchResult) {
    const relatedQuery =
      paper.keywords.length > 0
        ? paper.keywords.slice(0, 3).join(" ")
        : paper.title.split(" ").slice(0, 6).join(" ");

    setQuery(relatedQuery);
    setSearchMode("keyword");
setWorkType("any");
setInstitution("");
setSearchMessage("");
    setSelectedPaper(null);
    setLoading(true);

    const params = new URLSearchParams({
  q: relatedQuery,
  mode: "keyword",
  type: "any",
  institution: "",
  sort: "relevance",
  year: "any",
  oa: "false",
});

    const response = await fetch(`/api/search?${params.toString()}`);
    const data = await response.json();

    setResults(data.results || []);
    setLoading(false);
  }

  async function saveArticle(paper: SearchResult) {
  setSaveMessage("");

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    window.location.href = "/signin";
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, library_limit")
    .eq("id", userData.user.id)
    .single();

  const plan = profile?.plan || "free";
  const libraryLimit = profile?.library_limit ?? 50;

  if (plan === "free") {
    const { count } = await supabase
      .from("saved_articles")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userData.user.id);

    if ((count ?? 0) >= libraryLimit) {
      setSaveMessage(
        `Free plan limit reached. You can save up to ${libraryLimit} papers. Upgrade to OpenScholar Premium for unlimited library.`
      );
      return;
    }
  }

  const { error } = await supabase.from("saved_articles").insert({
    user_id: userData.user.id,
    article_id: paper.id,
    title: paper.title,
    authors: paper.authors,
    journal: paper.journal,
    biblio: paper.biblio,
    citations: paper.citations,
    year: paper.year,
    doi: paper.doi,
    is_open_access: paper.isOpenAccess,
    pdf_url: paper.openAccessUrl,
    source_url: paper.sourceUrl,
  });

  if (error) {
    if (
      error.message.includes("duplicate") ||
      error.message.includes("saved_articles_unique")
    ) {
      setSaveMessage("Article already exists in your library.");
      return;
    }

    setSaveMessage("Failed to save article. Please try again.");
    return;
  }

  setSaveMessage("Article saved to your library.");
}

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <h1 className="text-4xl font-black text-slate-950">
      Search Literature
    </h1>

    <p className="mt-3 text-slate-500">
      Search papers, authors, journals and DOI.
    </p>
  </div>

  <div className="flex flex-wrap gap-3">
  <button
    type="button"
    onClick={() => {
  setShowSearchHistory((current) => !current);
  setShowRecentlyViewed(false);
  setShowRecommendations(false);
}}
    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
  >
    Search History

    {searchHistory.length > 0 && (
      <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
        {searchHistory.length}
      </span>
    )}
  </button>

  <button
    type="button"
   onClick={() => {
  setShowRecentlyViewed(
    (current) => !current
  );
  setShowSearchHistory(false);
  setShowRecommendations(false);
}}
    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
  >
    Recently Viewed

    {recentlyViewed.length > 0 && (
      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
        {recentlyViewed.length}
      </span>
    )}
  </button>

  <button
  type="button"
  onClick={loadSmartRecommendations}
  disabled={recommendationsLoading}
  className="inline-flex items-center justify-center rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
>
  {recommendationsLoading
    ? "Finding Papers..."
    : "Recommended"}

  {recommendations.length > 0 && (
    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
      {recommendations.length}
    </span>
  )}
</button>
</div>
</div>

      {showSearchHistory && (
  <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-black text-slate-950">
          Recent Searches
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Your latest 10 searches are stored on this device.
        </p>
      </div>

      {searchHistory.length > 0 && (
        <button
          type="button"
          onClick={clearSearchHistory}
          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
        >
          Clear History
        </button>
      )}
    </div>

    {searchHistory.length === 0 ? (
      <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-6 text-sm text-slate-500">
        No recent searches yet.
      </div>
    ) : (
      <div className="mt-5 space-y-3">
        {searchHistory.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              onClick={() => runHistorySearch(item)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-bold text-slate-950">
                {item.query}
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">
                  {item.searchMode}
                </span>

                {item.workType !== "any" && (
                  <span className="rounded-full bg-violet-50 px-3 py-1 capitalize text-violet-700">
                    {item.workType.replaceAll("-", " ")}
                  </span>
                )}

                {item.institution && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                    {item.institution}
                  </span>
                )}

                {item.openAccessOnly && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                    Open Access
                  </span>
                )}

                {item.year !== "any" && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                    Since {item.year}
                  </span>
                )}
              </div>
            </button>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => runHistorySearch(item)}
                className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
              >
                Search Again
              </button>

              <button
                type="button"
                onClick={() =>
                  removeSearchHistoryItem(item.id)
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
)}
      
     {showRecentlyViewed && (
  <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-black text-slate-950">
          Recently Viewed Papers
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Your latest 10 viewed papers are stored on
          this device.
        </p>
      </div>

      {recentlyViewed.length > 0 && (
        <button
          type="button"
          onClick={clearRecentlyViewed}
          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
        >
          Clear All
        </button>
      )}
    </div>

    {recentlyViewed.length === 0 ? (
      <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-6 text-sm text-slate-500">
        No recently viewed papers yet.
      </div>
    ) : (
      <div className="mt-5 space-y-3">
        {recentlyViewed.map((paper) => (
          <div
            key={paper.id}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/30 lg:flex-row lg:items-center lg:justify-between"
          >
            <button
              type="button"
              onClick={() =>
                reopenRecentlyViewed(paper)
              }
              className="min-w-0 flex-1 text-left"
            >
              <p className="font-bold leading-6 text-slate-950">
                {paper.title}
              </p>

              <p className="mt-1 truncate text-sm text-slate-500">
                {paper.authors}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold capitalize text-violet-700">
                  {paper.type.replaceAll("-", " ")}
                </span>

                {paper.year && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {paper.year}
                  </span>
                )}

                {paper.isOpenAccess && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Open Access
                  </span>
                )}
              </div>
            </button>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  reopenRecentlyViewed(paper)
                }
                className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
              >
                Details
              </button>

              {paper.openAccessUrl && (
                <a
                  href={paper.openAccessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    addToRecentlyViewed(paper)
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Full Text
                </a>
              )}

              <button
                type="button"
                onClick={() =>
                  removeRecentlyViewedItem(paper.id)
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
)}

{showRecommendations && (
  <section className="mt-8 rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-700">
          Smart Recommendations
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Because you read...
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          OpenScholar uses topics from your recently viewed papers to identify
          related scholarly literature.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={loadSmartRecommendations}
          disabled={recommendationsLoading}
          className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {recommendationsLoading
            ? "Refreshing..."
            : "Refresh"}
        </button>

        <button
          type="button"
          onClick={() =>
            setShowRecommendations(false)
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>

    {recommendationBasis.length > 0 && (
      <div className="mt-5 rounded-2xl border border-indigo-100 bg-white/80 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Based on
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {recommendationBasis.map((title) => (
            <span
              key={title}
              className="max-w-full truncate rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
            >
              {title}
            </span>
          ))}
        </div>
      </div>
    )}

    {recommendationMessage && (
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
        {recommendationMessage}
      </div>
    )}

    {recommendationsLoading ? (
      <div className="mt-6 rounded-2xl bg-white/70 px-5 py-8 text-center text-sm font-semibold text-slate-500">
        Analysing recently viewed research topics...
      </div>
    ) : recommendations.length > 0 ? (
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {recommendations.map((paper) => (
          <article
            key={paper.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
          >
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold capitalize text-violet-700">
                {paper.type.replaceAll("-", " ")}
              </span>

              {paper.year && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {paper.year}
                </span>
              )}

              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {paper.citations} citations
              </span>

              {paper.isOpenAccess && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Open Access
                </span>
              )}
            </div>

            <h3 className="mt-4 text-lg font-black leading-7 text-slate-950">
              {paper.title}
            </h3>

            <p className="mt-2 line-clamp-2 text-sm text-slate-500">
              {paper.authors}
            </p>

            <p className="mt-2 text-sm font-bold text-slate-700">
              {paper.journal}
            </p>

            {recommendationReasons[paper.id]?.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                  Recommended because
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {recommendationReasons[paper.id].map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-indigo-700 shadow-sm"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                Related through overlapping research concepts from your recent reading.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  addToRecentlyViewed(paper);
                  setPreviewPaper(paper);
                }}
                className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
              >
                Preview
              </button>

              {paper.openAccessUrl && (
                <a
                  href={paper.openAccessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    addToRecentlyViewed(paper)
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Full Text
                </a>
              )}

              <button
                type="button"
                onClick={() => saveArticle(paper)}
                className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() =>
                  dismissRecommendation(paper.id)
                }
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
              >
                Not Interested
              </button>
            </div>
          </article>
        ))}
      </div>
    ) : null}

    {!recommendationsLoading &&
      recommendations.length === 0 &&
      recentlyViewed.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={clearDismissedRecommendations}
            className="text-sm font-bold text-indigo-700 hover:underline"
          >
            Reset dismissed recommendations
          </button>
        </div>
      )}
  </section>
)}
     
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
  <select
  value={searchMode}
  onChange={(e) => {
    const nextMode = e.target.value;

    setSearchMode(nextMode);

    setAuthorResults([]);
    setAuthorMessage("");

    // Reset researcher card expansion
    setShowAllAuthorResults(false);

    if (nextMode !== "author") {
      setInstitution("");
    }
  }}
    className="rounded-2xl border border-slate-300 bg-white px-5 py-4 font-semibold outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 lg:w-48"
  >
    <option value="keyword">
      Keyword
    </option>

    <option value="author">
      Author
    </option>

    <option value="title">
      Title
    </option>

    <option value="doi">
      DOI
    </option>
  </select>

  <input
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        searchPapers(1);
      }
    }}
    placeholder={
  searchMode === "author"
    ? "Enter author name..."
    : searchMode === "title"
      ? "Enter article title..."
      : searchMode === "doi"
        ? "Enter DOI (e.g. 10.1038/...)"
        : "Enter keywords..."
}
    className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
  />

  <button
    onClick={() => searchPapers(1)}
    disabled={loading}
    className="rounded-2xl bg-indigo-700 px-8 py-4 font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? "Searching..." : "Search"}
  </button>
</div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold transition hover:border-indigo-300 hover:bg-indigo-50/40">
    <input
      type="checkbox"
      checked={openAccessOnly}
      onChange={(e) =>
        setOpenAccessOnly(e.target.checked)
      }
    />

    Open Access Only
  </label>

  <select
  value={workType}
  onChange={(e) => setWorkType(e.target.value)}
  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold transition hover:border-indigo-300"
>
  <option value="any">All Types</option>
  <option value="article">Research Article</option>
  <option value="review">Review Article</option>
  <option value="book-chapter">Book Chapter</option>
  <option value="book">Book</option>
</select>

  {searchMode === "author" && (
    <input
      value={institution}
      onChange={(e) =>
        setInstitution(e.target.value)
      }
      onKeyDown={(e) => {
        if (e.key === "Enter") {
         searchPapers(1);
        }
      }}
      placeholder="Institution, e.g. Mizoram University"
      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition hover:border-indigo-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
    />
  )}

  <select
  value={sort}
  onChange={(e) => setSort(e.target.value)}
  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold transition hover:border-indigo-300"
>
  <option value="relevance">Relevance</option>
  <option value="cited">Most Cited</option>
  <option value="newest">Newest</option>
</select>

  <select
  value={year}
  onChange={(e) => setYear(e.target.value)}
  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold transition hover:border-indigo-300"
>
  <option value="any">Any Year</option>
  <option value="2025">Since 2025</option>
  <option value="2020">Since 2020</option>
  <option value="2015">Since 2015</option>
  <option value="2010">Since 2010</option>
</select>

  <button
  type="button"
  onClick={() => {
    setSearchMode("keyword");
    setWorkType("any");
    setInstitution("");
    setSort("relevance");
    setYear("any");
    setOpenAccessOnly(false);

    setSearchMessage("");
    setAuthorMessage("");
    setAuthorResults([]);
    setShowAllAuthorResults(false);

    setCurrentPage(1);
    setTotalPages(0);
    setTotalResults(0);
    setResults([]);
  }}
  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold transition hover:border-indigo-300 hover:bg-indigo-50/40"
>
  Clear Filters
</button>
</div>
</div>

{searchMessage && !loading && (
  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
    {searchMessage}
  </div>
)}

      {saveMessage && (
  <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 shadow-xl">
    {saveMessage}
  </div>
)}

      {loading && (
        <p className="mt-8 text-slate-500">Searching scholarly literature...</p>
      )}

      {!loading &&
  searchMode === "author" &&
  authorResults.length > 0 && (
    <section className="mt-8 rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-700">
          Researcher Discovery
        </p>

        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Researchers ({authorResults.length})
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Showing the best matching researchers
          before their publications.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {(
  showAllAuthorResults
    ? authorResults
    : authorResults.slice(0, 1)
).map((author, index) => (
          <article
            key={author.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl font-black text-white shadow-md">
                {author.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
  <h3 className="text-xl font-black text-slate-950">
    {author.name}
  </h3>

  {index === 0 && (
    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
      Best match
    </span>
  )}

                  {author.verified && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      ORCID linked
                    </span>
                  )}
                </div>

                <p className="mt-2 font-semibold text-slate-700">
                  {author.affiliation}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-400">
                  OpenAlex ID: {author.id}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [
                  "Publications",
                  author.worksCount.toLocaleString(),
                ],
                [
                  "Citations",
                  author.citedByCount.toLocaleString(),
                ],
                ["h-index", author.hIndex],
                ["i10-index", author.i10Index],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 text-xl font-black text-slate-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {author.topics.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Research areas
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {author.topics
                    .slice(0, 5)
                    .map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                      >
                        {topic}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
              <Link
                href={`/researcher/${author.id}`}
                className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
              >
                View Researcher Profile
              </Link>

              <a
                href={author.openAlexUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                OpenAlex Record
              </a>

              {author.orcid && (
                <a
                  href={author.orcid}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-emerald-200 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                >
                  ORCID
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      {authorResults.length > 1 && (
  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-5 py-4">
    <p className="text-sm text-slate-600">
      {showAllAuthorResults
        ? `Showing all ${authorResults.length} possible researcher matches.`
        : `${authorResults.length - 1} other possible matches are available.`}
    </p>

    <button
      type="button"
      onClick={() =>
        setShowAllAuthorResults(
          (current) => !current
        )
      }
      className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
    >
      {showAllAuthorResults
        ? "Show Best Match Only"
        : "Show Other Possible Matches"}
    </button>
  </div>
)}
    </section>
  )}

  {!loading &&
  searchMode === "author" &&
  authorMessage &&
  authorResults.length === 0 && (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
      {authorMessage}
    </div>
  )}

      {!loading && results.length > 0 && (
  <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
    <p className="text-sm font-semibold text-slate-600">
  {totalResults.toLocaleString()}{" "}
  {searchMode === "author"
    ? "publications found"
    : "results found"}
</p>

    <p className="text-sm text-slate-500">
      Page {currentPage} of {totalPages}
    </p>
  </div>
)}

      <div className="mt-5 space-y-5">
        {results.map((paper) => (
          <article
            key={paper.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold capitalize text-violet-700">
  {paper.type.replaceAll("-", " ")}
</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {paper.year || "Year unknown"}
              </span>

              {paper.isOpenAccess && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Open Access
                </span>
              )}

              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {paper.citations} citations
              </span>
            </div>

            <h2 className="mt-4 text-xl font-black leading-snug text-slate-950">
              {paper.title}
            </h2>

            <p className="mt-2 text-sm text-slate-500">{paper.authors}</p>

            <p className="mt-2 text-sm font-semibold text-slate-700">
              {paper.journal}
            </p>

            {paper.biblio && (
              <p className="mt-1 text-sm text-slate-500">{paper.biblio}</p>
            )}

            {paper.doi && (
              <p className="mt-2 text-xs text-slate-400">{paper.doi}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
  <button
    onClick={() => {
      addToRecentlyViewed(paper);
      setPreviewPaper(paper);
    }}
    className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
  >
    Preview
  </button>

  <button
    onClick={() => openPaperDetails(paper)}
    className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
  >
    Details
  </button>

              <a
  href={paper.sourceUrl}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => addToRecentlyViewed(paper)}
  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
>
  Source
</a>

              {paper.openAccessUrl && (
                <a
  href={paper.openAccessUrl}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => addToRecentlyViewed(paper)}
  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
>
  View Full Text
</a>
              )}

              <button
  onClick={() => saveArticle(paper)}
  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold transition hover:border-indigo-300 hover:bg-indigo-50/40"
>
  Save
</button>

              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold transition hover:border-indigo-300 hover:bg-indigo-50/40">
                Cite
              </button>
            </div>
          </article>
        ))}
      </div>
{!loading && results.length > 0 && totalPages > 1 && (
  <div className="mt-10 flex items-center justify-center gap-4">
    <button
      onClick={() => {
        if (currentPage > 1) {
          searchPapers(currentPage - 1);
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
      }}
      disabled={currentPage <= 1}
      className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Previous
    </button>

    <span className="rounded-xl bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700">
      Page {currentPage} of {totalPages}
    </span>

    <button
      onClick={() => {
        if (currentPage < totalPages) {
          searchPapers(currentPage + 1);
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
      }}
      disabled={currentPage >= totalPages}
      className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Next
    </button>
  </div>
)}
      {previewPaper && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
    onClick={() => setPreviewPaper(null)}
  >
    <div
      className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-700">
            Quick Preview
          </p>

          <h2 className="mt-3 text-2xl font-black leading-snug text-slate-950">
            {previewPaper.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setPreviewPaper(null)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-slate-50"
          aria-label="Close preview"
        >
          ×
        </button>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">
        {previewPaper.authors}
      </p>

      <p className="mt-2 font-bold text-slate-800">
        {previewPaper.journal}
      </p>

      {previewPaper.biblio && (
        <p className="mt-1 text-sm text-slate-500">
          {previewPaper.biblio}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold capitalize text-violet-700">
          {previewPaper.type.replaceAll("-", " ")}
        </span>

        {previewPaper.year && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {previewPaper.year}
          </span>
        )}

        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          {previewPaper.citations} citations
        </span>

        {previewPaper.isOpenAccess && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            Open Access
          </span>
        )}
      </div>

      <section className="mt-7 rounded-3xl bg-slate-50 p-6">
        <h3 className="text-lg font-black text-slate-950">
          Abstract
        </h3>

        {previewPaper.abstract &&
previewPaper.abstract !== "Abstract not available from source." ? (
  <p className="mt-3 line-clamp-[12] whitespace-pre-line text-sm leading-7 text-slate-600">
    {previewPaper.abstract}
  </p>
) : (
  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <p className="font-bold text-amber-900">
      Abstract not available in OpenAlex
    </p>

    <p className="mt-2 text-sm leading-6 text-amber-800">
      The source record does not provide an abstract. You can still review the
      research topics, open the full article, or view the publisher page.
    </p>

    <div className="mt-4 flex flex-wrap gap-3">
      {previewPaper.openAccessUrl && (
        <a
          href={previewPaper.openAccessUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => addToRecentlyViewed(previewPaper)}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          View Full Text
        </a>
      )}

      <a
        href={previewPaper.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => addToRecentlyViewed(previewPaper)}
        className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
      >
        Open Source
      </a>
    </div>
  </div>
)}
      </section>

      {previewPaper.keywords.length > 0 && (
        <section className="mt-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Research Topics
          </h3>

          <div className="mt-3 flex flex-wrap gap-2">
            {previewPaper.keywords.slice(0, 8).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700"
              >
                {keyword}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => {
            const paper = previewPaper;
            setPreviewPaper(null);
            openPaperDetails(paper);
          }}
          className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
        >
          Open Full Details
        </button>

        {previewPaper.openAccessUrl && (
          <a
            href={previewPaper.openAccessUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => addToRecentlyViewed(previewPaper)}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            View Full Text
          </a>
        )}

        <button
          type="button"
          onClick={() => saveArticle(previewPaper)}
          className="rounded-xl border border-indigo-200 px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
        >
          Save
        </button>

        <button
          type="button"
          onClick={() => {
            const paper = previewPaper;
            setPreviewPaper(null);
            searchRelatedPapers(paper);
          }}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Related Papers
        </button>
      </div>
    </div>
  </div>
)}
      
      {selectedPaper && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm">
          <div className="h-full w-full max-w-3xl overflow-y-auto bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-700">
                  Article Details
                </p>

                <h2 className="mt-3 text-3xl font-black leading-snug text-slate-950">
                  {selectedPaper.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedPaper(null)}
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-bold transition hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                Close
              </button>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                ["Year", selectedPaper.year || "Unknown"],
                ["Citations", selectedPaper.citations],
                ["Authors", selectedPaper.authorCount],
                ["Institutions", selectedPaper.institutionCount],
                ["Open Access", selectedPaper.isOpenAccess ? "YES" : "NO"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-lg"
                >
                  <div className="absolute left-0 top-0 h-1 w-full bg-indigo-600" />

                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                    {label}
                  </p>

                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    {label === "Open Access" ? (
                      <span
                        className={
                          value === "YES" ? "text-emerald-600" : "text-rose-600"
                        }
                      >
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </p>
                </div>
              ))}
            </div>

            <section className="mt-8">
              <h3 className="text-lg font-black">Authors</h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedPaper.authorList.length > 0 ? (
                  selectedPaper.authorList.map((author) => (
                    <span
                      key={author}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      {author}
                    </span>
                  ))
                ) : (
                  <p className="text-slate-500">Authors not available</p>
                )}
              </div>
            </section>

            <section className="mt-7">
              <h3 className="text-lg font-black">Journal / Source</h3>

              <p className="mt-2 text-lg font-semibold text-slate-700">
                {selectedPaper.journal}
              </p>

              {selectedPaper.biblio && (
                <p className="mt-1 text-sm text-slate-500">
                  {selectedPaper.biblio}
                </p>
              )}
            </section>

            <section className="mt-7">
              <h3 className="text-lg font-black">Institutions</h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedPaper.institutionList.length > 0 ? (
                  selectedPaper.institutionList.map((institution) => (
                    <span
                      key={institution}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      {institution}
                    </span>
                  ))
                ) : (
                  <p className="text-slate-500">Institutions not available</p>
                )}
              </div>
            </section>

            <section className="mt-7">
              <h3 className="text-lg font-black">Abstract</h3>

              <p className="mt-3 leading-8 text-slate-600">
                {selectedPaper.abstract}
              </p>
            </section>

            {selectedPaper.keywords.length > 0 && (
              <section className="mt-7">
                <h3 className="text-lg font-black">Research Topics</h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPaper.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {selectedPaper.doi && (
              <section className="mt-7">
                <h3 className="text-lg font-black">DOI</h3>

                <a
                  href={selectedPaper.doi}
                  target="_blank"
                  className="mt-2 block text-sm text-indigo-700 hover:underline"
                >
                  {selectedPaper.doi}
                </a>
              </section>
            )}

            <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
              <a
                href={selectedPaper.sourceUrl}
                target="_blank"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Source
              </a>

              {selectedPaper.openAccessUrl && (
                <a
                  href={selectedPaper.openAccessUrl}
                  target="_blank"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  View Full Text
                </a>
              )}

              <button
  onClick={() => saveArticle(selectedPaper)}
  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold transition hover:border-indigo-300 hover:bg-indigo-50/40"
>
  Save
</button>

              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold transition hover:border-indigo-300 hover:bg-indigo-50/40">
                Cite
              </button>

              <button
                onClick={() => searchRelatedPapers(selectedPaper)}
                className="rounded-xl border border-indigo-300 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
              >
                Related Papers
              </button>

              {selectedPaper.doi && (
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(selectedPaper.doi || "")
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold transition hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  Copy DOI
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}