import Link from "next/link";

const capabilities = [
  {
    title: "Research Discovery",
    text: "Search scholarly literature across papers, authors, journals and DOI records.",
  },
  {
    title: "Personal Library",
    text: "Save important papers and build an organized research reading workflow.",
  },
  {
    title: "Collections",
    text: "Group saved literature into focused collections for projects, topics and ideas.",
  },
  {
    title: "Citation Tools",
    text: "Generate and export citations for use in academic writing and manuscripts.",
  },
  {
    title: "Research Alerts",
    text: "Monitor research topics and identify newly published literature that matches your interests.",
  },
  {
    title: "Researcher Profiles",
    text: "Build and curate your scholarly identity, manage publications and maintain a public research profile.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-14">
      {/* HERO */}
      <section className="overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-emerald-50 p-8 shadow-sm md:p-12">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-700">
          About OpenScholar-Web
        </p>

        <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
          Research discovery built around the researcher
        </h1>

        <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-600">
          OpenScholar-Web is a research discovery and scholarly workflow
          platform built in India to help researchers, faculty and students
          discover literature, organize knowledge, monitor emerging research
          and build their scholarly presence.
        </p>
      </section>

      {/* MISSION */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">
            Our Purpose
          </p>

          <h2 className="mt-4 text-3xl font-black text-slate-950">
            From finding a paper to building research knowledge
          </h2>

          <p className="mt-5 leading-8 text-slate-600">
            Research discovery is more than entering a keyword into a search
            box. Researchers need to find relevant literature, identify
            accessible sources, preserve important papers, organize reading,
            revisit ideas and stay aware of new work in their field.
          </p>

          <p className="mt-4 leading-8 text-slate-600">
            OpenScholar-Web brings these activities into a connected research
            environment while keeping the experience focused, transparent
            and easy to use.
          </p>
        </div>

        <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
            Research Workflow
          </p>

          <h2 className="mt-4 text-3xl font-black">
            One connected journey
          </h2>

          <div className="mt-7 space-y-3">
            {[
              "Discover scholarly literature",
              "Find open-access opportunities",
              "Save important research",
              "Organize papers into collections",
              "Record research notes and insights",
              "Monitor new literature",
              "Build your scholarly profile",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">
                  {index + 1}
                </span>

                <span className="text-sm font-semibold">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="mt-12">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">
            Platform Capabilities
          </p>

          <h2 className="mt-3 text-3xl font-black text-slate-950">
            Designed for academic workflows
          </h2>

          <p className="mt-3 leading-7 text-slate-600">
            OpenScholar-Web combines research discovery... combines research discovery with practical tools
            researchers can use throughout their scholarly workflow.
          </p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item) => (
            <div
              key={item.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 h-11 w-11 rounded-2xl bg-indigo-50" />

              <h3 className="text-lg font-black text-slate-950">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* OPEN ACCESS */}
      <section className="mt-12 rounded-[2rem] border border-emerald-200 bg-emerald-50/60 p-8 md:p-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              Responsible Discovery
            </p>

            <h2 className="mt-4 text-3xl font-black text-slate-950">
              Supporting access to scholarly knowledge
            </h2>
          </div>

          <div>
            <p className="leading-8 text-slate-600">
              OpenScholar helps researchers identify scholarly records and
              legally accessible open-access sources. Where available, users
              are directed to appropriate source, full-text and DOI
              destinations.
            </p>

            <p className="mt-4 leading-8 text-slate-600">
              OpenScholar is a discovery platform. It does not replace
              publishers, institutional repositories or the original sources
              of scholarly publications.
            </p>
          </div>
        </div>
      </section>

      {/* INDIA + APP */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">
            Built in India
          </p>

          <h2 className="mt-4 text-2xl font-black text-slate-950">
            Research technology with a global outlook
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            OpenScholar-Web is being developed in India as an independent
            research technology initiative with the aim of making scholarly
            discovery and research organization simpler and more useful for
            the academic community.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            OpenScholar Ecosystem
          </p>

          <h2 className="mt-4 text-2xl font-black text-slate-950">
            Web and Android
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            OpenScholar-Web is available as a web research platform and an
            Android application, extending research discovery and personal
            literature organization across devices.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-[2rem] bg-slate-950 px-8 py-10 text-white md:px-10">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Explore OpenScholar
            </p>

            <h2 className="mt-3 text-3xl font-black">
              Start your research journey
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Discover literature, build your research library and create
              your scholarly presence on OpenScholar.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
            >
              Search Research
            </Link>

            <Link
              href="/profile"
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              Research Profile
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}