import { NextResponse } from "next/server";

type OpenAlexWork = {
  id: string;
  title: string | null;
  type?: string | null;

  publication_year: number | null;
  publication_date?: string | null;

  doi: string | null;
  cited_by_count: number | null;

  abstract_inverted_index?: Record<string, number[]>;

  concepts?: {
    display_name: string;
  }[];

  primary_location?: {
    source?: {
      display_name?: string | null;
    } | null;

    landing_page_url?: string | null;
    pdf_url?: string | null;
  } | null;

  authorships?: {
    author?: {
      display_name?: string | null;
    } | null;

    institutions?: {
      display_name?: string | null;
    }[];
  }[];

  open_access?: {
    is_oa?: boolean;
    oa_url?: string | null;
  };

  biblio?: {
    volume?: string | null;
    issue?: string | null;
    first_page?: string | null;
    last_page?: string | null;
  };
};

type OpenAlexInstitution = {
  id: string;
  display_name?: string | null;
};

type OpenAlexAuthor = {
  id: string;
  display_name?: string | null;
};

function cleanOpenAlexId(id: string) {
  return id.substring(
    id.lastIndexOf("/") + 1
  );
}

function normalizeDoi(value: string) {
  return value
    .trim()
    .replace(
      /^https?:\/\/doi\.org\//i,
      ""
    )
    .replace(
      /^doi:\s*/i,
      ""
    );
}

