"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabaseClient";

type DailyActivity = {
  date: string;
  users: number;
  saved_papers: number;
  notes: number;
  alerts: number;
};

type GrowthAnalytics = {
  users_last_7_days: number;
  users_last_30_days: number;

  saved_papers_last_7_days: number;
  saved_papers_last_30_days: number;

  notes_last_7_days: number;
  notes_last_30_days: number;

  alerts_last_7_days: number;
  alerts_last_30_days: number;

  daily_activity: DailyActivity[];
};

const emptyAnalytics: GrowthAnalytics = {
  users_last_7_days: 0,
  users_last_30_days: 0,

  saved_papers_last_7_days: 0,
  saved_papers_last_30_days: 0,

  notes_last_7_days: 0,
  notes_last_30_days: 0,

  alerts_last_7_days: 0,
  alerts_last_30_days: 0,

  daily_activity: [],
};

type MetricKey =
  | "users"
  | "saved_papers"
  | "notes"
  | "alerts";

export default function AdminGrowthAnalytics() {
  const [
    analytics,
    setAnalytics,
  ] =
    useState<GrowthAnalytics>(
      emptyAnalytics
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

  const [
    activeMetric,
    setActiveMetric,
  ] =
    useState<MetricKey>(
      "users"
    );

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const {
        data,
        error: analyticsError,
      } =
        await supabase.rpc(
          "get_openscholar_admin_growth_analytics"
        );

      if (analyticsError) {
        throw analyticsError;
      }

      setAnalytics({
        ...emptyAnalytics,
        ...(data as GrowthAnalytics),

        daily_activity:
          Array.isArray(
            data?.daily_activity
          )
            ? data.daily_activity
            : [],
      });
    } catch (loadError) {
      console.error(
        "Unable to load growth analytics:",
        loadError
      );

      setError(
        "Unable to load usage and growth analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  const maxValue =
    useMemo(() => {
      const values =
        analytics.daily_activity.map(
          (item) =>
            Number(
              item[
                activeMetric
              ] || 0
            )
        );

      return Math.max(
        1,
        ...values
      );
    }, [
      analytics.daily_activity,
      activeMetric,
    ]);

  if (loading) {
    return (
      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">
          Loading usage analytics...
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
            Usage & Growth
          </p>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            Platform Adoption
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Track researcher registrations and core
            OpenScholar activity over recent periods.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAnalytics}
          className="w-fit rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
        >
          Refresh Analytics
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GrowthMetric
          label="New Users"
          sevenDays={
            analytics.users_last_7_days
          }
          thirtyDays={
            analytics.users_last_30_days
          }
        />

        <GrowthMetric
          label="Papers Saved"
          sevenDays={
            analytics.saved_papers_last_7_days
          }
          thirtyDays={
            analytics.saved_papers_last_30_days
          }
        />

        <GrowthMetric
          label="Research Notes"
          sevenDays={
            analytics.notes_last_7_days
          }
          thirtyDays={
            analytics.notes_last_30_days
          }
        />

        <GrowthMetric
          label="Alerts Created"
          sevenDays={
            analytics.alerts_last_7_days
          }
          thirtyDays={
            analytics.alerts_last_30_days
          }
        />
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              14-Day Activity
            </p>

            <h3 className="mt-2 text-xl font-black text-slate-950">
              Daily Usage Trend
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              [
                "users",
                "Users",
              ],
              [
                "saved_papers",
                "Saved Papers",
              ],
              [
                "notes",
                "Notes",
              ],
              [
                "alerts",
                "Alerts",
              ],
            ].map(
              ([
                key,
                label,
              ]) => (
                <button
                  key={
                    key
                  }
                  type="button"
                  onClick={() =>
                    setActiveMetric(
                      key as MetricKey
                    )
                  }
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                    activeMetric ===
                    key
                      ? "border-indigo-700 bg-indigo-700 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                  }`}
                >
                  {
                    label
                  }
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-7 gap-3 md:grid-cols-14">
          {analytics.daily_activity.map(
            (item) => {
              const value =
                Number(
                  item[
                    activeMetric
                  ] || 0
                );

              const heightPercent =
                Math.max(
                  value > 0
                    ? 12
                    : 4,

                  Math.round(
                    (value /
                      maxValue) *
                      100
                  )
                );

              return (
                <div
                  key={
                    item.date
                  }
                  className="flex min-w-0 flex-col items-center"
                >
                  <div className="flex h-36 w-full items-end justify-center">
                    <div
                      className="w-full max-w-7 rounded-t-lg bg-indigo-600 transition-all"
                      style={{
                        height: `${heightPercent}%`,
                        opacity:
                          value ===
                          0
                            ? 0.15
                            : 1,
                      }}
                      title={`${item.date}: ${value}`}
                    />
                  </div>

                  <p className="mt-2 text-xs font-black text-slate-700">
                    {
                      value
                    }
                  </p>

                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                    {new Date(
                      `${item.date}T00:00:00`
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                      }
                    )}
                  </p>
                </div>
              );
            }
          )}
        </div>

        {analytics.daily_activity.length ===
          0 && (
          <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No activity data available yet.
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs leading-5 text-slate-500">
          Usage analytics currently measure account
          registrations and OpenScholar application
          activity stored in Supabase. They do not
          track private search terms, paper-note
          contents or browsing behaviour.
        </p>
      </div>
    </section>
  );
}

function GrowthMetric({
  label,
  sevenDays,
  thirtyDays,
}: {
  label: string;
  sevenDays: number;
  thirtyDays: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-3xl font-black text-indigo-700">
            {sevenDays.toLocaleString()}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Last 7 days
          </p>
        </div>

        <div>
          <p className="text-3xl font-black text-slate-950">
            {thirtyDays.toLocaleString()}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Last 30 days
          </p>
        </div>
      </div>
    </div>
  );
}