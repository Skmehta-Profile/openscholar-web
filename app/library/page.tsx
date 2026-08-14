"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import CitationDialog from "@/app/components/CitationDialog";
import AbstractDialog from "@/app/components/AbstractDialog";
import PaperNotesDialog from "@/app/components/PaperNotesDialog";
import {
  getMyEntitlements,
  type OpenScholarPlan,
} from "@/lib/entitlements";
import {
  cleanScholarlyText,
} from "@/lib/scholarlyText";

type SavedArticle = {
  id: string;
  user_id: string;
  article_id: string | null;
  title: string | null;
  authors: string | null;
  journal: string | null;
  biblio: string | null;
  citations: number | null;
  is_open_access: boolean | null;
  year: number | null;
  doi: string | null;
  saved_at: string | null;
};

type Collection = {
  id: string;
  name: string;
  description: string | null;
};

type ReadingStatus =
  | "want_to_read"
  | "reading"
  | "completed"
  | "paused";

type WorkspaceFilter =
  | "all"
  | "want_to_read"
  | "reading"
  | "completed"
  | "paused"
  | "recently_opened"
  | "open_access";

type WorkspaceItem = {
  id: string;
  user_id: string;
  saved_article_id: string;
  reading_status: ReadingStatus;
  reading_progress: number;
  started_at: string | null;
  completed_at: string | null;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
};

function cleanText(
  value: string | null
) {
  return cleanScholarlyText(
    value
  );
}

function readingStatusLabel(
  status: ReadingStatus
) {
  switch (status) {
    case "reading":
      return "Reading";

    case "completed":
      return "Completed";

    case "paused":
      return "Paused";

    case "want_to_read":
    default:
      return "Want to Read";
  }
}

function readingStatusIcon(
  status: ReadingStatus
) {
  switch (status) {
    case "reading":
      return "📘";

    case "completed":
      return "✓";

    case "paused":
      return "Ⅱ";

    case "want_to_read":
    default:
      return "📚";
  }
}

