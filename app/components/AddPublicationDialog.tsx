"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type AddedPublication = {
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

type DoiLookupPublication = {
  id: string;
  openAlexUrl: string | null;
  openAlexWorkId: string | null;
  title: string;
  authors: string;
  journal: string;
  year: number | null;
  publicationDate: string | null;
  type: string;
  doi: string;
  doiUrl: string;
  sourceUrl: string;
  fullTextUrl: string | null;
  isOpenAccess: boolean;
  licenseUrl: string | null;
  abstract: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  biblio: string;
  citations: number;
  metadataSource: string;
};

type DoiLookupResponse = {
  publication: DoiLookupPublication | null;
  message?: string;
  error?: string;
};

type Props = {
  open: boolean;

  user: User;

  researcherId: string;

  existingOpenAlexDois: string[];

  existingAddedDois: string[];

  onClose: () => void;

  onSaved: (
    publication: AddedPublication
  ) => void;
};

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

function cleanDoiInput(value: string | null) {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .replace(
      /^https?:\/\/(?:dx\.)?doi\.org\//i,
      ""
    )
    .replace(/^doi:\s*/i, "")
    .trim();
}

export default function AddPublicationDialog({
  open,
  user,
  researcherId,
  existingOpenAlexDois,
  existingAddedDois,
  onClose,
  onSaved,
}: Props) {
  const [doiInput, setDoiInput] =
    useState("");

  const [doiLookupLoading, setDoiLookupLoading] =
    useState(false);

  const [doiLookupError, setDoiLookupError] =
    useState("");

  const [
    doiLookupPublication,
    setDoiLookupPublication,
  ] =
    useState<DoiLookupPublication | null>(
      null
    );

  const [
    addedPublicationNotes,
    setAddedPublicationNotes,
  ] = useState("");

  const [
    addedPublicationSubmitting,
    setAddedPublicationSubmitting,
  ] = useState(false);

  function resetDialog() {
    setDoiInput("");
    setDoiLookupPublication(null);
    setDoiLookupError("");
    setAddedPublicationNotes("");
  }

  function closeDialog() {
    if (addedPublicationSubmitting) {
      return;
    }

    resetDialog();
    onClose();
  }

  async function lookupMissingPublication() {
    const doi = cleanDoiInput(doiInput);

    if (!doi) {
      setDoiLookupError(
        "Enter a DOI before searching."
      );
      return;
    }

    if (
      doi.length < 6 ||
      !doi.toLowerCase().startsWith("10.")
    ) {
      setDoiLookupError(
        "Enter a valid DOI beginning with 10."
      );
      return;
    }

    const normalizedDoi =
      doi.toLowerCase();

    const alreadyInOpenAlex =
      existingOpenAlexDois.some(
        (existingDoi) =>
          cleanDoiInput(
            existingDoi
          ).toLowerCase() ===
          normalizedDoi
      );

    if (alreadyInOpenAlex) {
      setDoiLookupError(
        "This DOI is already present in the OpenAlex publication list."
      );

      setDoiLookupPublication(null);
      return;
    }

    const alreadyAdded =
      existingAddedDois.some(
        (existingDoi) =>
          cleanDoiInput(
            existingDoi
          ).toLowerCase() ===
          normalizedDoi
      );

    if (alreadyAdded) {
      setDoiLookupError(
        "This DOI has already been added to this profile."
      );

      setDoiLookupPublication(null);
      return;
    }

    setDoiLookupLoading(true);
    setDoiLookupError("");
    setDoiLookupPublication(null);

    try {
      const response = await fetch(
        `/api/publications/doi?doi=${encodeURIComponent(
          doi
        )}`
      );

      const lookupData =
        (await response.json()) as
          DoiLookupResponse;

      if (!response.ok) {
        setDoiLookupError(
          lookupData.error ||
            "Unable to retrieve publication metadata."
        );
        return;
      }

      if (!lookupData.publication) {
        setDoiLookupError(
          "No publication metadata was returned."
        );
        return;
      }

      setDoiLookupPublication(
        lookupData.publication
      );
    } catch (lookupError) {
      console.error(
        "DOI lookup failed:",
        lookupError
      );

      setDoiLookupError(
        "Unable to contact the DOI lookup service."
      );
    } finally {
      setDoiLookupLoading(false);
    }
  }

  async function saveMissingPublication() {
    if (!doiLookupPublication) {
      return;
    }

    setAddedPublicationSubmitting(true);
    setDoiLookupError("");

    try {
      const payload = {
        user_id: user.id,

        openalex_author_id:
          researcherId.toUpperCase(),

        openalex_work_id:
          doiLookupPublication.openAlexWorkId,

        doi:
          cleanDoiInput(
            doiLookupPublication.doi
          ) || null,

        title:
          stripHtml(
            doiLookupPublication.title
          ),

        authors:
          doiLookupPublication.authors,

        journal:
          doiLookupPublication.journal ||
          null,

        publication_year:
          doiLookupPublication.year,

        publication_date:
          doiLookupPublication.publicationDate,

        publication_type:
          doiLookupPublication.type ||
          "article",

        source_url:
          doiLookupPublication.sourceUrl ||
          doiLookupPublication.doiUrl ||
          null,

        full_text_url:
          doiLookupPublication.fullTextUrl,

        is_open_access:
          doiLookupPublication.isOpenAccess,

        notes:
          addedPublicationNotes.trim() ||
          null,

        verification_status:
          "pending" as const,

        verification_source:
          "crossref" as const,
      };

      const {
        data: insertedPublication,
        error: insertionError,
      } = await supabase
        .from(
          "researcher_publication_additions"
        )
        .insert(payload)
        .select("*")
        .single();

      if (insertionError) {
        throw insertionError;
      }

      onSaved(
        insertedPublication as AddedPublication
      );

      resetDialog();
      onClose();
    } catch (saveError) {
      console.error(
        "Unable to add missing publication:",
        saveError
      );

      const message =
        saveError &&
        typeof saveError === "object" &&
        "message" in saveError
          ? String(saveError.message)
          : "Unable to save the publication.";

      setDoiLookupError(message);
    } finally {
      setAddedPublicationSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 px-5 py-8 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-add-publication-title"
      onClick={closeDialog}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
              Publication Curation
            </p>

            <h2
              id="shared-add-publication-title"
              className="mt-2 text-2xl font-black text-slate-950"
            >
              Add Missing Publication
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter a DOI to retrieve
              bibliographic metadata before
              adding the publication.
            </p>
          </div>

          <button
            type="button"
            onClick={closeDialog}
            disabled={
              addedPublicationSubmitting
            }
            aria-label="Close add publication dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="mt-7">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Digital Object Identifier
          </label>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              value={doiInput}
              onChange={(event) => {
                setDoiInput(
                  event.target.value
                );

                setDoiLookupError("");
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !doiLookupLoading
                ) {
                  event.preventDefault();

                  lookupMissingPublication();
                }
              }}
              placeholder="Example: 10.1016/j.chemosphere.2005.06.031"
              className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-5 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />

            <button
              type="button"
              onClick={
                lookupMissingPublication
              }
              disabled={
                doiLookupLoading ||
                !doiInput.trim()
              }
              className="rounded-2xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {doiLookupLoading
                ? "Looking up..."
                : "Look Up DOI"}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            You may paste either the DOI
            itself or the complete doi.org
            URL.
          </p>
        </div>

        {doiLookupError && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-800">
            {doiLookupError}
          </div>
        )}

        {doiLookupPublication && (
          <div className="mt-7">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Crossref metadata
                </span>

                {doiLookupPublication.isOpenAccess && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                    Open Access
                  </span>
                )}

                {doiLookupPublication.year && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    {
                      doiLookupPublication.year
                    }
                  </span>
                )}
              </div>

              <h3 className="mt-4 text-xl font-black leading-8 text-slate-950">
                {stripHtml(
                  doiLookupPublication.title
                )}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {
                  doiLookupPublication.authors
                }
              </p>

              <p className="mt-3 font-bold text-slate-800">
                {
                  doiLookupPublication.journal
                }
              </p>

              {doiLookupPublication.biblio && (
                <p className="mt-1 text-sm text-slate-500">
                  {
                    doiLookupPublication.biblio
                  }
                </p>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    DOI
                  </p>

                  <p className="mt-2 break-all text-sm font-semibold text-indigo-700">
                    {
                      doiLookupPublication.doi
                    }
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Publication Type
                  </p>

                  <p className="mt-2 text-sm font-semibold capitalize text-slate-700">
                    {doiLookupPublication.type.replaceAll(
                      "-",
                      " "
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={
                    doiLookupPublication.doiUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700"
                >
                  Open DOI
                </a>

                {doiLookupPublication.fullTextUrl && (
                  <a
                    href={
                      doiLookupPublication.fullTextUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700"
                  >
                    Full Text
                  </a>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Owner note
              </label>

              <textarea
                value={
                  addedPublicationNotes
                }
                onChange={(event) =>
                  setAddedPublicationNotes(
                    event.target.value
                  )
                }
                rows={4}
                maxLength={1000}
                placeholder="Optional note explaining why this publication should be added."
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs leading-5 text-amber-900">
              The publication will initially
              be stored as pending. It can be
              reviewed before becoming part of
              the public curated profile.
            </div>
          </div>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={closeDialog}
            disabled={
              addedPublicationSubmitting
            }
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              saveMissingPublication
            }
            disabled={
              !doiLookupPublication ||
              addedPublicationSubmitting
            }
            className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addedPublicationSubmitting
              ? "Saving..."
              : "Save Publication"}
          </button>
        </div>
      </div>
    </div>
  );
}