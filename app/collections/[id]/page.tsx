"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Collection = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type SavedArticle = {
  id: string;
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

type CollectionArticle = {
  id: string;
  saved_article_id: string;
  added_at: string | null;
  saved_articles: SavedArticle | null;
};

function cleanText(value: string | null) {
  return value?.replace(/<[^>]+>/g, "") || "";
}

type RecentlyViewedStoredItem = {
  id?: string;
};

function addToRecentlyViewed(article: SavedArticle) {
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
      isOpenAccess: article.is_open_access || false,
      openAccessUrl: article.article_id,
      sourceUrl: article.article_id || "",
      type: "saved article",
      authorList: [],
      institutionList: [],
      authorCount: 0,
      institutionCount: 0,
      abstract: "",
      keywords: [],
      viewedAt: new Date().toISOString(),
    };

    const rawItems = localStorage.getItem(
      "openscholar_recently_viewed"
    );

    const parsedItems: RecentlyViewedStoredItem[] = rawItems
      ? JSON.parse(rawItems)
      : [];

    const existingItems = Array.isArray(parsedItems)
      ? parsedItems
      : [];

    const updatedItems = [
      viewedPaper,
      ...existingItems.filter((item) => item.id !== article.id),
    ].slice(0, 10);

    localStorage.setItem(
      "openscholar_recently_viewed",
      JSON.stringify(updatedItems)
    );
  } catch (error) {
    console.error(
      "Unable to update Recently Viewed:",
      error
    );
  }
}

export default function CollectionDetailPage() {
  const params = useParams();
  const collectionId = params.id as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [articles, setArticles] = useState<CollectionArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    if (collectionId) {
      loadCollection();
    }
  }, [collectionId]);

  async function loadCollection() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please sign in to view this collection.");
      setLoading(false);
      return;
    }

    const { data: collectionData, error: collectionError } = await supabase
      .from("collections")
      .select("*")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .single();

    if (collectionError || !collectionData) {
      setMessage("Collection not found or access denied.");
      setLoading(false);
      return;
    }

    const { data: articleLinks, error: articleError } = await supabase
      .from("collection_articles")
      .select(
        `
        id,
        saved_article_id,
        added_at,
        saved_articles (
          id,
          article_id,
          title,
          authors,
          journal,
          biblio,
          citations,
          is_open_access,
          year,
          doi,
          saved_at
        )
      `
      )
      .eq("collection_id", collectionId)
      .eq("user_id", user.id)
      .order("added_at", { ascending: false });

    if (articleError) {
      setMessage("Unable to load articles in this collection.");
      setLoading(false);
      return;
    }

    setCollection(collectionData);

const normalizedArticleLinks: CollectionArticle[] = (
  articleLinks ?? []
).map((link) => {
  const relatedArticle = Array.isArray(link.saved_articles)
    ? link.saved_articles[0] ?? null
    : link.saved_articles ?? null;

  return {
    id: link.id,
    saved_article_id: link.saved_article_id,
    added_at: link.added_at,
    saved_articles: relatedArticle,
  };
});

