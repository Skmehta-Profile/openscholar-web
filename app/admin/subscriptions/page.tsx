"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabaseClient";

type AuditEvent = {
  id: string;
  user_id: string | null;

  action: string;
  source: string;
  provider: string;

  provider_subscription_id:
    string | null;

  provider_payment_id:
    string | null;

  previous_status:
    string | null;

  new_status:
    string | null;

  billing_cycle:
    string | null;

  message:
    string | null;

  metadata:
    Record<
      string,
      unknown
    > | null;

  created_at: string;
};

type AuditResponse = {
  events: AuditEvent[];
  count: number;
};

function formatDateTime(
  value: string
) {
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
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(date);
}

function shortId(
  value:
    | string
    | null,
  length = 16
) {
  if (!value) {
    return "—";
  }

  if (
    value.length <=
    length
  ) {
    return value;
  }

  return `${value.slice(
    0,
    length
  )}…`;
}

function statusClasses(
  status:
    | string
    | null
) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "past_due":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "cancelled":
    case "expired":
      return "border-slate-200 bg-slate-100 text-slate-600";

    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

export default function AdminSubscriptionAuditPage() {
  const [events, setEvents] =
    useState<AuditEvent[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [action, setAction] =
    useState("");

  const [source, setSource] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState<
      Date | null
    >(null);

  const loadAudit =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const {
            data:
              sessionData,
            error:
              sessionError,
          } =
            await supabase
              .auth
              .getSession();

          const accessToken =
            sessionData
              .session
              ?.access_token;

          if (
            sessionError ||
            !accessToken
          ) {
            throw new Error(
              "Please sign in to access the admin audit trail."
            );
          }

          const params =
            new URLSearchParams();

          if (
            action.trim()
          ) {
            params.set(
              "action",
              action.trim()
            );
          }

          if (
            source.trim()
          ) {
            params.set(
              "source",
              source.trim()
            );
          }

          if (
            search.trim()
          ) {
            params.set(
              "search",
              search.trim()
            );
          }

          params.set(
            "limit",
            "100"
          );

          const response =
            await fetch(
              `/api/admin/subscriptions/audit?${params.toString()}`,
              {
                method:
                  "GET",

                headers: {
                  Authorization:
                    `Bearer ${accessToken}`,
                },
              }
            );

          const data =
            (await response.json()) as
              | AuditResponse
              | {
                  error?:
                    string;
                };

          if (
            !response.ok
          ) {
            throw new Error(
              "error" in
                data &&
              data.error
                ? data.error
                : "Unable to load subscription audit trail."
            );
          }

          if (
            "events" in
            data
          ) {
            setEvents(
              data.events
            );
          }

          setLastUpdated(
            new Date()
          );
        } catch (loadError) {
          console.error(
            "Unable to load admin subscription audit trail:",
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load subscription audit trail."
          );

          setEvents([]);
        } finally {
          setLoading(false);
        }
      },
      [
        action,
        source,
        search,
      ]
    );

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const actions =
    useMemo(
      () =>
        Array.from(
          new Set(
            events.map(
              (
                event
              ) =>
                event.action
            )
          )
        ).sort(),
      [events]
    );

  const sources =
    useMemo(
      () =>
        Array.from(
          new Set(
            events.map(
              (
                event
              ) =>
                event.source
            )
          )
        ).sort(),
      [events]
    );

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-7 py-8 text-white md:px-9">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-300">
            Administration
          </p>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Subscription Audit Trail
              </h1>

              <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                Review Razorpay subscription activity,
                reconciliation, lifecycle changes and
                payment-related events recorded by
                OpenScholar.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={
                  loadAudit
                }
                disabled={
                  loading
                }
                className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Refreshing..."
                  : "Refresh Audit"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-7 md:p-9">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]">
            <input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
              placeholder="Search subscription ID, payment ID, action or message"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <select
              value={
                source
              }
              onChange={(
                event
              ) =>
                setSource(
                  event
                    .target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">
                All Sources
              </option>

              {sources.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <select
              value={
                action
              }
              onChange={(
                event
              ) =>
                setAction(
                  event
                    .target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">
                All Actions
              </option>

              {actions.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch(
                  ""
                );

                setAction(
                  ""
                );

                setSource(
                  ""
                );
              }}
              className="rounded-xl border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Clear
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <p>
              Showing{" "}
              <strong className="text-slate-800">
                {
                  events.length
                }
              </strong>{" "}
              audit event
              {events.length ===
              1
                ? ""
                : "s"}
            </p>

            {lastUpdated && (
              <p>
                Updated{" "}
                {lastUpdated.toLocaleTimeString(
                  "en-IN",
                  {
                    hour:
                      "2-digit",

                    minute:
                      "2-digit",
                  }
                )}
              </p>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />

              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading subscription audit trail...
              </p>
            </div>
          ) : events.length ===
            0 ? (
            <div className="mt-7 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
              <h2 className="text-xl font-black text-slate-800">
                No audit events found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Try clearing the
                filters or wait for
                new subscription
                activity.
              </p>
            </div>
          ) : (
            <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1150px] w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-4">
                      Date
                    </th>

                    <th className="px-4 py-4">
                      Action
                    </th>

                    <th className="px-4 py-4">
                      Source
                    </th>

                    <th className="px-4 py-4">
                      User
                    </th>

                    <th className="px-4 py-4">
                      Subscription
                    </th>

                    <th className="px-4 py-4">
                      Payment
                    </th>

                    <th className="px-4 py-4">
                      Status
                    </th>

                    <th className="px-4 py-4">
                      Billing
                    </th>

                    <th className="px-4 py-4">
                      Message
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {events.map(
                    (
                      event
                    ) => (
                      <tr
                        key={
                          event.id
                        }
                        className="border-b border-slate-100 align-top last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-600">
                          {formatDateTime(
                            event.created_at
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                            {
                              event.action
                            }
                          </span>
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-600">
                          {
                            event.source
                          }
                        </td>

                        <td
                          className="px-4 py-4 font-mono text-xs text-slate-500"
                          title={
                            event.user_id ??
                            ""
                          }
                        >
                          {shortId(
                            event.user_id,
                            12
                          )}
                        </td>

                        <td
                          className="px-4 py-4 font-mono text-xs text-slate-600"
                          title={
                            event.provider_subscription_id ??
                            ""
                          }
                        >
                          {shortId(
                            event.provider_subscription_id,
                            18
                          )}
                        </td>

                        <td
                          className="px-4 py-4 font-mono text-xs text-slate-600"
                          title={
                            event.provider_payment_id ??
                            ""
                          }
                        >
                          {shortId(
                            event.provider_payment_id,
                            18
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            {event.previous_status && (
                              <span className="text-xs font-semibold text-slate-400">
                                {
                                  event.previous_status
                                }{" "}
                                →
                              </span>
                            )}

                            {event.new_status ? (
                              <span
                                className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClasses(
                                  event.new_status
                                )}`}
                              >
                                {
                                  event.new_status
                                }
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                —
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 font-semibold capitalize text-slate-600">
                          {event.billing_cycle ??
                            "—"}
                        </td>

                        <td className="max-w-[280px] px-4 py-4 leading-6 text-slate-600">
                          {event.message ??
                            "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}