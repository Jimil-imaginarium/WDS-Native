"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  uploadMedia,
  useSaveRiddle,
  type AdminData,
} from "@/hooks/use-admin-data";
import { isoToLocalInput, localInputToIso } from "@/lib/utils";
import type { Riddle } from "@/lib/types";

interface RiddleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riddle: Riddle | null; // null → create in dayId
  dayId: string;
  data: AdminData;
}

export function RiddleEditor({
  open,
  onOpenChange,
  riddle,
  dayId,
  data,
}: RiddleEditorProps) {
  const saveRiddle = useSaveRiddle();

  const schedule = riddle
    ? data.schedule.find((s) => s.riddle_id === riddle.id)
    : undefined;
  const punishment = riddle
    ? data.punishments.find((p) => p.riddle_id === riddle.id)
    : undefined;

  const usedNumbers = useMemo(
    () =>
      data.riddles
        .filter((r) => r.day_id === dayId && r.id !== riddle?.id)
        .map((r) => r.riddle_number),
    [data.riddles, dayId, riddle]
  );

  const [riddleNumber, setRiddleNumber] = useState("1");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [question, setQuestion] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [unlockLocal, setUnlockLocal] = useState("");
  const [punishmentTitle, setPunishmentTitle] = useState("");
  const [punishmentDescription, setPunishmentDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (riddle) {
      setRiddleNumber(String(riddle.riddle_number));
      setTitle(riddle.title);
      setStory(riddle.story);
      setQuestion(riddle.question);
      setImageUrl(riddle.image_url);
      setUnlockLocal(isoToLocalInput(schedule?.unlock_at));
      setPunishmentTitle(punishment?.title ?? "");
      setPunishmentDescription(punishment?.description ?? "");
    } else {
      const free = [1, 2, 3].find((n) => !usedNumbers.includes(n)) ?? 1;
      setRiddleNumber(String(free));
      setTitle("");
      setStory("");
      setQuestion("");
      setImageUrl(null);
      setUnlockLocal("");
      setPunishmentTitle("");
      setPunishmentDescription("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, riddle?.id]);

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, "riddles");
      setImageUrl(url);
      toast("🖼️ Image uploaded");
    } catch (e) {
      toast.error("Upload failed", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockLocal) {
      toast.error("Set an unlock time — chests need their moment!");
      return;
    }
    if (!punishmentTitle.trim()) {
      toast.error("Every riddle needs a punishment 🎭");
      return;
    }
    try {
      await saveRiddle.mutateAsync({
        id: riddle?.id,
        day_id: dayId,
        riddle_number: Number(riddleNumber),
        title: title.trim(),
        story: story.trim(),
        question: question.trim(),
        image_url: imageUrl,
        unlock_at: localInputToIso(unlockLocal),
        punishment_title: punishmentTitle.trim(),
        punishment_description: punishmentDescription.trim(),
      });
      toast(riddle ? "💾 Riddle updated" : "✨ Riddle created");
      onOpenChange(false);
    } catch (err) {
      toast.error("Couldn't save the riddle", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {riddle ? "Edit riddle" : "Create riddle"}
          </DialogTitle>
          <DialogDescription>
            The story, the question, the unlock time and the punishment — the
            full recipe for one treasure chest.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Riddle slot</Label>
              <Select value={riddleNumber} onValueChange={setRiddleNumber}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      disabled={usedNumbers.includes(n)}
                    >
                      Riddle {n}
                      {n === 1 ? " (10:00 AM)" : n === 2 ? " (2:00 PM)" : " (9:00 PM)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlock-at">Unlock time</Label>
              <Input
                id="unlock-at"
                type="datetime-local"
                required
                value={unlockLocal}
                onChange={(e) => setUnlockLocal(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="riddle-title">Romantic title</Label>
            <Input
              id="riddle-title"
              required
              placeholder="The First Hello"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="riddle-story">Story text</Label>
            <Textarea
              id="riddle-story"
              rows={3}
              placeholder="Close your eyes and drift back…"
              value={story}
              onChange={(e) => setStory(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="riddle-question">The question</Label>
            <Textarea
              id="riddle-question"
              rows={2}
              required
              placeholder="Where did we meet for the very first time?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Clue image (optional)</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() =>
                  document.getElementById("riddle-image-input")?.click()
                }
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {imageUrl ? "Replace image" : "Upload image"}
              </Button>
              {imageUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Clue"
                    className="h-12 w-12 rounded-lg border border-border/60 object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageUrl(null)}
                  >
                    Remove
                  </Button>
                </>
              )}
              <input
                id="riddle-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
              />
            </div>
          </div>

          <Separator className="my-2" />

          <p className="text-sm font-medium text-rose-300">
            🎭 Punishment (required if she answers wrong)
          </p>
          <div className="space-y-2">
            <Label htmlFor="punishment-title">Punishment title</Label>
            <Input
              id="punishment-title"
              required
              placeholder="Sing It Loud"
              value={punishmentTitle}
              onChange={(e) => setPunishmentTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="punishment-description">What she must do</Label>
            <Textarea
              id="punishment-description"
              rows={2}
              required
              placeholder="Sing the chorus of my favorite song — full volume — and send the audio."
              value={punishmentDescription}
              onChange={(e) => setPunishmentDescription(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saveRiddle.isPending || uploading}
          >
            {saveRiddle.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {riddle ? "Save riddle" : "Create riddle"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
