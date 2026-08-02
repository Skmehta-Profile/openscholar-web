import { NextResponse } from "next/server";

type OpenAlexInstitution = {
  id?: string | null;
  display_name?: string | null;
  country_code?: string | null;
  type?: string | null;
};

type OpenAlexTopic = {
  id?: string | null;
  display_name?: string | null;
  count?: number | null;
};

type OpenAlexAuthor = {
  id: string;
  orcid?: string | null;
  display_name?: string | null;
  display_name_alternatives?: string[] | null;
  works_count?: number | null;
  cited_by_count?: number | null;

  summary_stats?: {
    h_index?: number | null;
    i10_index?: number | null;
    "2yr_mean_citedness"?: number | null;
  } | null;

  last_known_institutions?:
    | OpenAlexInstitution[]
    | null;

  affiliations?: {
    institution?: OpenAlexInstitution | null;
    years?: number[] | null;
  }[] | null;

  topics?: OpenAlexTopic[] | null;

  works_api_url?: string | null;
  updated_date?: string | null;
};

type OpenAlexWork = {
  id: string;
  title?: string | null;
  doi?: string | null;
  type?: string | null;
  publication_year?: number | null;
  publication_date?: string | null;
  cited_by_count?: number | null;

  primary_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;

    source?: {
      display_name?: string | null;
    } | null;
  } | null;

  best_oa_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
  } | null;

  open_access?: {
    is_oa?: boolean | null;
    oa_url?: string | null;
  } | null;

  authorships?: {
    author?: {
      display_name?: string | null;
    } | null;
  }[] | null;

  biblio?: {
    volume?: string | null;
    issue?: string | null;
    first_page?: string | null;
    last_page?: string | null;
  } | null;
};

function cleanOpenAlexId(value: string) {
  return value.substring(
    value.lastIndexOf("/") + 1
  );
}

