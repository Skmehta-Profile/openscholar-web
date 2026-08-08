"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type NotesArticle = {
  id: string;
  title: string | null;
  authors: string | null;
  journal: string | null;
  year: number | null;
  doi: string | null;
};

type PaperNotesDialogProps = {
  open: boolean;
  article: NotesArticle | null;
  onClose: () => void;
};

type NotesRecord = {
  id: string;
  user_id: string;
  saved_article_id: string;
  general_notes: string | null;
  key_findings: string | null;
  methods: string | null;
  relevance: string | null;
  citation_note: string | null;
  tags: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

function cleanText(value: string | null) {
  return value?.replace(/<[^>]+>/g, "") || "";
}

function normalizeDoi(value: string | null) {
  if (!value) {
    return "";
  }

  return value
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

function tagsToText(tags: string[] | null | undefined) {
  return (tags || []).join(", ");
}

function textToTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 30);
}

export default function PaperNotesDialog({
  open,
  article,
  onClose,
}: PaperNotesDialogProps) {
  const [generalNotes, setGeneralNotes] = useState("");
  const [keyFindings, setKeyFindings] = useState("");
  const [methods, setMethods] = useState("");
  const [relevance, setRelevance] = useState("");
  const [citationNote, setCitationNote] = useState("");
  const [tagsText, setTagsText] = useState("");

  const [existingRecord, setExistingRecord] =
    useState<NotesRecord | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  const tags = useMemo(
    () => textToTags(tagsText),
    [tagsText]
  );

  useEffect(() => {
  if (!open || !article) {
    return;
  }

  const currentArticle = article;

  let cancelled = false;

  async function loadNotes() {
      setLoading(true);
      setLoadError("");
      setMessage("");
      setExistingRecord(null);

      setGeneralNotes("");
      setKeyFindings("");
      setMethods("");
      setRelevance("");
      setCitationNote("");
      setTagsText("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (!cancelled) {
            setLoadError(
              "Please sign in to access your research notes."
            );
          }
          return;
        }

        const { data, error } = await supabase
          .from("research_paper_notes")
          .select(
            `
              id,
              user_id,
              saved_article_id,
              general_notes,
              key_findings,
              methods,
              relevance,
              citation_note,
              tags,
              created_at,
              updated_at
            `
          )
          .eq("user_id", user.id)
          .eq("saved_article_id", currentArticle.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!cancelled && data) {
          const record = data as NotesRecord;

          setExistingRecord(record);
          setGeneralNotes(record.general_notes || "");
          setKeyFindings(record.key_findings || "");
          setMethods(record.methods || "");
          setRelevance(record.relevance || "");
          setCitationNote(record.citation_note || "");
          setTagsText(tagsToText(record.tags));
        }
      } catch (error) {
        console.error("Unable to load paper notes:", error);

        if (!cancelled) {
          setLoadError(
            "Unable to load your research notes."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNotes();

    return () => {
      cancelled = true;
    };
  }, [open, article]);

  if (!open || !article) {
    return null;
  }

  const doi = normalizeDoi(article.doi);

  const hasContent =
    generalNotes.trim().length > 0 ||
    keyFindings.trim().length > 0 ||
    methods.trim().length > 0 ||
    relevance.trim().length > 0 ||
    citationNote.trim().length > 0 ||
    tags.length > 0;

  async function saveNotes() {
  if (!article) {
    return;
  }

  const currentArticle = article;

  setSaving(true);
  setMessage("");
  setLoadError("");

  try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoadError(
          "Please sign in to save research notes."
        );
        return;
      }

      const payload = {
        user_id: user.id,
        saved_article_id: currentArticle.id,

        general_notes:
          generalNotes.trim() || null,

        key_findings:
          keyFindings.trim() || null,

        methods:
          methods.trim() || null,

        relevance:
          relevance.trim() || null,

        citation_note:
          citationNote.trim() || null,

        tags,
      };

      const {
        data,
        error,
      } = await supabase
        .from("research_paper_notes")
        .upsert(payload, {
          onConflict:
            "user_id,saved_article_id",
        })
        .select(
          `
            id,
            user_id,
            saved_article_id,
            general_notes,
            key_findings,
            methods,
            relevance,
            citation_note,
            tags,
            created_at,
            updated_at
          `
        )
        .single();

      if (error) {
        throw error;
      }

      setExistingRecord(
        data as NotesRecord
      );

      setMessage(
        existingRecord
          ? "Research notes updated."
          : "Research notes saved."
      );
    } catch (error) {
      console.error(
        "Unable to save paper notes:",
        error
      );

      setLoadError(
        "Unable to save your research notes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotes() {
    if (!existingRecord) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete all notes for this paper? This cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");
    setLoadError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadError(
          "Please sign in to delete research notes."
        );
        return;
      }

      const { error } =
        await supabase
          .from("research_paper_notes")
          .delete()
          .eq("id", existingRecord.id)
          .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setExistingRecord(null);

      setGeneralNotes("");
      setKeyFindings("");
      setMethods("");
      setRelevance("");
      setCitationNote("");
      setTagsText("");

      setMessage(
        "Research notes deleted."
      );
    } catch (error) {
      console.error(
        "Unable to delete paper notes:",
        error
      );

      setLoadError(
        "Unable to delete your research notes."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setMessage("");
    setLoadError("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[180] overflow-y-auto bg-slate-950/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paper-notes-dialog-title"
    >
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-200 bg-white px-8 py-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-700">
              Research Notes Workspace
            </p>

            <h2
              id="paper-notes-dialog-title"
              className="mt-3 text-3xl font-black text-slate-950"
            >
              Paper Insights
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Record what matters about this paper so you can
              retrieve the idea quickly when analysing literature
              or writing a manuscript.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close notes workspace"
          >
            ×
          </button>
        </div>

        <div className="p-8">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-xl font-black leading-snug text-slate-950">
              {cleanText(article.title) || "Untitled article"}
            </h3>

            <p className="mt-3 text-sm text-slate-500">
              {article.authors || "Authors not available"}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
              <span>
                {article.journal || "Unknown source"}
              </span>

              {article.year && (
                <>
                  <span>·</span>
                  <span>{article.year}</span>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {doi && (
                <a
                  href={`https://doi.org/${doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200"
                >
                  DOI: {doi}
                </a>
              )}

              {existingRecord && (
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  Notes saved
                </span>
              )}
            </div>
          </section>

          {loadError && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
              {loadError}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
              {message}
            </div>
          )}

          {loading ? (
            <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-700" />

              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading your research notes...
              </p>
            </div>
          ) : (
            <div className="mt-7 space-y-6">
              <section>
                <label className="text-sm font-black text-slate-800">
                  General Notes
                </label>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Overall observations, interpretation, comments,
                  questions or ideas about the paper.
                </p>

                <textarea
                  value={generalNotes}
                  onChange={(event) =>
                    setGeneralNotes(event.target.value)
                  }
                  rows={6}
                  placeholder="What should you remember about this paper?"
                  className="mt-3 w-full resize-y rounded-2xl border border-slate-300 px-5 py-4 leading-7 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section>
                  <label className="text-sm font-black text-slate-800">
                    Key Findings
                  </label>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Main results, conclusions or observations worth
                    citing later.
                  </p>

                  <textarea
                    value={keyFindings}
                    onChange={(event) =>
                      setKeyFindings(event.target.value)
                    }
                    rows={8}
                    placeholder="Important findings, numerical results, conclusions..."
                    className="mt-3 w-full resize-y rounded-2xl border border-slate-300 px-5 py-4 leading-7 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </section>

                <section>
                  <label className="text-sm font-black text-slate-800">
                    Methods / Approach
                  </label>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Experimental design, datasets, analytical
                    methods or techniques you may want to revisit.
                  </p>

                  <textarea
                    value={methods}
                    onChange={(event) =>
                      setMethods(event.target.value)
                    }
                    rows={8}
                    placeholder="Methods, experimental design, instruments, statistical analysis..."
                    className="mt-3 w-full resize-y rounded-2xl border border-slate-300 px-5 py-4 leading-7 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </section>
              </div>

              <section>
                <label className="text-sm font-black text-slate-800">
                  Why This Paper Matters
                </label>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Record how this work relates to your hypothesis,
                  project, discussion, proposal or future study.
                </p>

                <textarea
                  value={relevance}
                  onChange={(event) =>
                    setRelevance(event.target.value)
                  }
                  rows={5}
                  placeholder="Why is this paper relevant to your research?"
                  className="mt-3 w-full resize-y rounded-2xl border border-slate-300 px-5 py-4 leading-7 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </section>

              <section className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-6">
                <label className="text-sm font-black text-indigo-900">
                  Citation Note
                </label>

                <p className="mt-1 text-xs leading-5 text-indigo-700">
                  Record where or why you expect to cite this paper.
                </p>

                <textarea
                  value={citationNote}
                  onChange={(event) =>
                    setCitationNote(event.target.value)
                  }
                  rows={4}
                  placeholder="Example: Cite when discussing algal biosorption of heavy metals..."
                  className="mt-3 w-full resize-y rounded-2xl border border-indigo-200 bg-white px-5 py-4 leading-7 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </section>

              <section>
                <label className="text-sm font-black text-slate-800">
                  Research Tags
                </label>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Separate tags with commas. These will later help
                  you search and group your literature.
                </p>

                <input
                  value={tagsText}
                  onChange={(event) =>
                    setTagsText(event.target.value)
                  }
                  placeholder="heavy metals, algae, biosorption, wastewater"
                  className="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-4 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />

                {tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs leading-5 text-slate-500">
                These notes are private to your OpenScholar account.
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Removing the saved paper will also remove its linked
                research notes.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {existingRecord && (
                <button
                  type="button"
                  onClick={deleteNotes}
                  disabled={saving}
                  className="rounded-xl border border-rose-200 px-5 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete Notes
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={saveNotes}
                disabled={saving || loading || !hasContent}
                className="rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : existingRecord
                    ? "Update Notes"
                    : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}