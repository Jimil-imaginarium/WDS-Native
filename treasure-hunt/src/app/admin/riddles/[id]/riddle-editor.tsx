"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Music4, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaManager, type ManagedMedia } from "@/components/admin/media-manager";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { setRiddleMusic, upsertRiddle } from "@/server/actions/admin";
import type { Riddle } from "@/lib/database.types";

interface RiddleEditorProps {
  riddle: Riddle;
  dayNumber: number;
  dayTitle: string;
  media: ManagedMedia[];
  musicUrl: string | null;
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RiddleEditor({
  riddle,
  dayNumber,
  dayTitle,
  media,
  musicUrl,
}: RiddleEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { upload, uploading } = useMediaUpload();
  const musicInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    riddleNumber: riddle.riddle_number,
    title: riddle.title,
    story: riddle.story,
    question: riddle.question,
    hint: riddle.hint ?? "",
    correctAnswer: riddle.correct_answer,
    locationHint: riddle.location_hint ?? "",
    specialNotes: riddle.special_notes ?? "",
    unlockAt: toLocalInputValue(riddle.unlock_at),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = () => {
    startTransition(async () => {
      const result = await upsertRiddle({
        id: riddle.id,
        dayId: riddle.day_id,
        riddleNumber: form.riddleNumber,
        title: form.title,
        story: form.story,
        question: form.question,
        hint: form.hint || undefined,
        correctAnswer: form.correctAnswer,
        locationHint: form.locationHint || undefined,
        specialNotes: form.specialNotes || undefined,
        unlockAt: form.unlockAt,
      });
      if (result.ok) {
        toast("Riddle saved 🖋️");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const uploadMusic = (file: File | null) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const uploaded = await upload(file, "media", `riddles/${riddle.id}/music`);
        const result = await setRiddleMusic(riddle.id, uploaded.path);
        if (!result.ok) throw new Error(result.error);
        toast("Background music set 🎶");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  };

  const removeMusic = () => {
    startTransition(async () => {
      const result = await setRiddleMusic(riddle.id, null);
      if (result.ok) {
        toast("Music removed");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/days"
            className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Days & Riddles
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-500">
            Day {dayNumber} · {dayTitle}
          </p>
          <h1 className="mt-1 font-serif text-3xl">
            Riddle {riddle.riddle_number}
          </h1>
        </div>
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          Save riddle
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>The riddle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unlock time</Label>
              <Input
                type="datetime-local"
                value={form.unlockAt}
                onChange={(e) => set("unlockAt", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Story</Label>
            <Textarea
              rows={7}
              value={form.story}
              placeholder={
                "Set the scene… Remember that evening when the rain caught us outside the café?"
              }
              onChange={(e) => set("story", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Question</Label>
            <Textarea
              rows={3}
              value={form.question}
              placeholder="What was the name written on my coffee cup that day?"
              onChange={(e) => set("question", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hint (optional — she can reveal it herself)</Label>
            <Input
              value={form.hint}
              placeholder="It starts with the letter of your favorite month…"
              onChange={(e) => set("hint", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            For your eyes only <Badge variant="gold">private</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Correct answer</Label>
            <Input
              value={form.correctAnswer}
              placeholder="The exact answer you'll compare against"
              onChange={(e) => set("correctAnswer", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Location hint</Label>
              <Input
                value={form.locationHint}
                placeholder="Under the blue flowerpot on the balcony"
                onChange={(e) => set("locationHint", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Special notes</Label>
              <Input
                value={form.specialNotes}
                placeholder="Bring the polaroid camera before 2pm"
                onChange={(e) => set("specialNotes", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaManager
            context="riddle"
            riddleId={riddle.id}
            folder={`riddles/${riddle.id}`}
            items={media}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music4 className="h-5 w-5 text-rose-400" /> Background music
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {musicUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio src={musicUrl} controls preload="none" className="w-full" />
              <Button
                variant="ghost"
                size="icon"
                onClick={removeMusic}
                disabled={pending}
                aria-label="Remove music"
                className="shrink-0 text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              A soft song that plays while she reads this riddle.
            </p>
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
