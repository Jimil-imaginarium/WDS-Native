"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_DESIGN_NAME } from "@/lib/schema/defaults";
import { encodeInlineConfigId, shareUrl } from "@/lib/share/codec";
import {
  getCurrentUser,
  getStorageMode,
  saveDesign,
  type CurrentUser,
} from "@/lib/supabase/storage";
import { useBuilderStore } from "@/store/builderStore";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { downloadSnapshot } from "@/components/three/snapshot";

export function ShareTab() {
  const config = useBuilderStore((s) => s.config);
  const designName = useBuilderStore((s) => s.designName);
  const setDesignName = useBuilderStore((s) => s.setDesignName);
  const savedDesignId = useBuilderStore((s) => s.savedDesignId);
  const markSaved = useBuilderStore((s) => s.markSaved);
  const dirty = useBuilderStore((s) => s.dirty);
  const glCanvas = useBuilderStore((s) => s.glCanvas);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastShareId, setLastShareId] = useState<string | null>(null);
  const mode = getStorageMode();

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setUserLoaded(true);
    });
  }, []);

  async function handleSave() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const record = await saveDesign(
        designName || DEFAULT_DESIGN_NAME,
        config,
        savedDesignId,
      );
      markSaved(record.id);
      setLastShareId(record.shareId);
      setMessage(mode === "local" ? "Saved in this browser." : "Saved to your account.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyLink() {
    // Saved Supabase designs share their shortcode URL; everything else
    // shares a self-contained inline config link.
    const id =
      mode === "supabase" && savedDesignId && !dirty && lastShareId
        ? lastShareId
        : encodeInlineConfigId(config);
    const url = shareUrl(id);
    await navigator.clipboard.writeText(url);
    setMessage("Share link copied to clipboard.");
  }

  const needsSignIn = mode === "supabase" && userLoaded && !user;

  return (
    <div>
      <SectionLabel en="Save design" hi="डिज़ाइन सहेजें" />
      <input
        type="text"
        value={designName}
        onChange={(e) => setDesignName(e.target.value)}
        placeholder={DEFAULT_DESIGN_NAME}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-saffron-400"
        maxLength={120}
      />
      {needsSignIn ? (
        <Link
          href="/login?next=/builder"
          className="mt-2 block w-full rounded-xl bg-stone-800 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-stone-700"
        >
          Sign in to save
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="mt-2 w-full rounded-xl bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-saffron-600 disabled:opacity-50"
        >
          {busy ? "Saving…" : savedDesignId ? "Update saved design" : "Save design"}
        </button>
      )}
      {mode === "local" && (
        <p className="mt-1.5 text-[11px] text-stone-400">
          Demo mode — saves live in this browser. Configure Supabase for
          account saves (.env.example).
        </p>
      )}
      <p className="mt-1.5">
        <Link href="/designs" className="text-xs font-medium text-saffron-700 underline">
          My saved designs →
        </Link>
      </p>

      <SectionLabel
        en="Share"
        hi="साझा करें"
        hint="Share links carry the design parameters — anyone can view and fork."
      />
      <button
        type="button"
        onClick={handleCopyLink}
        className="w-full rounded-xl border border-saffron-500 bg-white px-4 py-2.5 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
      >
        Copy share link
      </button>

      <SectionLabel en="Snapshot" hi="चित्र" />
      <button
        type="button"
        disabled={!glCanvas}
        onClick={() => glCanvas && downloadSnapshot(glCanvas, designName || DEFAULT_DESIGN_NAME)}
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
      >
        Download PNG
      </button>

      {message && <p className="mt-3 text-xs font-medium text-green-700">{message}</p>}
      {error && <p className="mt-3 text-xs font-medium text-maroon-700">{error}</p>}
    </div>
  );
}
