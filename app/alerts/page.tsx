"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { getMyEntitlements } from "@/lib/entitlements";

type ResearchAlert = {
  id: string;
  user_id: string;

  name: string;
  query: string;

  search_mode: string;
  work_type: string;

  institution: string | null;

  publication_year: string;

  open_access_only: boolean;

  frequency:
    | "daily"
    | "weekly";

  is_active: boolean;

  last_checked_at:
    | string
    | null;

  last_seen_publication_date:
    | string
    | null;

  new_papers_count: number;

  created_at: string;
  updated_at: string;
};

type AlertResult = {
  id: string;

  user_id: string;
  alert_id: string;

  openalex_work_id: string;

  title: string;

  authors:
    | string
    | null;

  journal:
    | string
    | null;

  publication_year:
    | number
    | null;

  publication_date:
    | string
    | null;

  doi:
    | string
    | null;

  is_open_access: boolean;

  open_access_url:
    | string
    | null;

  source_url:
    | string
    | null;

  citations: number;

  detected_at: string;

  is_seen: boolean;
};

type AlertCheckPaper = {
  openalex_work_id: string;

  title: string;

  authors: string;

  journal: string;

  publication_year:
    | number
    | null;

  publication_date:
    | string
    | null;

  doi:
    | string
    | null;

  citations: number;

  is_open_access: boolean;

  open_access_url:
    | string
    | null;

  source_url:
    | string
    | null;
};

type AlertCheckResponse = {
  papers?: AlertCheckPaper[];
  count?: number;
  checkedAt?: string;
  baseline?: string;
  error?: string;
};

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "Not checked yet";
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

function formatShortDate(
  value: string | null
) {
  if (!value) {
    return "Date not available";
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

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
    }
  ).format(date);
}

function formatSearchMode(
  value: string
) {
  switch (value) {
    case "author":
      return "Author";

    case "title":
      return "Title";

    case "doi":
      return "DOI";

    default:
      return "Keyword";
  }
}

