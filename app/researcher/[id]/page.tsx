import { notFound } from "next/navigation";
import ResearcherClient from "./ResearcherClient";

type OpenAlexInstitution = {
  id?: string | null;
  display_name?: string | null;
  country_code?: string | null;
  type?: string | null;
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
  last_known_institutions?: OpenAlexInstitution[] | null;
  affiliations?: {
    institution?: OpenAlexInstitution | null;
  }[] | null;
  topics?: {
    display_name?: string | null;
    count?: number | null;
  }[] | null;
  updated_date?: string | null;
};

type ResearcherProfile = {
  id: string;
  openAlexUrl: string;
  name: string;
  alternativeNames: string[];
  orcid: string | null;
  verified: boolean;
  worksCount: number;
  citedByCount: number;
  hIndex: number;
  i10Index: number;
  twoYearMeanCitedness: number;
  affiliation: string;
  institutions: {
    id: string;
    name: string;
    countryCode: string | null;
    type: string | null;
  }[];
  topics: string[];
  updatedDate: string | null;
};

type ResearcherPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

function cleanOpenAlexId(value: string) {
  return value.substring(value.lastIndexOf("/") + 1);
}

function toInstitution(institution: OpenAlexInstitution) {
  return {
    id: institution.id
      ? cleanOpenAlexId(institution.id)
      : "",
    name: institution.display_name || "Unknown institution",
    countryCode: institution.country_code || null,
    type: institution.type || null,
  };
}

function buildProfile(author: OpenAlexAuthor): ResearcherProfile {
  const institutions =
    author.last_known_institutions
      ?.map(toInstitution)
      .filter((institution) => institution.id) || [];
  const fallbackInstitutions =
    author.affiliations
      ?.map((affiliation) => affiliation.institution)
      .filter(
        (institution): institution is OpenAlexInstitution =>
          Boolean(institution?.id)
      )
      .map(toInstitution) || [];
  const finalInstitutions =
    institutions.length > 0 ? institutions : fallbackInstitutions;
  const topics =
    author.topics
      ?.filter((topic) => Boolean(topic.display_name))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 12)
      .map((topic) => topic.display_name as string) || [];

  return {
    id: cleanOpenAlexId(author.id),
    openAlexUrl: author.id,
    name: author.display_name || "Unknown researcher",
    alternativeNames: author.display_name_alternatives || [],
    orcid: author.orcid || null,
    verified: Boolean(author.orcid),
    worksCount: author.works_count || 0,
    citedByCount: author.cited_by_count || 0,
    hIndex: author.summary_stats?.h_index || 0,
    i10Index: author.summary_stats?.i10_index || 0,
    twoYearMeanCitedness:
      author.summary_stats?.["2yr_mean_citedness"] || 0,
    affiliation:
      finalInstitutions[0]?.name || "Affiliation not available",
    institutions: finalInstitutions,
    topics,
    updatedDate: author.updated_date || null,
  };
}

async function loadPublicProfile(id: string) {
  const apiKey = process.env.OPENALEX_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OpenAlex API key is not configured.");
  }

  const authorUrl = new URL(
    `https://api.openalex.org/authors/${id}`
  );
  authorUrl.searchParams.set("api_key", apiKey);

  const response = await fetch(authorUrl, {
    cache: "no-store",
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Unable to load researcher profile.");
  }

  return buildProfile(
    (await response.json()) as OpenAlexAuthor
  );
}

export default async function ResearcherPage({
  params,
}: ResearcherPageProps) {
  const { id } = await params;
  const researcherId = id.trim().toUpperCase();

  if (!/^A\d+$/.test(researcherId)) {
    notFound();
  }

  const initialProfile = await loadPublicProfile(researcherId);

  return (
    <ResearcherClient
      researcherId={researcherId}
      initialProfile={initialProfile}
    />
  );
}
