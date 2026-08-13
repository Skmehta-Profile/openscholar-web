import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
          Privacy
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Privacy Policy
        </h1>

        <p className="mt-4 text-sm font-semibold text-slate-500">
          Last updated: 13 August 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-black text-slate-950">
              1. About this policy
            </h2>

            <p className="mt-3">
              This Privacy Policy explains how
              OpenScholar-Web collects, uses, stores
              and processes information when you use
              the service.
            </p>

            <p className="mt-3">
              OpenScholar-Web is operated by DVS
              Analytik, Ahikaura, Chandauli,
              Uttar Pradesh, India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              2. Information we may collect
            </h2>

            <p className="mt-3">
              Depending on the features you use,
              OpenScholar-Web may process information
              such as:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                account information, including your
                email address and authentication
                identifiers;
              </li>

              <li>
                researcher-profile information that
                you provide or manage;
              </li>

              <li>
                publication information and
                publication-management records;
              </li>

              <li>
                saved papers, collections, research
                notes, reading-related records and
                other research-workspace information;
              </li>

              <li>
                research alerts and alert
                preferences;
              </li>

              <li>
                search queries and information
                necessary to provide research
                discovery features;
              </li>

              <li>
                subscription plan, billing cycle,
                subscription status and related
                payment-reference information;
              </li>

              <li>
                support communications that you send
                to us; and
              </li>

              <li>
                technical, security and diagnostic
                information reasonably necessary to
                operate and protect the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              3. Payment information
            </h2>

            <p className="mt-3">
              Payments for OpenScholar Scholar are
              processed through Razorpay or another
              payment provider identified at
              checkout.
            </p>

            <p className="mt-3">
              Where payment credentials are entered
              directly into the payment
              provider&apos;s payment interface,
              OpenScholar-Web does not need to
              receive or store your full card number,
              CVV or similar sensitive payment
              credentials.
            </p>

            <p className="mt-3">
              We may receive and retain information
              necessary to administer a
              subscription, such as payment or
              subscription identifiers, billing
              cycle, payment status, subscription
              status, transaction-related references
              and cancellation information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              4. How we use information
            </h2>

            <p className="mt-3">
              We may use information as reasonably
              necessary to:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                authenticate users and maintain
                accounts;
              </li>

              <li>
                provide scholarly search and research
                discovery services;
              </li>

              <li>
                maintain saved papers, collections,
                notes, alerts and other workspace
                features;
              </li>

              <li>
                provide and manage researcher-profile
                and publication-management features;
              </li>

              <li>
                administer Free and Scholar plans;
              </li>

              <li>
                verify payments and subscription
                status;
              </li>

              <li>
                process cancellation, billing and
                refund-related requests;
              </li>

              <li>
                provide customer support;
              </li>

              <li>
                prevent fraud, abuse and security
                incidents;
              </li>

              <li>
                diagnose technical problems and
                maintain service reliability; and
              </li>

              <li>
                comply with applicable legal
                obligations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              5. Research information and third-party sources
            </h2>

            <p className="mt-3">
              OpenScholar-Web uses scholarly
              information from external academic
              sources and services, which may include
              services such as OpenAlex and Crossref.
            </p>

            <p className="mt-3">
              Researcher names, affiliations,
              publications, citation information and
              other scholarly metadata may therefore
              originate from public or third-party
              scholarly sources rather than directly
              from the individual concerned.
            </p>

            <p className="mt-3">
              Third-party services operate under
              their own terms and privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              6. Service providers
            </h2>

            <p className="mt-3">
              OpenScholar-Web may use service
              providers to operate parts of the
              platform, including infrastructure,
              authentication, database, deployment,
              scholarly-data and payment-processing
              services.
            </p>

            <p className="mt-3">
              Information may be processed by such
              providers where reasonably necessary
              to deliver their services to
              OpenScholar-Web.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              7. Data sharing
            </h2>

            <p className="mt-3">
              DVS Analytik does not sell your
              personal information.
            </p>

            <p className="mt-3">
              Information may be disclosed where
              reasonably necessary to service
              providers acting in connection with
              OpenScholar-Web, to process or verify
              payments, to protect the service and
              its users, to investigate fraud or
              abuse, or where disclosure is required
              by applicable law or lawful process.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              8. Public researcher profiles
            </h2>

            <p className="mt-3">
              Certain researcher-profile or
              scholarly information may be displayed
              publicly when a feature is designed to
              create or display a public researcher
              profile or public scholarly record.
            </p>

            <p className="mt-3">
              Users should avoid placing private,
              confidential or sensitive personal
              information in fields intended for
              public display.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              9. Data retention
            </h2>

            <p className="mt-3">
              Information is retained for as long as
              reasonably necessary to provide the
              service, maintain account and
              subscription records, resolve disputes,
              prevent fraud, meet legitimate
              operational needs and comply with
              applicable legal obligations.
            </p>

            <p className="mt-3">
              Different categories of information
              may require different retention
              periods.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              10. Security
            </h2>

            <p className="mt-3">
              We use reasonable technical and
              organizational measures intended to
              protect information against
              unauthorized access, alteration,
              disclosure or loss.
            </p>

            <p className="mt-3">
              However, no internet service,
              transmission method or electronic
              storage system can be guaranteed to be
              completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              11. Your choices and requests
            </h2>

            <p className="mt-3">
              Depending on the relevant feature and
              applicable law, users may be able to
              update certain account or profile
              information through OpenScholar-Web.
            </p>

            <p className="mt-3">
              You may also contact us regarding
              reasonable requests concerning your
              personal information, including
              correction, account-related questions
              or deletion requests where applicable.
            </p>

            <p className="mt-3">
              Some information may need to be
              retained where required for legitimate
              billing, fraud-prevention, dispute,
              security or legal purposes.
            </p>
          </section>

          <section>
  <h2 className="text-xl font-black text-slate-950">
    12. Browser storage, cookies and similar technologies
  </h2>

  <p className="mt-3">
    OpenScholar-Web uses browser storage for
    functional purposes. This may include
    maintaining authentication sessions and
    supporting features such as search history,
    recently viewed research and other
    research-workspace preferences or state.
  </p>

  <p className="mt-3">
    OpenScholar-Web does not currently use
    advertising cookies or third-party
    behavioural advertising or analytics
    trackers.
  </p>

  <p className="mt-3">
    Third-party services used when you choose
    to access particular functionality, such
    as payment processing through Razorpay,
    may use cookies, browser storage or similar
    technologies in accordance with their own
    privacy and security practices.
  </p>

  <p className="mt-3">
    If OpenScholar-Web later introduces
    non-essential analytics, advertising or
    similar tracking technologies, this policy
    and any consent mechanism required by
    applicable law may be updated before or
    when those technologies are introduced.
  </p>
