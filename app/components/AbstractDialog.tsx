"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

type AbstractArticle = {
  id: string;
  article_id: string | null;
  title: string | null;
  authors: string | null;
  journal: string | null;
  year: number | null;
  doi: string | null;
  citations: number | null;
  is_open_access: boolean | null;
};

type AbstractMetadata = {
  id: string | null;
  title: string | null;
  abstract: string | null;
  journal: string | null;
  year: number | null;
  citations: number | null;
  doi: string | null;
  isOpenAccess: boolean;
  openAccessUrl: string | null;
  topics: string[];
  concepts: string[];
};

type AbstractDialogProps = {
  open: boolean;
  article: AbstractArticle | null;
  onClose: () => void;
};

function cleanText(
  value: string | null
) {
  return (
    value
      ?.replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim() || ""
  );
}

function normalizeDoi(
  value: string | null
) {
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

export default function AbstractDialog({
  open,
  article,
  onClose,
}: AbstractDialogProps) {
  const [
    metadata,
    setMetadata,
  ] =
    useState<AbstractMetadata | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!open || !article) {
      return;
    }

    let cancelled = false;

    async function loadAbstract() {
      setLoading(true);
      setError("");
      setMetadata(null);

      try {
        const params =
          new URLSearchParams();

        if (
          article?.article_id
        ) {
          params.set(
            "article_id",
            article.article_id
          );
        }

        if (article?.doi) {
          params.set(
            "doi",
            article.doi
          );
        }

        const response =
          await fetch(
            `/api/publications/abstract?${params.toString()}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Abstract could not be loaded."
          );
        }

        if (!cancelled) {
          setMetadata(
            data as AbstractMetadata
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Abstract could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAbstract();

    return () => {
      cancelled = true;
    };
  }, [open, article]);

  if (!open || !article) {
    return null;
  }

  const title =
    cleanText(
      metadata?.title ||
        article.title
    ) || "Untitled article";

  const journal =
    metadata?.journal ||
    article.journal ||
    "Unknown source";

  const year =
    metadata?.year ||
    article.year;

  const citations =
    metadata?.citations ??
    article.citations ??
    0;

  const doi =
    normalizeDoi(
      metadata?.doi ||
        article.doi
    );

  const isOpenAccess =
    metadata?.isOpenAccess ??
    article.is_open_access ??
    false;

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/65 px-5 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="abstract-workspace-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-100 bg-white px-7 py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-700">
              Abstract Workspace
            </p>

            <h2
              id="abstract-workspace-title"
              className="mt-2 text-2xl font-black text-slate-950"
            >
              Read Abstract
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Evaluate the paper before
              opening the full text.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close abstract workspace"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-slate-50"
          >
            ×
          </button>
        </div>

        <div className="p-7">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-2xl font-black leading-8 text-slate-950">
              {title}
            </h3>

            <p className="mt-3 text-sm font-medium text-slate-500">
              {article.authors ||
                "Authors not available"}
            </p>

            <p className="mt-3 font-bold text-slate-800">
              {journal}
              {year
                ? ` · ${year}`
                : ""}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                {citations} citations
              </span>

              {doi && (
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  DOI Available
                </span>
              )}

              {isOpenAccess && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Open Access
                </span>
              )}
            </div>
          </section>

          <section className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
              Abstract
            </p>

            {loading ? (
              <div className="mt-4 rounded-3xl border border-indigo-100 bg-indigo-50/50 p-7">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-700" />

                  <p className="text-sm font-semibold text-slate-500">
                    Retrieving abstract
                    from OpenAlex...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <p className="font-bold text-amber-900">
                  Abstract unavailable
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-700">
                  {error}
                </p>
              </div>
            ) : metadata?.abstract ? (
              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
                <p className="select-text text-base leading-8 text-slate-700">
                  {
                    metadata.abstract
                  }
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="font-bold text-slate-800">
                  Abstract not available
                  in OpenAlex
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  The publication record
                  exists, but OpenAlex does
                  not currently provide an
                  abstract for this work.
                </p>
              </div>
            )}
          </section>

          {metadata?.topics &&
            metadata.topics.length >
              0 && (
              <section className="mt-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Research Topics
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {metadata.topics.map(
                    (topic) => (
                      <span
                        key={topic}
                        className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700"
                      >
                        {topic}
                      </span>
                    )
                  )}
                </div>
              </section>
            )}

          {metadata?.concepts &&
            metadata.concepts.length >
              0 && (
              <section className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Concepts
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {metadata.concepts.map(
                    (concept) => (
                      <span
                        key={
                          concept
                        }
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        {concept}
                      </span>
                    )
                  )}
                </div>
              </section>
            )}

          {doi && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                DOI
              </p>

              <a
                href={`https://doi.org/${doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block break-all text-sm font-bold text-indigo-700 hover:underline"
              >
                {doi}
              </a>
            </section>
          )}

          <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
            <Link
              href={`/reader/${article.id}`}
              className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
            >
              Read in App
            </Link>

            {metadata
              ?.openAccessUrl && (
              <a
                href={
                  metadata.openAccessUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Open Full Text
              </a>
            )}

            {doi && (
              <a
                href={`https://doi.org/${doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-indigo-200 px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
              >
                Open DOI
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}