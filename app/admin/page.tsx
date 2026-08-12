"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabaseClient";
import AdminGrowthAnalytics from "@/app/components/AdminGrowthAnalytics";
import AdminInfrastructureMonitor from "@/app/components/AdminInfrastructureMonitor";

type AdminStats = {
  registered_users: number;
  users_last_7_days: number;
  users_last_30_days: number;

  saved_articles: number;
  collections: number;

  research_profiles: number;
  publication_additions: number;

  research_notes: number;

  research_alerts: number;
  active_alerts: number;
  paused_alerts: number;

  alert_results: number;
  unseen_alert_results: number;
    pending_publication_reviews: number;
  pending_profile_claims: number;
  rejected_profile_claims: number;
};

type HealthState =
  | "checking"
  | "operational"
  | "warning"
  | "unavailable";

type HealthItem = {
  key: string;
  label: string;
  description: string;
  status: HealthState;
  detail: string;
  responseTime: number | null;
};

const emptyStats: AdminStats = {
  registered_users: 0,
  users_last_7_days: 0,
  users_last_30_days: 0,

  saved_articles: 0,
  collections: 0,

  research_profiles: 0,
  publication_additions: 0,

  research_notes: 0,

  research_alerts: 0,
  active_alerts: 0,
  paused_alerts: 0,

  alert_results: 0,
  unseen_alert_results: 0,
    pending_publication_reviews: 0,
  pending_profile_claims: 0,
  rejected_profile_claims: 0,
};

function createInitialHealth(): HealthItem[] {
  return [
    {
      key: "database",
      label: "Supabase Database",
      description:
        "Application database connectivity",
      status: "checking",
      detail: "Waiting for health check",
      responseTime: null,
    },
    {
      key: "auth",
      label: "Authentication",
      description:
        "Supabase user authentication",
      status: "checking",
      detail: "Waiting for health check",
      responseTime: null,
    },
    {
      key: "search",
      label: "Search / OpenAlex",
      description:
        "Research discovery API and OpenAlex access",
      status: "checking",
      detail: "Waiting for health check",
      responseTime: null,
    },
    {
      key: "alerts",
      label: "Alert Engine",
      description:
        "New-literature monitoring service",
      status: "checking",
      detail: "Waiting for health check",
      responseTime: null,
    },
  ];
}

