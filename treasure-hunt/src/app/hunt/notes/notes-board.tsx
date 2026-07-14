"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createSecretNote } from "@/server/actions/player";
import { formatDateTime } from "@/lib/utils";

interface NoteView {
  id: string;
  title: string | null;
  body: string;
  createdAt: string;
  mine: boolean;
}

/** Little love letters passed back and forth. */
export function NotesBoard({ notes }: { notes: NoteView[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSecretNote({
        title: title.trim() || undefined,
        body,
      });
      if (result.ok) {
        toast("Note tucked away 💌");
        setTitle("");
        setBody("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not send the note");
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          For your eyes only
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Secret Notes</h1>
      </header>

      <Card className="mb-10">
        <CardContent className="p-6">
          <form onSubmit={send} className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A title (optional)…"
              maxLength={160}
              disabled={pending}
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write him something sweet…"
              rows={3}
              maxLength={8000}
              disabled={pending}
            />
            <Button type="submit" disabled={pending || !body.trim()} className="w-full">
              {pending ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
              Send secretly
            </Button>
          </form>
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <div className="glass mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl p-12 text-center">
          <Mail className="h-8 w-8 text-rose-400" />
          <p className="text-muted-foreground">
            No notes yet — leave the first whisper…
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((n, i) => (
            <motion.article
              key={n.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className={`glass max-w-[85%] rounded-3xl p-5 ${
                n.mine ? "ml-auto rounded-br-md" : "mr-auto rounded-bl-md"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {n.mine ? "You" : "From your love"} · {formatDateTime(n.createdAt)}
              </p>
              {n.title && <h3 className="mt-1 font-serif text-xl">{n.title}</h3>}
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                {n.body}
              </p>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
