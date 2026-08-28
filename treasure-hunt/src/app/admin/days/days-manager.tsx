"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteDay, deleteRiddle, upsertDay, upsertRiddle } from "@/server/actions/admin";
import { UNLOCK_SLOTS } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/utils";
import type { Day, Riddle } from "@/lib/database.types";

interface DaysManagerProps {
  days: Day[];
  riddles: Riddle[];
}

/** Convert a Date to the value expected by <input type="datetime-local">. */
function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DaysManager({ days, riddles }: DaysManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [dayDialog, setDayDialog] = useState<{ open: boolean; day?: Day }>({
    open: false,
  });
  const [dayForm, setDayForm] = useState({
    dayNumber: 1,
    title: "",
    subtitle: "",
    date: "",
  });

  const [riddleDialog, setRiddleDialog] = useState<{
    open: boolean;
    day?: Day;
  }>({ open: false });
  const [riddleForm, setRiddleForm] = useState({
    riddleNumber: 1,
    title: "",
    unlockAt: "",
  });

  const openDayDialog = (day?: Day) => {
    setDayForm(
      day
        ? {
            dayNumber: day.day_number,
            title: day.title,
            subtitle: day.subtitle ?? "",
            date: day.date,
          }
        : {
            dayNumber: (days.at(-1)?.day_number ?? 0) + 1,
            title: "",
            subtitle: "",
            date: "",
          },
    );
    setDayDialog({ open: true, day });
  };

  const saveDay = () => {
    startTransition(async () => {
      const result = await upsertDay({
        id: dayDialog.day?.id,
        dayNumber: dayForm.dayNumber,
        title: dayForm.title,
        subtitle: dayForm.subtitle || undefined,
        date: dayForm.date,
      });
      if (result.ok) {
        toast("Day saved ✨");
        setDayDialog({ open: false });
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const openRiddleDialog = (day: Day) => {
    const existing = riddles.filter((r) => r.day_id === day.id);
    const nextNumber = (existing.at(-1)?.riddle_number ?? 0) + 1;
    const slot =
      UNLOCK_SLOTS.find((s) => s.riddleNumber === nextNumber) ?? UNLOCK_SLOTS[0];
    setRiddleForm({
      riddleNumber: nextNumber,
      title: "",
      unlockAt: `${day.date}T${slot.time}`,
    });
    setRiddleDialog({ open: true, day });
  };

  const saveRiddle = () => {
    if (!riddleDialog.day) return;
    startTransition(async () => {
      const result = await upsertRiddle({
        dayId: riddleDialog.day!.id,
        riddleNumber: riddleForm.riddleNumber,
        title: riddleForm.title,
        unlockAt: riddleForm.unlockAt,
      });
      if (result.ok && result.data) {
        toast("Riddle created — now write the story 🖋️");
        setRiddleDialog({ open: false });
        router.push(`/admin/riddles/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  };

  const removeDay = (day: Day) => {
    if (
      !window.confirm(
        `Delete "Day ${day.day_number} — ${day.title}" and ALL its riddles? This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteDay(day.id);
      if (result.ok) {
        toast("Day deleted");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const removeRiddle = (riddle: Riddle) => {
    if (!window.confirm(`Delete riddle "${riddle.title}"? This cannot be undone.`))
      return;
    startTransition(async () => {
      const result = await deleteRiddle(riddle.id);
      if (result.ok) {
        toast("Riddle deleted");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
            The script
          </p>
          <h1 className="mt-1 font-serif text-4xl">Days & Riddles</h1>
        </div>
        <Button onClick={() => openDayDialog()}>
          <Plus /> New day
        </Button>
      </header>

      {days.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <CalendarDays className="h-8 w-8 text-rose-400" />
            <p className="text-muted-foreground">
              Create Day 1 to start writing the hunt. Each day holds three
              riddles unlocking at 10:00, 14:00 and 21:00.
            </p>
          </CardContent>
        </Card>
      )}

      {days.map((day) => {
        const dayRiddles = riddles.filter((r) => r.day_id === day.id);
        return (
          <motion.section
            key={day.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-500">
                      Day {day.day_number} · {formatDate(day.date)}
                    </p>
                    <h2 className="mt-1 font-serif text-2xl">{day.title}</h2>
                    {day.subtitle && (
                      <p className="text-sm italic text-muted-foreground">
                        {day.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDayDialog(day)}
                      aria-label="Edit day"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDay(day)}
                      disabled={pending}
                      aria-label="Delete day"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {dayRiddles.map((riddle) => (
                    <Link
                      key={riddle.id}
                      href={`/admin/riddles/${riddle.id}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/50 px-4 py-3 transition hover:border-rose-300/60 hover:shadow-luxe"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          <span className="mr-2 text-xs text-muted-foreground">
                            #{riddle.riddle_number}
                          </span>
                          {riddle.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Unlocks {formatDate(riddle.unlock_at)} at{" "}
                          {formatTime(riddle.unlock_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!riddle.question && (
                          <Badge variant="warning">Needs content</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete riddle"
                          className="text-destructive opacity-0 transition group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            removeRiddle(riddle);
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </Link>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => openRiddleDialog(day)}
                  >
                    <Plus /> Add riddle {dayRiddles.length + 1}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        );
      })}

      {/* Day dialog */}
      <Dialog
        open={dayDialog.open}
        onOpenChange={(open) => setDayDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dayDialog.day ? "Edit day" : "Create a day"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Day number</Label>
                <Input
                  type="number"
                  min={1}
                  value={dayForm.dayNumber}
                  onChange={(e) =>
                    setDayForm((f) => ({ ...f, dayNumber: +e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dayForm.date}
                  onChange={(e) =>
                    setDayForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={dayForm.title}
                placeholder="Where It Began"
                onChange={(e) =>
                  setDayForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subtitle (optional)</Label>
              <Input
                value={dayForm.subtitle}
                placeholder="Our first chapter"
                onChange={(e) =>
                  setDayForm((f) => ({ ...f, subtitle: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={saveDay}
              disabled={pending || !dayForm.title || !dayForm.date}
            >
              {pending && <Loader2 className="animate-spin" />} Save day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New riddle dialog */}
      <Dialog
        open={riddleDialog.open}
        onOpenChange={(open) => setRiddleDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              New riddle — Day {riddleDialog.day?.day_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Riddle number</Label>
                <Input
                  type="number"
                  min={1}
                  value={riddleForm.riddleNumber}
                  onChange={(e) =>
                    setRiddleForm((f) => ({
                      ...f,
                      riddleNumber: +e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unlock time</Label>
                <Input
                  type="datetime-local"
                  value={riddleForm.unlockAt}
                  onChange={(e) =>
                    setRiddleForm((f) => ({ ...f, unlockAt: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={riddleForm.title}
                placeholder="The Place We First Met"
                onChange={(e) =>
                  setRiddleForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Default slots: {UNLOCK_SLOTS.map((s) => s.label).join(" · ")}.
              You&apos;ll write the story, question and answer on the next
              screen.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={saveRiddle}
              disabled={pending || !riddleForm.title || !riddleForm.unlockAt}
            >
              {pending && <Loader2 className="animate-spin" />} Create & write
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { toLocalInputValue };
