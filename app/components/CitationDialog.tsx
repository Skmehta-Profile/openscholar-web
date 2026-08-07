"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  type CitationArticle,
  type CitationStyle,
  formatCitation,
  generateBibTeX,
  generateRIS,
} from "@/lib/citations";

type CitationDialogProps = {
  open: boolean;
  article: CitationArticle | null;
  onClose: () => void;
};

const citationStyles: Array<{
  value: CitationStyle;
  label: string;
}> = [
  {
    value: "apa",
    label: "APA 7",
  },
  {
    value: "mla",
    label: "MLA 9",
  },
  {
    value: "chicago",
    label: "Chicago Author–Date",
  },
  {
    value: "vancouver",
    label: "Vancouver",
  },
  {
    value: "ieee",
    label: "IEEE",
  },
];

function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob(
    [content],
    {
      type: mimeType,
    }
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(
    anchor
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function CitationDialog({
  open,
  article,
  onClose,
}: CitationDialogProps) {
  const [style, setStyle] =
    useState<CitationStyle>("apa");

  const [message, setMessage] =
    useState("");

  const citation =
    useMemo(() => {
      if (!article) {
        return "";
      }

      return formatCitation(
        article,
        style
      );
    }, [article, style]);

  if (!open || !article) {
    return null;
  }

  const currentArticle = article;

  function showMessage(
    value: string
  ) {
    setMessage(value);

    window.setTimeout(() => {
      setMessage("");
    }, 2200);
  }

  async function copyCitation() {
    await navigator.clipboard.writeText(
      citation
    );

    showMessage(
      "Citation copied."
    );
  }

  async function copyBibTeX() {
    await navigator.clipboard.writeText(
      generateBibTeX(currentArticle)
    );

    showMessage(
      "BibTeX copied."
    );
  }

  function downloadBibTeX() {
    downloadTextFile(
     generateBibTeX(currentArticle),
      "openscholar-reference.bib",
      "application/x-bibtex"
    );

    showMessage(
      "BibTeX downloaded."
    );
  }

  function downloadRIS() {
    downloadTextFile(
      generateRIS(currentArticle),
      "openscholar-reference.ris",
      "application/x-research-info-systems"
    );

    showMessage(
      "RIS downloaded."
    );
  }

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 px-5 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-dialog-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
              Citation Workspace
            </p>

            <h2
              id="citation-dialog-title"
              className="mt-2 text-2xl font-black text-slate-950"
            >
              Cite this paper
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Choose a citation style,
              copy the formatted
              reference, or export it to
              your reference manager.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close citation dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl font-bold text-slate-500 transition hover:bg-slate-50"
          >
            ×
          </button>
        </div>

        <div className="mt-7">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Citation Style
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {citationStyles.map(
              (item) => (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() =>
                    setStyle(
                      item.value
                    )
                  }
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                    style ===
                    item.value
                      ? "border-indigo-700 bg-indigo-700 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
            Citation Preview
          </p>

          <p className="mt-3 select-text text-sm leading-7 text-slate-800">
            {citation}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={
              copyCitation
            }
            className="rounded-xl bg-indigo-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
          >
            Copy Citation
          </button>

          <button
            type="button"
            onClick={
              copyBibTeX
            }
            className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
          >
            Copy BibTeX
          </button>

          <button
            type="button"
            onClick={
              downloadBibTeX
            }
            className="rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
          >
            Download .bib
          </button>

          <button
            type="button"
            onClick={
              downloadRIS
            }
            className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            Download RIS
          </button>
        </div>

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500">
          Citation formatting uses
          bibliographic metadata stored
          in OpenScholar. Always verify
          journal-specific requirements
          before final manuscript
          submission.
        </div>
      </div>
    </div>
  );
}