function formatWork(work: OpenAlexWork) {
  const authorNames =
    work.authorships
      ?.map(
        (item) =>
          item.author?.display_name
      )
      .filter(
        (name): name is string =>
          Boolean(name)
      ) || [];

  const bibliographicDetails = [
    work.publication_year
      ? String(work.publication_year)
      : null,

    work.biblio?.volume
      ? `Vol. ${work.biblio.volume}`
      : null,

    work.biblio?.issue
      ? `Issue ${work.biblio.issue}`
      : null,

    work.biblio?.first_page &&
    work.biblio?.last_page
      ? `Pages ${work.biblio.first_page}-${work.biblio.last_page}`
      : work.biblio?.first_page
        ? `Page ${work.biblio.first_page}`
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const fullTextUrl =
    work.best_oa_location?.pdf_url ||
    work.open_access?.oa_url ||
    work.primary_location?.pdf_url ||
    null;

  const sourceUrl =
    work.primary_location?.landing_page_url ||
    work.best_oa_location?.landing_page_url ||
    work.doi ||
    work.id;

  return {
    id: cleanOpenAlexId(work.id),
    openAlexUrl: work.id,

    title:
      work.title ||
      "Untitled research work",

    type: work.type || "article",

    year: work.publication_year || null,

    publicationDate:
      work.publication_date || null,

    doi: work.doi || null,

    citations:
      work.cited_by_count || 0,

    journal:
      work.primary_location?.source
        ?.display_name ||
      "Source not available",

    authors:
      authorNames.join(", ") ||
      "Authors not available",

    biblio:
      bibliographicDetails ||
      "Bibliographic details not available",

    isOpenAccess:
      work.open_access?.is_oa || false,

    fullTextUrl,

    sourceUrl,
  };
}

async function fetchAuthorWorks(
  authorId: string,
  apiKey: string,
  sort: string
) {
  const url = new URL(
    "https://api.openalex.org/works"
  );

  url.searchParams.set(
  "filter",
  `authorships.author.id:${authorId}`
);

  url.searchParams.set("sort", sort);
  url.searchParams.set("per_page", "10");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    next: {
      revalidate: 3600,
    },
  });

  if (!response.ok) {
  const errorText = await response.text();

  console.error(
    "OpenAlex researcher works request failed:",
    {
      status: response.status,
      response: errorText,
      requestedUrl: url
        .toString()
        .replace(apiKey, "[HIDDEN_API_KEY]"),
    }
  );

  return [];
}

  const data = await response.json();

  return (
    (data.results || []) as OpenAlexWork[]
  ).map(formatWork);
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await context.params;

    const cleanId = id
      .trim()
      .toUpperCase();

    const apiKey =
      process.env.OPENALEX_API_KEY?.trim() ||
      "";

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OpenAlex API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    if (!/^A\d+$/.test(cleanId)) {
      return NextResponse.json(
        {
          error:
            "Invalid OpenAlex researcher ID.",
        },
        {
          status: 400,
        }
      );
    }

    const authorUrl = new URL(
      `https://api.openalex.org/authors/${cleanId}`
    );

    authorUrl.searchParams.set(
      "api_key",
      apiKey
    );

    const [
      authorResponse,
      latestPublications,
      mostCitedPublications,
    ] = await Promise.all([
      fetch(authorUrl.toString(), {
        next: {
          revalidate: 3600,
        },
      }),

      fetchAuthorWorks(
  cleanId,
  apiKey,
  "publication_date:desc"
),

fetchAuthorWorks(
  cleanId,
  apiKey,
  "cited_by_count:desc"
),
    ]);

    if (!authorResponse.ok) {
      const errorText =
        await authorResponse.text();

      console.error(
        "OpenAlex author profile request failed:",
        authorResponse.status,
        errorText
      );

      return NextResponse.json(
        {
          error:
            authorResponse.status === 404
              ? "Researcher profile was not found."
              : "Unable to load researcher profile.",
        },
        {
          status:
            authorResponse.status === 404
              ? 404
              : 502,
        }
      );
    }

    const author =
      (await authorResponse.json()) as OpenAlexAuthor;

    const institutions =
      author.last_known_institutions
        ?.map((institution) => ({
          id: institution.id
            ? cleanOpenAlexId(
                institution.id
              )
            : "",

          name:
            institution.display_name ||
            "Unknown institution",

          countryCode:
            institution.country_code ||
            null,

          type:
            institution.type || null,
        }))
        .filter(
          (institution) =>
            institution.id
        ) || [];

    const fallbackInstitutions =
      author.affiliations
        ?.map(
          (affiliation) =>
            affiliation.institution
        )
        .filter(
          (
            institution
          ): institution is OpenAlexInstitution =>
            Boolean(institution?.id)
        )
        .map((institution) => ({
          id: cleanOpenAlexId(
            institution.id || ""
          ),

          name:
            institution.display_name ||
            "Unknown institution",

          countryCode:
            institution.country_code ||
            null,

          type:
            institution.type || null,
        })) || [];

    const finalInstitutions =
      institutions.length > 0
        ? institutions
        : fallbackInstitutions;

    const topics =
      author.topics
        ?.filter((topic) =>
          Boolean(topic.display_name)
        )
        .sort(
          (a, b) =>
            (b.count || 0) -
            (a.count || 0)
        )
        .slice(0, 12)
        .map(
          (topic) =>
            topic.display_name as string
        ) || [];

    const profile = {
      id: cleanOpenAlexId(author.id),

      openAlexUrl: author.id,

      name:
        author.display_name ||
        "Unknown researcher",

      alternativeNames:
        author.display_name_alternatives ||
        [],

      orcid: author.orcid || null,

      verified: Boolean(author.orcid),

      worksCount:
        author.works_count || 0,

      citedByCount:
        author.cited_by_count || 0,

      hIndex:
        author.summary_stats?.h_index ||
        0,

      i10Index:
        author.summary_stats
          ?.i10_index || 0,

      twoYearMeanCitedness:
        author.summary_stats?.[
          "2yr_mean_citedness"
        ] || 0,

      affiliation:
        finalInstitutions[0]?.name ||
        "Affiliation not available",

      institutions:
        finalInstitutions,

      topics,

      updatedDate:
        author.updated_date || null,
    };

    return NextResponse.json({
      profile,
      latestPublications,
      mostCitedPublications,
    });
  } catch (error) {
    console.error(
      "Researcher profile API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while loading the researcher profile.",
      },
      {
        status: 500,
      }
    );
  }
}