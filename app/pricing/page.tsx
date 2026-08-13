import Link from "next/link";
import ScholarCheckoutButton from "@/app/components/ScholarCheckoutButton";


type PlanFeature = {
  label: string;
  free: string;
  scholar: string;
};

const features: PlanFeature[] = [
  {
    label: "Research search",
    free: "Unlimited",
    scholar: "Unlimited",
  },
  {
    label: "Read abstracts",
    free: "Unlimited",
    scholar: "Unlimited",
  },
  {
    label: "Open DOI / source",
    free: "Unlimited",
    scholar: "Unlimited",
  },
  {
    label: "Open-access full text",
    free: "Available",
    scholar: "Available",
  },
  {
    label: "Saved papers",
    free: "100",
    scholar: "1,000",
  },
  {
    label: "Collections",
    free: "3",
    scholar: "50",
  },
  {
    label: "Research notes",
    free: "10",
    scholar: "500",
  },
  {
    label: "Active research alerts",
    free: "2",
    scholar: "25",
  },
  {
    label: "Researcher profile",
    free: "Basic profile",
    scholar: "Full profile tools",
  },
  {
    label: "Publication Manager",
    free: "View record",
    scholar: "Full curation",
  },
  {
    label: "Add missing publications",
    free: "—",
    scholar: "Included",
  },
  {
    label: "Hide / restore records",
    free: "—",
    scholar: "Included",
  },
  {
    label: "Edit curated publications",
    free: "—",
    scholar: "Included",
  },
  {
    label: "Bulk publication export",
    free: "—",
    scholar: "Included",
  },
  {
    label: "CSV export",
    free: "—",
    scholar: "Included",
  },
  {
    label: "BibTeX / RIS export",
    free: "—",
    scholar: "Included",
  },
  {
    label: "JSON / text export",
    free: "—",
    scholar: "Included",
  },
];

function CheckIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700"
    >
      ✓
    </span>
  );
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {/* HERO */}

      <section className="relative overflow-hidden rounded-[2rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 px-7 py-12 text-center shadow-sm md:px-10 md:py-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-100 blur-3xl" />

        <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-emerald-100 blur-3xl" />

        <div className="relative mx-auto max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-700">
            OpenScholar-Web Plans
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            Research discovery stays free.
            <span className="block text-indigo-700">
              Upgrade when your workflow grows.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Search scholarly literature, read
            abstracts and open legally available
            research without a subscription.
            Scholar adds expanded organization,
            monitoring, publication management
            and export tools.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/search"
              className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Start Searching Free
            </Link>

            <a
              href="#plans"
              className="rounded-xl border border-indigo-200 bg-white px-6 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            >
              Compare Plans
            </a>
          </div>
        </div>
      </section>

      {/* PLANS */}

      <section
        id="plans"
        className="mt-10 grid gap-6 lg:grid-cols-2"
      >
        {/* FREE */}

        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                Free
              </p>

              <h2 className="mt-3 text-3xl font-black text-slate-950">
                OpenScholar Free
              </h2>

              <p className="mt-3 max-w-lg leading-7 text-slate-500">
                For researchers who want powerful
                literature discovery and a
                lightweight research workspace.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
              Always available
            </span>
          </div>

          <div className="mt-8">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-slate-950">
                ₹0
              </span>

              <span className="pb-1 font-semibold text-slate-500">
                forever
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              No payment required.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {[
              "Unlimited scholarly search",
              "Read abstracts and metadata",
              "Open DOI and source pages",
              "Access legitimate open-access full text",
              "Save up to 100 papers",
              "Create up to 3 collections",
              "Create up to 10 research-note records",
              "Run up to 2 active research alerts",
              "Basic researcher profile",
              "View indexed publication records",
            ].map((feature) => (
              <div
                key={feature}
                className="flex gap-3"
              >
                <CheckIcon />

                <span className="text-sm font-semibold leading-6 text-slate-700">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/search"
            className="mt-9 flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            Continue with Free
          </Link>
        </article>

        {/* SCHOLAR */}

        <article className="relative overflow-hidden rounded-[2rem] border-2 border-indigo-600 bg-slate-950 p-8 text-white shadow-xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/30 blur-3xl" />

          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
                  Scholar
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  OpenScholar Scholar
                </h2>

                <p className="mt-3 max-w-lg leading-7 text-slate-300">
                  For researchers who need a
                  larger literature workspace,
                  continuous monitoring and
                  professional publication
                  management.
                </p>
              </div>

              <span className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-black text-white">
                Recommended
              </span>
            </div>

            <div className="mt-8">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                <span className="text-5xl font-black">
                  ₹199
                </span>

                <span className="pb-1 font-semibold text-slate-300">
                  / month
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-emerald-300">
                Or ₹1,999 per year
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Annual billing offers better value.
              </p>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-4">
  <p className="text-xs font-bold leading-5 text-slate-300">
    Scholar is a recurring subscription.
    Monthly plans renew at ₹199 each month
    and annual plans renew at ₹1,999 each
    year unless cancelled.
  </p>

  <p className="mt-2 text-xs leading-5 text-slate-400">
    Cancellation can be scheduled for the
    end of the current billing period, so
    Scholar access continues until that
    period ends. Payments are processed
    securely by Razorpay.
  </p>
</div>
            </div>

            <div className="mt-8 space-y-4">
              {[
                "Everything available in Free",
                "Save up to 1,000 papers",
                "Create up to 50 collections",
                "Create up to 500 research-note records",
                "Run up to 25 active research alerts",
                "Full Publication Manager",
                "Add missing publications",
                "Hide and restore incorrect records",
                "Edit curated publication metadata",
                "Full research-profile management",
                "Bulk publication export",
                "CSV, BibTeX, RIS, JSON and text export",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex gap-3"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-black text-emerald-300"
                  >
                    ✓
                  </span>

                  <span className="text-sm font-semibold leading-6 text-slate-200">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <ScholarCheckoutButton />
          </div>
        </article>
      </section>

      {/* COMPARISON */}

      <section className="mt-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-7 py-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
            Plan Comparison
          </p>

          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Compare Free and Scholar
          </h2>

          <p className="mt-3 max-w-3xl leading-7 text-slate-500">
            Core research discovery remains
            accessible on both plans. Scholar
            expands the research-management tools
            around discovery.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Feature
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-500">
                  Free
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-indigo-700">
                  Scholar
                </th>
              </tr>
            </thead>

            <tbody>
              {features.map(
                (
                  feature,
                  index
                ) => (
                  <tr
                    key={
                      feature.label
                    }
                    className={
                      index %
                        2 ===
                      0
                        ? "bg-white"
                        : "bg-slate-50/60"
                    }
                  >
                    <td className="border-t border-slate-100 px-6 py-4 text-sm font-bold text-slate-800">
                      {
                        feature.label
                      }
                    </td>

                    <td className="border-t border-slate-100 px-6 py-4 text-sm font-semibold text-slate-600">
                      {
                        feature.free
                      }
                    </td>

                    <td className="border-t border-slate-100 px-6 py-4 text-sm font-bold text-indigo-700">
                      {
                        feature.scholar
                      }
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PRINCIPLE */}

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Open Research
          </p>

          <h2 className="mt-3 text-2xl font-black text-emerald-950">
            Research access is not being sold
          </h2>

          <p className="mt-4 leading-7 text-emerald-900/80">
            OpenScholar-Web does not charge
            researchers for searching scholarly
            metadata or opening legally available
            open-access research. Scholar pricing
            applies to additional organization,
            storage, monitoring, curation and
            productivity capabilities.
          </p>
        </div>

        <div className="rounded-[2rem] border border-indigo-200 bg-indigo-50 p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
            Fair Use
          </p>

          <h2 className="mt-3 text-2xl font-black text-indigo-950">
            Generous limits for active researchers
          </h2>

          <p className="mt-4 leading-7 text-indigo-900/80">
            Scholar limits are designed to support
            normal and intensive academic workflows
            while keeping infrastructure and service
            costs sustainable.
          </p>
        </div>
      </section>

      {/* FAQ / EXPLANATION */}

      <section className="mt-10 rounded-[2rem] bg-slate-950 p-8 text-white md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
          Simple Pricing
        </p>

        <h2 className="mt-3 text-3xl font-black">
          Start free. Upgrade only when you need more.
        </h2>

        <p className="mt-4 max-w-4xl leading-7 text-slate-300">
          A researcher can use OpenScholar-Web for
          discovery without purchasing Scholar.
          Upgrading becomes useful when the
          researcher needs a larger personal
          library, more collections, more alerts,
          publication curation or professional
          bulk-export capabilities.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="rounded-xl bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
          >
            Search Research
          </Link>

          <Link
            href="/about"
            className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-white/20"
          >
            About OpenScholar-Web
          </Link>
        </div>
      </section>
    </main>
  );
}