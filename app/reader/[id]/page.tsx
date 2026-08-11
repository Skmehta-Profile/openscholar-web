"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  pdf_url: string | null;
  source_url: string | null;
};

type ReadingStatus =
  | "want_to_read"
  | "reading"
  | "completed"
  | "paused";

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

function cleanText(value: string | null) {
  return value?.replace(/<[^>]+>/g, "") || "";
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

function readingStatusClasses(
  status: ReadingStatus
) {
  switch (status) {
    case "reading":
      return "border-blue-300/30 bg-blue-300/10 text-blue-300";

    case "completed":
      return "border-emerald-300/30 bg-emerald-300/10 text-emerald-300";

    case "paused":
      return "border-amber-300/30 bg-amber-300/10 text-amber-300";

    case "want_to_read":
    default:
      return "border-white/10 bg-white/10 text-slate-300";
  }
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
    );

    const updated = [
      viewedPaper,
      ...existing.filter(
        (item: { id?: string }) =>
          item.id !== article.id
      ),
    ].slice(0, 10);

    localStorage.setItem(
      "openscholar_recently_viewed",
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error(
      "Unable to update Recently Viewed:",
      error
    );
  }
}

export default function ReaderPage() {
  const params = useParams();

  const articleId =
    params.id as string;

  const [article, setArticle] =
    useState<SavedArticle | null>(null);

  const [
    workspaceItem,
    setWorkspaceItem,
  ] = useState<WorkspaceItem | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (articleId) {
      loadArticle();
    }
  }, [articleId]);

  async function loadArticle() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      setMessage(
        "Please sign in to read this paper."
      );
      setLoading(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("saved_articles")
      .select("*")
      .eq("id", articleId)
      .eq("user_id", user.id)
      .single();

    if (
      error ||
      !data
    ) {
      setMessage(
        "Article not found or access denied."
      );
      setLoading(false);
      return;
    }

    const savedArticle =
      data as SavedArticle;

    setArticle(savedArticle);

    addToRecentlyViewed(
      savedArticle
    );

    await updateWorkspaceOnOpen(
      savedArticle,
      user.id
    );

    setLoading(false);
  }

  async function updateWorkspaceOnOpen(
    savedArticle: SavedArticle,
    userId: string
  ) {
    try {
      const {
        data: existingItem,
        error: existingError,
      } = await supabase
        .from(
          "research_workspace_items"
        )
        .select("*")
        .eq("user_id", userId)
        .eq(
          "saved_article_id",
          savedArticle.id
        )
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      const now =
        new Date().toISOString();

      if (existingItem) {
        const existing =
          existingItem as WorkspaceItem;

        const nextStatus:
          ReadingStatus =
          existing.reading_status ===
            "completed"
            ? "completed"
            : "reading";

        const updatePayload = {
          reading_status:
            nextStatus,

          reading_progress:
            existing.reading_progress,

          started_at:
            existing.started_at ||
            (nextStatus === "reading"
              ? now
              : null),

          completed_at:
            existing.completed_at,

          last_opened_at: now,
        };

        const {
          data: updatedItem,
          error: updateError,
        } = await supabase
          .from(
            "research_workspace_items"
          )
          .update(updatePayload)
          .eq(
            "id",
            existing.id
          )
          .select("*")
          .single();

        if (updateError) {
          throw updateError;
        }

        setWorkspaceItem(
          updatedItem as WorkspaceItem
        );

        return;
      }

      const {
        data: createdItem,
        error: createError,
      } = await supabase
        .from(
          "research_workspace_items"
        )
        .insert({
          user_id: userId,

          saved_article_id:
            savedArticle.id,

          reading_status:
            "reading",

          reading_progress: 0,

          started_at: now,

          completed_at: null,

          last_opened_at: now,
        })
        .select("*")
        .single();

      if (createError) {
        throw createError;
      }

      setWorkspaceItem(
        createdItem as WorkspaceItem
      );
    } catch (workspaceError) {
      console.error(
        "Unable to update reading workspace:",
        workspaceError
      );
    }
  }

  function copyCitation() {
    if (!article) {
      return;
    }

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
    }`;

    navigator.clipboard.writeText(
      citation
    );

    setMessage(
      "Citation copied."
    );

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  }

  function printPaper() {
    window.print();
  }

  const pdfUrl =
    article?.pdf_url ||
    article?.source_url ||
    article?.doi ||
    article?.article_id ||
    "";

  const sourceUrl =
    article?.source_url ||
    article?.article_id ||
    article?.doi ||
    article?.pdf_url ||
    "";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/library"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-emerald-300/40 hover:text-emerald-300"
          >
            ← Back to Library
          </Link>

          <Link
            href="/collections"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-emerald-300/40 hover:text-emerald-300"
          >
            Collections
          </Link>
        </div>

        {message && (
          <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-4 text-sm font-bold text-emerald-200 shadow-xl">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-300">
            Loading reader...
          </div>
        ) : !article ? (
          <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-8 text-red-200">
            Article not available.
          </div>
        ) : (
          <>
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    OpenScholar-Web Reader
                  </p>

                  <h1 className="mt-4 max-w-5xl text-4xl font-bold leading-tight">
                    {cleanText(
                      article.title
                    ) ||
                      "Untitled article"}
                  </h1>

                  <p className="mt-4 text-slate-400">
                    {article.authors ||
                      "Authors not available"}
                  </p>

                  <p className="mt-3 font-semibold text-slate-200">
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
                </div>

                {workspaceItem && (
                  <div className="shrink-0 rounded-3xl border border-white/10 bg-white/[0.04] p-5 lg:w-64">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
                      Research Workspace
                    </p>

                    <div className="mt-4">
                      <p className="text-xs text-slate-500">
                        Reading Status
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${readingStatusClasses(
                          workspaceItem.reading_status
                        )}`}
                      >
                        {readingStatusLabel(
                          workspaceItem.reading_status
                        )}
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-slate-500">
                        Progress
                      </p>

                      <p className="mt-1 text-lg font-black text-white">
                        {
                          workspaceItem.reading_progress
                        }
                        %
                      </p>
                    </div>

                    {workspaceItem.last_opened_at && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-500">
                          Last Opened
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-300">
                          {new Date(
                            workspaceItem.last_opened_at
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {article.year && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                    {article.year}
                  </span>
                )}

                <span className="rounded-full bg-purple-300/10 px-3 py-1 text-xs font-bold text-purple-300">
                  {article.citations ??
                    0}{" "}
                  citations
                </span>

                {article.is_open_access && (
                  <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-300">
                    Open Access
                  </span>
                )}

                {article.doi && (
                  <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-300">
                    DOI Available
                  </span>
                )}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                  >
                    Open PDF
                  </a>
                )}

                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    download
                    className="rounded-xl border border-emerald-300/30 px-5 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-300/10"
                  >
                    Download PDF
                  </a>
                )}

                <button
                  type="button"
                  onClick={
                    printPaper
                  }
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10"
                >
                  Print
                </button>

                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10"
                  >
                    Open Original
                  </a>
                )}

                <button
                  type="button"
                  onClick={
                    copyCitation
                  }
                  className="rounded-xl border border-purple-300/30 px-5 py-3 text-sm font-bold text-purple-300 transition hover:bg-purple-300/10"
                >
                  Copy Citation
                </button>
              </div>
            </section>

            <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 px-6 py-4">
                <h2 className="text-xl font-bold">
                  Paper Viewer
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  If the PDF does not
                  display, use Open PDF or
                  Download PDF.
                </p>
              </div>

              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="h-[80vh] w-full bg-white"
                  title="OpenScholar PDF Reader"
                />
              ) : (
                <div className="p-10 text-center">
                  <h3 className="text-2xl font-bold">
                    PDF not available
                  </h3>

                  <p className="mt-3 text-slate-400">
                    Open the original source
                    to access this paper.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}