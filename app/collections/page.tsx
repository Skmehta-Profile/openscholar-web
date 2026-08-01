"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Collection = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type CollectionWithCount = Collection & {
  article_count: number;
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCollections([]);
      setLoading(false);
      return;
    }

    const { data: collectionsData, error: collectionsError } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (collectionsError) {
      setMessage("Unable to load collections.");
      setLoading(false);
      return;
    }

    const collectionIds = (collectionsData ?? []).map((item) => item.id);

    if (collectionIds.length === 0) {
      setCollections([]);
      setLoading(false);
      return;
    }

    const { data: articleLinks, error: articleLinksError } = await supabase
      .from("collection_articles")
      .select("collection_id")
      .eq("user_id", user.id)
      .in("collection_id", collectionIds);

    if (articleLinksError) {
      setCollections(
        (collectionsData ?? []).map((item) => ({
          ...item,
          article_count: 0,
        }))
      );
      setLoading(false);
      return;
    }

    const countMap = new Map<string, number>();

    for (const link of articleLinks ?? []) {
      const currentCount = countMap.get(link.collection_id) ?? 0;
      countMap.set(link.collection_id, currentCount + 1);
    }

    const collectionsWithCounts = (collectionsData ?? []).map((item) => ({
      ...item,
      article_count: countMap.get(item.id) ?? 0,
    }));

    setCollections(collectionsWithCounts);
    setLoading(false);
  }

  async function createCollection() {
  const cleanName = name.trim();
  const cleanDescription = description.trim();

  if (!cleanName) {
    setMessage("Please enter a collection name.");
    return;
  }

  setSaving(true);
  setMessage("");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setMessage("Please sign in to create collections.");
    setSaving(false);
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, collection_limit")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan || "free";
  const collectionLimit = profile?.collection_limit ?? 3;

  if (plan === "free" && collections.length >= collectionLimit) {
    setMessage(
      `Free plan allows up to ${collectionLimit} collections. Upgrade to OpenScholar Premium for unlimited collections.`
    );
    setSaving(false);
    return;
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name: cleanName,
      description: cleanDescription || null,
    })
    .select()
    .single();

  if (error) {
    setMessage("Unable to create collection.");
    setSaving(false);
    return;
  }

  setCollections((prev) => [{ ...data, article_count: 0 }, ...prev]);
  setName("");
  setDescription("");
  setMessage("Collection created.");
  setSaving(false);
}

  async function deleteCollection(id: string) {
    const { error } = await supabase.from("collections").delete().eq("id", id);

    if (error) {
      setMessage("Unable to delete collection.");
      return;
    }

    setCollections((prev) => prev.filter((item) => item.id !== id));
    setMessage("Collection deleted.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
            OpenScholar Library
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Collections
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Organize saved research papers into focused academic folders such as
            thesis literature, review articles, project references, and teaching
            material.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold">Create collection</h2>

            <p className="mt-2 text-sm text-slate-400">
              Start a new folder for your saved papers.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Collection name
                </label>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Example: Algal nanotechnology"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional short note about this collection"
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
                />
              </div>

              <button
                onClick={createCollection}
                disabled={saving}
                className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Collection"}
              </button>

              {message && (
                <p className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                  {message}
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">My collections</h2>

                <p className="mt-1 text-sm text-slate-400">
                  {collections.length} collection
                  {collections.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-300">
                Loading collections...
              </div>
            ) : collections.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
                <h3 className="text-xl font-semibold">No collections yet</h3>

                <p className="mt-2 text-slate-400">
                  Create your first collection to organize your research library.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {collections.map((collection) => (
                  <article
                    key={collection.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-300/50 hover:bg-white/[0.06]"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span className="inline-flex rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Collection
                      </span>

                      <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                        {collection.article_count}{" "}
                        {collection.article_count === 1 ? "paper" : "papers"}
                      </span>
                    </div>

                    <Link
                      href={`/collections/${collection.id}`}
                      className="block text-xl font-bold leading-snug transition hover:text-emerald-300"
                    >
                      {collection.name}
                    </Link>

                    {collection.description ? (
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {collection.description}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No description added.
                      </p>
                    )}

                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                      <p className="text-xs text-slate-500">
                        Created{" "}
                        {new Date(collection.created_at).toLocaleDateString()}
                      </p>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/collections/${collection.id}`}
                          className="rounded-full border border-emerald-300/30 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-300/10"
                        >
                          Open
                        </Link>

                        <button
                          onClick={() => deleteCollection(collection.id)}
                          className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}