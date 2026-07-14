"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Music4, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { deleteMedia, recordMedia } from "@/server/actions/admin";
import type { MediaContext, MediaType } from "@/lib/database.types";

export interface ManagedMedia {
  id: string;
  url: string;
  mediaType: MediaType;
  caption: string | null;
}

interface MediaManagerProps {
  context: MediaContext;
  riddleId?: string;
  refId?: string;
  folder: string;
  items: ManagedMedia[];
  accept?: string;
  emptyLabel?: string;
}

/**
 * Admin media manager: upload photos / videos / voice notes / GIFs /
 * PDFs to the `media` bucket and attach them to riddles, punishments,
 * the treasure gallery, etc. Shows existing files with delete.
 */
export function MediaManager({
  context,
  riddleId,
  refId,
  folder,
  items,
  accept = "image/*,video/*,audio/*,.pdf",
  emptyLabel = "No media yet — add photos, videos, voice notes, GIFs or PDFs.",
}: MediaManagerProps) {
  const router = useRouter();
  const { upload, uploading } = useMediaUpload();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || pending;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    startTransition(async () => {
      try {
        for (const file of Array.from(files)) {
          const uploaded = await upload(file, "media", folder);
          const result = await recordMedia({
            context,
            riddleId,
            refId,
            bucket: uploaded.bucket,
            path: uploaded.path,
            mediaType: uploaded.mediaType,
          });
          if (!result.ok) throw new Error(result.error);
        }
        toast(`Uploaded ${files.length} file${files.length > 1 ? "s" : ""} 🎞️`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await deleteMedia(id);
      if (result.ok) {
        toast("Media removed");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 p-5 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((m) => (
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
              ) : m.mediaType === "audio" ? (
                <div className="flex aspect-square items-center justify-center bg-rose-100/40 dark:bg-rose-950/30">
                  <Music4 className="h-8 w-8 text-rose-400" />
                </div>
              ) : m.mediaType === "pdf" || m.mediaType === "other" ? (
                <div className="flex aspect-square items-center justify-center bg-gold-100/40 dark:bg-gold-900/20">
                  <FileText className="h-8 w-8 text-gold-500" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt={m.caption ?? ""}
                  className="aspect-square w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => remove(m.id)}
                disabled={busy}
                aria-label="Delete media"
                className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {busy ? "Uploading…" : "Upload media"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