</section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              13. Children
            </h2>

            <p className="mt-3">
              OpenScholar-Web is intended primarily
              for researchers, students and academic
              users. The service is not specifically
              directed to young children.
            </p>

            <p className="mt-3">
              If we become aware that personal
              information has been collected in a
              manner that requires deletion or other
              action under applicable law, we will
              take reasonable steps to address it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              14. Changes to this Privacy Policy
            </h2>

            <p className="mt-3">
              We may update this Privacy Policy to
              reflect changes in OpenScholar-Web,
              service providers, business operations
              or applicable requirements.
            </p>

            <p className="mt-3">
              The latest version will be published
              on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              15. Contact
            </h2>

            <p className="mt-3">
              Operator: DVS Analytik
              <br />
              Owner: Suman
              <br />
              Address: Ahikaura, Chandauli,
              Uttar Pradesh, India
              <br />
              Privacy &amp; Support Contact:{" "}
              <a
                href="mailto:suryakantmehta39@gmail.com"
                className="font-bold text-indigo-700 hover:underline"
              >
                suryakantmehta39@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-200 pt-7">
          <Link
            href="/terms"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Terms of Service
          </Link>

          <Link
            href="/refund-policy"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Cancellation &amp; Refund Policy
          </Link>

          <Link
            href="/pricing"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            View Pricing
          </Link>
        </div>
      </section>
    </main>
  );
}