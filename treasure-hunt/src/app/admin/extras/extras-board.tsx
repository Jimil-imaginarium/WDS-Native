"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GalleryHorizontalEnd,
  HeartHandshake,
  Loader2,
  Mail,
  Plus,
  Send,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMediaUpload } from "@/hooks/use-media-upload";
import {
  deleteMemory,
  deleteTimelineEvent,
  updatePlayerProfile,
  upsertMemory,
  upsertTimelineEvent,
} from "@/server/actions/admin";
import { createSecretNote, deleteSecretNote } from "@/server/actions/player";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { MediaType } from "@/lib/database.types";

interface MemoryView {
  id: string;
  title: string | null;
  caption: string | null;
  takenOn: string | null;
  mediaType: MediaType;
  url: string;
}

interface TimelineView {
  id: string;
  eventDate: string;
  title: string;
  description: string | null;
  imagePath: string | null;
  imageUrl: string | null;
}

interface NoteView {
  id: string;
  title: string | null;
  body: string;
  createdAt: string;
  mine: boolean;
  unlockRiddleId: string | null;
}

interface ExtrasBoardProps {
  currentUserId: string;
  player: { id: string; displayName: string; welcomeMessage: string | null } | null;
  memories: MemoryView[];
  timeline: TimelineView[];
  notes: NoteView[];
  riddleOptions: { id: string; label: string; sort: number }[];
}

