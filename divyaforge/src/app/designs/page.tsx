"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDeity } from "@/lib/catalog";
import { shareUrl } from "@/lib/share/codec";
import {
  deleteDesign,
  getCurrentUser,
  getStorageMode,
  listDesigns,
  signOut,
  type CurrentUser,
  type SavedDesign,
} from "@/lib/supabase/storage";

export default function DesignsPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState<SavedDesign[] | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const mode = getStorageMode();

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      setUserLoaded(true);
      if (u) setDesigns(await listDesigns().catch(() => []));
      else setDesigns([]);
    })();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this saved design?")) return;
    await deleteDesign(id);
    setDesigns((prev) => prev?.filter((d) => d.id !== id) ?? null);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-black tracking-tight text-stone-900">
          Divya<span className="text-saffron-600">Forge</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/builder" className="font-semibold text-saffron-700">
            Builder →
          </Link>
          {user && !user.isLocal && (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.refresh();
                setUser(null);
                setDesigns([]);
              }}
              className="text-xs text-stone-400 underline"
            >
              Sign out{user.email ? ` (${user.email})` : ""}
            </button>
          )}
        </div>
      </header>

      <h1 className="text-2xl font-bold text-stone-900">My designs</h1>
      {mode === "local" && (
        <p className="mt-1 text-xs text-stone-400">
          Demo mode — designs live in this browser.
        </p>
      )}

      {userLoaded && !user && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 text-center">
          <p className="text-sm text-stone-600">Sign in to see your saved designs.</p>
          <Link
            href="/login?next=/designs"
            className="mt-3 inline-block rounded-xl bg-saffron-500 px-6 py-2.5 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      )}

      {designs === null ? (
        <p className="mt-6 text-sm text-stone-400">Loading…</p>
      ) : designs.length === 0 && user ? (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center">
          <p className="text-sm text-stone-500">
            Nothing saved yet. Design a murti and save it from the Share tab.
          </p>
          <Link
            href="/builder"
            className="mt-3 inline-block rounded-xl bg-saffron-500 px-6 py-2.5 text-sm font-semibold text-white"
          >
            Start creating
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {designs?.map((d) => {
            const deity = getDeity(d.config.deityId);
            return (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">{d.name}</p>
                  <p className="text-xs text-stone-400">
                    {deity ? `${deity.name.en} · ${deity.name.hi} · ` : ""}
                    {new Date(d.updatedAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/builder?load=${encodeURIComponent(d.id)}`}
                    className="rounded-lg bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(shareUrl(d.shareId))
                    }
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(d.id)}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-maroon-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
