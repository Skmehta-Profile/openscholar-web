import { NextResponse } from "next/server";

type OpenAlexInstitution = {
  id: string;
  display_name?: string | null;
  country_code?: string | null;
  type?: string | null;
};

type OpenAlexTopic = {
  id: string;
  display_name?: string | null;
  count?: number | null;
};

type OpenAlexAuthor = {
  id: string;
  orcid?: string | null;
  display_name?: string | null;
  works_count?: number | null;
  cited_by_count?: number | null;

  summary_stats?: {
    h_index?: number | null;
    i10_index?: number | null;
    "2yr_mean_citedness"?: number | null;
  } | null;

  last_known_institutions?: OpenAlexInstitution[] | null;

  affiliations?: {
    institution?: OpenAlexInstitution | null;
    years?: number[] | null;
  }[] | null;

  topics?: OpenAlexTopic[] | null;
};

type OpenAlexInstitutionSearchResult = {
  id: string;
  display_name?: string | null;
};

function cleanOpenAlexId(value: string) {
  return value.substring(value.lastIndexOf("/") + 1);
}

async function resolveInstitutionId(
  institutionName: string,
  apiKey: string
): Promise<string | null> {
  const cleanInstitution = institutionName.trim();

  if (!cleanInstitution) {
    return null;
  }

  const url = new URL(
    "https://api.openalex.org/institutions"
  );

  url.searchParams.set("search", cleanInstitution);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  const institution = data.results?.[0] as
    | OpenAlexInstitutionSearchResult
    | undefined;

  return institution?.id
    ? cleanOpenAlexId(institution.id)
    : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query =
      searchParams.get("q")?.trim() || "";

    const institution =
      searchParams.get("institution")?.trim() || "";

    const apiKey =
      process.env.OPENALEX_API_KEY?.trim() || "";

    if (!apiKey) {
      return NextResponse.json(
        {
          authors: [],
          error:
            "OpenAlex API key is not configured.",
        },
        { status: 500 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json({
        authors: [],
        message:
          "Enter at least two characters to search researchers.",
      });
    }

    const url = new URL(
      "https://api.openalex.org/authors"
    );

    url.searchParams.set("search", query);
url.searchParams.set("per_page", "8");
url.searchParams.set("api_key", apiKey);
    if (institution) {
      const institutionId =
        await resolveInstitutionId(
          institution,
          apiKey
        );

      if (!institutionId) {
        return NextResponse.json({
          authors: [],
          message: `Institution "${institution}" was not found.`,
        });
      }

      url.searchParams.set(
        "filter",
        `last_known_institutions.id:${institutionId}`
      );
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "OpenAlex author request failed:",
        response.status,
        errorText
      );

      return NextResponse.json(
  {
    authors: [],
    error: "Unable to fetch researchers from OpenAlex.",
    openAlexStatus: response.status,
    openAlexResponse: errorText,
    requestedUrl: url.toString().replace(
      apiKey,
      "[HIDDEN_API_KEY]"
    ),
  },
  { status: 502 }
);
    }

    const data = await response.json();

    const authors = (
      (data.results || []) as OpenAlexAuthor[]
    ).map((author) => {
      const institutions =
        author.last_known_institutions
          ?.map((item) => ({
            id: item.id
              ? cleanOpenAlexId(item.id)
              : "",
            name:
              item.display_name ||
              "Unknown institution",
            countryCode:
              item.country_code || null,
            type: item.type || null,
          }))
          .filter((item) => item.id) || [];

      /*
       * Fall back to historical affiliations
       * when last_known_institutions is empty.
       */
      const affiliationFallback =
        author.affiliations
          ?.map((item) => item.institution)
          .filter(
            (
              item
            ): item is OpenAlexInstitution =>
              Boolean(item?.id)
          )
          .map((item) => ({
            id: cleanOpenAlexId(item.id),
            name:
              item.display_name ||
              "Unknown institution",
            countryCode:
              item.country_code || null,
            type: item.type || null,
          })) || [];

      const finalInstitutions =
        institutions.length > 0
          ? institutions
          : affiliationFallback;

      const topics =
        author.topics
          ?.filter((topic) =>
            Boolean(topic.display_name)
          )
          .sort(
            (a, b) =>
              (b.count || 0) - (a.count || 0)
          )
          .slice(0, 8)
          .map((topic) => topic.display_name as string) ||
        [];

      return {
        id: cleanOpenAlexId(author.id),

        openAlexUrl: author.id,

        name:
          author.display_name ||
          "Unknown researcher",

        orcid: author.orcid || null,

        verified: Boolean(author.orcid),

        worksCount: author.works_count || 0,

        citedByCount:
          author.cited_by_count || 0,

        hIndex:
          author.summary_stats?.h_index || 0,

        i10Index:
          author.summary_stats?.i10_index || 0,

        twoYearMeanCitedness:
          author.summary_stats?.[
            "2yr_mean_citedness"
          ] || 0,

        affiliation:
          finalInstitutions[0]?.name ||
          "Affiliation not available",

        institutions: finalInstitutions,

        topics,
      };
    });

    return NextResponse.json({
      authors,
      total: authors.length,
      message:
        authors.length === 0
          ? "No matching researchers were found."
          : "",
    });
  } catch (error) {
    console.error(
      "Author search API error:",
      error
    );

    return NextResponse.json(
      {
        authors: [],
        error:
          "An unexpected error occurred while searching researchers.",
      },
      { status: 500 }
    );
  }
}