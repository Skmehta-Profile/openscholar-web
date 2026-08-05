import { NextResponse } from "next/server";

type CrossrefAuthor = {
  given?: string;
  family?: string;
  name?: string;
  ORCID?: string;
};

type CrossrefDateParts = {
  "date-parts"?: number[][];
};

type CrossrefWork = {
  DOI?: string;
  URL?: string;
  title?: string[];
  subtitle?: string[];
  author?: CrossrefAuthor[];
  "container-title"?: string[];
  publisher?: string;
  type?: string;
  issued?: CrossrefDateParts;
  published?: CrossrefDateParts;
  "published-print"?: CrossrefDateParts;
  "published-online"?: CrossrefDateParts;
  created?: {
    "date-time"?: string;
  };
  volume?: string;
issue?: string;
page?: string;
"article-number"?: string;
abstract?: string;
  license?: {
    URL?: string;
  }[];
  link?: {
    URL?: string;
    "content-type"?: string;
    "content-version"?: string;
    "intended-application"?: string;
  }[];
};

type CrossrefResponse = {
  status?: string;
  message?: CrossrefWork;
};

function normalizeDoi(value: string) {
  return decodeURIComponent(value)
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function formatAuthors(
  authors: CrossrefAuthor[] | undefined
) {
  if (!authors || authors.length === 0) {
    return "Authors not available";
  }

  return authors
    .map((author) => {
      if (author.name?.trim()) {
        return author.name.trim();
      }

      return [author.given, author.family]
        .filter(Boolean)
        .join(" ")
        .trim();
    })
    .filter(Boolean)
    .join(", ");
}

function extractDateParts(
  dateValue: CrossrefDateParts | undefined
) {
  const dateParts = dateValue?.["date-parts"]?.[0];

  if (!dateParts || dateParts.length === 0) {
    return {
      year: null,
      publicationDate: null,
    };
  }

  const [year, month = 1, day = 1] = dateParts;

  if (!year) {
    return {
      year: null,
      publicationDate: null,
    };
  }

  const publicationDate = [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");

  return {
    year,
    publicationDate,
  };
}

function getPublicationDate(work: CrossrefWork) {
  return (
    work.published ||
    work["published-online"] ||
    work["published-print"] ||
    work.issued
  );
}

function getFullTextUrl(work: CrossrefWork) {
  const preferredLink = work.link?.find(
    (link) =>
      Boolean(link.URL) &&
      (
        link["content-type"]?.includes("pdf") ||
        link["content-type"]?.includes("html") ||
        link["intended-application"] ===
          "text-mining"
      )
  );

  return preferredLink?.URL || null;
}

function mapPublicationType(type: string | undefined) {
  switch (type) {
    case "journal-article":
      return "article";

    case "book-chapter":
      return "book-chapter";

    case "book":
    case "monograph":
    case "edited-book":
    case "reference-book":
      return "book";

    case "proceedings-article":
      return "conference-paper";

    case "dissertation":
      return "dissertation";

    case "report":
    case "report-series":
      return "report";

    case "posted-content":
      return "preprint";

    default:
      return type || "article";
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const doi = normalizeDoi(
      searchParams.get("doi") || ""
    );

    if (!doi) {
      return NextResponse.json(
        {
          publication: null,
          error: "Enter a DOI.",
        },
        { status: 400 }
      );
    }

    if (
      doi.length < 6 ||
      !doi.toLowerCase().startsWith("10.")
    ) {
      return NextResponse.json(
        {
          publication: null,
          error:
            "Enter a valid DOI beginning with 10.",
        },
        { status: 400 }
      );
    }

    const crossrefUrl = new URL(
      `https://api.crossref.org/works/${encodeURIComponent(
        doi
      )}`
    );

    const mailto =
      process.env.CROSSREF_MAILTO?.trim();

    if (mailto) {
      crossrefUrl.searchParams.set(
        "mailto",
        mailto
      );
    }

    const response = await fetch(
      crossrefUrl.toString(),
      {
        headers: {
          Accept: "application/json",
          "User-Agent": mailto
            ? `OpenScholar/1.0 (mailto:${mailto})`
            : "OpenScholar/1.0",
        },
        next: {
          revalidate: 86400,
        },
      }
    );

    if (response.status === 404) {
      return NextResponse.json(
        {
          publication: null,
          error:
            "No Crossref publication was found for this DOI.",
        },
        { status: 404 }
      );
    }

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Crossref DOI lookup failed:",
        response.status,
        errorText
      );

      return NextResponse.json(
        {
          publication: null,
          error:
            "Unable to retrieve DOI metadata from Crossref.",
        },
        { status: response.status }
      );
    }

    const crossrefData =
      (await response.json()) as CrossrefResponse;

    const work = crossrefData.message;

    if (!work) {
      return NextResponse.json(
        {
          publication: null,
          error:
            "Crossref returned no publication metadata.",
        },
        { status: 404 }
      );
    }

    const titleParts = [
      ...(work.title || []),
      ...(work.subtitle || []),
    ].filter(Boolean);

    const title =
      stripHtml(titleParts.join(": ")) ||
      "Untitled publication";

    const {
      year,
      publicationDate,
    } = extractDateParts(
      getPublicationDate(work)
    );

    const normalizedDoi = normalizeDoi(
      work.DOI || doi
    );

    const doiUrl =
      `https://doi.org/${normalizedDoi}`;

    const journal =
      work["container-title"]?.[0]?.trim() ||
      work.publisher?.trim() ||
      "Source not available";

    const biblio = [
      year ? String(year) : "",
      work.volume
        ? `Vol. ${work.volume}`
        : "",
      work.issue
        ? `Issue ${work.issue}`
        : "",
      work.page
        ? `Pages ${work.page}`
        : "",
      work["article-number"]
        ? `Article ${work["article-number"]}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const licenseUrl =
      work.license?.find(
        (license) => license.URL
      )?.URL || null;

    const publication = {
      id: `manual-doi-${normalizedDoi}`,
      openAlexUrl: null,
      openAlexWorkId: null,

      title,
      authors: formatAuthors(work.author),
      journal,

      year,
      publicationDate,

      type: mapPublicationType(work.type),

      doi: normalizedDoi,
      doiUrl,

      sourceUrl:
        work.URL || doiUrl,

      fullTextUrl:
        getFullTextUrl(work),

      isOpenAccess:
        Boolean(licenseUrl),

      licenseUrl,

      abstract: work.abstract
        ? stripHtml(work.abstract)
        : null,

      volume: work.volume || null,
      issue: work.issue || null,
      pages: work.page || null,

      biblio,

      citations: 0,

      metadataSource: "crossref",
    };

    return NextResponse.json({
      publication,
      message:
        "Publication metadata retrieved successfully.",
    });
  } catch (error) {
    console.error(
      "DOI lookup API error:",
      error
    );

    return NextResponse.json(
      {
        publication: null,
        error:
          "An unexpected error occurred while looking up the DOI.",
      },
      { status: 500 }
    );
  }
}