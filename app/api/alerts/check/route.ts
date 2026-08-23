import {
  NextResponse,
} from "next/server";
import {
  createClient,
} from "@supabase/supabase-js";
import {
  checkRateLimit,
} from "@/lib/rateLimit";

type CheckAlertRequest = {
  alert_id: string;
};

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

type OpenAlexWork = {
  id: string;

  title:
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

  cited_by_count:
    | number
    | null;

  primary_location?: {
    source?: {
      display_name?:
        | string
        | null;
    } | null;

    landing_page_url?:
      | string
      | null;

    pdf_url?:
      | string
      | null;
  } | null;

  authorships?: {
    author?: {
      display_name?:
        | string
        | null;
    } | null;
  }[];

  open_access?: {
    is_oa?: boolean;

    oa_url?:
      | string
      | null;
  };
};

type OpenAlexInstitution = {
  id: string;
};

type OpenAlexAuthor = {
  id: string;
};

function cleanOpenAlexId(
  id: string
) {
  return id.substring(
    id.lastIndexOf("/") + 1
  );
}

async function resolveInstitutionId(
  name: string
) {
  const url =
    new URL(
      "https://api.openalex.org/institutions"
    );

  url.searchParams.set(
    "search",
    name
  );

  url.searchParams.set(
    "per-page",
    "1"
  );

  const response =
    await fetch(
      url.toString(),
      {
        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    return null;
  }

  const data =
    await response.json();

  const institution =
    data.results?.[0] as
      | OpenAlexInstitution
      | undefined;

  return institution?.id
    ? cleanOpenAlexId(
        institution.id
      )
    : null;
}

async function resolveAuthorId(
  name: string,
  institutionId:
    | string
    | null
) {
  const url =
    new URL(
      "https://api.openalex.org/authors"
    );

  url.searchParams.set(
    "search",
    name
  );

  url.searchParams.set(
    "per-page",
    "10"
  );

  if (
    institutionId
  ) {
    url.searchParams.set(
      "filter",
      `last_known_institutions.id:${institutionId}`
    );
  }

  const response =
    await fetch(
      url.toString(),
      {
        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    return null;
  }

  const data =
    await response.json();

  const author =
    data.results?.[0] as
      | OpenAlexAuthor
      | undefined;

  return author?.id
    ? cleanOpenAlexId(
        author.id
      )
    : null;
}

export async function POST(
  request: Request
) {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.slice(7);

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "Supabase alert-check configuration is missing."
      );

      return NextResponse.json(
        {
          error:
            "Alert service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const authClient =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    const {
      data: userData,
      error: userError,
    } = await authClient.auth.getUser(
      accessToken
    );

    if (
      userError ||
      !userData.user
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as CheckAlertRequest;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      !isUuid(body.alert_id)
    ) {
      return NextResponse.json(
        {
          error:
            "A valid alert is required.",
        },
        {
          status: 400,
        }
      );
    }

    const rateLimit =
      checkRateLimit({
        key:
          `alert-check:${userData.user.id}`,
        limit: 10,
        windowMs:
          10 * 60 * 1000,
      });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many alert checks. Please wait before trying again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              rateLimit.retryAfterSeconds
            ),
          },
        }
      );
    }

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    const {
      data: alert,
      error: alertError,
    } = await adminClient
      .from("research_alerts")
      .select(
        "id, user_id, query, search_mode, work_type, institution, publication_year, open_access_only, created_at, last_checked_at"
      )
      .eq("id", body.alert_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (alertError) {
      console.error(
        "Unable to load alert for checking."
      );

      return NextResponse.json(
        {
          error:
            "Unable to load this research alert.",
        },
        {
          status: 500,
        }
      );
    }

    if (!alert) {
      return NextResponse.json(
        {
          error:
            "Research alert not found.",
        },
        {
          status: 404,
        }
      );
    }

    const query =
      alert.query?.trim();

    if (
      !query ||
      query.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "A valid alert query is required.",
        },
        {
          status: 400,
        }
      );
    }

    const baselineDate =
      new Date(
        alert.last_checked_at ||
          alert.created_at
      );

    if (
      Number.isNaN(
        baselineDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A valid alert baseline is required.",
        },
        {
          status: 400,
        }
      );
    }

    const now =
      new Date();

    const today =
      now
        .toISOString()
        .slice(0, 10);

    const baseline =
      baselineDate
        .toISOString()
        .slice(0, 10);

    const url =
      new URL(
        "https://api.openalex.org/works"
      );

    const filters:
      string[] = [];

    const searchMode =
      alert.search_mode ||
      "keyword";

    const workType =
      alert.work_type ||
      "any";

    const institution =
      alert.institution?.trim() ||
      "";

    if (
      searchMode ===
      "author"
    ) {
      const institutionId =
        institution
          ? await resolveInstitutionId(
              institution
            )
          : null;

      const authorId =
        await resolveAuthorId(
          query,
          institutionId
        );

      if (
        !authorId
      ) {
        return NextResponse.json({
          papers: [],
          count: 0,

          checkedAt:
            now.toISOString(),

          baseline,

          today,
        });
      }

      filters.push(
        `author.id:${authorId}`
      );
    } else if (
      searchMode ===
      "title"
    ) {
      filters.push(
        `title.search:${query}`
      );
    } else if (
      searchMode ===
      "doi"
    ) {
      const normalizedDoi =
        query
          .replace(
            /^https?:\/\/doi\.org\//i,
            ""
          )
          .replace(
            /^doi:\s*/i,
            ""
          );

      filters.push(
        `doi:https://doi.org/${normalizedDoi}`
      );
    } else {
      url.searchParams.set(
        "search",
        query
      );
    }

    if (
      workType !==
      "any"
    ) {
      filters.push(
        `type:${workType}`
      );
    }

    if (
      alert.open_access_only
    ) {
      filters.push(
        "is_oa:true"
      );
    }

    /*
     * Determine the effective
     * start date.
     *
     * Usually this is the alert
     * baseline. If the user has
     * selected a later year
     * filter, use that later date.
     */

    let effectiveFromDate =
      baseline;

    if (
      alert.publication_year &&
      alert.publication_year !==
        "any"
    ) {
      const requestedStart =
        `${alert.publication_year}-01-01`;

      if (
        requestedStart >
        effectiveFromDate
      ) {
        effectiveFromDate =
          requestedStart;
      }
    }

    /*
     * IMPORTANT:
     * Research Alerts should
     * never classify future-dated
     * OpenAlex records as newly
     * published papers.
     */

    filters.push(
      `from_publication_date:${effectiveFromDate}`
    );

    filters.push(
      `to_publication_date:${today}`
    );

    url.searchParams.set(
      "filter",
      filters.join(",")
    );

    url.searchParams.set(
      "sort",
      "publication_date:desc"
    );

    url.searchParams.set(
      "per-page",
      "100"
    );

    const response =
      await fetch(
        url.toString(),
        {
          cache:
            "no-store",
        }
      );

    if (
      !response.ok
    ) {
      const errorText =
        await response.text();

      console.error(
        "OpenAlex alert check failed:",
        response.status,
        errorText,
        url.toString()
      );

      return NextResponse.json(
        {
          error:
            "Unable to check OpenAlex for new papers.",
        },
        {
          status:
            response.status,
        }
      );
    }

    const data =
      await response.json();

    const baselineTime =
      baselineDate.getTime();

    /*
     * End-of-today UTC boundary.
     *
     * This second guard protects
     * us even if upstream metadata
     * or API filtering behaves
     * unexpectedly.
     */

    const endOfTodayUtc =
      new Date(
        `${today}T23:59:59.999Z`
      ).getTime();

    const papers =
      (
        data.results || []
      )
        .filter(
          (
            work: OpenAlexWork
          ) => {
            if (
              !work.publication_date
            ) {
              return false;
            }

            const publicationTime =
              new Date(
                `${work.publication_date}T00:00:00Z`
              ).getTime();

            if (
              Number.isNaN(
                publicationTime
              )
            ) {
              return false;
            }

            /*
             * Must be newer than
             * the alert baseline.
             */

            if (
              publicationTime <=
              baselineTime
            ) {
              return false;
            }

            /*
             * Must NOT be in the
             * future.
             */

            if (
              publicationTime >
              endOfTodayUtc
            ) {
              return false;
            }

            return true;
          }
        )
        .map(
          (
            work: OpenAlexWork
          ) => {
            const authors =
              work.authorships
                ?.slice(
                  0,
                  12
                )
                .map(
                  (
                    item
                  ) =>
                    item.author
                      ?.display_name
                )
                .filter(
                  (
                    name
                  ): name is string =>
                    Boolean(
                      name
                    )
                )
                .join(", ") ||
              "Authors not available";

            return {
              openalex_work_id:
                work.id,

              title:
                (
                  work.title ||
                  "Untitled research work"
                ).replace(
                  /<[^>]+>/g,
                  ""
                ),

              authors,

              journal:
                work.primary_location
                  ?.source
                  ?.display_name ||
                "Unknown source",

              publication_year:
                work.publication_year,

              publication_date:
                work.publication_date,

              doi:
                work.doi,

              citations:
                work.cited_by_count ||
                0,

              is_open_access:
                work.open_access
                  ?.is_oa ||
                false,

              open_access_url:
                work.open_access
                  ?.oa_url ||
                work.primary_location
                  ?.pdf_url ||
                null,

              source_url:
                work.primary_location
                  ?.landing_page_url ||
                work.id,
            };
          }
        );

    return NextResponse.json({
      papers,

      count:
        papers.length,

      checkedAt:
        now.toISOString(),

      baseline,

      today,

      effectiveFromDate,
    });
  } catch (error) {
    console.error(
      "Alert checker error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to check this research alert.",
      },
      {
        status: 500,
      }
    );
  }
}