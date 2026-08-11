"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabaseClient";

type InfrastructureStats = {
  database_bytes: number;
  database_mb: number;
  database_connections: number;

  saved_articles_bytes: number;
  collections_bytes: number;
  collection_articles_bytes: number;

  research_notes_bytes: number;
  workspace_items_bytes: number;

  research_alerts_bytes: number;
  alert_results_bytes: number;

  profile_claims_bytes: number;
  publication_additions_bytes: number;
  publication_exclusions_bytes: number;
};

const emptyStats: InfrastructureStats = {
  database_bytes: 0,
  database_mb: 0,
  database_connections: 0,

  saved_articles_bytes: 0,
  collections_bytes: 0,
  collection_articles_bytes: 0,

  research_notes_bytes: 0,
  workspace_items_bytes: 0,

  research_alerts_bytes: 0,
  alert_results_bytes: 0,

  profile_claims_bytes: 0,
  publication_additions_bytes: 0,
  publication_exclusions_bytes: 0,
};

const SUPABASE_FREE_DATABASE_MB = 500;

function formatBytes(value: number) {
  if (!value) {
    return "0 KB";
  }

  const kb =
    value / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb =
    kb / 1024;

  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }

  return `${(
    mb / 1024
  ).toFixed(2)} GB`;
}