export default function AdminDashboardPage() {
  const [
    stats,
    setStats,
  ] =
    useState<AdminStats>(
      emptyStats
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    isAdmin,
    setIsAdmin,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    health,
    setHealth,
  ] =
    useState<HealthItem[]>(
      createInitialHealth()
    );

  const [
    healthChecking,
    setHealthChecking,
  ] =
    useState(false);

  const [
    lastHealthCheck,
    setLastHealthCheck,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        setIsAdmin(false);

        setMessage(
          "Please sign in with an administrator account."
        );

        return;
      }

      const {
        data: adminAccess,
        error: adminError,
      } =
        await supabase.rpc(
          "is_openscholar_admin"
        );

      if (
        adminError ||
        adminAccess !== true
      ) {
        setIsAdmin(false);

        setMessage(
          "Administrator access is required."
        );

        return;
      }

      setIsAdmin(true);

      const {
        data,
        error,
      } =
        await supabase.rpc(
          "get_openscholar_admin_dashboard"
        );

      if (error) {
        throw error;
      }

      setStats(
        data as AdminStats
      );

      await checkSystemHealth();
    } catch (error) {
      console.error(
        "Unable to load admin dashboard:",
        error
      );

      setMessage(
        "Unable to load OpenScholar administration statistics."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateHealthItem(
    key: string,
    update: Partial<HealthItem>
  ) {
    setHealth(
      (current) =>
        current.map(
          (item) =>
            item.key === key
              ? {
                  ...item,
                  ...update,
                }
              : item
        )
    );
  }

  async function checkSystemHealth() {
    setHealthChecking(true);

    setHealth(
      createInitialHealth()
    );

    /*
     * 1. AUTHENTICATION
     */

    const authStart =
      performance.now();

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.getUser();

      const elapsed =
        Math.round(
          performance.now() -
            authStart
        );

      if (
        error ||
        !data.user
      ) {
        updateHealthItem(
          "auth",
          {
            status:
              "unavailable",

            detail:
              "No valid authenticated session",

            responseTime:
              elapsed,
          }
        );
      } else {
        updateHealthItem(
          "auth",
          {
            status:
              "operational",

            detail:
              "Administrator session authenticated",

            responseTime:
              elapsed,
          }
        );
      }
    } catch (error) {
      console.error(
        "Auth health check failed:",
        error
      );

      updateHealthItem(
        "auth",
        {
          status:
            "unavailable",

          detail:
            "Authentication request failed",

          responseTime:
            Math.round(
              performance.now() -
                authStart
            ),
        }
      );
    }

    /*
     * 2. SUPABASE DATABASE
     */

    const databaseStart =
      performance.now();

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "research_alerts"
          )
          .select(
            "id",
            {
              head: true,
              count:
                "exact",
            }
          );

      const elapsed =
        Math.round(
          performance.now() -
            databaseStart
        );

      if (error) {
        updateHealthItem(
          "database",
          {
            status:
              "unavailable",

            detail:
              "Database query failed",

            responseTime:
              elapsed,
          }
        );
      } else {
        updateHealthItem(
          "database",
          {
            status:
              elapsed >
              2500
                ? "warning"
                : "operational",

            detail:
              elapsed >
              2500
                ? "Connected, but response is slow"
                : "Database query successful",

            responseTime:
              elapsed,
          }
        );
      }
    } catch (error) {
      console.error(
        "Database health check failed:",
        error
      );

      updateHealthItem(
        "database",
        {
          status:
            "unavailable",

          detail:
            "Unable to reach Supabase",

          responseTime:
            Math.round(
              performance.now() -
                databaseStart
            ),
        }
      );
    }

    /*
     * 3. SEARCH API + OPENALEX
     */

    const searchStart =
      performance.now();

    try {
      const params =
        new URLSearchParams({
          q: "cyanobacteria",
          mode: "keyword",
          type: "any",
          institution: "",
          sort: "relevance",
          year: "any",
          oa: "false",
          page: "1",
        });

      const response =
        await fetch(
          `/api/search?${params.toString()}`,
          {
            cache:
              "no-store",
          }
        );

      const elapsed =
        Math.round(
          performance.now() -
            searchStart
        );

      if (
        !response.ok
      ) {
        updateHealthItem(
          "search",
          {
            status:
              "unavailable",

            detail:
              `Search API returned HTTP ${response.status}`,

            responseTime:
              elapsed,
          }
        );
      } else {
        const data =
          await response.json();

        const resultCount =
          Array.isArray(
            data.results
          )
            ? data.results
                .length
            : 0;

        updateHealthItem(
          "search",
          {
            status:
              elapsed >
              5000
                ? "warning"
                : "operational",

            detail:
              `${resultCount} test records returned from OpenAlex`,

            responseTime:
              elapsed,
          }
        );
      }
    } catch (error) {
      console.error(
        "Search health check failed:",
        error
      );

      updateHealthItem(
        "search",
        {
          status:
            "unavailable",

          detail:
            "Search API or OpenAlex unavailable",

          responseTime:
            Math.round(
              performance.now() -
                searchStart
            ),
        }
      );
    }

    /*
     * 4. ALERT ENGINE
     *
     * The baseline is the current
     * time, so this health check
     * does not create alert results.
     */

    const alertStart =
      performance.now();

    try {
      const response =
        await fetch(
          "/api/alerts/check",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            cache:
              "no-store",

            body:
              JSON.stringify({
                query:
                  "cyanobacteria",

                searchMode:
                  "keyword",

                workType:
                  "any",

                institution:
                  null,

                publicationYear:
                  "any",

                openAccessOnly:
                  false,

                baseline:
                  new Date().toISOString(),
              }),
          }
        );

      const elapsed =
        Math.round(
          performance.now() -
            alertStart
        );

      if (
        !response.ok
      ) {
        updateHealthItem(
          "alerts",
          {
            status:
              "unavailable",

            detail:
              `Alert engine returned HTTP ${response.status}`,

            responseTime:
              elapsed,
          }
        );
      } else {
        updateHealthItem(
          "alerts",
          {
            status:
              elapsed >
              5000
                ? "warning"
                : "operational",

            detail:
              "Alert checker executed successfully",

            responseTime:
              elapsed,
          }
        );
      }
    } catch (error) {
      console.error(
        "Alert engine health check failed:",
        error
      );

      updateHealthItem(
        "alerts",
        {
          status:
            "unavailable",

          detail:
            "Alert engine unavailable",

          responseTime:
            Math.round(
              performance.now() -
                alertStart
            ),
        }
      );
    }

    setLastHealthCheck(
      new Date().toISOString()
    );

    setHealthChecking(false);
  }

  const operationalCount =
    health.filter(
      (item) =>
        item.status ===
        "operational"
    ).length;

  const warningCount =
    health.filter(
      (item) =>
        item.status ===
        "warning"
    ).length;

  const unavailableCount =
    health.filter(
      (item) =>
        item.status ===
        "unavailable"
    ).length;

  const overallStatus:
    | "operational"
    | "warning"
    | "unavailable" =
    unavailableCount >
    0
      ? "unavailable"
      : warningCount >
          0
        ? "warning"
        : "operational";

  const deploymentLabel =
    typeof window !==
      "undefined" &&
    (
      window.location.hostname ===
        "localhost" ||
      window.location.hostname ===
        "127.0.0.1"
    )
      ? "Local Development"
      : "Production";
  const attentionCount =
    stats.pending_publication_reviews +
    stats.pending_profile_claims +
    stats.rejected_profile_claims;

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />

          <p className="mt-5 font-semibold text-slate-500">
            Loading OpenScholar
            administration...
          </p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <section className="rounded-[2rem] border border-rose-200 bg-white p-10 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-600">
            Restricted Area
          </p>

          <h1 className="mt-4 text-3xl font-black text-slate-950">
            Administrator Access
            Required
          </h1>

          <p className="mt-4 text-slate-600">
            {message}
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            Return to OpenScholar
          </Link>
        </section>
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

      {/* HERO */}

      <section className="relative overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-8 shadow-sm md:p-10">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-700">
              OpenScholar-Web Administration
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Operations Dashboard
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Monitor platform growth,
              system health, research
              activity, alerts and
              administrative operations.
            </p>
          </div>

          <button
            type="button"
            onClick={
              loadDashboard
            }
            className="w-fit rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
          >
            Refresh Dashboard
          </button>
        </div>
      </section>

      {/* PRIMARY METRICS */}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Registered Users"
          value={
            stats.registered_users
          }
          detail={`${stats.users_last_7_days} joined in last 7 days`}
        />

        <MetricCard
          label="Research Profiles"
          value={
            stats.research_profiles
          }
          detail="Profile claims"
        />

        <MetricCard
          label="Saved Papers"
          value={
            stats.saved_articles
          }
          detail="Across user libraries"
        />

        <MetricCard
          label="Active Alerts"
          value={
            stats.active_alerts
          }
          detail={`${stats.research_alerts} total alerts`}
        />
      </section>

      {/* SYSTEM HEALTH */}

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              System Health
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black text-slate-950">
                Platform Status
              </h2>

              <HealthBadge
                status={
                  overallStatus
                }
              />
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Live connectivity checks
              for core OpenScholar
              services.
            </p>

            {lastHealthCheck && (
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Last checked{" "}
                {new Intl.DateTimeFormat(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute:
                      "2-digit",
                    second:
                      "2-digit",
                  }
                ).format(
                  new Date(
                    lastHealthCheck
                  )
                )}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={
              checkSystemHealth
            }
            disabled={
              healthChecking
            }
            className="w-fit rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {healthChecking
              ? "Checking..."
              : "Check Health"}
          </button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {health.map(
            (item) => (
              <HealthCard
                key={
                  item.key
                }
                item={
                  item
                }
              />
            )
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Operational
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-700">
              {
                operationalCount
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Warning
            </p>

            <p className="mt-2 text-2xl font-black text-amber-700">
              {
                warningCount
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Unavailable
            </p>

            <p className="mt-2 text-2xl font-black text-rose-700">
              {
                unavailableCount
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Environment
            </p>

            <p className="mt-2 text-lg font-black text-slate-950">
              {
                deploymentLabel
              }
            </p>
          </div>
        </div>
      </section>

      {/* ADMIN ATTENTION CENTRE */}

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
              Admin Attention
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black text-slate-950">
                Attention Centre
              </h2>

              {attentionCount > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-700">
                  {attentionCount}{" "}
                  {attentionCount === 1
                    ? "item needs"
                    : "items need"}{" "}
                  attention
                </span>
              ) : (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">
                  ✓ Nothing pending
                </span>
              )}
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Administrative items that may require review,
              verification or follow-up.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3">

          {/* PUBLICATION REVIEWS */}

          <Link
            href="/admin/publications"
            className={`rounded-3xl border p-6 transition ${
              stats.pending_publication_reviews > 0
                ? "border-amber-200 bg-amber-50 hover:border-amber-300"
                : "border-slate-200 bg-slate-50 hover:border-indigo-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-indigo-700">
                  Publication Review
                </p>

                <h3 className="mt-3 text-xl font-black text-slate-950">
                  Pending Publications
                </h3>
              </div>

              <span
                className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-xl font-black ${
                  stats.pending_publication_reviews > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {stats.pending_publication_reviews}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Researcher-added publications waiting for
              verification before entering verified public
              profiles.
            </p>

            <p className="mt-5 text-sm font-black text-indigo-700">
              {stats.pending_publication_reviews > 0
                ? "Review Publications →"
                : "Open Review Queue →"}
            </p>
          </Link>

          {/* PROFILE CLAIMS */}

          <div
            className={`rounded-3xl border p-6 ${
              stats.pending_profile_claims > 0
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-violet-700">
                  Researcher Identity
                </p>

                <h3 className="mt-3 text-xl font-black text-slate-950">
                  Pending Profile Claims
                </h3>
              </div>

              <span
                className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-xl font-black ${
                  stats.pending_profile_claims > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {stats.pending_profile_claims}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Researcher profile ownership claims currently
              waiting for administrative verification.
            </p>

            {stats.pending_profile_claims === 0 && (
              <p className="mt-5 text-sm font-bold text-emerald-700">
                ✓ No pending claims
              </p>
            )}

            {stats.pending_profile_claims > 0 && (
              <p className="mt-5 text-sm font-bold text-amber-700">
                Review required
              </p>
            )}
          </div>

          {/* REJECTED CLAIMS */}

          <div
            className={`rounded-3xl border p-6 ${
              stats.rejected_profile_claims > 0
                ? "border-rose-200 bg-rose-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-rose-700">
                  Follow-up
                </p>

                <h3 className="mt-3 text-xl font-black text-slate-950">
                  Rejected Claims
                </h3>
              </div>

              <span
                className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-xl font-black ${
                  stats.rejected_profile_claims > 0
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {stats.rejected_profile_claims}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Profile claims that were rejected and remain
              available for administrative awareness or
              follow-up.
            </p>

            {stats.rejected_profile_claims === 0 ? (
              <p className="mt-5 text-sm font-bold text-emerald-700">
                ✓ No rejected claims
              </p>
            ) : (
              <p className="mt-5 text-sm font-bold text-rose-700">
                Follow-up may be required
              </p>
            )}
          </div>
        </div>
      </section>

      <AdminGrowthAnalytics />

      <AdminInfrastructureMonitor />

      {/* GROWTH + ALERTS */}

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
            Platform Growth
          </p>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            User Activity
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <MiniMetric
              label="New Users · 7 Days"
              value={
                stats.users_last_7_days
              }
            />

            <MiniMetric
              label="New Users · 30 Days"
              value={
                stats.users_last_30_days
              }
            />

            <MiniMetric
              label="Collections"
              value={
                stats.collections
              }
            />

            <MiniMetric
              label="Research Notes"
              value={
                stats.research_notes
              }
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Literature Monitoring
          </p>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            Research Alerts
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <MiniMetric
              label="Total Alerts"
              value={
                stats.research_alerts
              }
            />

            <MiniMetric
              label="Active"
              value={
                stats.active_alerts
              }
            />

            <MiniMetric
              label="Paused"
              value={
                stats.paused_alerts
              }
            />

            <MiniMetric
              label="Detected Papers"
              value={
                stats.alert_results
              }
            />
          </div>

          {stats.unseen_alert_results >
            0 && (
            <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
              <p className="text-sm font-bold text-indigo-800">
                {
                  stats.unseen_alert_results
                }{" "}
                unseen alert result
                {stats.unseen_alert_results ===
                1
                  ? ""
                  : "s"}{" "}
                currently exist across
                the platform.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ADMIN OPERATIONS */}

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
          Administration
        </p>

        <h2 className="mt-3 text-2xl font-black text-slate-950">
          Admin Operations
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/admin/publications"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <p className="text-xs font-black uppercase tracking-wide text-indigo-700">
              Publication Review
            </p>

            <h3 className="mt-3 text-xl font-black text-slate-950">
              Review Queue
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review researcher-added
              publications before they
              become verified profile
              records.
            </p>

            <p className="mt-5 text-sm font-bold text-indigo-700">
              Open Publication Review →
            </p>
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Researcher Profiles
            </p>

            <h3 className="mt-3 text-xl font-black text-slate-950">
              {
                stats.research_profiles
              }{" "}
              Claims
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Researcher identity and
              profile ownership activity
              across OpenScholar.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-black uppercase tracking-wide text-violet-700">
              Curated Publications
            </p>

            <h3 className="mt-3 text-xl font-black text-slate-950">
              {
                stats.publication_additions
              }{" "}
              Additions
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Publications added by
              researchers beyond their
              indexed OpenAlex records.
            </p>
          </div>
                    <Link
            href="/admin/subscriptions"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Subscription Operations
            </p>

            <h3 className="mt-3 text-xl font-black text-slate-950">
              Subscription Audit Trail
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review Razorpay payments,
              subscription lifecycle events,
              webhook activity and
              reconciliation history.
            </p>

            <p className="mt-5 text-sm font-bold text-indigo-700">
              View Audit Trail →
            </p>
          </Link>
        </div>
      </section>

      {/* DATABASE ACTIVITY */}

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
          Database Activity
        </p>

        <h2 className="mt-3 text-2xl font-black">
          OpenScholar Data
        </h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DarkMetric
            label="Saved Articles"
            value={
              stats.saved_articles
            }
          />

          <DarkMetric
            label="Collections"
            value={
              stats.collections
            }
          />

          <DarkMetric
            label="Paper Notes"
            value={
              stats.research_notes
            }
          />

          <DarkMetric
            label="Alert Results"
            value={
              stats.alert_results
            }
          />
        </div>

        <p className="mt-6 max-w-4xl text-sm leading-6 text-slate-400">
          These values represent
          OpenScholar application
          records. Detailed storage,
          bandwidth, authentication
          logs and quota information
          remain available in the
          Supabase dashboard.
        </p>
      </section>
    </main>
  );
}

function HealthBadge({
  status,
}: {
  status:
    | "operational"
    | "warning"
    | "unavailable";
}) {
  if (
    status ===
    "operational"
  ) {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">
        ● Operational
      </span>
    );
  }

  if (
    status ===
    "warning"
  ) {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-700">
        ● Warning
      </span>
    );
  }

  return (
    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-rose-700">
      ● Unavailable
    </span>
  );
}

function HealthCard({
  item,
}: {
  item: HealthItem;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">
            {
              item.label
            }
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {
              item.description
            }
          </p>
        </div>

        <span
          className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
            item.status ===
            "operational"
              ? "bg-emerald-500"
              : item.status ===
                  "warning"
                ? "bg-amber-500"
                : item.status ===
                    "checking"
                  ? "animate-pulse bg-indigo-500"
                  : "bg-rose-500"
          }`}
        />
      </div>

      <p className="mt-5 text-sm font-bold text-slate-700">
        {item.status ===
        "checking"
          ? "Checking..."
          : item.status ===
              "operational"
            ? "Operational"
            : item.status ===
                "warning"
              ? "Warning"
              : "Unavailable"}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {
          item.detail
        }
      </p>

      {item.responseTime !==
        null && (
        <p className="mt-3 text-xs font-bold text-slate-400">
          {
            item.responseTime
          }{" "}
          ms
        </p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-indigo-700">
        {value.toLocaleString()}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-950">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function DarkMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">
        {value.toLocaleString()}
      </p>
    </div>
  );
}