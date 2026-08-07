export type CitationArticle = {
  id: string;
  title: string | null;
  authors: string | null;
  journal: string | null;
  biblio: string | null;
  year: number | null;
  doi: string | null;
};

export type CitationStyle =
  | "apa"
  | "mla"
  | "chicago"
  | "vancouver"
  | "ieee";

export function cleanCitationText(
  value: string | null
) {
  return (
    value
      ?.replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim() || ""
  );
}

export function normalizeCitationDoi(
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
    .replace(/^doi:\s*/i, "")
    .trim();
}

function articleAuthors(
  article: CitationArticle
) {
  return (
    cleanCitationText(
      article.authors
    ) || "Unknown author"
  );
}

function articleTitle(
  article: CitationArticle
) {
  return (
    cleanCitationText(
      article.title
    ) || "Untitled article"
  );
}

function articleJournal(
  article: CitationArticle
) {
  return (
    cleanCitationText(
      article.journal
    ) || "Unknown source"
  );
}

function articleYear(
  article: CitationArticle
) {
  return article.year
    ? String(article.year)
    : "n.d.";
}

function articleBiblio(
  article: CitationArticle
) {
  return cleanCitationText(
    article.biblio
  );
}

function doiUrl(
  article: CitationArticle
) {
  const doi =
    normalizeCitationDoi(
      article.doi
    );

  return doi
    ? `https://doi.org/${doi}`
    : "";
}

export function formatCitation(
  article: CitationArticle,
  style: CitationStyle
) {
  const authors =
    articleAuthors(article);

  const title =
    articleTitle(article);

  const journal =
    articleJournal(article);

  const year =
    articleYear(article);

  const biblio =
    articleBiblio(article);

  const doi =
    doiUrl(article);

  switch (style) {
    case "mla":
      return `${authors}. “${title}.” ${journal}, ${year}${
        biblio
          ? `, ${biblio}`
          : ""
      }${
        doi ? `. ${doi}` : "."
      }`;

    case "chicago":
      return `${authors}. ${year}. “${title}.” ${journal}${
        biblio
          ? `, ${biblio}`
          : ""
      }${
        doi ? `. ${doi}` : "."
      }`;

    case "vancouver":
      return `${authors}. ${title}. ${journal}. ${year}${
        biblio
          ? `;${biblio}`
          : ""
      }${
        doi ? `. doi:${normalizeCitationDoi(article.doi)}` : "."
      }`;

    case "ieee":
      return `${authors}, “${title},” ${journal}${
        biblio
          ? `, ${biblio}`
          : ""
      }, ${year}${
        doi
          ? `, doi: ${normalizeCitationDoi(
              article.doi
            )}`
          : ""
      }.`;

    case "apa":
    default:
      return `${authors} (${year}). ${title}. ${journal}${
        biblio
          ? `, ${biblio}`
          : ""
      }${
        doi ? `. ${doi}` : "."
      }`;
  }
}

function bibtexKey(
  article: CitationArticle
) {
  const authors =
    articleAuthors(article);

  const firstAuthor =
    authors
      .split(",")[0]
      .split(" ")
      .filter(Boolean)
      .pop()
      ?.replace(
        /[^a-zA-Z0-9]/g,
        ""
      ) || "article";

  return `${firstAuthor}${
    article.year || "nd"
  }`;
}

export function generateBibTeX(
  article: CitationArticle
) {
  const doi =
    normalizeCitationDoi(
      article.doi
    );

  const fields = [
    `  title = {${articleTitle(
      article
    )}}`,
    `  author = {${articleAuthors(
      article
    )}}`,
    `  journal = {${articleJournal(
      article
    )}}`,
    article.year
      ? `  year = {${article.year}}`
      : "",
    doi
      ? `  doi = {${doi}}`
      : "",
    doi
      ? `  url = {https://doi.org/${doi}}`
      : "",
  ].filter(Boolean);

  return `@article{${bibtexKey(
    article
  )},
${fields.join(",\n")}
}`;
}

export function generateRIS(
  article: CitationArticle
) {
  const doi =
    normalizeCitationDoi(
      article.doi
    );

  const authors =
    articleAuthors(article)
      .split(",")
      .map((author) =>
        author.trim()
      )
      .filter(Boolean);

  const lines = [
    "TY  - JOUR",
    ...authors.map(
      (author) =>
        `AU  - ${author}`
    ),
    `TI  - ${articleTitle(
      article
    )}`,
    `JO  - ${articleJournal(
      article
    )}`,
    article.year
      ? `PY  - ${article.year}`
      : "",
    doi
      ? `DO  - ${doi}`
      : "",
    doi
      ? `UR  - https://doi.org/${doi}`
      : "",
    "ER  -",
  ].filter(Boolean);

  return lines.join("\n");
}