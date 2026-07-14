"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, PenLine, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { submitProof } from "@/server/actions/player";
import { createClient } from "@/lib/supabase/client";

/**
 * Punishment proof uploader: text, image or video.
 * Media goes straight to the private `proofs` bucket
 * (under the player's own folder), then a Server Action records it.
 */
export function ProofUploader({ punishmentId }: { punishmentId: string }) {
  const router = useRouter();
  const { upload, uploading } = useMediaUpload();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tab, setTab] = useState<"text" | "image" | "video">("text");

  const busy = uploading || pending;

  const submit = () => {
    startTransition(async () => {
      try {
        if (tab === "text") {
          if (!text.trim()) {
            toast.error("Write your proof first 💌");
            return;
          }
          const result = await submitProof({
            punishmentId,
            proofType: "text",
            text,
          });
          if (!result.ok) throw new Error(result.error);
        } else {
          if (!file) {
            toast.error(`Choose a ${tab} first`);
            return;
          }
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("Not signed in");

          const uploaded = await upload(
            file,
            "proofs",
            `${user.id}/${punishmentId}`,
          );
          const result = await submitProof({
            punishmentId,
            proofType: tab,
            text: text.trim() || undefined,
            bucket: uploaded.bucket,
            path: uploaded.path,
          });
          if (!result.ok) throw new Error(result.error);
        }

        toast("Proof delivered 🎬", {
          description: "Now we wait for the royal verdict…",
        });
        setText("");
        setFile(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-5">
      <p className="mb-4 text-sm font-medium">Submit your proof</p>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="text" className="flex-1">
            <PenLine className="h-3.5 w-3.5" /> Text
          </TabsTrigger>
          <TabsTrigger value="image" className="flex-1">
            <Camera className="h-3.5 w-3.5" /> Photo
          </TabsTrigger>
          <TabsTrigger value="video" className="flex-1">
            <Video className="h-3.5 w-3.5" /> Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe how you completed your forfeit…"
            rows={4}
            disabled={busy}
          />
        </TabsContent>

        {(["image", "video"] as const).map((kind) => (
          <TabsContent key={kind} value={kind}>
            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 p-8 text-center transition hover:border-rose-300 hover:bg-rose-50/30 dark:hover:bg-rose-950/10 ${
                busy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <Upload className="h-6 w-6 text-rose-400" />
              <span className="text-sm font-medium">
                {file ? file.name : `Tap to choose a ${kind}`}
              </span>
              <span className="text-xs text-muted-foreground">
                Up to 100 MB — it stays just between us
              </span>
              <input
                type="file"
                accept={kind === "image" ? "image/*" : "video/*"}
                className="hidden"
                disabled={busy}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a little note (optional)…"
              rows={2}
              disabled={busy}
              className="mt-3"
            />
          </TabsContent>
        ))}
      </Tabs>

      <Button onClick={submit} disabled={busy} size="lg" className="mt-4 w-full">
        {busy ? (
          <>
            <Loader2 className="animate-spin" />
            {uploading ? "Uploading…" : "Sending…"}
          </>
        ) : (
          "Send proof for approval"
        )}
      </Button>
    </div>
  );
}
