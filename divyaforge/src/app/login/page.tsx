"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/builder";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
        <h2 className="text-lg font-bold text-stone-900">Demo mode</h2>
        <p className="mt-2 text-sm text-stone-500">
          Supabase is not configured, so no account is needed — designs and
          orders are stored in this browser. See <code>.env.example</code> to
          enable accounts.
        </p>
        <Link
          href={next}
          className="mt-4 inline-block rounded-xl bg-saffron-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Continue to the builder
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = getBrowserSupabase();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setInfo("Check your email to confirm your account, then sign in.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-stone-200 bg-white p-6"
    >
      <h2 className="text-lg font-bold text-stone-900">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h2>
      <label className="mt-4 block text-sm">
        <span className="text-stone-600">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-saffron-400"
        />
      </label>
      <label className="mt-3 block text-sm">
        <span className="text-stone-600">Password</span>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-saffron-400"
        />
      </label>
      {error && <p className="mt-3 text-xs font-medium text-maroon-700">{error}</p>}
      {info && <p className="mt-3 text-xs font-medium text-green-700">{info}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-50"
      >
        {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-3 w-full text-center text-xs font-medium text-saffron-700 underline"
      >
        {mode === "signin"
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
      <Link href="/" className="text-center text-xl font-black tracking-tight text-stone-900">
        Divya<span className="text-saffron-600">Forge</span>
      </Link>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
