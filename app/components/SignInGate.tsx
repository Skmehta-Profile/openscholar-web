import Link from "next/link";

export default function SignInGate() {
  return (
    <section className="mx-auto mt-8 w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm md:p-10">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">
        OpenScholar Workspace
      </p>

      <h2 className="mt-3 text-3xl font-black text-slate-950">
        Sign in to continue
      </h2>

      <p className="mx-auto mt-4 max-w-lg leading-7 text-slate-600">
        This workspace is available after signing in to your free OpenScholar account.
      </p>

      <Link
        href="/signin"
        className="mt-7 inline-flex rounded-xl bg-indigo-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-800"
      >
        Sign In
      </Link>
    </section>
  );
}