export function ExtrasBoard({
  player,
  memories,
  timeline,
  notes,
  riddleOptions,
}: ExtrasBoardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { upload, uploading } = useMediaUpload();
  const busy = pending || uploading;

  // Memories
  const memoryInputRef = useRef<HTMLInputElement>(null);
  const uploadMemories = (files: FileList | null) => {
    if (!files?.length) return;
    startTransition(async () => {
      try {
        for (const file of Array.from(files)) {
          const uploaded = await upload(file, "media", "memories");
          const result = await upsertMemory({
            path: uploaded.path,
            mediaType: uploaded.mediaType,
          });
          if (!result.ok) throw new Error(result.error);
        }
        toast("Memories added 📸");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        if (memoryInputRef.current) memoryInputRef.current.value = "";
      }
    });
  };

  // Timeline dialog
  const [timelineDialog, setTimelineDialog] = useState<{
    open: boolean;
    event?: TimelineView;
  }>({ open: false });
  const [timelineForm, setTimelineForm] = useState({
    eventDate: "",
    title: "",
    description: "",
    imagePath: "" as string,
  });
  const timelineImageRef = useRef<HTMLInputElement>(null);

  const openTimelineDialog = (event?: TimelineView) => {
    setTimelineForm({
      eventDate: event?.eventDate ?? "",
      title: event?.title ?? "",
      description: event?.description ?? "",
      imagePath: event?.imagePath ?? "",
    });
    setTimelineDialog({ open: true, event });
  };

  const saveTimeline = () => {
    startTransition(async () => {
      const result = await upsertTimelineEvent({
        id: timelineDialog.event?.id,
        eventDate: timelineForm.eventDate,
        title: timelineForm.title,
        description: timelineForm.description || undefined,
        imagePath: timelineForm.imagePath || undefined,
      });
      if (result.ok) {
        toast("Chapter saved 📖");
        setTimelineDialog({ open: false });
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const attachTimelineImage = (file: File | null) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const uploaded = await upload(file, "media", "timeline");
        setTimelineForm((f) => ({ ...f, imagePath: uploaded.path }));
        toast("Photo attached");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  };

  // Notes
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteRiddle, setNoteRiddle] = useState("");

  const sendNote = () => {
    startTransition(async () => {
      const result = await createSecretNote({
        title: noteTitle.trim() || undefined,
        body: noteBody,
        unlockRiddleId: noteRiddle || undefined,
      });
      if (result.ok) {
        toast("Note hidden away 💌");
        setNoteTitle("");
        setNoteBody("");
        setNoteRiddle("");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  // Player settings
  const [displayName, setDisplayName] = useState(player?.displayName ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(
    player?.welcomeMessage ?? "",
  );

  const saveProfile = () => {
    if (!player) return;
    startTransition(async () => {
      const result = await updatePlayerProfile({
        playerId: player.id,
        displayName,
        welcomeMessage: welcomeMessage || undefined,
      });
      if (result.ok) {
        toast("Her welcome updated 💐");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          The little things
        </p>
        <h1 className="mt-1 font-serif text-4xl">Extras</h1>
      </header>

      <Tabs defaultValue="memories">
        <TabsList className="w-full flex-wrap sm:w-auto">
          <TabsTrigger value="memories">
            <GalleryHorizontalEnd className="h-3.5 w-3.5" /> Memories
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <HeartHandshake className="h-3.5 w-3.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="notes">
            <Mail className="h-3.5 w-3.5" /> Notes
          </TabsTrigger>
          <TabsTrigger value="player">
            <Settings2 className="h-3.5 w-3.5" /> Player
          </TabsTrigger>
        </TabsList>

        {/* ── Memories ── */}
        <TabsContent value="memories">
          <Card>
            <CardContent className="space-y-4 p-6">
              <Button
                variant="outline"
                className="w-full border-dashed"
                disabled={busy}
                onClick={() => memoryInputRef.current?.click()}
              >
                {busy ? <Loader2 className="animate-spin" /> : <Upload />}
                Upload photos & videos
              </Button>
              <input
                ref={memoryInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => uploadMemories(e.target.files)}
              />

              {memories.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  The gallery is empty — fill it with the two of you.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {memories.map((m) => (
                    <div
                      key={m.id}
                      className="group relative overflow-hidden rounded-2xl border border-border/50"
                    >
                      {m.mediaType === "video" ? (
                        <video
                          src={m.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.url}
                          alt={m.title ?? ""}
                          className="aspect-square w-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        aria-label="Delete memory"
                        disabled={busy}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await deleteMemory(m.id);
                            if (result.ok) {
                              toast("Memory removed");
                              router.refresh();
                            } else toast.error(result.error);
                          })
                        }
                        className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Timeline ── */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="space-y-4 p-6">
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => openTimelineDialog()}
              >
                <Plus /> Add a chapter
              </Button>

              {timeline.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Chart your story: first date, first trip, the day you knew…
                </p>
              ) : (
                <div className="space-y-2.5">
                  {timeline.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 px-4 py-3"
                    >
                      <button
                        type="button"
                        onClick={() => openTimelineDialog(t)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.eventDate)}
                          {t.imageUrl ? " · 📷" : ""}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete chapter"
                        className="shrink-0 text-destructive"
                        disabled={busy}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await deleteTimelineEvent(t.id);
                            if (result.ok) {
                              toast("Chapter removed");
                              router.refresh();
                            } else toast.error(result.error);
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notes ── */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-3">
                <Input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="A title (optional)…"
                  maxLength={160}
                  disabled={busy}
                />
                <Textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Write her something she'll read twice…"
                  rows={3}
                  disabled={busy}
                />
                <div className="space-y-1.5">
                  <Label>Reveal after riddle (optional)</Label>
                  <select
                    value={noteRiddle}
                    onChange={(e) => setNoteRiddle(e.target.value)}
                    className="flex h-11 w-full rounded-2xl border border-input bg-background/70 px-4 py-2 text-sm shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Visible immediately</option>
                    {riddleOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={sendNote}
                  disabled={busy || !noteBody.trim()}
                  className="w-full"
                >
                  {pending ? <Loader2 className="animate-spin" /> : <Send />}
                  Hide the note
                </Button>
              </div>

              <div className="space-y-3 pt-2">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-border/50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {n.mine ? "You" : "From her"} · {formatDateTime(n.createdAt)}
                        {n.unlockRiddleId ? " · 🔒 riddle-locked" : ""}
                      </p>
                      {n.title && (
                        <p className="mt-0.5 font-serif text-lg">{n.title}</p>
                      )}
                      <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">
                        {n.body}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete note"
                      className="shrink-0 text-destructive"
                      disabled={busy}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteSecretNote(n.id);
                          if (result.ok) {
                            toast("Note deleted");
                            router.refresh();
                          } else toast.error(result.error);
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Player settings ── */}
        <TabsContent value="player">
          <Card>
            <CardContent className="space-y-4 p-6">
              {player ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Her display name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="My Love"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Personalized welcome message</Label>
                    <Textarea
                      rows={3}
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="Good morning, beautiful. Your adventure continues…"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown at the top of her dashboard, every time she signs in.
                    </p>
                  </div>
                  <Button onClick={saveProfile} disabled={busy || !displayName.trim()}>
                    {pending && <Loader2 className="animate-spin" />} Save
                  </Button>
                </>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No player account yet — create her user in Supabase Auth
                  (see the Admin Setup guide), and she&apos;ll appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Timeline dialog */}
      <Dialog
        open={timelineDialog.open}
        onOpenChange={(open) => setTimelineDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {timelineDialog.event ? "Edit chapter" : "New chapter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={timelineForm.eventDate}
                  onChange={(e) =>
                    setTimelineForm((f) => ({ ...f, eventDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={timelineForm.title}
                  placeholder="Our first date"
                  onChange={(e) =>
                    setTimelineForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={timelineForm.description}
                placeholder="You wore that yellow dress. I forgot my own name."
                onChange={(e) =>
                  setTimelineForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <Button
              variant="outline"
              className="w-full border-dashed"
              disabled={busy}
              onClick={() => timelineImageRef.current?.click()}
            >
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
              {timelineForm.imagePath ? "Replace photo" : "Attach a photo"}
            </Button>
            <input
              ref={timelineImageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => attachTimelineImage(e.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={saveTimeline}
              disabled={busy || !timelineForm.title.trim() || !timelineForm.eventDate}
            >
              {pending && <Loader2 className="animate-spin" />} Save chapter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