setArticles(normalizedArticleLinks);
setLoading(false);
  }

  async function removeFromCollection(linkId: string) {
    const { error } = await supabase
      .from("collection_articles")
      .delete()
      .eq("id", linkId);

    if (error) {
      setMessage("Unable to remove article from collection.");
      return;
    }

    setArticles((prev) => prev.filter((item) => item.id !== linkId));
    setMessage("Article removed from collection.");
  }

  const filteredArticles = useMemo(() => {
    const q = search.toLowerCase().trim();

    let list = articles.filter((link) => {
      const article = link.saved_articles;

      if (!article) return false;

      return [
        article.title,
        article.authors,
        article.journal,
        article.biblio,
        article.doi,
        article.year?.toString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    if (sort === "cited") {
      list = [...list].sort(
        (a, b) =>
          (b.saved_articles?.citations || 0) -
          (a.saved_articles?.citations || 0)
      );
    }

    if (sort === "newestYear") {
      list = [...list].sort(
        (a, b) =>
          (b.saved_articles?.year || 0) - (a.saved_articles?.year || 0)
      );
    }

    if (sort === "oldestYear") {
      list = [...list].sort(
        (a, b) =>
          (a.saved_articles?.year || 9999) -
          (b.saved_articles?.year || 9999)
      );
    }

    if (sort === "recent") {
      list = [...list].sort(
        (a, b) =>
          new Date(b.added_at || 0).getTime() -
          new Date(a.added_at || 0).getTime()
      );
    }

    return list;
  }, [articles, search, sort]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <Link
          href="/collections"
          className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-emerald-300/40 hover:text-emerald-300"
        >
          ← Back to Collections
        </Link>

        {message && (
          <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-4 text-sm font-bold text-emerald-200 shadow-xl">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-300">
            Loading collection...
          </div>
        ) : message && !collection ? (
          <div className="mt-10 rounded-3xl border border-red-400/20 bg-red-400/10 p-8 text-red-200">
            {message}
          </div>
        ) : collection ? (
          <>
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    OpenScholar Collection
                  </p>

                  <h1 className="mt-4 text-4xl font-bold tracking-tight">
                    {collection.name}
                  </h1>

                  {collection.description ? (
                    <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                      {collection.description}
                    </p>
                  ) : (
                    <p className="mt-4 text-slate-500">
                      No description added for this collection.
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 px-6 py-5 text-center">
                  <p className="text-3xl font-black text-emerald-300">
                    {articles.length}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-300">
                    {articles.length === 1 ? "paper" : "papers"}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-5 text-sm text-slate-500">
                Created {new Date(collection.created_at).toLocaleDateString()}
              </div>
            </div>

            {articles.length > 0 && (
              <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search this collection..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300 lg:max-w-xl"
                  />

                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-4 text-sm font-bold text-white outline-none focus:border-emerald-300"
                  >
                    <option value="recent">Sort: Recently Added</option>
                    <option value="cited">Sort: Most Cited</option>
                    <option value="newestYear">Sort: Newest Year</option>
                    <option value="oldestYear">Sort: Oldest Year</option>
                  </select>
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  Showing {filteredArticles.length} of {articles.length} papers
                </p>
              </section>
            )}

            {articles.length === 0 ? (
              <section className="mt-8 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
                <h2 className="text-2xl font-bold">No articles added yet</h2>

                <p className="mt-3 text-slate-400">
                  Go to My Library and use “Add to Collection” to place saved
                  papers inside this collection.
                </p>

                <Link
                  href="/library"
                  className="mt-6 inline-flex rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                >
                  Go to My Library
                </Link>
              </section>
            ) : filteredArticles.length === 0 ? (
              <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
                <h2 className="text-2xl font-bold">No matching paper found</h2>
                <p className="mt-3 text-slate-400">
                  Try another keyword in this collection.
                </p>
              </section>
            ) : (
              <section className="mt-8 space-y-5">
                {filteredArticles.map((link, index) => {
                  const article = link.saved_articles;

                  if (!article) return null;

                  return (
                    <article
                      key={link.id}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-300/40 hover:bg-white/[0.06]"
                    >
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-300/10 text-lg font-black text-emerald-300">
                          {index + 1}
                        </div>

                        <div>
                          <h2 className="text-2xl font-bold leading-snug">
                            {cleanText(article.title) || "Untitled article"}
                          </h2>

                          <p className="mt-3 text-sm text-slate-400">
                            {article.authors || "Authors not available"}
                          </p>

                          <p className="mt-2 text-sm font-semibold text-slate-300">
                            {article.journal || "Unknown source"}
                          </p>

                          {article.biblio && (
                            <p className="mt-1 text-sm text-slate-500">
                              {article.biblio}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            {article.year && (
                              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                                {article.year}
                              </span>
                            )}

                            <span className="rounded-full bg-purple-300/10 px-3 py-1 text-xs font-bold text-purple-300">
                              {article.citations ?? 0} citations
                            </span>

                            {article.doi && (
                              <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-300">
                                DOI Available
                              </span>
                            )}

                            {article.is_open_access && (
                              <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-300">
                                Open Access
                              </span>
                            )}
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
  <Link
  href={`/reader/${article.id}`}
  onClick={() => addToRecentlyViewed(article)}
    className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800"
  >
    Read in App
  </Link>

  {article.article_id && (
    <a
  href={article.article_id}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => addToRecentlyViewed(article)}
      className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
    >
      Open Source
    </a>
  )}

                            {article.doi && (
                              <a
  href={article.doi}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => addToRecentlyViewed(article)}
                                className="rounded-xl border border-emerald-300/30 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-300/10"
                              >
                                Open DOI
                              </a>
                            )}

                            <button
                              onClick={() => removeFromCollection(link.id)}
                              className="rounded-xl border border-red-400/30 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-400/10"
                            >
                              Remove From Collection
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}