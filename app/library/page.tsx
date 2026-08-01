"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
};

type Collection = {
  id: string;
  name: string;
  description: string | null;
};

function cleanText(value: string | null) {
  return value?.replace(/<[^>]+>/g, "") || "";
}

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

    const existing = JSON.parse(
      localStorage.getItem("openscholar_recently_viewed") || "[]"
    );

    const updated = [
      viewedPaper,
      ...existing.filter((item: any) => item.id !== article.id),
    ].slice(0, 10);

    localStorage.setItem(
      "openscholar_recently_viewed",
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error("Unable to update Recently Viewed", error);
  }
}

export default function LibraryPage() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<SavedArticle | null>(
    null
  );
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
const [newCollectionDescription, setNewCollectionDescription] = useState("");
const [creatingCollection, setCreatingCollection] = useState(false);

  const [loading, setLoading] = useState(true);
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("saved");
  const [collectionCount, setCollectionCount] = useState(0);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setLoading(false);
      return;
    }

    const { data: collectionsData, count } = await supabase
      .from("collections")
      .select("id, name, description", { count: "exact" })
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    setCollections(collectionsData ?? []);
    setCollectionCount(count ?? 0);

    const { data, error } = await supabase
      .from("saved_articles")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("saved_at", { ascending: false });

    if (error) {
      setMessage("Unable to load your library.");
    } else {
      setArticles(data || []);
    }

    setLoading(false);
  }

  async function removeArticle(id: string) {
    const { error } = await supabase
      .from("saved_articles")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("Unable to remove article.");
      return;
    }

    setArticles((prev) => prev.filter((item) => item.id !== id));
    setMessage("Article removed from library.");
  }

  function openCollectionModal(article: SavedArticle) {
    setSelectedArticle(article);
    setSelectedCollectionId(collections[0]?.id ?? "");
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
  const cleanName = newCollectionName.trim();
  const cleanDescription = newCollectionDescription.trim();

  if (!selectedArticle) {
    setMessage("Please select an article.");
    return;
  }

  if (!cleanName) {
    setMessage("Please enter a collection name.");
    return;
  }

  setCreatingCollection(true);

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    setMessage("Please sign in to create collections.");
    setCreatingCollection(false);
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, collection_limit")
    .eq("id", userData.user.id)
    .single();

  const plan = profile?.plan || "free";
  const collectionLimit = profile?.collection_limit ?? 3;

  if (plan === "free" && collectionCount >= collectionLimit) {
    setMessage(
      `Free plan allows up to ${collectionLimit} collections. Upgrade to OpenScholar Premium for unlimited collections.`
    );
    setCreatingCollection(false);
    return;
  }

  const { data: newCollection, error: collectionError } = await supabase
    .from("collections")
    .insert({
      user_id: userData.user.id,
      name: cleanName,
      description: cleanDescription || null,
    })
    .select("id, name, description")
    .single();

  if (collectionError || !newCollection) {
    setMessage("Unable to create collection.");
    setCreatingCollection(false);
    return;
  }

  const { error: linkError } = await supabase
    .from("collection_articles")
    .insert({
      user_id: userData.user.id,
      collection_id: newCollection.id,
      saved_article_id: selectedArticle.id,
    });

  if (linkError) {
    setMessage("Collection created, but article could not be added.");
    setCreatingCollection(false);
    return;
  }

  setCollections((prev) => [newCollection, ...prev]);
  setCollectionCount((prev) => prev + 1);
  setNewCollectionName("");
  setNewCollectionDescription("");
  setCreatingCollection(false);
  setMessage("Collection created and article added.");
  closeCollectionModal();
}

  async function addArticleToCollection() {
  if (!selectedArticle || !selectedCollectionId) {
    setMessage("Please select a collection.");
    return;
  }

  setAddingToCollection(true);

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    setMessage("Please sign in to add articles to collections.");
    setAddingToCollection(false);
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, papers_per_collection_limit")
    .eq("id", userData.user.id)
    .single();

  const plan = profile?.plan || "free";
  const papersPerCollectionLimit = profile?.papers_per_collection_limit ?? 25;

  const { data: existingLink } = await supabase
    .from("collection_articles")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("collection_id", selectedCollectionId)
    .eq("saved_article_id", selectedArticle.id)
    .maybeSingle();

  if (existingLink) {
    setMessage("This article is already in the selected collection.");
    setAddingToCollection(false);
    return;
  }

  if (plan === "free") {
    const { count } = await supabase
      .from("collection_articles")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userData.user.id)
      .eq("collection_id", selectedCollectionId);

    if ((count ?? 0) >= papersPerCollectionLimit) {
      setMessage(
        `This collection has reached the free-plan limit of ${papersPerCollectionLimit} papers. Upgrade to OpenScholar Premium for unlimited papers per collection.`
      );
      setAddingToCollection(false);
      return;
    }
  }

  const { error } = await supabase.from("collection_articles").insert({
    user_id: userData.user.id,
    collection_id: selectedCollectionId,
    saved_article_id: selectedArticle.id,
  });

  if (error) {
    setMessage("Unable to add article to collection.");
    setAddingToCollection(false);
    return;
  }

  setMessage("Article added to collection.");
  closeCollectionModal();
}

  function copyApaCitation(article: SavedArticle) {
    const citation = `${article.authors || "Unknown author"} (${
      article.year || "n.d."
    }). ${cleanText(article.title) || "Untitled article"}. ${
      article.journal || "Unknown source"
    }${article.biblio ? `, ${article.biblio}` : ""}.${
      article.doi ? ` ${article.doi}` : ""
    }${article.citations ? ` Cited ${article.citations} times.` : ""}`;

    navigator.clipboard.writeText(citation);
    setMessage("APA-style citation copied.");
  }

  const totalCitations = articles.reduce(
    (sum, item) => sum + (item.citations || 0),
    0
  );

  const openAccessCount = articles.filter(
    (item) => item.is_open_access
  ).length;

  const filteredArticles = useMemo(() => {
    const q = search.toLowerCase().trim();

    let list = articles.filter((article) =>
      [
        article.title,
        article.authors,
        article.journal,
        article.doi,
        article.year?.toString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );

    if (sort === "cited") {
      list = [...list].sort(
        (a, b) => (b.citations || 0) - (a.citations || 0)
      );
    }

    if (sort === "newestYear") {
      list = [...list].sort((a, b) => (b.year || 0) - (a.year || 0));
    }

    if (sort === "oldestYear") {
      list = [...list].sort((a, b) => (a.year || 9999) - (b.year || 9999));
    }

    return list;
  }, [articles, search, sort]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {message && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm font-bold text-indigo-700 shadow-xl">
          {message}
        </div>
      )}

      {collectionModalOpen && selectedArticle && (
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

          <p className="mt-2 line-clamp-2 text-sm text-slate-500">
            {cleanText(selectedArticle.title) || "Untitled article"}
          </p>
        </div>

        <button
          onClick={closeCollectionModal}
          className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-50"
        >
          ×
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <p className="text-lg font-black text-slate-950">
            Create your first collection
          </p>

          <p className="mt-2 text-sm text-slate-500">
            You do not have any collections yet. Create one now and this article
            will be added automatically.
          </p>

          <div className="mt-5 space-y-4">
            <input
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder="Example: Thesis Literature"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />

            <textarea
              value={newCollectionDescription}
              onChange={(event) =>
                setNewCollectionDescription(event.target.value)
              }
              placeholder="Optional description"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeCollectionModal}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-white"
              >
                Cancel
              </button>

              <button
                onClick={createCollectionAndAddArticle}
                disabled={creatingCollection}
                className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingCollection ? "Creating..." : "Create & Add Article"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {collections.map((collection) => (
              <label
                key={collection.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                  selectedCollectionId === collection.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="collection"
                  value={collection.id}
                  checked={selectedCollectionId === collection.id}
                  onChange={() => setSelectedCollectionId(collection.id)}
                  className="mt-1"
                />

                <span>
                  <span className="block font-black text-slate-950">
                    {collection.name}
                  </span>

                  {collection.description && (
                    <span className="mt-1 block text-sm text-slate-500">
                      {collection.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={closeCollectionModal}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              onClick={addArticleToCollection}
              disabled={addingToCollection}
              className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addingToCollection ? "Adding..." : "Add to Collection"}
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
            A citation-ready workspace for saved scholarly literature.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">Total Saved</p>
              <p className="mt-2 text-3xl font-black text-indigo-700">
                {articles.length}
              </p>
              <p className="text-sm text-slate-500">articles</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">
                Total Citations
              </p>
              <p className="mt-2 text-3xl font-black text-purple-700">
                {totalCitations}
              </p>
              <p className="text-sm text-slate-500">across saved papers</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">Open Access</p>
              <p className="mt-2 text-3xl font-black text-emerald-600">
                {openAccessCount}
              </p>
              <p className="text-sm text-slate-500">available records</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold text-slate-500">Collections</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {collectionCount}
              </p>
              <p className="text-sm text-slate-500">active collections</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your library..."
            className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 lg:max-w-xl"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-2xl border border-slate-300 px-5 py-4 text-sm font-bold outline-none transition hover:border-indigo-300"
            >
              <option value="saved">Sort: Recently Saved</option>
              <option value="cited">Sort: Most Cited</option>
              <option value="newestYear">Sort: Newest Year</option>
              <option value="oldestYear">Sort: Oldest Year</option>
            </select>

            <Link
              href="/search"
              className="rounded-2xl bg-indigo-700 px-5 py-4 text-center text-sm font-bold text-white transition hover:bg-indigo-800"
            >
              Add More Papers
            </Link>
          </div>
        </div>
      </section>

      {loading && (
        <p className="mt-10 text-slate-500">Loading your saved articles...</p>
      )}

      {!loading && articles.length === 0 && (
        <section className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-3xl font-black text-indigo-700">
            ☆
          </div>

          <h2 className="mt-6 text-2xl font-black text-slate-950">
            No articles saved yet
          </h2>

          <p className="mt-3 text-slate-500">
            Search for papers and click Save to build your personal library.
          </p>

          <Link
            href="/search"
            className="mt-6 inline-flex rounded-2xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white"
          >
            Go to Search
          </Link>
        </section>
      )}

      {!loading && filteredArticles.length > 0 && (
        <section className="mt-10 space-y-5">
          {filteredArticles.map((article, index) => (
            <article
              key={article.id}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-indigo-600 opacity-0 transition group-hover:opacity-100" />

              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-black text-indigo-700">
                    {index + 1}
                  </div>

                  <div>
                    <h2 className="text-2xl font-black leading-snug text-slate-950">
                      {cleanText(article.title) || "Untitled article"}
                    </h2>

                    <p className="mt-3 text-sm font-medium text-slate-500">
                      {article.authors || "Authors not available"}
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {article.journal || "Unknown source"}
                    </p>

                    {article.biblio && (
                      <p className="mt-1 text-sm text-slate-500">
                        {article.biblio}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {article.year && (
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                          {article.year}
                        </span>
                      )}

                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                        {article.citations ?? 0} citations
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
      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
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
                          className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Open DOI
                        </a>
                      )}

                      <button
                        onClick={() => openCollectionModal(article)}
                        className="rounded-xl border border-purple-200 px-4 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50"
                      >
                        Add to Collection
                      </button>

                      <button
                        onClick={() => copyApaCitation(article)}
                        className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        Copy APA
                      </button>

                      <button
                        onClick={() => removeArticle(article.id)}
                        className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div className="hidden w-60 shrink-0 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 lg:block">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
                    Citation Ready
                  </p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">Year</p>
                      <p className="font-bold">{article.year || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Citations</p>
                      <p className="font-bold">{article.citations ?? 0}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Journal</p>
                      <p className="line-clamp-2 text-sm font-semibold">
                        {article.journal || "Unknown"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Bibliography</p>
                      <p className="line-clamp-2 text-sm font-semibold">
                        {article.biblio || "Not available"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">DOI</p>
                      <p className="text-sm font-semibold">
                        {article.doi ? "Available" : "Not Available"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {!loading && articles.length > 0 && filteredArticles.length === 0 && (
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-xl font-black">No matching article found</h2>
          <p className="mt-2 text-slate-500">
            Try another keyword in your library search.
          </p>
        </section>
      )}
    </main>
  );
}