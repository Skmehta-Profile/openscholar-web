"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  supabase,
} from "@/lib/supabaseClient";

type ProfileClaim = {
  id: string;

  user_id: string;

  claimant_email:
    | string
    | null;

  openalex_author_id:
    string;

  researcher_name:
    string;

  affiliation:
    | string
    | null;

  orcid:
    | string
    | null;

  claim_status:
    | "pending"
    | "verified"
    | "rejected";

  verification_method:
    | string
    | null;

  verification_note:
    | string
    | null;

  claimed_at: string;

  verified_at:
    | string
    | null;

  updated_at: string;
};

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

export default function AdminProfileClaimsPage() {
  const [
    claims,
    setClaims,
  ] =
    useState<
      ProfileClaim[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    selectedClaim,
    setSelectedClaim,
  ] =
    useState<
      ProfileClaim | null
    >(null);

  const [
    reviewAction,
    setReviewAction,
  ] =
    useState<
      | "verified"
      | "rejected"
      | null
    >(null);

  const [
    reviewNote,
    setReviewNote,
  ] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  async function getAccessToken() {
    const {
      data,
    } =
      await supabase
        .auth
        .getSession();

    return (
      data.session
        ?.access_token ||
      null
    );
  }

  async function loadClaims() {
    setLoading(true);
    setError("");

    try {
      const accessToken =
        await getAccessToken();

      if (!accessToken) {
        setError(
          "Please sign in with an administrator account."
        );

        return;
      }

      const response =
        await fetch(
          "/api/admin/profile-claims",
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },

            cache:
              "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load profile claims."
        );
      }

      setClaims(
        data.claims || []
      );
    } catch (
      loadError
    ) {
      console.error(
        "Unable to load profile claims:",
        loadError
      );

      setError(
        loadError instanceof
          Error
          ? loadError.message
          : "Unable to load profile claims."
      );
    } finally {
      setLoading(false);
    }
  }

  function beginReview(
    claim: ProfileClaim,
    action:
      | "verified"
      | "rejected"
  ) {
    setSelectedClaim(
      claim
    );

    setReviewAction(
      action
    );

    setReviewNote("");

    setMessage("");
  }

  function closeReview() {
    if (submitting) {
      return;
    }

    setSelectedClaim(
      null
    );

    setReviewAction(
      null
    );

    setReviewNote("");
  }

  async function submitReview() {
    if (
      !selectedClaim ||
      !reviewAction
    ) {
      return;
    }

    if (
      reviewAction ===
        "rejected" &&
      !reviewNote.trim()
    ) {
      setMessage(
        "Please provide a reason for rejecting this claim."
      );

      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const accessToken =
        await getAccessToken();

      if (!accessToken) {
        throw new Error(
          "Administrator session expired. Please sign in again."
        );
      }

      const response =
        await fetch(
          "/api/admin/profile-claims",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`,
            },

            body:
              JSON.stringify({
                claimId:
                  selectedClaim.id,

                action:
                  reviewAction,

                reviewNote:
                  reviewNote.trim(),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to review profile claim."
        );
      }

      setClaims(
        (current) =>
          current.map(
            (claim) =>
              claim.id ===
              selectedClaim.id
                ? {
                    ...claim,
                    ...data.claim,
                  }
                : claim
          )
      );

      setMessage(
        reviewAction ===
          "verified"
          ? "Profile claim approved successfully."
          : "Profile claim rejected successfully."
      );

      setSelectedClaim(
        null
      );

      setReviewAction(
        null
      );

      setReviewNote("");

      await loadClaims();
    } catch (
      reviewError
    ) {
      console.error(
        "Profile claim review failed:",
        reviewError
      );

      setMessage(
        reviewError instanceof
          Error
          ? reviewError.message
          : "Unable to review profile claim."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const pendingClaims =
    useMemo(
      () =>
        claims.filter(
          (claim) =>
            claim.claim_status ===
            "pending"
        ),
      [claims]
    );

  const rejectedClaims =
    useMemo(
      () =>
        claims.filter(
          (claim) =>
            claim.claim_status ===
            "rejected"
        ),
      [claims]
    );

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />

          <p className="mt-5 font-semibold text-slate-500">
            Loading profile claims...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="text-sm font-bold text-indigo-700 hover:underline"
          >
            ← Back to Administration
          </Link>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-violet-700">
            Researcher Identity
          </p>

          <h1 className="mt-3 text-4xl font-black text-slate-950">
            Profile Claim Review
          </h1>

          <p className="mt-3 max-w-3xl text-slate-500">
            Review researcher requests to take ownership of OpenScholar public profiles.
          </p>
        </div>

        <button
          type="button"
          onClick={
            loadClaims
          }
          className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm font-bold text-indigo-700">
          {message}
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
            Pending
          </p>

          <p className="mt-2 text-4xl font-black text-slate-950">
            {pendingClaims.length}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            claims awaiting administrator review
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-black uppercase tracking-wide text-rose-700">
            Previously Rejected
          </p>

          <p className="mt-2 text-4xl font-black text-slate-950">
            {rejectedClaims.length}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            rejected claims retained for follow-up
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
            Review Queue
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Pending Profile Claims
          </h2>
        </div>

        {pendingClaims.length ===
        0 ? (
          <div className="mt-6 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8">
            <p className="text-lg font-black text-emerald-800">
              ✓ No pending profile claims
            </p>

            <p className="mt-2 text-sm text-emerald-700">
              All current researcher identity claims have been reviewed.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {pendingClaims.map(
              (claim) => (
                <article
                  key={
                    claim.id
                  }
                  className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-black text-slate-950">
                          {
                            claim.researcher_name
                          }
                        </h3>

                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-800">
                          Pending
                        </span>
                      </div>

                      <p className="mt-2 font-semibold text-slate-700">
                        {claim.affiliation ||
                          "Affiliation not available"}
                      </p>

                      <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                        <InfoItem
                          label="Claimant"
                          value={
                            claim.claimant_email ||
                            claim.user_id
                          }
                        />

                        <InfoItem
                          label="OpenAlex ID"
                          value={
                            claim.openalex_author_id
                          }
                        />

                        <InfoItem
                          label="ORCID"
                          value={
                            claim.orcid ||
                            "Not provided"
                          }
                        />

                        <InfoItem
                          label="Claim Submitted"
                          value={formatDate(
                            claim.claimed_at
                          )}
                        />
                      </div>

                      {claim.verification_note && (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Claim Note
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {
                              claim.verification_note
                            }
                          </p>
                        </div>
                      )}

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href={`/researcher/${claim.openalex_author_id}`}
                          target="_blank"
                          className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
                        >
                          View Researcher Profile
                        </Link>

                        <a
                          href={`https://openalex.org/${claim.openalex_author_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                          OpenAlex
                        </a>

                        {claim.orcid && (
                          <a
                            href={
                              claim.orcid.startsWith(
                                "http"
                              )
                                ? claim.orcid
                                : `https://orcid.org/${claim.orcid}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
                          >
                            ORCID
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          beginReview(
                            claim,
                            "verified"
                          )
                        }
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          beginReview(
                            claim,
                            "rejected"
                          )
                        }
                        className="rounded-xl border border-rose-300 px-5 py-3 text-sm font-black text-rose-700 hover:bg-rose-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      {selectedClaim &&
        reviewAction && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
            onClick={
              closeReview
            }
          >
            <div
              className="w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
                Profile Claim Review
              </p>

              <h2 className="mt-3 text-2xl font-black text-slate-950">
                {reviewAction ===
                "verified"
                  ? "Approve profile claim?"
                  : "Reject profile claim?"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Researcher:{" "}
                <strong className="text-slate-800">
                  {
                    selectedClaim.researcher_name
                  }
                </strong>
              </p>

              <div className="mt-6">
                <label className="text-sm font-black text-slate-800">
                  {reviewAction ===
                  "verified"
                    ? "Administrator note (optional)"
                    : "Reason for rejection"}
                </label>

                <textarea
                  value={
                    reviewNote
                  }
                  onChange={(
                    event
                  ) =>
                    setReviewNote(
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder={
                    reviewAction ===
                    "verified"
                      ? "Optional verification note"
                      : "Explain why this ownership claim cannot be approved"
                  }
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              {message && (
                <p className="mt-4 text-sm font-bold text-amber-700">
                  {message}
                </p>
              )}

              <div className="mt-7 flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={
                    closeReview
                  }
                  disabled={
                    submitting
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    submitReview
                  }
                  disabled={
                    submitting
                  }
                  className={`rounded-xl px-6 py-3 text-sm font-black text-white disabled:opacity-50 ${
                    reviewAction ===
                    "verified"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submitting
                    ? "Saving..."
                    : reviewAction ===
                        "verified"
                      ? "Approve Claim"
                      : "Reject Claim"}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}