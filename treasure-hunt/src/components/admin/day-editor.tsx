"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveDay } from "@/hooks/use-admin-data";
import type { Day } from "@/lib/types";

interface DayEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: Day | null; // null → create
  existingDayNumbers: number[];
}

export function DayEditor({
  open,
  onOpenChange,
  day,
  existingDayNumbers,
}: DayEditorProps) {
  const saveDay = useSaveDay();
  const [dayNumber, setDayNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [islandName, setIslandName] = useState("");
  const [story, setStory] = useState("");

  useEffect(() => {
    if (!open) return;
    if (day) {
      setDayNumber(day.day_number);
      setTitle(day.title);
      setIslandName(day.island_name);
      setStory(day.story);
    } else {
      const next =
        existingDayNumbers.length > 0 ? Math.max(...existingDayNumbers) + 1 : 1;
      setDayNumber(next);
      setTitle("");
      setIslandName("");
      setStory("");
    }
  }, [open, day, existingDayNumbers]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveDay.mutateAsync({
        ...(day ? { id: day.id } : {}),
        day_number: dayNumber,
        title: title.trim(),
        island_name: islandName.trim() || "Mystery Island",
        story: story.trim(),
      });
      toast(day ? "💾 Day updated" : "🏝️ Day created");
      onOpenChange(false);
    } catch (err) {
      toast.error("Couldn't save the day", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {day ? `Edit Day ${day.day_number}` : "Create a new day"}
          </DialogTitle>
          <DialogDescription>
            Each day is an island on her treasure map.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="day-number">Day number</Label>
              <Input
                id="day-number"
                type="number"
                min={1}
                max={30}
                required
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="island-name">Island name</Label>
              <Input
                id="island-name"
                placeholder="Isle of First Glances"
                value={islandName}
                onChange={(e) => setIslandName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="day-title">Title</Label>
            <Input
              id="day-title"
              required
              placeholder="Where It All Began"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="day-story">Story (shown on the map)</Label>
            <Textarea
              id="day-story"
              rows={3}
              placeholder="Today we sail back to the beginning…"
              value={story}
              onChange={(e) => setStory(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saveDay.isPending}>
            {saveDay.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {day ? "Save changes" : "Create day"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
