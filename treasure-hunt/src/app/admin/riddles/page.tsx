"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DayEditor } from "@/components/admin/day-editor";
import { RiddleEditor } from "@/components/admin/riddle-editor";
import {
  useAdminData,
  useDeleteDay,
  useDeleteRiddle,
} from "@/hooks/use-admin-data";
import { formatDateTime } from "@/lib/utils";
import type { Day, Riddle } from "@/lib/types";

export default function RiddlesAdminPage() {
  const { data, isLoading } = useAdminData();
  const deleteRiddle = useDeleteRiddle();
  const deleteDay = useDeleteDay();

  const [dayEditorOpen, setDayEditorOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<Day | null>(null);
  const [riddleEditorOpen, setRiddleEditorOpen] = useState(false);
  const [editingRiddle, setEditingRiddle] = useState<Riddle | null>(null);
  const [targetDayId, setTargetDayId] = useState<string | null>(null);

  const scheduleByRiddle = useMemo(
    () => new Map((data?.schedule ?? []).map((s) => [s.riddle_id, s])),
    [data]
  );
  const punishmentByRiddle = useMemo(
    () => new Map((data?.punishments ?? []).map((p) => [p.riddle_id, p])),
    [data]
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-60 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  const handleDeleteRiddle = async (riddle: Riddle) => {
    if (
      !window.confirm(
        `Delete riddle “${riddle.title}”? This also removes its answers and punishment.`
      )
    )
      return;
    try {
      await deleteRiddle.mutateAsync({ id: riddle.id });
      toast("🗑️ Riddle deleted");
    } catch {
      toast.error("Couldn't delete the riddle");
    }
  };

  const handleDeleteDay = async (day: Day) => {
    if (
      !window.confirm(
        `Delete Day ${day.day_number} (“${day.title}”) and ALL its riddles?`
      )
    )
      return;
    try {
      await deleteDay.mutateAsync({ id: day.id });
      toast("🗑️ Day deleted");
    } catch {
      toast.error("Couldn't delete the day");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-treasure">Days & Riddles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Islands, chests, questions, punishments and unlock times — all
            editable, no code required.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDay(null);
            setDayEditorOpen(true);
          }}
        >
          <CalendarPlus className="h-4 w-4" /> Create day
        </Button>
      </div>

      {data.days.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No days yet. Create Day 1 to begin drawing the map 🗺️ — or run{" "}
            <code className="rounded bg-accent px-1.5 py-0.5">npm run seed</code>{" "}
            for a ready-made hunt.
          </CardContent>
        </Card>
      )}

      {data.days.map((day, idx) => {
        const dayRiddles = data.riddles
          .filter((r) => r.day_id === day.id)
          .sort((a, b) => a.riddle_number - b.riddle_number);

        return (
          <motion.section
            key={day.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
                      Day {day.day_number} • {day.island_name}
                    </p>
                    <h2 className="font-display text-2xl">{day.title}</h2>
                    {day.story && (
                      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        {day.story}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingDay(day);
                        setDayEditorOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit day
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-300 hover:text-rose-200"
                      onClick={() => handleDeleteDay(day)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {dayRiddles.map((riddle) => {
                    const schedule = scheduleByRiddle.get(riddle.id);
                    const punishment = punishmentByRiddle.get(riddle.id);
                    const unlocked =
                      schedule &&
                      new Date(schedule.unlock_at).getTime() <= Date.now();
                    return (
                      <div
                        key={riddle.id}
                        className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={unlocked ? "success" : "secondary"}>
                              {unlocked ? "🔓 Unlocked" : "🔒 Locked"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              #{riddle.riddle_number} •{" "}
                              {schedule
                                ? formatDateTime(schedule.unlock_at)
                                : "No unlock time!"}
                            </span>
                          </div>
                          <p className="mt-1 truncate font-medium">
                            {riddle.title}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {riddle.question}
                          </p>
                          {punishment && (
                            <p className="mt-0.5 truncate text-xs text-rose-300/80">
                              🎭 {punishment.title}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingRiddle(riddle);
                              setTargetDayId(day.id);
                              setRiddleEditorOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-rose-300 hover:text-rose-200"
                            onClick={() => handleDeleteRiddle(riddle)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {dayRiddles.length < 3 && (
                    <Button
                      variant="ghost"
                      className="w-full border border-dashed border-border/60"
                      onClick={() => {
                        setEditingRiddle(null);
                        setTargetDayId(day.id);
                        setRiddleEditorOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add riddle (
                      {dayRiddles.length}/3)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.section>
        );
      })}

      <DayEditor
        open={dayEditorOpen}
        onOpenChange={setDayEditorOpen}
        day={editingDay}
        existingDayNumbers={data.days.map((d) => d.day_number)}
      />

      {targetDayId && (
        <RiddleEditor
          open={riddleEditorOpen}
          onOpenChange={setRiddleEditorOpen}
          riddle={editingRiddle}
          dayId={targetDayId}
          data={data}
        />
      )}
    </div>
  );
}
