import type { Metadata } from "next";

type OpenAlexAuthor = {
  display_name?: string | null;
  works_count?: number | null;
  cited_by_count?: number | null;
  last_known_institutions?: {
    display_name?: string | null;
  }[] | null;
  topics?: {
    display_name?: string | null;
    count?: number | null;
  }[] | null;
};

type ResearcherLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}>;

const productionDomain = "https://openscholar.dvsanalytik.com";
const fallbackTitle = "Researcher Profile";
const fallbackDescription =
  "Explore researcher profiles, publications, research interests, citations, and scholarly activity on OpenScholar-Web.";

function cleanResearcherId(value: string) {
  return value.trim().toUpperCase();
}

async function fetchAuthor(id: string) {
  const apiKey = process.env.OPENALEX_API_KEY?.trim();

  if (!apiKey || !/^A\d+$/.test(id)) {
    return null;
  }

  const authorUrl = new URL(
    `https://api.openalex.org/authors/${id}`
  );
  authorUrl.searchParams.set("api_key", apiKey);

  try {
    const response = await fetch(authorUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as OpenAlexAuthor;
  } catch {
    return null;
  }
}

function buildDescription(author: OpenAlexAuthor) {
  const name = author.display_name?.trim();
  const institution = author.last_known_institutions
    ?.map((item) => item.display_name?.trim())
    .find(Boolean);
  const topics = author.topics
    ?.sort((a, b) => (b.count || 0) - (a.count || 0))
    .map((topic) => topic.display_name?.trim())
    .filter(Boolean)
    .slice(0, 3) as string[] | undefined;
  const researchAreas = topics?.length
    ? ` Research areas include ${topics.join(", ")}.`
    : "";
  const activity =
    typeof author.works_count === "number" ||
    typeof author.cited_by_count === "number"
      ? ` The profile includes ${author.works_count || 0} publications and ${author.cited_by_count || 0} citations.`
      : "";

  if (!name) {
    return fallbackDescription;
  }

  return `Explore the researcher profile of ${name}${
    institution ? ` at ${institution}` : ""
  }, including publications, research interests, citations, and scholarly activity on OpenScholar-Web.${researchAreas}${activity}`;
}

export async function generateMetadata({
  params,
}: ResearcherLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const researcherId = cleanResearcherId(id);
  const profileUrl = `${productionDomain}/researcher/${encodeURIComponent(
    researcherId
  )}`;
  const author = await fetchAuthor(researcherId);
  const name = author?.display_name?.trim();
  const title = name
    ? `${name} — Researcher Profile`
    : fallbackTitle;
  const description = author
    ? buildDescription(author)
    : fallbackDescription;

  return {
    title,
    description,
    alternates: {
      canonical: profileUrl,
    },
    openGraph: {
      type: "profile",
      siteName: "OpenScholar-Web",
      title,
      description,
      url: profileUrl,
      images: [
        {
          url: "/openscholar-logo.png",
          alt: "OpenScholar-Web logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/openscholar-logo.png"],
    },
  };
}

export default function ResearcherLayout({
  children,
}: ResearcherLayoutProps) {
  return children;
}