function readingStatusClasses(
  status: ReadingStatus
) {
  switch (status) {
    case "reading":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "paused":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "want_to_read":
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function formatWorkspaceDate(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function addToRecentlyViewed(
  article: SavedArticle
) {
  try {
    const viewedPaper = {
      id: article.id,
      title: cleanText(article.title),
      authors: article.authors || "",
      journal: article.journal || "",
      biblio: article.biblio || "",
      citations: article.citations || 0,
      year: article.year,
      doi: article.doi,
      isOpenAccess:
        article.is_open_access || false,
      openAccessUrl: article.article_id,
      sourceUrl:
        article.article_id || "",
      type: "saved article",
      authorList: [],
      institutionList: [],
      authorCount: 0,
      institutionCount: 0,
      abstract: "",
      keywords: [],
      viewedAt: new Date().toISOString(),
    };

    const existing = JSON.parse(
      localStorage.getItem(
        "openscholar_recently_viewed"
      ) || "[]"
    ) as Array<{ id?: string }>;

    const updated = [
      viewedPaper,
      ...existing.filter(
        (item) =>
          item.id !== article.id
      ),
    ].slice(0, 10);

    localStorage.setItem(
      "openscholar_recently_viewed",
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error(
      "Unable to update Recently Viewed",
      error
    );
  }
}

export default function LibraryPage() {
  const [articles, setArticles] =
    useState<SavedArticle[]>([]);

  const [collections, setCollections] =
    useState<Collection[]>([]);

  const [
    workspaceItems,
    setWorkspaceItems,
  ] = useState<
    Record<string, WorkspaceItem>
  >({});

  const [
    workspaceBusyArticleId,
    setWorkspaceBusyArticleId,
  ] = useState<string | null>(null);

  const [
    workspaceFilter,
    setWorkspaceFilter,
  ] = useState<WorkspaceFilter>("all");

  const [
    selectedArticle,
    setSelectedArticle,
  ] = useState<SavedArticle | null>(
    null
  );

  const [
    selectedCollectionId,
    setSelectedCollectionId,
  ] = useState("");

  const [
    collectionModalOpen,
    setCollectionModalOpen,
  ] = useState(false);

  const [
    newCollectionName,
    setNewCollectionName,
  ] = useState("");

  const [
    newCollectionDescription,
    setNewCollectionDescription,
  ] = useState("");

  const [
    creatingCollection,
    setCreatingCollection,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [
    addingToCollection,
    setAddingToCollection,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState("saved");

  const [
  citationArticle,
  setCitationArticle,
] = useState<SavedArticle | null>(
  null
); 

const [
  abstractArticle,
  setAbstractArticle,
] = useState<SavedArticle | null>(
  null
);

const [
  notesArticle,
  setNotesArticle,
] = useState<SavedArticle | null>(
  null
);

const [
  collectionLimit,
  setCollectionLimit,
] = useState(3);

  const [
    collectionCount,
    setCollectionCount,
  ] = useState(0);

  const [
  libraryPlan,
  setLibraryPlan,
] = useState<OpenScholarPlan>("free");

const [
  libraryLimit,
  setLibraryLimit,
] = useState(100);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setLoading(true);

    const { data: userData } =
      await supabase.auth.getUser();

    if (!userData.user) {
      setLoading(false);
      return;
    }

    const currentUser =
      userData.user;

    const [
  collectionsResult,
  articlesResult,
  workspaceResult,
  entitlements,
] = await Promise.all([
      supabase
        .from("collections")
        .select(
          "id, name, description",
          {
            count: "exact",
          }
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("saved_articles")
        .select("*")
        .eq(
          "user_id",
          currentUser.id
        )
        .order("saved_at", {
          ascending: false,
        }),

    supabase
  .from(
    "research_workspace_items"
  )
  .select("*")
  .eq(
    "user_id",
    currentUser.id
  ),

getMyEntitlements(),
]);

    setLibraryPlan(
      entitlements.plan
    );

    setLibraryLimit(
      entitlements.saved_papers_limit
    );

    setCollectionLimit(
      entitlements.collections_limit
    );

    setCollections(
      collectionsResult.data ?? []
    );

    setCollectionCount(
      collectionsResult.count ?? 0
    );

    if (articlesResult.error) {
      setMessage(
        "Unable to load your library."
      );
    } else {
      setArticles(
        articlesResult.data || []
      );
    }

    if (workspaceResult.error) {
      console.error(
        "Unable to load research workspace:",
        workspaceResult.error
      );

      setWorkspaceItems({});
    } else {
      const workspaceMap: Record<
        string,
        WorkspaceItem
      > = {};

      (
        (workspaceResult.data ||
          []) as WorkspaceItem[]
      ).forEach((item) => {
        workspaceMap[
          item.saved_article_id
        ] = item;
      });

      setWorkspaceItems(
        workspaceMap
      );
    }

    setLoading(false);
  }

  async function updateReadingStatus(
    article: SavedArticle,
    status: ReadingStatus
  ) {
    setWorkspaceBusyArticleId(
      article.id
    );

    try {
      const { data: userData } =
        await supabase.auth.getUser();

      if (!userData.user) {
        setMessage(
          "Please sign in to update reading status."
        );
        return;
      }

      const currentItem =
        workspaceItems[article.id];

      const now =
        new Date().toISOString();

      const payload = {
        user_id:
          userData.user.id,

        saved_article_id:
          article.id,

        reading_status: status,

        reading_progress:
          status === "completed"
            ? 100
            : currentItem
                ?.reading_progress ?? 0,

        started_at:
          status === "reading"
            ? currentItem
                ?.started_at || now
            : currentItem
                ?.started_at || null,

        completed_at:
          status === "completed"
            ? now
            : null,
      };

      const {
        data: updatedItem,
        error,
      } = await supabase
        .from(
          "research_workspace_items"
        )
        .upsert(payload, {
          onConflict:
            "user_id,saved_article_id",
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setWorkspaceItems(
        (current) => ({
          ...current,

          [article.id]:
            updatedItem as WorkspaceItem,
        })
      );

      setMessage(
        `Reading status changed to ${readingStatusLabel(
          status
        )}.`
      );
    } catch (error) {
      console.error(
        "Unable to update reading status:",
        error
      );

      setMessage(
        "Unable to update reading status."
      );
    } finally {
      setWorkspaceBusyArticleId(
        null
      );

      window.setTimeout(() => {
        setMessage("");
      }, 3000);
    }
  }

  async function removeArticle(
    id: string
  ) {
    const { error } =
      await supabase
        .from("saved_articles")
        .delete()
        .eq("id", id);

    if (error) {
      setMessage(
        "Unable to remove article."
      );
      return;
    }

    setArticles((prev) =>
      prev.filter(
        (item) => item.id !== id
      )
    );

    setWorkspaceItems(
      (current) => {
        const next = {
          ...current,
        };

        delete next[id];

        return next;
      }
    );

    setMessage(
      "Article removed from library."
    );
  }

  function openCollectionModal(
    article: SavedArticle
  ) {
    setSelectedArticle(article);

    setSelectedCollectionId(
      collections[0]?.id ?? ""
    );

    setCollectionModalOpen(true);
  }

  function closeCollectionModal() {
    setCollectionModalOpen(false);
    setSelectedArticle(null);
    setSelectedCollectionId("");
    setAddingToCollection(false);
    setCreatingCollection(false);
    setNewCollectionName("");
    setNewCollectionDescription("");
  }

  async function createCollectionAndAddArticle() {
    const cleanName =
      newCollectionName.trim();

    const cleanDescription =
      newCollectionDescription.trim();

    if (!selectedArticle) {
      setMessage(
        "Please select an article."
      );
      return;
    }

    if (!cleanName) {
      setMessage(
        "Please enter a collection name."
      );
      return;
    }

    setCreatingCollection(true);

    const { data: userData } =
      await supabase.auth.getUser();

    if (!userData.user) {
      setMessage(
        "Please sign in to create collections."
      );
      setCreatingCollection(false);
      return;
    }

    const entitlements =
      await getMyEntitlements();

    const currentCollectionLimit =
      entitlements.collections_limit;

    if (
      collectionCount >=
      currentCollectionLimit
    ) {
      if (
        entitlements.plan ===
        "scholar"
      ) {
        setMessage(
          "Your Scholar account has reached the 50-collection fair-use limit."
        );
      } else {
        setMessage(
          "Your Free account has reached the 3-collection limit. Upgrade to Scholar to create up to 50 collections."
        );
      }

      setCreatingCollection(false);

      return;
    }

    const {
      data: newCollection,
      error: collectionError,
    } = await supabase
      .from("collections")
      .insert({
        user_id:
          userData.user.id,
        name: cleanName,
        description:
          cleanDescription || null,
      })
      .select(
        "id, name, description"
      )
      .single();

    if (
      collectionError ||
      !newCollection
    ) {
      setMessage(
        "Unable to create collection."
      );

      setCreatingCollection(false);

      return;
    }

    const { error: linkError } =
      await supabase
        .from(
          "collection_articles"
        )
        .insert({
          user_id:
            userData.user.id,

          collection_id:
            newCollection.id,

          saved_article_id:
            selectedArticle.id,
        });

    if (linkError) {
      setMessage(
        "Collection created, but article could not be added."
      );

      setCreatingCollection(false);

      return;
    }

    setCollections((prev) => [
      newCollection,
      ...prev,
    ]);

    setCollectionCount(
      (prev) => prev + 1
    );

    setNewCollectionName("");
    setNewCollectionDescription("");

    setCreatingCollection(false);

    setMessage(
      "Collection created and article added."
    );

    closeCollectionModal();
  }

  async function addArticleToCollection() {
    if (
      !selectedArticle ||
      !selectedCollectionId
    ) {
      setMessage(
        "Please select a collection."
      );
      return;
    }

    setAddingToCollection(true);

    const { data: userData } =
      await supabase.auth.getUser();

    if (!userData.user) {
      setMessage(
        "Please sign in to add articles to collections."
      );

      setAddingToCollection(false);

      return;
    }

    const {
  data: existingLink,
} = await supabase
  .from(
    "collection_articles"
  )
  .select("id")
  .eq(
    "user_id",
    userData.user.id
  )
  .eq(
    "collection_id",
    selectedCollectionId
  )
  .eq(
    "saved_article_id",
    selectedArticle.id
  )
  .maybeSingle();

if (existingLink) {
  setMessage(
    "This article is already in the selected collection."
  );

  setAddingToCollection(false);

  return;
}

    const { error } =
      await supabase
        .from(
          "collection_articles"
        )
        .insert({
          user_id:
            userData.user.id,

          collection_id:
            selectedCollectionId,

          saved_article_id:
            selectedArticle.id,
        });

    if (error) {
      setMessage(
        "Unable to add article to collection."
      );

      setAddingToCollection(false);

      return;
    }

    setMessage(
      "Article added to collection."
    );

    closeCollectionModal();
  }

  function copyApaCitation(
    article: SavedArticle
  ) {
    const citation = `${
      article.authors ||
      "Unknown author"
    } (${
      article.year || "n.d."
    }). ${
      cleanText(article.title) ||
      "Untitled article"
    }. ${
      article.journal ||
      "Unknown source"
    }${
      article.biblio
        ? `, ${article.biblio}`
        : ""
    }.${
      article.doi
        ? ` ${article.doi}`
        : ""
    }${
      article.citations
        ? ` Cited ${article.citations} times.`
        : ""
    }`;

    navigator.clipboard.writeText(
      citation
    );

    setMessage(
      "APA-style citation copied."
    );
  }

  const libraryUsed =
  articles.length;

const libraryRemaining =
  Math.max(
    libraryLimit - libraryUsed,
    0
  );

const libraryUsagePercent =
  libraryLimit > 0
    ? Math.min(
        100,
        Math.round(
          (libraryUsed /
            libraryLimit) *
            100
        )
      )
    : 0;

const libraryNearLimit =
  libraryUsagePercent >= 80;

  const openAccessCount =
    articles.filter(
      (item) =>
        item.is_open_access
    ).length;

  const readingCounts =
    useMemo(() => {
      const counts = {
        want_to_read: 0,
        reading: 0,
        completed: 0,
        paused: 0,
      };

      articles.forEach((article) => {
        const status =
          workspaceItems[
            article.id
          ]?.reading_status ||
          "want_to_read";

        counts[status] += 1;
      });

      return counts;
    }, [
      articles,
      workspaceItems,
    ]);

  const workspaceArticles =
    useMemo(() => {
      return articles.map(
        (article) => {
          const workspace =
            workspaceItems[
              article.id
            ];

          return {
            article,
            workspace,

            readingStatus:
              workspace
                ?.reading_status ||
              ("want_to_read" as ReadingStatus),
          };
        }
      );
    }, [
      articles,
      workspaceItems,
    ]);

  const continueReadingArticles =
    useMemo(() => {
      return workspaceArticles
        .filter(
          ({ readingStatus }) =>
            readingStatus ===
            "reading"
        )
        .sort((a, b) => {
          const dateA =
            a.workspace
              ?.last_opened_at ||
            a.workspace
              ?.started_at ||
            "";

          const dateB =
            b.workspace
              ?.last_opened_at ||
            b.workspace
              ?.started_at ||
            "";

          return dateB.localeCompare(
            dateA
          );
        })
        .slice(0, 3);
    }, [workspaceArticles]);

  const recentlyOpenedArticles =
    useMemo(() => {
      return workspaceArticles
        .filter(
          ({ workspace }) =>
            Boolean(
              workspace
                ?.last_opened_at
            )
        )
        .sort((a, b) =>
          (
            b.workspace
              ?.last_opened_at ||
            ""
          ).localeCompare(
            a.workspace
              ?.last_opened_at ||
              ""
          )
        )
        .slice(0, 5);
    }, [workspaceArticles]);

  const totalRecentlyOpenedCount =
    useMemo(
      () =>
        workspaceArticles.filter(
          ({ workspace }) =>
            Boolean(
              workspace
                ?.last_opened_at
            )
        ).length,
      [workspaceArticles]
    );

  const todayOpenedCount =
    useMemo(() => {
      const today =
        new Date().toDateString();

      return workspaceArticles.filter(
        ({ workspace }) => {
          if (
            !workspace
              ?.last_opened_at
          ) {
            return false;
          }

          return (
            new Date(
              workspace.last_opened_at
            ).toDateString() ===
            today
          );
        }
      ).length;
    }, [workspaceArticles]);

  const workspaceStartedCount =
    useMemo(
      () =>
        workspaceArticles.filter(
          ({ workspace }) =>
            Boolean(
              workspace?.started_at
            )
        ).length,
      [workspaceArticles]
    );

  const workspaceCompletedCount =
    readingCounts.completed;

  const workspaceActiveCount =
    readingCounts.reading +
    readingCounts.paused;

  const filteredArticles =
    useMemo(() => {
      const q =
        search
          .toLowerCase()
          .trim();

      let list = articles.filter(
        (article) => {
          const workspace =
            workspaceItems[
              article.id
            ];

          const readingStatus =
            workspace
              ?.reading_status ||
            "want_to_read";

          if (
            workspaceFilter ===
              "want_to_read" &&
            readingStatus !==
              "want_to_read"
          ) {
            return false;
          }

          if (
            workspaceFilter ===
              "reading" &&
            readingStatus !==
              "reading"
          ) {
            return false;
          }

          if (
            workspaceFilter ===
              "completed" &&
            readingStatus !==
              "completed"
          ) {
            return false;
          }

          if (
            workspaceFilter ===
              "paused" &&
            readingStatus !==
              "paused"
          ) {
            return false;
          }

          if (
            workspaceFilter ===
              "recently_opened" &&
            !workspace
              ?.last_opened_at
          ) {
            return false;
          }

          if (
            workspaceFilter ===
              "open_access" &&
            !article.is_open_access
          ) {
            return false;
          }

          if (!q) {
            return true;
          }

          return [
            article.title,
            article.authors,
            article.journal,
            article.doi,
            article.year?.toString(),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);
        }
      );

      if (
        workspaceFilter ===
        "recently_opened"
      ) {
        list = [...list].sort(
          (a, b) =>
            (
              workspaceItems[b.id]
                ?.last_opened_at ||
              ""
            ).localeCompare(
              workspaceItems[a.id]
                ?.last_opened_at ||
                ""
            )
        );

        return list;
      }

      if (sort === "cited") {
        list = [...list].sort(
          (a, b) =>
            (b.citations || 0) -
            (a.citations || 0)
        );
      }

      if (
        sort === "newestYear"
      ) {
        list = [...list].sort(
          (a, b) =>
            (b.year || 0) -
            (a.year || 0)
        );
      }

      if (
        sort === "oldestYear"
      ) {
        list = [...list].sort(
          (a, b) =>
            (a.year || 9999) -
            (b.year || 9999)
        );
      }

      if (sort === "saved") {
        list = [...list].sort(
          (a, b) =>
            (
              b.saved_at || ""
            ).localeCompare(
              a.saved_at || ""
            )
        );
      }

      return list;
    }, [
      articles,
      search,
      sort,
      workspaceFilter,
      workspaceItems,
    ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {message && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm font-bold text-indigo-700 shadow-xl">
          {message}
        </div>
      )}

      <CitationDialog
  open={Boolean(citationArticle)}
  article={citationArticle}
  onClose={() =>
    setCitationArticle(null)
  }
/>

<AbstractDialog
  open={Boolean(
    abstractArticle
  )}
  article={abstractArticle}
  onClose={() =>
    setAbstractArticle(null)
  }
/>

<PaperNotesDialog
  open={Boolean(notesArticle)}
  article={notesArticle}
  onClose={() =>
    setNotesArticle(null)
  }
/>

      {collectionModalOpen &&
        selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-700">
                    Add to Collection
                  </p>

                 <h2 className="mt-3 text-2xl font-black text-slate-950">
  {collections.length === 0
    ? "Create your first collection"
    : "Select collection"}
</h2>

<p className="mt-2 text-xs font-semibold text-slate-500">
  {collectionCount} of {collectionLimit} collections used
</p>

                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                    {cleanText(
                      selectedArticle.title
                    ) ||
                      "Untitled article"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeCollectionModal
                  }
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-50"
                >
                  ×
                </button>
              </div>

              {collections.length ===
              0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                  <p className="text-lg font-black text-slate-950">
                    Create your first
                    collection
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    You do not have any
                    collections yet. Create
                    one now and this article
                    will be added
                    automatically.
                  </p>

                  <div className="mt-5 space-y-4">
                    <input
                      value={
                        newCollectionName
                      }
                      onChange={(event) =>
                        setNewCollectionName(
                          event.target.value
                        )
                      }
                      placeholder="Example: Thesis Literature"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                    />

                    <textarea
                      value={
                        newCollectionDescription
                      }
                      onChange={(event) =>
                        setNewCollectionDescription(
                          event.target.value
                        )
                      }
                      placeholder="Optional description"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={
                          closeCollectionModal
                        }
                        className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-white"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={
                          createCollectionAndAddArticle
                        }
                        disabled={
                          creatingCollection
                        }
                        className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {creatingCollection
                          ? "Creating..."
                          : "Create & Add Article"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-3">
                    {collections.map(
                      (collection) => (
                        <label
                          key={
                            collection.id
                          }
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                            selectedCollectionId ===
                            collection.id
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="collection"
                            value={
                              collection.id
                            }
                            checked={
                              selectedCollectionId ===
                              collection.id
                            }
                            onChange={() =>
                              setSelectedCollectionId(
                                collection.id
                              )
                            }
                            className="mt-1"
                          />

                          <span>
                            <span className="block font-black text-slate-950">
                              {
                                collection.name
                              }
                            </span>

                            {collection.description && (
                              <span className="mt-1 block text-sm text-slate-500">
                                {
                                  collection.description
                                }
                              </span>
                            )}
                          </span>
                        </label>
                      )
                    )}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={
                        closeCollectionModal
                      }
                      className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={
                        addArticleToCollection
                      }
                      disabled={
                        addingToCollection
                      }
                      className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingToCollection
                        ? "Adding..."
                        : "Add to Collection"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />
        <div className="absolute right-40 top-20 h-56 w-56 rounded-full bg-emerald-100 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-700">
            Personal Research Workspace
          </p>

          <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950">
            My Library
          </h1>

          <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
            Save, organize and track
            scholarly literature throughout
            your research workflow.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">
                Total Saved
              </p>

              <p className="mt-2 text-3xl font-black text-indigo-700">
                {articles.length}
              </p>

              <p className="text-sm text-slate-500">
                articles
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">
                Reading
              </p>

              <p className="mt-2 text-3xl font-black text-blue-700">
                {
                  readingCounts.reading
                }
              </p>

              <p className="text-sm text-slate-500">
                active papers
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">
                Completed
              </p>

              <p className="mt-2 text-3xl font-black text-emerald-600">
                {
                  readingCounts.completed
                }
              </p>

              <p className="text-sm text-slate-500">
                papers read
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">
                Collections
              </p>

              <p className="mt-2 text-3xl font-black text-slate-950">
                {collectionCount}
              </p>

              <p className="text-sm text-slate-500">
                {collectionCount} of {collectionLimit} used
              </p>
            </div>
          </div>

<div
  className={`mt-4 rounded-2xl border px-5 py-4 ${
    libraryNearLimit
      ? "border-amber-200 bg-amber-50"
      : "border-slate-200 bg-slate-50"
  }`}
>
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-black text-slate-900">
          Library Usage
        </p>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
            libraryPlan === "scholar"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {libraryPlan === "scholar"
            ? "Scholar"
            : "Free"}
        </span>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        {libraryUsed} of {libraryLimit} papers saved
      </p>
    </div>

    <p
      className={`text-sm font-black ${
        libraryNearLimit
          ? "text-amber-700"
          : "text-slate-700"
      }`}
    >
      {libraryRemaining}{" "}
      {libraryRemaining === 1
        ? "save"
        : "saves"}{" "}
      remaining
    </p>
  </div>

  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
    <div
      className={`h-full rounded-full ${
        libraryUsagePercent >= 95
          ? "bg-rose-500"
          : libraryUsagePercent >= 80
            ? "bg-amber-500"
            : "bg-indigo-600"
      }`}
      style={{
        width: `${libraryUsagePercent}%`,
      }}
    />
  </div>
</div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Want to Read
              </p>

              <p className="mt-1 text-xl font-black text-slate-800">
                {
                  readingCounts.want_to_read
                }
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Reading
              </p>

              <p className="mt-1 text-xl font-black text-blue-800">
                {
                  readingCounts.reading
                }
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                Completed
              </p>

              <p className="mt-1 text-xl font-black text-emerald-800">
                {
                  readingCounts.completed
                }
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                Paused
              </p>

              <p className="mt-1 text-xl font-black text-amber-800">
                {
                  readingCounts.paused
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-700">
            Research Workspace
          </p>

          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Continue Your Research
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Resume active papers, revisit
            recently opened literature and
            manage your current reading queue.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
                  Continue Reading
                </p>

                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  Active Papers
                </h3>
              </div>

              <span className="rounded-full bg-indigo-100 px-4 py-2 text-sm font-black text-indigo-700">
                {
                  readingCounts.reading
                }
              </span>
            </div>

            {continueReadingArticles.length ===
            0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-6">
                <p className="font-bold text-slate-800">
                  Nothing currently being
                  read
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Change a saved paper to
                  Reading or open it in
                  OpenScholar-Web Reader.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {continueReadingArticles.map(
                  ({
                    article,
                    workspace,
                  }) => (
                    <div
                      key={
                        article.id
                      }
                      className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-black leading-6 text-slate-950">
                            {cleanText(
                              article.title
                            ) ||
                              "Untitled article"}
                          </p>

                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {article.journal ||
                              "Unknown source"}
                            {article.year
                              ? ` · ${article.year}`
                              : ""}
                          </p>

                          {workspace?.last_opened_at && (
                            <p className="mt-2 text-xs text-slate-400">
                              Last opened{" "}
                              {formatWorkspaceDate(
                                workspace.last_opened_at
                              )}
                            </p>
                          )}
                        </div>

                        <Link
                          href={`/reader/${article.id}`}
                          onClick={() =>
                            addToRecentlyViewed(
                              article
                            )
                          }
                          className="shrink-0 rounded-xl bg-indigo-700 px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-indigo-800"
                        >
                          Continue Reading
                        </Link>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Today&apos;s Research
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-indigo-50 p-4">
                <p className="text-3xl font-black text-indigo-700">
                  {todayOpenedCount}
                </p>

                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-indigo-500">
                  Opened Today
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-3xl font-black text-blue-700">
                  {
                    workspaceActiveCount
                  }
                </p>

                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-blue-500">
                  Active Queue
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-3xl font-black text-emerald-700">
                  {
                    workspaceCompletedCount
                  }
                </p>

                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-emerald-600">
                  Completed
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-3xl font-black text-slate-800">
                  {
                    workspaceStartedCount
                  }
                </p>

                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Ever Started
                </p>
              </div>
            </div>
          </div>
        </div>

        {recentlyOpenedArticles.length >
          0 && (
          <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Recent Activity
                </p>

                <h3 className="mt-2 text-xl font-black text-slate-950">
                  Recently Opened
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWorkspaceFilter(
                    "recently_opened"
                  );

                  setSearch("");
                }}
                className="text-sm font-bold text-indigo-700 hover:underline"
              >
                View all recent
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentlyOpenedArticles.map(
                ({
                  article,
                  workspace,
                }) => (
                  <Link
                    key={
                      article.id
                    }
                    href={`/reader/${article.id}`}
                    onClick={() =>
                      addToRecentlyViewed(
                        article
                      )
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <p className="line-clamp-2 font-bold leading-5 text-slate-900">
                      {cleanText(
                        article.title
                      ) ||
                        "Untitled article"}
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      {formatWorkspaceDate(
                        workspace
                          ?.last_opened_at ||
                          null
                      )}
                    </p>
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            [
              "all",
              "All Papers",
              articles.length,
            ],
            [
              "reading",
              "Reading",
              readingCounts.reading,
            ],
            [
              "want_to_read",
              "Want to Read",
              readingCounts.want_to_read,
            ],
            [
              "completed",
              "Completed",
              readingCounts.completed,
            ],
            [
              "paused",
              "Paused",
              readingCounts.paused,
            ],
            [
              "recently_opened",
              "Recently Opened",
              totalRecentlyOpenedCount,
            ],
            [
              "open_access",
              "Open Access",
              openAccessCount,
            ],
          ].map(
            ([
              filter,
              label,
              count,
            ]) => (
              <button
                key={String(
                  filter
                )}
                type="button"
                onClick={() =>
                  setWorkspaceFilter(
                    filter as WorkspaceFilter
                  )
                }
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  workspaceFilter ===
                  filter
                    ? "border-indigo-700 bg-indigo-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                {label} ({count})
              </button>
            )
          )}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search your library..."
            className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 lg:max-w-xl"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value
                )
              }
              className="rounded-2xl border border-slate-300 px-5 py-4 text-sm font-bold outline-none transition hover:border-indigo-300"
            >
              <option value="saved">
                Sort: Recently Saved
              </option>

              <option value="cited">
                Sort: Most Cited
              </option>

              <option value="newestYear">
                Sort: Newest Year
              </option>

              <option value="oldestYear">
                Sort: Oldest Year
              </option>
            </select>

            <Link
              href="/search"
              className="rounded-2xl bg-indigo-700 px-5 py-4 text-center text-sm font-bold text-white transition hover:bg-indigo-800"
            >
              Add More Papers
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-500">
            Showing{" "}
            {filteredArticles.length} of{" "}
            {articles.length} saved papers
          </p>

          {workspaceFilter !==
            "all" && (
            <button
              type="button"
              onClick={() =>
                setWorkspaceFilter(
                  "all"
                )
              }
              className="text-xs font-bold text-indigo-700 hover:underline"
            >
              Clear workspace filter
            </button>
          )}
        </div>
      </section>

      {loading && (
        <p className="mt-10 text-slate-500">
          Loading your saved articles...
        </p>
      )}

      {!loading &&
        articles.length === 0 && (
          <section className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-3xl font-black text-indigo-700">
              ☆
            </div>

            <h2 className="mt-6 text-2xl font-black text-slate-950">
              No articles saved yet
            </h2>

            <p className="mt-3 text-slate-500">
              Search for papers and click
              Save to build your personal
              library.
            </p>

            <Link
              href="/search"
              className="mt-6 inline-flex rounded-2xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white"
            >
              Go to Search
            </Link>
          </section>
        )}

      {!loading &&
        filteredArticles.length >
          0 && (
          <section className="mt-10 space-y-5">
            {filteredArticles.map(
              (article, index) => {
                const readingStatus =
                  workspaceItems[
                    article.id
                  ]?.reading_status ||
                  "want_to_read";

                const statusBusy =
                  workspaceBusyArticleId ===
                  article.id;

                return (
                  <article
                    key={article.id}
                    className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-indigo-600 opacity-0 transition group-hover:opacity-100" />

                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-5">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-black text-indigo-700">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${readingStatusClasses(
                                readingStatus
                              )}`}
                            >
                              <span>
                                {readingStatusIcon(
                                  readingStatus
                                )}
                              </span>

                              <span>
                                {readingStatusLabel(
                                  readingStatus
                                )}
                              </span>
                            </div>

                            <select
                              value={
                                readingStatus
                              }
                              disabled={
                                statusBusy
                              }
                              onChange={(
                                event
                              ) =>
                                updateReadingStatus(
                                  article,
                                  event
                                    .target
                                    .value as ReadingStatus
                                )
                              }
                              aria-label={`Reading status for ${
                                cleanText(
                                  article.title
                                ) ||
                                "article"
                              }`}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none transition hover:border-indigo-300 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="want_to_read">
                                Want to Read
                              </option>

                              <option value="reading">
                                Reading
                              </option>

                              <option value="completed">
                                Completed
                              </option>

                              <option value="paused">
                                Paused
                              </option>
                            </select>

                            {statusBusy && (
                              <span className="text-xs font-semibold text-slate-400">
                                Saving...
                              </span>
                            )}
                          </div>

                          <h2 className="mt-4 text-2xl font-black leading-snug text-slate-950">
                            {cleanText(
                              article.title
                            ) ||
                              "Untitled article"}
                          </h2>

                          <p className="mt-3 text-sm font-medium text-slate-500">
                            {article.authors ||
                              "Authors not available"}
                          </p>

                          <p className="mt-2 text-sm font-bold text-slate-800">
                            {article.journal ||
                              "Unknown source"}
                          </p>

                          {article.biblio && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                article.biblio
                              }
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            {article.year && (
                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                                {
                                  article.year
                                }
                              </span>
                            )}

                            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                              {article.citations ??
                                0}{" "}
                              citations
                            </span>

                            {article.doi && (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                DOI Available
                              </span>
                            )}

                            {article.is_open_access && (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                Open Access
                              </span>
                            )}

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              Saved Article
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <Link
                              href={`/reader/${article.id}`}
                              onClick={() =>
                                addToRecentlyViewed(
                                  article
                                )
                              }
                              className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
                            >
                              Read in App
                            </Link>

                            <button
  type="button"
  onClick={() =>
    setAbstractArticle(
      article
    )
  }
  className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
>
  Abstract
</button>

<button
  type="button"
  onClick={() =>
    setNotesArticle(
      article
    )
  }
  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
>
  Notes
</button>

                            {article.article_id && (
                              <a
                                href={
                                  article.article_id
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  addToRecentlyViewed(
                                    article
                                  )
                                }
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                              >
                                Open Source
                              </a>
                            )}

                            {article.doi && (
                              <a
                                href={
                                  article.doi
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  addToRecentlyViewed(
                                    article
                                  )
                                }
                                className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                              >
                                Open DOI
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                openCollectionModal(
                                  article
                                )
                              }
                              className="rounded-xl border border-purple-200 px-4 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50"
                            >
                              Add to Collection
                            </button>

                            <button
  type="button"
  onClick={() =>
    setCitationArticle(
      article
    )
  }
  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
>
  Cite
</button>

                            <button
                              type="button"
                              onClick={() =>
                                removeArticle(
                                  article.id
                                )
                              }
                              className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="hidden w-60 shrink-0 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 lg:block">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
                          Research Workspace
                        </p>

                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-xs text-slate-500">
                              Reading Status
                            </p>

                            <p className="font-bold text-slate-800">
                              {readingStatusLabel(
                                readingStatus
                              )}
                            </p>
                          </div>

                          {workspaceItems[
                            article.id
                          ]
                            ?.last_opened_at && (
                            <div>
                              <p className="text-xs text-slate-500">
                                Last Opened
                              </p>

                              <p className="text-sm font-semibold text-slate-700">
                                {formatWorkspaceDate(
                                  workspaceItems[
                                    article.id
                                  ]
                                    .last_opened_at
                                )}
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs text-slate-500">
                              Year
                            </p>

                            <p className="font-bold">
                              {article.year ||
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Citations
                            </p>

                            <p className="font-bold">
                              {article.citations ??
                                0}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Journal
                            </p>

                            <p className="line-clamp-2 text-sm font-semibold">
                              {article.journal ||
                                "Unknown"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              DOI
                            </p>

                            <p className="text-sm font-semibold">
                              {article.doi
                                ? "Available"
                                : "Not Available"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </section>
        )}

      {!loading &&
        articles.length > 0 &&
        filteredArticles.length ===
          0 && (
          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="text-xl font-black">
              No matching article found
            </h2>

            <p className="mt-2 text-slate-500">
              No saved papers match the
              current workspace filter or
              search term.
            </p>

            <button
              type="button"
              onClick={() => {
                setWorkspaceFilter(
                  "all"
                );
                setSearch("");
              }}
              className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800"
            >
              Show All Papers
            </button>
          </section>
        )}
    </main>
  );
}