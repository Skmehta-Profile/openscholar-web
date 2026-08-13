"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ClaimStatus =
  | "pending"
  | "verified"
  | "rejected";

type ResearcherClaim = {
  id: string;
  user_id: string;
  openalex_author_id: string;
  researcher_name: string;
  affiliation: string | null;
  orcid: string | null;
  claim_status: ClaimStatus;
  verification_method: string | null;
  verification_note: string | null;
  claimed_at: string;
  verified_at: string | null;
  updated_at: string;
};

type SubscriptionStatus = {
  plan: string;
  status: string;
  billingCycle: string | null;
  provider: string | null;
  providerSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function MyProfilePage() {
  const [claims, setClaims] =
    useState<ResearcherClaim[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [signedIn, setSignedIn] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [subscription, setSubscription] =
  useState<SubscriptionStatus | null>(null);

const [subscriptionLoading, setSubscriptionLoading] =
  useState(false);
  
const [syncingSubscription, setSyncingSubscription] =
  useState(false);

const [subscriptionSyncMessage, setSubscriptionSyncMessage] =
  useState("");  

async function loadSubscriptionStatus() {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  const accessToken =
    sessionData.session?.access_token;

  if (
    sessionError ||
    !accessToken
  ) {
    throw new Error(
      "Please sign in again."
    );
  }

  const response =
    await fetch(
      "/api/subscriptions/status",
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to load subscription status."
    );
  }

  setSubscription(
    data as SubscriptionStatus
  );

  return accessToken;
}

async function syncSubscription() {
  if (syncingSubscription) {
    return;
  }

  setSyncingSubscription(true);
  setSubscriptionSyncMessage("");

  try {
    const {
      data: sessionData,
      error: sessionError,
    } = await supabase.auth.getSession();

    const accessToken =
      sessionData.session?.access_token;

    if (
      sessionError ||
      !accessToken
    ) {
      throw new Error(
        "Please sign in again before syncing your subscription."
      );
    }

    const response =
      await fetch(
        "/api/subscriptions/reconcile",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Unable to sync subscription."
      );
    }

    /*
      Re-read the repaired local
      subscription after Razorpay
      reconciliation.
    */

    await loadSubscriptionStatus();

    if (data.reconciled) {
      setSubscriptionSyncMessage(
        "Subscription synced successfully with Razorpay."
      );
    } else {
      setSubscriptionSyncMessage(
        data.reason ||
          "Your subscription is already up to date."
      );
    }
  } catch (error) {
    console.error(
      "Subscription reconciliation failed:",
      error
    );

    setSubscriptionSyncMessage(
      error instanceof Error
        ? error.message
        : "Unable to sync subscription."
    );
  } finally {
    setSyncingSubscription(false);
  }
}

  useEffect(() => {
    let mounted = true;

    async function loadProfileGateway() {
      setLoading(true);
      setMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (authError || !user) {
          setSignedIn(false);
          setClaims([]);
          setLoading(false);
          return;
        }

        setSignedIn(true);

        setSubscriptionLoading(true);

try {
  await loadSubscriptionStatus();
} catch (subscriptionError) {
  console.error(
    "Subscription status load failed:",
    subscriptionError
  );
} finally {
  if (mounted) {
    setSubscriptionLoading(false);
  }
}

        const {
          data,
          error,
        } = await supabase
          .from("researcher_profile_claims")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", {
            ascending: false,
          });

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "Unable to load researcher claims:",
            error
          );

          setMessage(
            "Unable to load your researcher profile information."
          );

          setClaims([]);
          return;
        }

        setClaims(
          (data || []) as ResearcherClaim[]
        );
      } catch (error) {
        console.error(
          "Profile gateway load failed:",
          error
        );

        if (mounted) {
          setMessage(
            "Unable to load your researcher profile information."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfileGateway();

    return () => {
      mounted = false;
    };
  }, []);

  const primaryClaim = useMemo(() => {
    const verified =
      claims.find(
        (claim) =>
          claim.claim_status ===
          "verified"
      );

    if (verified) {
      return verified;
    }

    const pending =
      claims.find(
        (claim) =>
          claim.claim_status ===
          "pending"
      );

    if (pending) {
      return pending;
    }

    return claims[0] || null;
  }, [claims]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />

          <p className="mt-5 font-semibold text-slate-500">
            Loading your researcher profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {message && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
          {message}
        </div>
      )}

      <section className="relative overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-8 shadow-sm md:p-10">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />

        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-emerald-100 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-700">
            Researcher Identity
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            My Research Profile
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Build, verify and curate your scholarly
            identity on OpenScholar. Keep your
            publication record accurate, add missing
            research and share a professional public
            profile.
          </p>
        </div>
      </section>

{signedIn && (
  <SubscriptionCard
    subscription={subscription}
    loading={subscriptionLoading}
    syncing={syncingSubscription}
    syncMessage={subscriptionSyncMessage}
    onSync={syncSubscription}
  />
)}

      {!signedIn ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
              Get Started
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-950">
              Create your OpenScholar-Web research profile
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              Sign in first, find your scholarly
              identity, and claim the profile that
              belongs to you.
            </p>

            <Link
              href="/signin?next=%2Fprofile"
              className="mt-7 inline-flex rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
            >
              Sign in to Continue
            </Link>
          </div>

          <ProfileBenefits />
        </section>
      ) : !primaryClaim ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-black text-indigo-700">
              ID
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
              No Profile Connected Yet
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-950">
              Find your researcher profile
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              Search your name in OpenScholar using
              <strong> Author Search</strong>. Open
              the correct researcher record and
              choose <strong>Claim this Profile</strong>.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
              >
                Find My Research Profile
              </Link>

              <Link
                href="/about"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Learn About OpenScholar
              </Link>
            </div>

            <div className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 py-4 text-sm leading-6 text-slate-700">
              <strong>How it works:</strong> Search
              by Author → choose your correct profile
              → verify ownership → curate and share
              your research record.
            </div>
          </div>

          <ProfileBenefits />
        </section>
      ) : primaryClaim.claim_status ===
        "verified" ? (
        <VerifiedProfile claim={primaryClaim} />
      ) : primaryClaim.claim_status ===
        "pending" ? (
        <PendingProfile claim={primaryClaim} />
      ) : (
        <RejectedProfile claim={primaryClaim} />
      )}
    </main>
  );
}

