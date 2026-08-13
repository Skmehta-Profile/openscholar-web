import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
          Legal
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Terms of Service
        </h1>

        <p className="mt-4 text-sm font-semibold text-slate-500">
          Last updated: 13 August 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-black text-slate-950">
              1. About OpenScholar-Web
            </h2>

            <p className="mt-3">
              OpenScholar-Web is a research discovery
              and research-management service operated
              by DVS Analytik, Ahikaura, Chandauli,
              Uttar Pradesh, India.
            </p>

            <p className="mt-3">
              These Terms govern your use of
              OpenScholar-Web, including the Free and
              Scholar subscription plans.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              2. Research discovery service
            </h2>

            <p className="mt-3">
              OpenScholar-Web helps users discover,
              organize, monitor and manage scholarly
              information. Research metadata,
              abstracts, citation information, source
              links and related scholarly information
              may be obtained from third-party academic
              databases and services.
            </p>

            <p className="mt-3">
              OpenScholar-Web does not guarantee that
              third-party metadata is complete,
              error-free or continuously available.
              Users should verify important scholarly
              information against the original
              publication or authoritative source.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              3. Accounts
            </h2>

            <p className="mt-3">
              Some OpenScholar-Web features require an
              authenticated account. You are
              responsible for maintaining control of
              your account and for activity performed
              through your account.
            </p>

            <p className="mt-3">
              You must provide accurate information
              where required and must not impersonate
              another person or researcher.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              4. Free plan
            </h2>

            <p className="mt-3">
              Core scholarly search and selected
              research-management features are
              available without payment, subject to
              the limits displayed on the OpenScholar
              pricing page.
            </p>

            <p className="mt-3">
              Free-plan limits or features may be
              updated when necessary to maintain
              service quality, security or
              sustainability. Material changes will
              not affect an already-paid Scholar
              billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              5. Scholar subscription
            </h2>

            <p className="mt-3">
              OpenScholar Scholar is a recurring paid
              subscription offering expanded
              research-management capabilities and
              higher usage limits.
            </p>

            <p className="mt-3">
              The currently displayed subscription
              prices are ₹199 per month or ₹1,999 per
              year. The applicable price and billing
              frequency are shown before checkout.
            </p>

            <p className="mt-3">
              By completing a Scholar subscription,
              you authorize recurring billing
              according to the billing cycle you
              select, unless the subscription is
              cancelled.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              6. Payments
            </h2>

            <p className="mt-3">
              Subscription payments are processed
              through Razorpay or another payment
              provider identified at checkout.
              OpenScholar-Web does not require users
              to provide payment-card credentials
              directly to DVS Analytik where payment
              information is collected by the payment
              provider.
            </p>

            <p className="mt-3">
              Payment authorization, recurring-payment
              mandates and transaction processing may
              also be subject to the terms of the
              payment provider, bank, card network or
              other payment instrument used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              7. Cancellation
            </h2>

            <p className="mt-3">
              A Scholar subscription may be scheduled
              for cancellation through the available
              subscription-management controls.
            </p>

            <p className="mt-3">
              Where cancellation is scheduled for the
              end of the current billing period,
              Scholar access continues until that
              period ends and no further renewal is
              intended after the cancellation becomes
              effective.
            </p>

            <p className="mt-3">
              Cancellation does not automatically
              create a right to a refund for a billing
              period that has already started. Refund
              eligibility is governed by the separate
              Cancellation &amp; Refund Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              8. Acceptable use
            </h2>

            <p className="mt-3">
              You may not use OpenScholar-Web to
              interfere with the service, bypass
              access controls or usage limits,
              automate abusive requests, attempt
              unauthorized access, misrepresent
              researcher identities, or use the
              service in violation of applicable law
              or third-party rights.
            </p>

            <p className="mt-3">
              Reasonable technical restrictions may
              be applied to protect OpenScholar-Web,
              its users and third-party data services
              from abuse or excessive automated use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              9. Scholarly content and third-party services
            </h2>

            <p className="mt-3">
              OpenScholar-Web does not claim ownership
              of third-party journal articles,
              scholarly metadata or other content
              owned by publishers, authors, databases
              or other rights holders.
            </p>

            <p className="mt-3">
              Access to external publications,
              websites, DOI links and open-access
              resources remains subject to the
              applicable rights, licences and terms
              of those external services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              10. User-created information
            </h2>

            <p className="mt-3">
              Users may create notes, collections,
              profile information and other
              research-workspace records. You remain
              responsible for information you submit
              and should not upload content that you
              are not legally permitted to store or
              use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              11. Service availability
            </h2>

            <p className="mt-3">
              We aim to provide a reliable service,
              but OpenScholar-Web may occasionally be
              unavailable because of maintenance,
              technical failures, security incidents,
              internet outages or disruption of
              third-party services.
            </p>

            <p className="mt-3">
              No uninterrupted or error-free
              availability is guaranteed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              12. Disclaimer
            </h2>

            <p className="mt-3">
              OpenScholar-Web is a research discovery
              and productivity service. It does not
              provide legal, medical, financial or
              other regulated professional advice.
            </p>

            <p className="mt-3">
              Citation counts, publication records,
              researcher profiles, recommendations,
              abstracts and other scholarly
              information may originate from
              third-party sources and should be
              independently verified where accuracy
              is important.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              13. Limitation of liability
            </h2>

            <p className="mt-3">
              To the extent permitted by applicable
              law, DVS Analytik will not be liable for
              indirect, incidental, consequential or
              special losses arising from use of, or
              inability to use, OpenScholar-Web,
              including losses caused by inaccurate
              third-party scholarly information,
              external services or service
              interruptions.
            </p>

            <p className="mt-3">
              Nothing in these Terms excludes or
              limits rights or liabilities that
              cannot lawfully be excluded or limited
              under applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              14. Suspension or termination
            </h2>

            <p className="mt-3">
              Access may be restricted or terminated
              where reasonably necessary because of
              fraud, security risks, serious abuse,
              unlawful activity or material violation
              of these Terms.
            </p>

            <p className="mt-3">
              Where appropriate and legally
              permissible, reasonable efforts will be
              made to address legitimate account or
              billing issues before permanent
              termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              15. Changes to these Terms
            </h2>

            <p className="mt-3">
              These Terms may be updated to reflect
              changes in OpenScholar-Web features,
              subscription arrangements, legal
              requirements or business operations.
              The latest version will be published on
              this page with an updated effective
              date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              16. Governing law
            </h2>

            <p className="mt-3">
              These Terms are governed by the laws of
              India. Any mandatory rights available
              to consumers under applicable law
              remain unaffected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">
              17. Contact
            </h2>

            <p className="mt-3">
              Operator: DVS Analytik
              <br />
              Owner: Suman
              <br />
              Address: Ahikaura, Chandauli,
              Uttar Pradesh, India
              <br />
              Support &amp; Billing Contact:{" "}
              <a
                href="mailto:suryakantmehta39@gmail.com"
                className="font-bold text-indigo-700 hover:underline"
              >
                suryakantmehta39@gmail.com
              </a>
            </p>

            <p className="mt-3">
              The support email may be replaced by a
              dedicated DVS Analytik business address
              in the future.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-200 pt-7">
          <Link
            href="/pricing"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            View Pricing
          </Link>

          <Link
            href="/privacy"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Privacy Policy
          </Link>
        </div>
      </section>
    </main>
  );
}