function formatWorkType(
  value: string
) {
  if (
    !value ||
    value === "any"
  ) {
    return "All publication types";
  }

  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function normaliseDoi(
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
    .replace(
      /^doi:\s*/i,
      ""
    )
    .trim();
}

export default function AlertsPage() {
  const [
    alerts,
    setAlerts,
  ] =
    useState<
      ResearchAlert[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    signedIn,
    setSignedIn,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    busyAlertId,
    setBusyAlertId,
  ] =
    useState<
      string | null
    >(null);

  const [
    filter,
    setFilter,
  ] =
    useState<
      | "all"
      | "active"
      | "paused"
    >("all");

  const [
    resultsAlert,
    setResultsAlert,
  ] =
    useState<
      ResearchAlert | null
    >(null);

  const [
    alertResults,
    setAlertResults,
  ] =
    useState<
      AlertResult[]
    >([]);

  const [
    resultsLoading,
    setResultsLoading,
  ] =
    useState(false);

  const [
    resultsMessage,
    setResultsMessage,
  ] =
    useState("");

  const [
    savingPaperId,
    setSavingPaperId,
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error:
          authError,
      } =
        await supabase.auth.getUser();

      if (
        authError ||
        !user
      ) {
        setSignedIn(
          false
        );

        setAlerts(
          []
        );

        return;
      }

      setSignedIn(
        true
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "research_alerts"
          )
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (error) {
        throw error;
      }

      setAlerts(
        (data ||
          []) as ResearchAlert[]
      );
    } catch (error) {
      console.error(
        "Unable to load research alerts:",
        error
      );

      setMessage(
        "Unable to load your research alerts."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  function showTemporaryMessage(
    value: string
  ) {
    setMessage(value);

    window.setTimeout(
      () => {
        setMessage("");
      },
      3500
    );
  }

  async function toggleAlert(
    alert: ResearchAlert
  ) {
    setBusyAlertId(
      alert.id
    );

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        showTemporaryMessage(
          "Please sign in to manage research alerts."
        );

        return;
      }

      /*
  Pausing is always allowed.

  Only resuming a paused alert
  needs an active-alert limit check.
*/
if (!alert.is_active) {
  const entitlements =
    await getMyEntitlements();

  if (
    !entitlements.can_create_alert
  ) {
    if (
      entitlements.plan ===
      "scholar"
    ) {
      showTemporaryMessage(
        "Your Scholar account has reached the 25 active-alert fair-use limit. Pause another alert before resuming this one."
      );
    } else {
      showTemporaryMessage(
        "Your Free account has reached the 2 active-alert limit. Pause another alert or upgrade to Scholar to activate up to 25 alerts."
      );
    }

    return;
  }
}

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "research_alerts"
          )
          .update({
            is_active:
              !alert.is_active,
          })
          .eq(
            "id",
            alert.id
          )
          .eq(
            "user_id",
            user.id
          )
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      setAlerts(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              alert.id
                ? (data as ResearchAlert)
                : item
          )
      );

      showTemporaryMessage(
        alert.is_active
          ? "Research alert paused."
          : "Research alert resumed."
      );
    } catch (error) {
      console.error(
        "Unable to update research alert:",
        error
      );

      showTemporaryMessage(
        "Unable to update this research alert."
      );
    } finally {
      setBusyAlertId(
        null
      );
    }
  }

  async function deleteAlert(
    alert: ResearchAlert
  ) {
    const confirmed =
      window.confirm(
        `Delete the research alert "${alert.name}"? Detected papers for this alert will also be removed.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setBusyAlertId(
      alert.id
    );

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        showTemporaryMessage(
          "Please sign in to manage research alerts."
        );

        return;
      }

      const {
        error,
      } =
        await supabase
          .from(
            "research_alerts"
          )
          .delete()
          .eq(
            "id",
            alert.id
          )
          .eq(
            "user_id",
            user.id
          );

      if (error) {
        throw error;
      }

      setAlerts(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              alert.id
          )
      );

      if (
        resultsAlert?.id ===
        alert.id
      ) {
        setResultsAlert(
          null
        );

        setAlertResults(
          []
        );
      }

      showTemporaryMessage(
        "Research alert deleted."
      );
    } catch (error) {
      console.error(
        "Unable to delete research alert:",
        error
      );

      showTemporaryMessage(
        "Unable to delete this research alert."
      );
    } finally {
      setBusyAlertId(
        null
      );
    }
  }

  function buildSearchUrl(
    alert: ResearchAlert
  ) {
    const params =
      new URLSearchParams();

    params.set(
      "q",
      alert.query
    );

    params.set(
      "mode",
      alert.search_mode
    );

    params.set(
      "type",
      alert.work_type
    );

    params.set(
      "year",
      alert.publication_year
    );

    params.set(
      "sort",
      "newest"
    );

    if (
      alert.institution
    ) {
      params.set(
        "institution",
        alert.institution
      );
    }

    params.set(
      "oa",
      String(
        alert.open_access_only
      )
    );

    return `/search?${params.toString()}`;
  }

  function openFullSearch(
    alert: ResearchAlert
  ) {
    window.location.href =
      buildSearchUrl(
        alert
      );
  }

  async function runAlertNow(
    alert: ResearchAlert
  ) {
    setBusyAlertId(
      alert.id
    );

    setMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        showTemporaryMessage(
          "Please sign in to run research alerts."
        );

        return;
      }

      const baseline =
        alert.last_checked_at ||
        alert.created_at;

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

            body:
              JSON.stringify({
                query:
                  alert.query,

                searchMode:
                  alert.search_mode,

                workType:
                  alert.work_type,

                institution:
                  alert.institution,

                publicationYear:
                  alert.publication_year,

                openAccessOnly:
                  alert.open_access_only,

                baseline,
              }),
          }
        );

      const checkData =
        (await response.json()) as AlertCheckResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          checkData.error ||
            "Unable to check this alert."
        );
      }

      const papers =
        checkData.papers ||
        [];

      if (
        papers.length >
        0
      ) {
        const rows =
          papers.map(
            (paper) => ({
              user_id:
                user.id,

              alert_id:
                alert.id,

              openalex_work_id:
                paper.openalex_work_id,

              title:
                paper.title,

              authors:
                paper.authors,

              journal:
                paper.journal,

              publication_year:
                paper.publication_year,

              publication_date:
                paper.publication_date,

              doi:
                paper.doi,

              citations:
                paper.citations,

              is_open_access:
                paper.is_open_access,

              open_access_url:
                paper.open_access_url,

              source_url:
                paper.source_url,

              is_seen:
                false,
            })
          );

        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "research_alert_results"
            )
            .upsert(
              rows,
              {
                onConflict:
                  "alert_id,openalex_work_id",

                ignoreDuplicates:
                  true,
              }
            );

        if (
          insertError
        ) {
          throw insertError;
        }
      }

      const {
        count:
          unseenCount,
        error:
          countError,
      } =
        await supabase
          .from(
            "research_alert_results"
          )
          .select("*", {
            count:
              "exact",
            head: true,
          })
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "alert_id",
            alert.id
          )
          .eq(
            "is_seen",
            false
          );

      if (
        countError
      ) {
        throw countError;
      }

      const latestPublicationDate =
        papers
          .map(
            (paper) =>
              paper.publication_date
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
          .sort()
          .at(-1);

      const checkedAt =
        checkData.checkedAt ||
        new Date().toISOString();

      const updatePayload: {
        last_checked_at: string;
        new_papers_count: number;
        last_seen_publication_date?: string;
      } = {
        last_checked_at:
          checkedAt,

        new_papers_count:
          unseenCount ||
          0,
      };

      if (
        latestPublicationDate
      ) {
        updatePayload.last_seen_publication_date =
          latestPublicationDate;
      }

      const {
        data:
          updatedAlert,
        error:
          updateError,
      } =
        await supabase
          .from(
            "research_alerts"
          )
          .update(
            updatePayload
          )
          .eq(
            "id",
            alert.id
          )
          .eq(
            "user_id",
            user.id
          )
          .select("*")
          .single();

      if (
        updateError
      ) {
        throw updateError;
      }

      setAlerts(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              alert.id
                ? (updatedAlert as ResearchAlert)
                : item
          )
      );

      const newCount =
        papers.length;

      if (
        newCount >
        0
      ) {
        showTemporaryMessage(
          `${newCount} new paper${
            newCount === 1
              ? ""
              : "s"
          } detected.`
        );
      } else {
        showTemporaryMessage(
          "No new papers were found since the previous check."
        );
      }
    } catch (error) {
      console.error(
        "Research alert check failed:",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to run this research alert.";

      showTemporaryMessage(
        errorMessage
      );
    } finally {
      setBusyAlertId(
        null
      );
    }
  }

  async function viewNewPapers(
    alert: ResearchAlert
  ) {
    setResultsAlert(
      alert
    );

    setAlertResults(
      []
    );

    setResultsMessage(
      ""
    );

    setResultsLoading(
      true
    );

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setResultsMessage(
          "Please sign in to view alert results."
        );

        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "research_alert_results"
          )
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "alert_id",
            alert.id
          )
          .eq(
            "is_seen",
            false
          )
          .order(
            "publication_date",
            {
              ascending:
                false,
            }
          )
          .order(
            "detected_at",
            {
              ascending:
                false,
            }
          );

      if (error) {
        throw error;
      }

      setAlertResults(
        (data ||
          []) as AlertResult[]
      );

      if (
        !data ||
        data.length ===
          0
      ) {
        setResultsMessage(
          "There are no unseen papers for this alert."
        );
      }
    } catch (error) {
      console.error(
        "Unable to load new alert papers:",
        error
      );

      setResultsMessage(
        "Unable to load new papers for this alert."
      );
    } finally {
      setResultsLoading(
        false
      );
    }
  }

  async function markAllAsSeen() {
    if (
      !resultsAlert
    ) {
      return;
    }

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const {
        error:
          resultError,
      } =
        await supabase
          .from(
            "research_alert_results"
          )
          .update({
            is_seen:
              true,
          })
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "alert_id",
            resultsAlert.id
          )
          .eq(
            "is_seen",
            false
          );

      if (
        resultError
      ) {
        throw resultError;
      }

      const {
        data:
          updatedAlert,
        error:
          alertError,
      } =
        await supabase
          .from(
            "research_alerts"
          )
          .update({
            new_papers_count:
              0,
          })
          .eq(
            "id",
            resultsAlert.id
          )
          .eq(
            "user_id",
            user.id
          )
          .select("*")
          .single();

      if (
        alertError
      ) {
        throw alertError;
      }

      setAlerts(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              resultsAlert.id
                ? (updatedAlert as ResearchAlert)
                : item
          )
      );

      setResultsAlert(
        updatedAlert as ResearchAlert
      );

      setAlertResults(
        []
      );

      setResultsMessage(
        "All papers marked as seen."
      );
    } catch (error) {
      console.error(
        "Unable to mark alert papers as seen:",
        error
      );

      setResultsMessage(
        "Unable to update these alert results."
      );
    }
  }

  async function saveAlertPaper(
  paper: AlertResult
) {
  setSavingPaperId(
    paper.id
  );

  try {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      window.location.href =
        "/signin";

      return;
    }

    const entitlements =
      await getMyEntitlements();

    const libraryLimit =
      entitlements.saved_papers_limit;

    const {
      count,
      error: countError,
    } =
      await supabase
        .from(
          "saved_articles"
        )
        .select("*", {
          count:
            "exact",
          head: true,
        })
        .eq(
          "user_id",
          user.id
        );

    if (countError) {
      console.error(
        "Unable to verify Library usage:",
        countError
      );

      setResultsMessage(
        "Unable to verify your Library limit. Please try again."
      );

      return;
    }

    if (
      (count ?? 0) >=
      libraryLimit
    ) {
      if (
        entitlements.plan ===
        "scholar"
      ) {
        setResultsMessage(
          "Your Scholar Library has reached the 1,000-paper fair-use limit. Remove an existing paper to save another."
        );
      } else {
        setResultsMessage(
          "Your Free Library has reached the 100-paper limit. Upgrade to Scholar to save up to 1,000 papers."
        );
      }

      return;
    }

    const doi =
      normaliseDoi(
        paper.doi
      );

    const {
      error,
    } =
      await supabase
        .from(
          "saved_articles"
        )
        .insert({
          user_id:
            user.id,

          article_id:
            paper.openalex_work_id,

          title:
            paper.title,

          authors:
            paper.authors,

          journal:
            paper.journal,

          biblio:
            paper.publication_date ||
            (paper.publication_year
              ? String(
                  paper.publication_year
                )
              : null),

          citations:
            paper.citations,

          year:
            paper.publication_year,

          doi:
            doi
              ? `https://doi.org/${doi}`
              : null,

          is_open_access:
            paper.is_open_access,

          pdf_url:
            paper.open_access_url,

          source_url:
            paper.source_url,
        });

    if (error) {
      if (
        error.message.includes(
          "FREE_LIBRARY_LIMIT_REACHED"
        )
      ) {
        setResultsMessage(
          "Your Free Library has reached the 100-paper limit. Upgrade to Scholar to save up to 1,000 papers."
        );

        return;
      }

      if (
        error.message.includes(
          "SCHOLAR_LIBRARY_LIMIT_REACHED"
        )
      ) {
        setResultsMessage(
          "Your Scholar Library has reached the 1,000-paper fair-use limit. Remove an existing paper to save another."
        );

        return;
      }

      if (
        error.code ===
          "23505" ||
        error.message
          .toLowerCase()
          .includes(
            "duplicate"
          ) ||
        error.message.includes(
          "saved_articles_unique"
        )
      ) {
        setResultsMessage(
          "This paper is already in your Library."
        );

        return;
      }

      throw error;
    }

    setResultsMessage(
      `Paper saved to your Library. ${(count ?? 0) + 1} of ${libraryLimit} papers used.`
    );
  } catch (error) {
    console.error(
      "Unable to save alert paper:",
      error
    );

    setResultsMessage(
      "Unable to save this paper."
    );
  } finally {
    setSavingPaperId(
      null
    );
  }
}

  const activeCount =
    useMemo(
      () =>
        alerts.filter(
          (alert) =>
            alert.is_active
        ).length,
      [alerts]
    );

  const pausedCount =
    alerts.length -
    activeCount;

  const totalNewPapers =
    useMemo(
      () =>
        alerts.reduce(
          (
            total,
            alert
          ) =>
            total +
            (alert.new_papers_count ||
              0),
          0
        ),
      [alerts]
    );

  const filteredAlerts =
    useMemo(() => {
      if (
        filter ===
        "active"
      ) {
        return alerts.filter(
          (alert) =>
            alert.is_active
        );
      }

      if (
        filter ===
        "paused"
      ) {
        return alerts.filter(
          (alert) =>
            !alert.is_active
        );
      }

      return alerts;
    }, [
      alerts,
      filter,
    ]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />

          <p className="mt-5 font-semibold text-slate-500">
            Loading research
            alerts...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {message && (
        <div className="fixed bottom-6 right-6 z-[200] max-w-md rounded-2xl border border-indigo-200 bg-white px-5 py-4 text-sm font-bold text-indigo-700 shadow-2xl">
          {message}
        </div>
      )}

      <section className="relative overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-8 shadow-sm md:p-10">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-700">
              Literature Monitoring
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Research Alerts
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Monitor new scholarly
              publications in research
              areas that matter to you.
            </p>
          </div>

          <Link
            href="/search"
            className="w-fit rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
          >
            Search & Create Alert
          </Link>
        </div>
      </section>

      {!signedIn ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
              Research Monitoring
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-950">
              Follow new research in
              your field
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              Sign in to create alerts
              and monitor newly
              published literature
              matching your research
              interests.
            </p>

            <Link
              href="/signin?next=%2Falerts"
              className="mt-7 inline-flex rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
            >
              Sign in to Continue
            </Link>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              Research Alerts
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Stay focused on what
              matters
            </h2>

            <div className="mt-6 space-y-3">
              {[
                "Monitor research topics",
                "Detect newly published papers",
                "Preserve search filters",
                "Choose daily or weekly monitoring",
                "Save useful papers to your Library",
              ].map(
                (item) => (
                  <div
                    key={
                      item
                    }
                    className="flex gap-3 rounded-2xl bg-white/10 px-4 py-3"
                  >
                    <span className="font-black text-emerald-300">
                      ✓
                    </span>

                    <span className="text-sm leading-6 text-slate-200">
                      {
                        item
                      }
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      ) : alerts.length ===
        0 ? (
        <section className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-2xl font-black text-indigo-700">
            +
          </div>

          <h2 className="mt-6 text-3xl font-black text-slate-950">
            No research alerts yet
          </h2>

          <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-500">
            Search for a research
            topic, apply the filters
            you need and create an
            alert to monitor future
            publications.
          </p>

          <Link
            href="/search"
            className="mt-7 inline-flex rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
          >
            Find Literature
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Total Alerts
              </p>

              <p className="mt-3 text-3xl font-black text-slate-950">
                {
                  alerts.length
                }
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Active
              </p>

              <p className="mt-3 text-3xl font-black text-emerald-900">
                {
                  activeCount
                }
              </p>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Paused
              </p>

              <p className="mt-3 text-3xl font-black text-amber-900">
                {
                  pausedCount
                }
              </p>
            </div>

            <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                New Papers
              </p>

              <p className="mt-3 text-3xl font-black text-indigo-950">
                {
                  totalNewPapers
                }
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {[
                [
                  "all",
                  `All (${alerts.length})`,
                ],
                [
                  "active",
                  `Active (${activeCount})`,
                ],
                [
                  "paused",
                  `Paused (${pausedCount})`,
                ],
              ].map(
                ([
                  value,
                  label,
                ]) => (
                  <button
                    key={
                      value
                    }
                    type="button"
                    onClick={() =>
                      setFilter(
                        value as
                          | "all"
                          | "active"
                          | "paused"
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                      filter ===
                      value
                        ? "border-indigo-700 bg-indigo-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                  >
                    {
                      label
                    }
                  </button>
                )
              )}
            </div>
          </section>

          <section className="mt-6 space-y-5">
            {filteredAlerts.map(
              (alert) => {
                const busy =
                  busyAlertId ===
                  alert.id;

                return (
                  <article
                    key={
                      alert.id
                    }
                    className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:border-indigo-200 hover:shadow-lg"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              alert.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {alert.is_active
                              ? "Active"
                              : "Paused"}
                          </span>

                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold capitalize text-indigo-700">
                            {
                              alert.frequency
                            }
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {formatSearchMode(
                              alert.search_mode
                            )}
                          </span>

                          {alert.open_access_only && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              Open Access
                            </span>
                          )}
                        </div>

                        <h2 className="mt-4 text-2xl font-black text-slate-950">
                          {
                            alert.name
                          }
                        </h2>

                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                          Search Query
                        </p>

                        <p className="mt-1 break-words font-bold text-slate-800">
                          {
                            alert.query
                          }
                        </p>

                        {alert.new_papers_count >
                          0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              viewNewPapers(
                                alert
                              )
                            }
                            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-left transition hover:bg-indigo-100"
                          >
                            <span className="text-2xl font-black text-indigo-700">
                              {
                                alert.new_papers_count
                              }
                            </span>

                            <span>
                              <span className="block text-xs font-black uppercase tracking-wide text-indigo-700">
                                New Paper
                                {alert.new_papers_count ===
                                1
                                  ? ""
                                  : "s"}
                              </span>

                              <span className="mt-1 block text-xs text-slate-500">
                                View newly
                                detected
                                literature
                              </span>
                            </span>
                          </button>
                        ) : (
                          <div className="mt-5 inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                            No unseen new papers
                          </div>
                        )}

                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Publication Type
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {formatWorkType(
                                alert.work_type
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Year Filter
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {alert.publication_year ===
                              "any"
                                ? "Any year"
                                : `Since ${alert.publication_year}`}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Last Checked
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {formatDateTime(
                                alert.last_checked_at
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Latest Detected Date
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {alert.last_seen_publication_date
                                ? formatShortDate(
                                    alert.last_seen_publication_date
                                  )
                                : "None yet"}
                            </p>
                          </div>
                        </div>

                        {alert.institution && (
                          <div className="mt-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Institution
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {
                                alert.institution
                              }
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3 lg:max-w-sm lg:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            runAlertNow(
                              alert
                            )
                          }
                          disabled={
                            busy
                          }
                          className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busy
                            ? "Checking..."
                            : "Run Now"}
                        </button>

                        {alert.new_papers_count >
                          0 && (
                          <button
                            type="button"
                            onClick={() =>
                              viewNewPapers(
                                alert
                              )
                            }
                            disabled={
                              busy
                            }
                            className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                          >
                            View New Papers
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            openFullSearch(
                              alert
                            )
                          }
                          disabled={
                            busy
                          }
                          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          View Search
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleAlert(
                              alert
                            )
                          }
                          disabled={
                            busy
                          }
                          className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                        >
                          {alert.is_active
                            ? "Pause"
                            : "Resume"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteAlert(
                              alert
                            )
                          }
                          disabled={
                            busy
                          }
                          className="rounded-xl border border-rose-200 px-5 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </section>
        </>
      )}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
        <p className="text-sm font-bold text-slate-800">
          How Research Alerts work
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
          <strong>Run Now</strong>{" "}
          checks for newly published
          papers since the previous
          alert check.{" "}
          <strong>View New Papers</strong>{" "}
          shows only newly detected
          literature.{" "}
          <strong>View Search</strong>{" "}
          opens the complete current
          search for the alert topic.
        </p>
      </section>

      {/* NEW PAPERS DIALOG */}

      {resultsAlert && (
        <div
          className="fixed inset-0 z-[180] overflow-y-auto bg-slate-950/70 px-4 py-8 backdrop-blur-sm"
          onClick={() =>
            setResultsAlert(
              null
            )
          }
        >
          <div
            className="mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-200 bg-white px-8 py-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-700">
                  Alert Results
                </p>

                <h2 className="mt-3 text-3xl font-black text-slate-950">
                  New Papers
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Newly detected papers for{" "}
                  <strong>
                    {
                      resultsAlert.name
                    }
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setResultsAlert(
                    null
                  )
                }
                aria-label="Close new papers"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-slate-50"
              >
                ×
              </button>
            </div>

            <div className="p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    {
                      alertResults.length
                    }{" "}
                    unseen paper
                    {alertResults.length ===
                    1
                      ? ""
                      : "s"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Papers remain
                    available until
                    you mark them as
                    seen.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {alertResults.length >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        markAllAsSeen
                      }
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Mark All as Seen
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      openFullSearch(
                        resultsAlert
                      )
                    }
                    className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
                  >
                    View Full Search
                  </button>
                </div>
              </div>

              {resultsMessage && (
                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm font-semibold text-indigo-700">
                  {
                    resultsMessage
                  }
                </div>
              )}

              {resultsLoading ? (
                <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-700" />

                  <p className="mt-4 text-sm font-semibold text-slate-500">
                    Loading newly
                    detected papers...
                  </p>
                </div>
              ) : alertResults.length ===
                0 ? (
                <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <h3 className="text-xl font-black text-slate-950">
                    No unseen papers
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Run this alert
                    again later to
                    check for newly
                    published
                    research.
                  </p>
                </div>
              ) : (
                <div className="mt-7 space-y-5">
                  {alertResults.map(
                    (paper) => {
                      const doi =
                        normaliseDoi(
                          paper.doi
                        );

                      return (
                        <article
                          key={
                            paper.id
                          }
                          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                        >
                          <div className="flex flex-wrap gap-2">
                            {paper.publication_date && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {formatShortDate(
                                  paper.publication_date
                                )}
                              </span>
                            )}

                            {paper.is_open_access && (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                Open Access
                              </span>
                            )}

                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                              {
                                paper.citations
                              }{" "}
                              citations
                            </span>

                            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                              New
                            </span>
                          </div>

                          <h3 className="mt-4 text-xl font-black leading-8 text-slate-950">
                            {
                              paper.title
                            }
                          </h3>

                          <p className="mt-3 text-sm leading-6 text-slate-500">
                            {paper.authors ||
                              "Authors not available"}
                          </p>

                          <p className="mt-3 font-bold text-slate-800">
                            {paper.journal ||
                              "Unknown source"}
                          </p>

                          {doi && (
                            <p className="mt-2 text-xs font-semibold text-slate-400">
                              DOI:{" "}
                              {
                                doi
                              }
                            </p>
                          )}

                          <div className="mt-5 flex flex-wrap gap-3">
                            {paper.source_url && (
                              <a
                                href={
                                  paper.source_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                              >
                                Open Source
                              </a>
                            )}

                            {paper.open_access_url && (
                              <a
                                href={
                                  paper.open_access_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                              >
                                Full Text
                              </a>
                            )}

                            {doi && (
                              <a
                                href={`https://doi.org/${doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                              >
                                DOI
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                saveAlertPaper(
                                  paper
                                )
                              }
                              disabled={
                                savingPaperId ===
                                paper.id
                              }
                              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
                            >
                              {savingPaperId ===
                              paper.id
                                ? "Saving..."
                                : "Save to Library"}
                            </button>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}