function ProfileBenefits() {
  const benefits = [
    "Import your indexed publications",
    "Hide incorrectly attributed papers",
    "Add missing publications",
    "Review citation and research analytics",
    "Export publication records",
    "Share a professional public profile",
  ];

  return (
    <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
        Researcher Profile
      </p>

      <h2 className="mt-3 text-2xl font-black">
        Your scholarly record, under your control
      </h2>

      <div className="mt-6 space-y-3">
        {benefits.map((benefit) => (
          <div
            key={benefit}
            className="flex gap-3 rounded-2xl bg-white/10 px-4 py-3"
          >
            <span className="font-black text-emerald-300">
              ✓
            </span>

            <span className="text-sm leading-6 text-slate-200">
              {benefit}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function VerifiedProfile({
  claim,
}: {
  claim: ResearcherClaim;
}) {
  return (
    <section className="mt-8">
      <div className="rounded-[2rem] border border-emerald-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
              ✓ Verified Profile Owner
            </div>

            <h2 className="mt-5 text-3xl font-black text-slate-950">
              {claim.researcher_name}
            </h2>

            {claim.affiliation && (
              <p className="mt-3 text-lg font-semibold text-slate-600">
                {claim.affiliation}
              </p>
            )}

            <p className="mt-3 text-sm font-semibold text-slate-500">
              OpenAlex ID:{" "}
              {claim.openalex_author_id}
            </p>

            {claim.orcid && (
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                ORCID:{" "}
                {claim.orcid.replace(
                  "https://orcid.org/",
                  ""
                )}
              </p>
            )}

            {claim.verified_at && (
              <p className="mt-3 text-xs text-slate-400">
                Profile verified{" "}
                {formatDate(
                  claim.verified_at
                )}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/researcher/${claim.openalex_author_id}`}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
            >
              View Public Profile
            </Link>

            <Link
              href={`/researcher/${claim.openalex_author_id}/manage`}
              className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
            >
              Publication Manager
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link
            href={`/researcher/${claim.openalex_author_id}`}
            className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <p className="text-xs font-black uppercase tracking-wide text-indigo-700">
              Public Presence
            </p>

            <h3 className="mt-3 text-xl font-black text-slate-950">
              Research Profile
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review your public scholarly identity,
              research analytics and publications.
            </p>

            <p className="mt-5 text-sm font-bold text-indigo-700">
              Open Profile →
            </p>
          </Link>

          <Link
            href={`/researcher/${claim.openalex_author_id}/manage`}
            className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <p className="text-xs font-black uppercase tracking-wide text-violet-700">
              Curation
            </p>

            <h3 className="mt-3 text-xl font-black text-slate-950">
              Publications
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage indexed, curated and hidden
              publications from one workspace.
            </p>

            <p className="mt-5 text-sm font-bold text-indigo-700">
              Manage Publications →
            </p>
          </Link>

          <Link
            href={`/researcher/${claim.openalex_author_id}`}
            className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Share
            </p>

            <h3 className="mt-3 text-xl font-black text-slate-950">
              Profile Sharing
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Copy your public profile link, generate
              a QR code or share it professionally.
            </p>

            <p className="mt-5 text-sm font-bold text-indigo-700">
              Share Profile →
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}

function PendingProfile({
  claim,
}: {
  claim: ResearcherClaim;
}) {
  return (
    <section className="mt-8 rounded-[2rem] border border-amber-200 bg-white p-8 shadow-sm">
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-700">
        Claim Under Review
      </span>

      <h2 className="mt-5 text-3xl font-black text-slate-950">
        {claim.researcher_name}
      </h2>

      <p className="mt-3 max-w-2xl leading-7 text-slate-600">
        Your ownership request has been submitted.
        Publication-management access will become
        available after verification.
      </p>

      <p className="mt-4 text-sm font-semibold text-slate-500">
        Submitted {formatDate(claim.claimed_at)}
      </p>

      <Link
        href={`/researcher/${claim.openalex_author_id}`}
        className="mt-7 inline-flex rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
      >
        View Researcher Profile
      </Link>
    </section>
  );
}

function RejectedProfile({
  claim,
}: {
  claim: ResearcherClaim;
}) {
  return (
    <section className="mt-8 rounded-[2rem] border border-rose-200 bg-white p-8 shadow-sm">
      <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-rose-700">
        Verification Required
      </span>

      <h2 className="mt-5 text-3xl font-black text-slate-950">
        {claim.researcher_name}
      </h2>

      <p className="mt-3 max-w-2xl leading-7 text-slate-600">
        The previous claim could not be verified.
        Open the researcher profile to review the
        record and submit a new ownership request.
      </p>

      {claim.verification_note && (
        <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
          {claim.verification_note}
        </div>
      )}

      <Link
        href={`/researcher/${claim.openalex_author_id}`}
        className="mt-7 inline-flex rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
      >
        Open Profile
      </Link>
    </section>
  );
}

function SubscriptionCard({
  subscription,
  loading,
  syncing,
  syncMessage,
  onSync,
}: {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  syncing: boolean;
  syncMessage: string;
  onSync: () => Promise<void>;
}) {
  const [cancelling, setCancelling] =
    useState(false);

  const [cancelMessage, setCancelMessage] =
    useState("");

  const [cancelScheduled, setCancelScheduled] =
    useState(
      subscription?.cancelAtPeriodEnd ?? false
    );

  useEffect(() => {
    setCancelScheduled(
      subscription?.cancelAtPeriodEnd ?? false
    );
  }, [subscription?.cancelAtPeriodEnd]);

  async function cancelSubscription() {
    if (
      cancelling ||
      cancelScheduled
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Cancel your Scholar subscription at the end of the current billing period? You will keep Scholar access until then."
      );

    if (!confirmed) {
      return;
    }

    setCancelling(true);
    setCancelMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      const accessToken =
        sessionData.session?.access_token;

      if (
        sessionError ||
        !accessToken
      ) {
        setCancelMessage(
          "Please sign in again before managing your subscription."
        );

        return;
      }

      const response =
        await fetch(
          "/api/subscriptions/cancel",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to cancel subscription."
        );
      }

      setCancelScheduled(true);

      setCancelMessage(
        "Cancellation scheduled successfully. Your Scholar access will remain active until the end of the current billing period."
      );
    } catch (error) {
      console.error(
        "Unable to cancel Scholar subscription:",
        error
      );

      setCancelMessage(
        error instanceof Error
          ? error.message
          : "Unable to cancel subscription. Please try again."
      );
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">
          Loading subscription status...
        </p>
      </section>
    );
  }

  const hasScholarAccess =
    subscription?.plan === "scholar" &&
    (
      subscription?.status === "active" ||
      subscription?.status === "pending"
    );

  const isActive =
    subscription?.status === "active";

  const isPending =
    subscription?.status === "pending";

  const isPastDue =
    subscription?.status === "past_due";

  const isEnded =
    subscription?.status === "cancelled" ||
    subscription?.status === "expired";

  const billingLabel =
    subscription?.billingCycle === "monthly"
      ? "₹199/month"
      : subscription?.billingCycle === "annual"
        ? "₹1,999/year"
        : null;

  return (
    <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
            Subscription
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black text-slate-950">
              {hasScholarAccess
                ? "Scholar Plan"
                : "Free Plan"}
            </h2>

            {isActive && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">
                Active
              </span>
            )}

            {isPending && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-700">
                Payment Pending
              </span>
            )}

            {isPastDue && (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black uppercase text-rose-700">
                Payment Issue
              </span>
            )}

            {isEnded && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
                Scholar Ended
              </span>
            )}

            {hasScholarAccess &&
              cancelScheduled && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-700">
                  Cancellation Scheduled
                </span>
              )}
          </div>

          {hasScholarAccess ? (
            <>
              {billingLabel && (
                <p className="mt-3 font-semibold text-slate-600">
                  {billingLabel}
                </p>
              )}

              {subscription?.currentPeriodEnd && (
                <p className="mt-2 text-sm text-slate-500">
                  Current billing period ends{" "}
                  {formatDate(
                    subscription.currentPeriodEnd
                  )}
                </p>
              )}

              {isPending && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="text-sm font-bold text-amber-800">
  Your subscription payment is pending.
</p>

<p className="mt-1 text-sm leading-6 text-amber-700">
  Scholar access remains available
  temporarily while your subscription
  status is being resolved. Use Sync
  Subscription if you recently completed
  or updated a payment.
</p>
                </div>
              )}

              {cancelScheduled && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="text-sm font-bold text-amber-800">
                    Your subscription will not renew.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Scholar access remains available
                    until the end of your current
                    billing period
                    {subscription?.currentPeriodEnd
                      ? ` on ${formatDate(
                          subscription.currentPeriodEnd
                        )}.`
                      : "."}
                  </p>
                </div>
              )}

              {cancelMessage && (
                <p
                  className={`mt-4 text-sm font-semibold ${
                    cancelScheduled
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {cancelMessage}
                </p>
              )}
            </>
          ) : isPastDue ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
              <p className="text-sm font-bold text-rose-800">
                We could not renew your Scholar
                subscription.
              </p>

              <p className="mt-1 text-sm leading-6 text-rose-700">
                Your account has returned to the Free
                plan. You can start a new Scholar
                subscription whenever you are ready.
              </p>
            </div>
          ) : isEnded ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm font-bold text-slate-800">
                Your Scholar subscription has ended.
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Your account is now on the Free plan.
                You can restart Scholar at any time.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Upgrade to Scholar for premium
              OpenScholar features.
            </p>
          )}
        </div>

        <div className="flex min-w-[240px] flex-col gap-3">
          <button
  type="button"
  onClick={onSync}
  disabled={syncing}
  className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
>
  {syncing
    ? "Syncing..."
    : "Sync Subscription"}
</button>
{syncMessage && (
  <p className="text-sm font-semibold text-slate-600">
    {syncMessage}
  </p>
)}
          {hasScholarAccess ? (
            <>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Scholar Access
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {isPending
                    ? "Your Scholar access remains available temporarily while your subscription status is being resolved."
                    : "Your Scholar subscription is active."}
                </p>
              </div>

              {isActive &&
                !cancelScheduled && (
                  <button
                    type="button"
                    onClick={
                      cancelSubscription
                    }
                    disabled={cancelling}
                    className="rounded-xl border border-rose-200 bg-white px-5 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelling
                      ? "Scheduling cancellation..."
                      : "Cancel Subscription"}
                  </button>
                )}
            </>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex justify-center rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
            >
              {isPastDue || isEnded
                ? "Restart Scholar"
                : "Upgrade to Scholar"}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}