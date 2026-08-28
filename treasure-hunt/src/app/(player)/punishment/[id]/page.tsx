"use client";

import { use, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  FileAudio,
  Loader2,
  Type,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useMyAnswers,
  useMySubmissions,
  usePunishment,
  useSubmitProof,
} from "@/hooks/use-game-data";
import { getRejectionNeedingPunishment } from "@/lib/game";
import type { ProofType } from "@/lib/types";

const PROOF_OPTIONS: {
  type: ProofType;
  label: string;
  icon: React.ReactNode;
  accept?: string;
}[] = [
  { type: "photo", label: "Photo", icon: <Camera className="h-5 w-5" />, accept: "image/*" },
  { type: "video", label: "Video", icon: <Video className="h-5 w-5" />, accept: "video/*" },
  { type: "audio", label: "Audio", icon: <FileAudio className="h-5 w-5" />, accept: "audio/*" },
  { type: "text", label: "Text", icon: <Type className="h-5 w-5" /> },
];

/** Punishment page for a riddle (route param = riddle id). */
export default function PunishmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: riddleId } = use(params);
  const { data: punishment, isLoading } = usePunishment(riddleId);
  const { data: answers = [] } = useMyAnswers();
  const { data: submissions = [] } = useMySubmissions();
  const submitProof = useSubmitProof();

  const [proofType, setProofType] = useState<ProofType>("photo");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const riddleAnswers = useMemo(
    () => answers.filter((a) => a.riddle_id === riddleId),
    [answers, riddleId]
  );
  const riddleSubmissions = useMemo(
    () =>
      submissions.filter((s) => riddleAnswers.some((a) => a.id === s.answer_id)),
    [submissions, riddleAnswers]
  );

  const rejectedAnswer = getRejectionNeedingPunishment({
    answers: riddleAnswers,
    submissions: riddleSubmissions,
  });
  const pendingProof = riddleSubmissions.find((s) => s.status === "pending");
  const lastRejectedProof = riddleSubmissions.find(
    (s) => s.status === "rejected"
  );

  const allowedTypes = punishment?.proof_types ?? ["photo", "video", "text", "audio"];
  const options = PROOF_OPTIONS.filter((o) => allowedTypes.includes(o.type));

  const handleSubmit = async () => {
    if (!punishment || !rejectedAnswer) return;
    if (proofType === "text" && !text.trim()) {
      toast.error("Write your proof first!");
      return;
    }
    if (proofType !== "text" && !file) {
      toast.error("Choose a file first!");
      return;
    }
    try {
      await submitProof.mutateAsync({
        punishmentId: punishment.id,
        answerId: rejectedAnswer.id,
        proofType,
        file: proofType === "text" ? null : file,
        text: proofType === "text" ? text.trim() : undefined,
      });
      setText("");
      setFile(null);
      toast("🎭 Proof submitted!", {
        description: "Waiting for the Treasure Keeper's verdict…",
      });
    } catch (e) {
      toast.error("Upload failed", {
        description: e instanceof Error ? e.message : "Try again in a moment.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink riddleId={riddleId} />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }

  if (!punishment) {
    return (
      <div className="mx-auto max-w-2xl">
        <BackLink riddleId={riddleId} />
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No punishment here… lucky you! 🍀
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink riddleId={riddleId} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <header className="text-center">
          <motion.div
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="mb-3 inline-block text-6xl"
          >
            🎭
          </motion.div>
          <p className="mb-1 text-xs uppercase tracking-[0.35em] text-rose-300/80">
            Punishment time
          </p>
          <h1 className="font-display text-4xl text-romantic">
            {punishment.title}
          </h1>
        </header>

        <Card className="border-rose-400/25">
          <CardContent className="p-6 text-center sm:p-8">
            <p className="font-display text-lg italic leading-relaxed text-foreground/90">
              {punishment.description}
            </p>
          </CardContent>
        </Card>

        {/* status: waiting for review */}
        {pendingProof && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-6 text-center"
          >
            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="font-display text-lg text-amber-200"
            >
              ⏳ Waiting for approval…
            </motion.p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your proof has been delivered to the Treasure Keeper. The verdict
              will appear here instantly.
            </p>
          </motion.div>
        )}

        {/* no punishment owed */}
        {!pendingProof && !rejectedAnswer && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
            <p className="font-display text-lg text-emerald-300">
              💖 Nothing owed!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You're free to try the riddle again.
            </p>
            <Button asChild variant="gold" className="mt-4">
              <Link href={`/riddle/${riddleId}`}>Back to the riddle</Link>
            </Button>
          </div>
        )}

        {/* proof uploader */}
        {!pendingProof && rejectedAnswer && (
          <Card>
            <CardContent className="space-y-5 p-6 sm:p-8">
              {lastRejectedProof && (
                <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-center text-sm text-rose-200">
                  🙈 Your last proof was rejected — the Keeper demands better!
                </div>
              )}

              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  Choose your proof
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {options.map((o) => (
                    <button
                      key={o.type}
                      type="button"
                      onClick={() => {
                        setProofType(o.type);
                        setFile(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition-all",
                        proofType === o.type
                          ? "border-pink-400/60 bg-pink-500/15 text-pink-200 shadow-lg shadow-pink-500/10"
                          : "border-border/60 text-muted-foreground hover:border-pink-400/30 hover:text-foreground"
                      )}
                    >
                      {o.icon}
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {proofType === "text" ? (
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Describe how you completed your punishment… in loving detail."
                  rows={5}
                  maxLength={2000}
                />
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={options.find((o) => o.type === proofType)?.accept}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border/70 p-8 text-muted-foreground transition-colors hover:border-pink-400/50 hover:text-foreground"
                  >
                    <Upload className="h-7 w-7" />
                    {file ? (
                      <span className="text-sm font-medium text-pink-200">
                        {file.name}
                      </span>
                    ) : (
                      <span className="text-sm">
                        Tap to choose your {proofType}
                      </span>
                    )}
                  </button>
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                disabled={submitProof.isPending}
              >
                {submitProof.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {submitProof.isPending ? "Delivering proof…" : "Submit proof"}
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

function BackLink({ riddleId }: { riddleId: string }) {
  return (
    <Link
      href={`/riddle/${riddleId}`}
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Back to the riddle
    </Link>
  );
}
