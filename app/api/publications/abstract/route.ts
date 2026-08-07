import { NextRequest, NextResponse } from "next/server";

type OpenAlexInvertedIndex = Record<
  string,
  number[]
>;

type OpenAlexTopic = {
  display_name?: string;
};

type OpenAlexConcept = {
  display_name?: string;
};

type OpenAlexWork = {
  id?: string;
  title?: string;

  abstract_inverted_index?:
    | OpenAlexInvertedIndex
    | null;

  primary_location?: {
    source?: {
      display_name?: string | null;
    } | null;
  } | null;

  publication_year?: number | null;

  cited_by_count?: number | null;

  doi?: string | null;

  open_access?: {
    is_oa?: boolean;
    oa_url?: string | null;
  } | null;

  topics?: OpenAlexTopic[] | null;

  concepts?: OpenAlexConcept[] | null;
};

function reconstructAbstract(
  invertedIndex:
    | OpenAlexInvertedIndex
    | null
    | undefined
) {
  if (!invertedIndex) {
    return "";
  }

  const words: Array<{
    word: string;
    position: number;
  }> = [];

  Object.entries(
    invertedIndex
  ).forEach(
    ([word, positions]) => {
      positions.forEach(
        (position) => {
          words.push({
            word,
            position,
          });
        }
      );
    }
  );

  words.sort(
    (a, b) =>
      a.position - b.position
  );

  return words
    .map((item) => item.word)
    .join(" ")
    .trim();
}

function normalizeOpenAlexId(
  value: string
) {
  const cleanValue =
    value.trim();

  const match =
    cleanValue.match(
      /openalex\.org\/(W\d+)/i
    );

  if (match?.[1]) {
    return match[1];
  }

  if (/^W\d+$/i.test(cleanValue)) {
    return cleanValue;
  }

  return "";
}

function normalizeDoi(
  value: string
) {
  return value
    .trim()
    .replace(
      /^https?:\/\/(?:dx\.)?doi\.org\//i,
      ""
    )
    .replace(
      /^doi:\s*/i,
      ""
    );
}

export async function GET(
  request: NextRequest
) {
  const searchParams =
    request.nextUrl.searchParams;

  const articleId =
    searchParams.get("article_id") ||
    "";

  const doi =
    searchParams.get("doi") ||
    "";

  const openAlexId =
    normalizeOpenAlexId(
      articleId
    );

  let identifier = "";

  if (openAlexId) {
    identifier = openAlexId;
  } else if (doi) {
    identifier =
      `https://doi.org/${normalizeDoi(
        doi
      )}`;
  }

  if (!identifier) {
    return NextResponse.json(
      {
        error:
          "No OpenAlex identifier or DOI is available for this publication.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const openAlexUrl =
      `https://api.openalex.org/works/${encodeURIComponent(
        identifier
      )}`;

    const response =
      await fetch(openAlexUrl, {
        headers: {
          Accept:
            "application/json",
        },

        next: {
          revalidate: 86400,
        },
      });

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "OpenAlex metadata could not be retrieved for this publication.",
        },
        {
          status:
            response.status ===
            404
              ? 404
              : 502,
        }
      );
    }

    const work =
      (await response.json()) as OpenAlexWork;

    const abstract =
      reconstructAbstract(
        work.abstract_inverted_index
      );

    const topics =
      (work.topics || [])
        .filter(
          (topic) =>
            Boolean(
              topic.display_name
            )
        )
        .slice(0, 6)
        .map(
          (topic) =>
            topic.display_name as string
        );

    const concepts =
      (work.concepts || [])
        .filter(
          (concept) =>
            Boolean(
              concept.display_name
            )
        )
        .slice(0, 8)
        .map(
          (concept) =>
            concept.display_name as string
        );

    return NextResponse.json({
      id:
        work.id || null,

      title:
        work.title || null,

      abstract:
        abstract || null,

      journal:
        work.primary_location
          ?.source
          ?.display_name ||
        null,

      year:
        work.publication_year ||
        null,

      citations:
        work.cited_by_count ??
        null,

      doi:
        work.doi || null,

      isOpenAccess:
        work.open_access
          ?.is_oa || false,

      openAccessUrl:
        work.open_access
          ?.oa_url || null,

      topics,

      concepts,
    });
  } catch (error) {
    console.error(
      "Abstract lookup failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to retrieve abstract metadata.",
      },
      {
        status: 500,
      }
    );
  }
}