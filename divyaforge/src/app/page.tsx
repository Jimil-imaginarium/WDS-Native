import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron-600">
        M0 Prototype
      </p>
      <h1 className="text-4xl font-black tracking-tight text-stone-900">
        Divya<span className="text-saffron-600">Forge</span>
      </h1>
      <p className="text-lg text-stone-600">
        Design your own murti — every form, every detail — in your browser.
      </p>
      <p className="text-sm text-stone-500">
        This prototype builds one deity end-to-end: a fully customizable
        Ganesh with live pricing, sacred-rule guardrails, shareable designs,
        and a checkout stub. Placeholder geometry stands in for artist-made
        sculpts.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/builder"
          className="rounded-2xl bg-saffron-500 px-8 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-saffron-600"
        >
          Start creating
        </Link>
        <Link
          href="/designs"
          className="rounded-2xl border border-stone-300 bg-white px-8 py-3.5 text-base font-semibold text-stone-700 transition hover:border-saffron-400"
        >
          My designs
        </Link>
      </div>
      <p className="mt-4 text-xs text-stone-400">
        Every design is a lightweight parameter config — share a link, and
        anyone can view and fork it.
      </p>
    </main>
  );
}