export default function AdminInfrastructureMonitor() {
  const [
    stats,
    setStats,
  ] =
    useState<InfrastructureStats>(
      emptyStats
    );

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

  useEffect(() => {
    loadInfrastructure();
  }, []);

  async function loadInfrastructure() {
    setLoading(true);
    setError("");

    try {
      const {
        data,
        error:
          infrastructureError,
      } =
        await supabase.rpc(
          "get_openscholar_infrastructure_stats"
        );

      if (
        infrastructureError
      ) {
        throw infrastructureError;
      }

      setStats({
        ...emptyStats,
        ...(data as InfrastructureStats),
      });
    } catch (loadError) {
      console.error(
        "Unable to load infrastructure stats:",
        loadError
      );

      setError(
        "Unable to load infrastructure statistics."
      );
    } finally {
      setLoading(false);
    }
  }

  const databasePercent =
    useMemo(
      () =>
        Math.min(
          100,
          Math.max(
            0,
            (stats.database_mb /
              SUPABASE_FREE_DATABASE_MB) *
              100
          )
        ),
      [stats.database_mb]
    );

  const databaseStatus =
    databasePercent >= 85
      ? "critical"
      : databasePercent >= 65
        ? "warning"
        : "healthy";

  const environment =
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

  const tableUsage = [
    {
      label:
        "Saved Articles",
      value:
        stats.saved_articles_bytes,
    },
    {
      label:
        "Collections",
      value:
        stats.collections_bytes +
        stats.collection_articles_bytes,
    },
    {
      label:
        "Research Notes",
      value:
        stats.research_notes_bytes,
    },
    {
      label:
        "Workspace",
      value:
        stats.workspace_items_bytes,
    },
    {
      label:
        "Research Alerts",
      value:
        stats.research_alerts_bytes,
    },
    {
      label:
        "Alert Results",
      value:
        stats.alert_results_bytes,
    },
    {
      label:
        "Research Profiles",
      value:
        stats.profile_claims_bytes,
    },
    {
      label:
        "Publication Curation",
      value:
        stats.publication_additions_bytes +
        stats.publication_exclusions_bytes,
    },
  ].sort(
    (a, b) =>
      b.value - a.value
  );

  if (loading) {
    return (
      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">
          Loading infrastructure
          statistics...
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
            Infrastructure & Cost
          </p>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            Resource Monitor
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Monitor OpenScholar database
            consumption and major application
            storage drivers before they become
            infrastructure costs.
          </p>
        </div>

        <button
          type="button"
          onClick={
            loadInfrastructure
          }
          className="w-fit rounded-xl border border-violet-200 bg-white px-5 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
        >
          Refresh Usage
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Database Size
          </p>

          <p className="mt-3 text-3xl font-black text-slate-950">
            {stats.database_mb.toFixed(
              2
            )}{" "}
            MB
          </p>

          <p className="mt-2 text-sm text-slate-500">
            PostgreSQL database
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Free Database Usage
          </p>

          <p
            className={`mt-3 text-3xl font-black ${
              databaseStatus ===
              "healthy"
                ? "text-emerald-700"
                : databaseStatus ===
                    "warning"
                  ? "text-amber-700"
                  : "text-rose-700"
            }`}
          >
            {databasePercent.toFixed(
              1
            )}
            %
          </p>

          <p className="mt-2 text-sm text-slate-500">
            of 500 MB reference limit
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Database Connections
          </p>

          <p className="mt-3 text-3xl font-black text-slate-950">
            {
              stats.database_connections
            }
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Current PostgreSQL
            connections
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Environment
          </p>

          <p className="mt-3 text-xl font-black text-slate-950">
            {
              environment
            }
          </p>

          <p className="mt-2 text-sm text-slate-500">
            OpenScholar Web
          </p>
        </div>
      </div>

      {/* DATABASE LIMIT */}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Supabase Database
            </p>

            <h3 className="mt-2 text-xl font-black text-slate-950">
              Storage Consumption
            </h3>
          </div>

          <p className="text-sm font-bold text-slate-600">
            {stats.database_mb.toFixed(
              2
            )}{" "}
            MB / 500 MB
          </p>
        </div>

        <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${
              databaseStatus ===
              "healthy"
                ? "bg-emerald-500"
                : databaseStatus ===
                    "warning"
                  ? "bg-amber-500"
                  : "bg-rose-500"
            }`}
            style={{
              width: `${Math.max(
                databasePercent,
                1
              )}%`,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs font-semibold text-slate-500">
          <span>
            Healthy &lt; 65%
          </span>

          <span>
            Warning ≥ 65%
          </span>

          <span>
            Critical ≥ 85%
          </span>
        </div>
      </div>

      {/* TABLE USAGE */}

      <div className="mt-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Database Drivers
        </p>

        <h3 className="mt-2 text-xl font-black text-slate-950">
          Largest OpenScholar Data Areas
        </h3>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {tableUsage.map(
            (item) => (
              <div
                key={
                  item.label
                }
                className="flex items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <span className="text-sm font-bold text-slate-700">
                  {
                    item.label
                  }
                </span>

                <span className="text-sm font-black text-slate-950">
                  {formatBytes(
                    item.value
                  )}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* COST RISK */}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div
          className={`rounded-3xl border p-6 ${
            databaseStatus ===
            "healthy"
              ? "border-emerald-200 bg-emerald-50"
              : databaseStatus ===
                  "warning"
                ? "border-amber-200 bg-amber-50"
                : "border-rose-200 bg-rose-50"
          }`}
        >
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Database Cost Risk
          </p>

          <h3 className="mt-3 text-xl font-black text-slate-950">
            {databaseStatus ===
            "healthy"
              ? "Low"
              : databaseStatus ===
                  "warning"
                ? "Monitor Usage"
                : "Action Recommended"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            OpenScholar currently uses{" "}
            {databasePercent.toFixed(
              1
            )}
            % of the configured Supabase
            Free database reference limit.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-300">
            External Services
          </p>

          <h3 className="mt-3 text-xl font-black">
            Provider Usage
          </h3>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-sm font-bold">
                Supabase
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Database, Auth and
                application storage
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-sm font-bold">
                Vercel
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Hosting, builds and
                server functions
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-sm font-bold">
                OpenAlex
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Scholarly metadata API
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs leading-5 text-slate-500">
          OpenScholar displays measurable
          application-side resource usage.
          Exact provider invoices, bandwidth
          quotas and compute consumption should
          continue to be verified in the
          Supabase and Vercel dashboards.
        </p>
      </div>
    </section>
  );
}