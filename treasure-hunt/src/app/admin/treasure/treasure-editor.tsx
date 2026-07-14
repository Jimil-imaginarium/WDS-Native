"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gem, Loader2, Music4, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaManager, type ManagedMedia } from "@/components/admin/media-manager";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { setTreasureMusic, updateTreasure } from "@/server/actions/admin";
import type { TreasureSettings } from "@/lib/database.types";

interface TreasureEditorProps {
  treasure: TreasureSettings;
  gallery: ManagedMedia[];
  musicUrl: string | null;
}

export function TreasureEditor({ treasure, gallery, musicUrl }: TreasureEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { upload, uploading } = useMediaUpload();
  const musicInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: treasure.title,
    message: treasure.message,
    letter: treasure.letter,
    locationReveal: treasure.location_reveal,
  });

  const save = () => {
    startTransition(async () => {
      const result = await updateTreasure(form);
      if (result.ok) {
        toast("The treasure is ready 🗝️");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const uploadMusic = (file: File | null) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const uploaded = await upload(file, "media", "treasure/music");
        const result = await setTreasureMusic(uploaded.path);
        if (!result.ok) throw new Error(result.error);
        toast("Treasure music set 🎶");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
            The grand finale
          </p>
          <h1 className="mt-1 flex items-center gap-2 font-serif text-4xl">
            <Gem className="h-7 w-7 text-gold-500" /> Final Treasure
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            She sees this page only after all twelve riddles are approved.
          </p>
        </div>
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Words</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Opening message</Label>
            <Textarea
              rows={2}
              value={form.message}
              placeholder="Twelve riddles. Four days. One heart — yours to keep."
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Your letter</Label>
            <Textarea
              rows={10}
              value={form.letter}
              placeholder={"My love,\n\nIf you're reading this, you found every clue I hid for you…"}
              onChange={(e) => setForm((f) => ({ ...f, letter: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Final location reveal</Label>
            <Textarea
              rows={2}
              value={form.locationReveal}
              placeholder="Look inside the wooden box on the top shelf of my wardrobe…"
              onChange={(e) =>
                setForm((f) => ({ ...f, locationReveal: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photo gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaManager
            context="treasure_gallery"
            folder="treasure/gallery"
            items={gallery}
            accept="image/*,video/*"
            emptyLabel="Upload the photos of you two for the finale."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music4 className="h-5 w-5 text-rose-400" /> Music
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {musicUrl && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={musicUrl} controls preload="none" className="w-full" />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove music"
                className="shrink-0 text-destructive"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setTreasureMusic(null);
                    if (result.ok) {
                      toast("Music removed");
                      router.refresh();
                    } else toast.error(result.error);
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full border-dashed"
            disabled={pending || uploading}
            onClick={() => musicInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {musicUrl ? "Replace music" : "Upload music"}
          </Button>
          <input
            ref={musicInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => uploadMusic(e.target.files?.[0] ?? null)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