async function resolveInstitutionId(
  institutionName: string,
  apiKey: string
): Promise<string | null> {
  if (!institutionName.trim()) {
    return null;
  }

  const institutionUrl =
    new URL(
      "https://api.openalex.org/institutions"
    );

  institutionUrl.searchParams.set(
    "search",
    institutionName.trim()
  );

  institutionUrl.searchParams.set(
    "per-page",
    "1"
  );

  institutionUrl.searchParams.set(
    "api_key",
    apiKey
  );

  const response =
    await fetch(
      institutionUrl.toString(),
      {
        next: {
          revalidate: 3600,
        },
      }
    );

  if (!response.ok) {
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
  authorName: string,
  institutionId: string | null,
  apiKey: string
): Promise<string | null> {
  const authorUrl =
    new URL(
      "https://api.openalex.org/authors"
    );

  authorUrl.searchParams.set(
    "search",
    authorName.trim()
  );

  authorUrl.searchParams.set(
    "per-page",
    "10"
  );

  authorUrl.searchParams.set(
    "api_key",
    apiKey
  );

  if (institutionId) {
    authorUrl.searchParams.set(
      "filter",
      `last_known_institutions.id:${institutionId}`
    );
  }

  const response =
    await fetch(
      authorUrl.toString(),
      {
        next: {
          revalidate: 3600,
        },
      }
    );

  if (!response.ok) {
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

export async function GET(
  request: Request
) {
  try {
    const apiKey =
      process.env.OPENALEX_API_KEY?.trim() || "";

    if (!apiKey) {
      return NextResponse.json(
        {
          results: [],
          error:
            "OpenAlex API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const query =
      searchParams
        .get("q")
        ?.trim() || "";

    const mode =
      searchParams.get(
        "mode"
      ) || "keyword";

    const sort =
      searchParams.get(
        "sort"
      ) || "relevance";

    const year =
      searchParams.get(
        "year"
      ) || "any";

    const workType =
      searchParams.get(
        "type"
      ) || "any";

    const institution =
      searchParams
        .get("institution")
        ?.trim() || "";

    const openAccessOnly =
      searchParams.get(
        "oa"
      ) === "true";

    const page =
      Math.max(
        1,
        Number(
          searchParams.get(
            "page"
          ) || "1"
        )
      );

    if (
      query.length < 2
    ) {
      return NextResponse.json({
        results: [],
        message:
          "Enter at least two characters.",
      });
    }

    const url =
      new URL(
        "https://api.openalex.org/works"
      );

    const filters:
      string[] = [];

    /* SEARCH MODE */

    if (
      mode === "author"
    ) {
      const institutionId =
        institution
          ? await resolveInstitutionId(
              institution,
              apiKey
            )
          : null;

      if (
        institution &&
        !institutionId
      ) {
        return NextResponse.json({
          results: [],
          message:
            `Institution "${institution}" was not found.`,
        });
      }

      const authorId =
        await resolveAuthorId(
          query,
          institutionId,
          apiKey
        );

      if (!authorId) {
        return NextResponse.json({
          results: [],
          message:
            institution
              ? `No author named "${query}" was found at "${institution}".`
              : `No author named "${query}" was found.`,
        });
      }

      filters.push(
        `author.id:${authorId}`
      );
    } else if (
      mode === "title"
    ) {
      filters.push(
        `title.search:${query}`
      );
    } else if (
      mode === "doi"
    ) {
      const doi =
        normalizeDoi(
          query
        );

      filters.push(
        `doi:https://doi.org/${doi}`
      );
    } else {
      url.searchParams.set(
        "search",
        query
      );
    }

    /* ARTICLE TYPE */

    if (
      workType !== "any"
    ) {
      filters.push(
        `type:${workType}`
      );
    }

    /* OPEN ACCESS */

    if (
      openAccessOnly
    ) {
      filters.push(
        "is_oa:true"
      );
    }

    /* PUBLICATION YEAR */

    if (
      year !== "any"
    ) {
      filters.push(
        `from_publication_date:${year}-01-01`
      );
    }

    if (
      filters.length > 0
    ) {
      url.searchParams.set(
        "filter",
        filters.join(",")
      );
    }

    /* SORTING */

    if (
      sort === "cited"
    ) {
      url.searchParams.set(
        "sort",
        "cited_by_count:desc"
      );
    } else if (
      sort === "newest"
    ) {
      url.searchParams.set(
        "sort",
        "publication_date:desc"
      );
    } else if (
      mode === "keyword"
    ) {
      url.searchParams.set(
        "sort",
        "relevance_score:desc"
      );
    } else {
      url.searchParams.set(
        "sort",
        "publication_date:desc"
      );
    }

    url.searchParams.set(
      "per-page",
      "10"
    );

    url.searchParams.set(
      "page",
      String(page)
    );

    url.searchParams.set(
      "api_key",
      apiKey
    );

    const response =
      await fetch(
        url.toString(),
        {
          next: {
            revalidate: 3600,
          },
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "OpenAlex request failed:",
        response.status,
        errorText
      );

      return NextResponse.json(
        {
          results: [],
          error:
            "Failed to fetch OpenAlex results.",
        },
        {
          status:
            response.status,
        }
      );
    }

    const data =
      await response.json();

    const results =
      (
        data.results || []
      ).map(
        (
          work: OpenAlexWork
        ) => {
          const authorList =
            work.authorships
              ?.slice(0, 8)
              .map(
                (
                  authorship
                ) =>
                  authorship
                    .author
                    ?.display_name
              )
              .filter(
                (
                  name
                ): name is string =>
                  Boolean(
                    name
                  )
              ) || [];

          const institutionNames =
            work.authorships
              ?.flatMap(
                (
                  authorship
                ) =>
                  authorship
                    .institutions
                    ?.map(
                      (
                        item
                      ) =>
                        String(
                          item.display_name ||
                            ""
                        ).trim()
                    ) || []
              )
              .filter(
                Boolean
              ) || [];

          const institutionList =
            Array.from(
              new Set(
                institutionNames
              )
            ).slice(
              0,
              8
            );

          const abstract =
            work.abstract_inverted_index
              ? Object.entries(
                  work.abstract_inverted_index
                )
                  .flatMap(
                    ([
                      word,
                      positions,
                    ]) =>
                      positions.map(
                        (
                          position
                        ) =>
                          [
                            position,
                            word,
                          ] as [
                            number,
                            string,
                          ]
                      )
                  )
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      a[0] -
                      b[0]
                  )
                  .map(
                    (
                      item
                    ) =>
                      item[1]
                  )
                  .join(" ")
              : "Abstract not available from source.";

          const biblio =
            [
              work.publication_year
                ? String(
                    work.publication_year
                  )
                : null,

              work.biblio
                ?.volume
                ? `Vol. ${work.biblio.volume}`
                : null,

              work.biblio
                ?.issue
                ? `Issue ${work.biblio.issue}`
                : null,

              work.biblio
                  ?.first_page &&
              work.biblio
                ?.last_page
                ? `Pages ${work.biblio.first_page}-${work.biblio.last_page}`
                : work.biblio
                    ?.first_page
                  ? `Page ${work.biblio.first_page}`
                  : null,
            ]
              .filter(
                Boolean
              )
              .join(" ") ||
            "Bibliographic details not available";

          return {
            id:
              work.id,

            title:
              (
                work.title ||
                "Untitled research work"
              ).replace(
                /<[^>]+>/g,
                ""
              ),

            type:
              work.type ||
              "unknown",

            year:
              work.publication_year,

            publicationDate:
              work.publication_date ||
              null,

            doi:
              work.doi,

            journal:
              work.primary_location
                ?.source
                ?.display_name ||
              "Unknown source",

            biblio,

            authors:
              authorList.join(
                ", "
              ) ||
              "Authors not available",

            authorList,

            authorCount:
              authorList.length,

            institutions:
              institutionList.join(
                ", "
              ) ||
              "Institutions not available",

            institutionList,

            institutionCount:
              institutionList.length,

            citations:
              work.cited_by_count ||
              0,

            abstract,

            keywords:
              work.concepts
                ?.slice(
                  0,
                  8
                )
                .map(
                  (
                    concept
                  ) =>
                    concept.display_name
                )
                .filter(
                  Boolean
                ) || [],

            isOpenAccess:
              work.open_access
                ?.is_oa ||
              false,

            openAccessUrl:
              work.open_access
                ?.oa_url ||
              work.primary_location
                ?.pdf_url ||
              work.primary_location
                ?.landing_page_url ||
              null,

            sourceUrl:
              work.primary_location
                ?.landing_page_url ||
              work.id,
          };
        }
      );

    const totalResults =
      data.meta?.count ||
      0;

    const perPage =
      10;

    const totalPages =
      Math.ceil(
        totalResults /
          perPage
      );

    return NextResponse.json({
      results,

      pagination: {
        page,
        perPage,
        totalResults,
        totalPages,

        hasPreviousPage:
          page > 1,

        hasNextPage:
          page <
          totalPages,
      },

      message:
        results.length ===
        0
          ? "No matching papers were found."
          : "",
    });
  } catch (error) {
    console.error(
      "Search API error:",
      error
    );

    return NextResponse.json(
      {
        results: [],

        error:
          "An unexpected error occurred while searching.",
      },
      {
        status: 500,
      }
    );
  }
}