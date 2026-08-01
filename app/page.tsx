const features = [
  ["Research Discovery", "Search scholarly literature across papers, authors, journals and DOI."],
  ["Open Access Focus", "Find accessible research papers and source links faster."],
  ["Personal Library", "Save important papers and organize your reading workflow."],
  ["Citation Tools", "Export citations for academic writing and manuscripts."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-950">
      

      <section className="relative overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute right-[-10%] top-[10%] h-96 w-96 rounded-full bg-emerald-200/50 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              Built in India for scholars, faculty and researchers
            </div>

            <h2 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
              Discover research.
              <br />
              Build your library.
              <br />
              Cite with confidence.
            </h2>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              OpenScholar Web is a clean academic platform for discovering
              scholarly papers, open-access literature, citation information and
              research updates.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <button className="rounded-2xl bg-indigo-700 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-800">
                Start Searching
              </button>
              <button className="rounded-2xl border border-slate-300 bg-white px-7 py-4 text-sm font-bold text-slate-800">
                Download Android App
              </button>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
              {[
                ["Papers", "Open access discovery"],
                ["Library", "Save and organize"],
                ["Citations", "APA, MLA, Chicago"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-black text-slate-950">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200">
            <div className="rounded-[1.5rem] bg-slate-950 p-7 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">
                Literature Search
              </p>
              <h3 className="mt-5 text-3xl font-black">
                Search papers, authors, DOI and journals
              </h3>

              <div className="mt-7 rounded-2xl bg-white p-2">
                <input
                  placeholder="Example: algal nanomaterials, cyanobacteria, DOI..."
                  className="w-full rounded-xl px-4 py-4 text-slate-900 outline-none"
                />
                <button className="mt-2 w-full rounded-xl bg-emerald-500 py-4 text-sm font-black text-slate-950">
                  Search Papers
                </button>
              </div>

              <div className="mt-6 grid gap-3">
                {[
                  "Open access availability",
                  "Citation export support",
                  "Personal research library",
                ].map((item) => (
                  <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-indigo-700">
            Platform Features
          </p>
          <h2 className="mt-3 text-4xl font-black text-slate-950">
            Built for academic workflows
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {features.map(([title, text]) => (
            <div
              key={title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 h-12 w-12 rounded-2xl bg-indigo-50" />
              <h3 className="text-lg font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      
    </main>
  );
}