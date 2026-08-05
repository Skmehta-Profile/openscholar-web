export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <p className="text-gray-600 mb-8">
        Effective Date: August 5, 2026
      </p>

      <p className="mb-6">
        OpenScholar is developed by DVS Analytik to help researchers discover,
        organize and access scholarly literature.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">
        Information We Collect
      </h2>

      <ul className="list-disc ml-6 space-y-2">
        <li>Email address (when you sign in)</li>
        <li>Research search queries</li>
        <li>Saved articles and collections</li>
        <li>Device and diagnostic information</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">
        How We Use Information
      </h2>

      <ul className="list-disc ml-6 space-y-2">
        <li>Provide research discovery services</li>
        <li>Synchronize your research library</li>
        <li>Improve application performance</li>
        <li>Provide customer support</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">
        Third-Party Services
      </h2>

      <p>
        OpenScholar may integrate with Google Play Services, OpenAlex,
        Crossref and other academic information providers.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">
        Contact
      </h2>

      <p>
        DVS Analytik<br />
        Email: mzut051@mzu.edu.in
      </p>
    </main>
  );
}