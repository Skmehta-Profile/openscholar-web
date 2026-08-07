"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PendingPublication = {
  id: string;
  title: string;
  authors: string;
  journal: string | null;
  publication_year: number | null;
  doi: string | null;
  notes: string | null;
  verification_status: string;
  verification_source: string | null;
  created_at: string;
  openalex_author_id: string;
};

export default function AdminPublicationReviewPage() {
  const [loading, setLoading] =
    useState(true);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [accessChecked, setAccessChecked] =
    useState(false);

  const [publications, setPublications] =
    useState<PendingPublication[]>([]);

  const [error, setError] =
    useState("");

  const [
    selectedPublication,
    setSelectedPublication,
  ] = useState<PendingPublication | null>(
    null
  );

  const [
    reviewAction,
    setReviewAction,
  ] = useState<
    "verified" | "rejected" | null
  >(null);

  const [reviewNote, setReviewNote] =
    useState("");

  const [
    reviewSubmitting,
    setReviewSubmitting,
  ] = useState(false);

  const [reviewMessage, setReviewMessage] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAdminQueue() {
      setLoading(true);
      setError("");

      try {
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!authData.user) {
          if (mounted) {
            setIsAdmin(false);
            setAccessChecked(true);
          }

          return;
        }

        console.log(
          "Signed-in user UID:",
          authData.user.id
        );

        const {
          data: adminAccess,
          error: adminError,
        } = await supabase.rpc(
          "is_openscholar_admin"
        );

        console.log(
          "Admin access:",
          adminAccess
        );

        console.log(
          "Admin check error:",
          adminError
        );

        if (adminError) {
          throw adminError;
        }

        if (!adminAccess) {
          if (mounted) {
            setIsAdmin(false);
            setAccessChecked(true);
          }

          return;
        }

        if (!mounted) {
          return;
        }

        setIsAdmin(true);
        setAccessChecked(true);

        const {
          data: pendingData,
          error: pendingError,
        } = await supabase
          .from(
            "researcher_publication_additions"
          )
          .select("*")
          .eq(
            "verification_status",
            "pending"
          )
          .order("created_at", {
            ascending: true,
          });

        if (pendingError) {
          throw pendingError;
        }

        if (!mounted) {
          return;
        }

        setPublications(
          (pendingData ||
            []) as PendingPublication[]
        );
      } catch (loadError) {
        console.error(
          "Unable to load admin publication review queue:",
          loadError
        );

        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the publication review queue."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setAccessChecked(true);
        }
      }
    }

    loadAdminQueue();

    return () => {
      mounted = false;
    };
  }, []);

  async function submitReview() {
    if (
      !selectedPublication ||
      !reviewAction
    ) {
      return;
    }

    setReviewSubmitting(true);
    setReviewMessage("");

    try {
      const actionBeingSubmitted =
        reviewAction;

      const {
        data,
        error: reviewError,
      } = await supabase.rpc(
        "review_researcher_publication_addition",
        {
          p_addition_id:
            selectedPublication.id,

          p_status:
            actionBeingSubmitted,

          p_review_note:
            reviewNote.trim() || null,
        }
      );

      if (reviewError) {
        throw reviewError;
      }

      setPublications((current) =>
        current.filter(
          (publication) =>
            publication.id !==
            selectedPublication.id
        )
      );

      setSelectedPublication(null);
      setReviewAction(null);
      setReviewNote("");

      setReviewMessage(
        actionBeingSubmitted === "verified"
          ? "Publication approved successfully."
          : "Publication rejected successfully."
      );

      console.log(
        "Publication review completed:",
        data
      );
    } catch (reviewError) {
      console.error(
        "Publication review failed:",
        reviewError
      );

      const message =
        reviewError &&
        typeof reviewError === "object" &&
        "message" in reviewError
          ? String(reviewError.message)
          : "Unable to complete the publication review.";

      setReviewMessage(message);
    } finally {
      setReviewSubmitting(false);

      window.setTimeout(() => {
        setReviewMessage("");
      }, 4000);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />

          <p className="mt-5 font-semibold text-slate-500">
            Checking administrator access...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">
            Administration Error
          </p>

          <h1 className="mt-3 text-3xl font-black text-rose-950">
            Unable to Load Review Queue
          </h1>

          <p className="mt-4 leading-7 text-rose-700">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (
    accessChecked &&
    !isAdmin
  ) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">
            Restricted Area
          </p>

          <h1 className="mt-3 text-3xl font-black text-rose-950">
            Administrator Access Required
          </h1>

          <p className="mt-4 leading-7 text-rose-700">
            This page is available only to
            registered OpenScholar administrators.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {reviewMessage && (
        <div className="fixed bottom-6 left-1/2 z-[180] -translate-x-1/2 rounded-2xl border border-indigo-200 bg-white px-6 py-4 text-sm font-bold text-indigo-700 shadow-2xl">
          {reviewMessage}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
              OpenScholar Administration
            </p>

            <h1 className="mt-3 text-4xl font-black text-slate-950">
              Publication Review Queue
            </h1>

            <p className="mt-4 max-w-3xl text-slate-600">
              Review researcher-submitted
              publications before they become
              part of the verified public profile.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
            ✓ Administrator
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Pending Publications
          </p>

          <p className="mt-2 text-4xl font-black text-indigo-700">
            {publications.length}
          </p>
        </div>
      </div>

      <section className="mt-8 space-y-5">
        {publications.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              No pending publications
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Researcher-submitted publications
              awaiting review will appear here.
            </p>
          </div>
        ) : (
          publications.map(
            (publication) => (
              <article
                key={publication.id}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        Pending Review
                      </span>

                      {publication.publication_year && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {publication.publication_year}
                        </span>
                      )}

                      {publication.verification_source && (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                          Added via{" "}
                          {publication.verification_source}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 text-xl font-black leading-8 text-slate-950">
                      {publication.title}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {publication.authors}
                    </p>

                    {publication.journal && (
                      <p className="mt-3 font-bold text-slate-800">
                        {publication.journal}
                      </p>
                    )}

                    {publication.doi && (
                      <p className="mt-3 break-all text-xs font-semibold text-indigo-700">
                        DOI: {publication.doi}
                      </p>
                    )}

                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      OpenAlex Author ID:{" "}
                      {publication.openalex_author_id}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Submitted{" "}
                      {new Date(
                        publication.created_at
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>

                    {publication.notes && (
                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Researcher Note
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {publication.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {publication.doi && (
                      <a
                        href={`https://doi.org/${publication.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                      >
                        View DOI
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPublication(
                          publication
                        );
                        setReviewAction(
                          "verified"
                        );
                        setReviewNote("");
                      }}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPublication(
                          publication
                        );
                        setReviewAction(
                          "rejected"
                        );
                        setReviewNote("");
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            )
          )
        )}
      </section>

      {selectedPublication &&
        reviewAction && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 px-5 py-8"
            role="dialog"
            aria-modal="true"
            onClick={() => {
              if (!reviewSubmitting) {
                setSelectedPublication(
                  null
                );
                setReviewAction(null);
              }
            }}
          >
            <div
              className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p
                    className={`text-xs font-bold uppercase tracking-[0.18em] ${
                      reviewAction ===
                      "verified"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    Publication Review
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {reviewAction ===
                    "verified"
                      ? "Approve Publication"
                      : "Reject Publication"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!reviewSubmitting) {
                      setSelectedPublication(
                        null
                      );
                      setReviewAction(null);
                    }
                  }}
                  disabled={reviewSubmitting}
                  aria-label="Close review dialog"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <p className="font-black leading-6 text-slate-950">
                  {selectedPublication.title}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {selectedPublication.journal}
                  {selectedPublication.publication_year
                    ? ` · ${selectedPublication.publication_year}`
                    : ""}
                </p>

                {selectedPublication.doi && (
                  <p className="mt-3 break-all text-xs font-semibold text-indigo-700">
                    DOI: {selectedPublication.doi}
                  </p>
                )}
              </div>

              <div className="mt-5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {reviewAction ===
                  "verified"
                    ? "Review Note"
                    : "Rejection Reason"}
                </label>

                <textarea
                  value={reviewNote}
                  onChange={(event) =>
                    setReviewNote(
                      event.target.value
                    )
                  }
                  rows={4}
                  maxLength={1000}
                  disabled={reviewSubmitting}
                  placeholder={
                    reviewAction ===
                    "verified"
                      ? "Optional verification note..."
                      : "Reason for rejection..."
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50"
                />
              </div>

              {reviewAction ===
                "verified" && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-xs leading-5 text-emerald-800">
                  Approving this publication
                  will mark it as verified and
                  allow it to become part of the
                  researcher&apos;s verified
                  public publication record.
                </div>
              )}

              {reviewAction ===
                "rejected" && (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-xs leading-5 text-rose-800">
                  Rejecting this publication
                  will keep the record in the
                  researcher&apos;s Publication
                  Manager but exclude it from the
                  verified public publication
                  record.
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPublication(
                      null
                    );
                    setReviewAction(null);
                  }}
                  disabled={reviewSubmitting}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitReview}
                  disabled={reviewSubmitting}
                  className={`rounded-xl px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    reviewAction ===
                    "verified"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {reviewSubmitting
                    ? "Saving..."
                    : reviewAction ===
                      "verified"
                    ? "Approve Publication"
                    : "Reject Publication"}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}