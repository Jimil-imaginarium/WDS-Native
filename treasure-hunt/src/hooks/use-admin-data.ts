"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  Answer,
  Day,
  Finale,
  GameProgress,
  GameSettings,
  Profile,
  Punishment,
  PunishmentSubmission,
  Riddle,
  UnlockSchedule,
} from "@/lib/types";

// ── Bundled admin dataset ───────────────────────────────────────────

export interface AdminData {
  days: Day[];
  riddles: Riddle[];
  schedule: UnlockSchedule[];
  punishments: Punishment[];
  answers: Answer[];
  submissions: PunishmentSubmission[];
  progress: GameProgress[];
  players: Profile[];
  settings: GameSettings | null;
  finale: Finale | null;
}

export function useAdminData() {
  return useQuery({
    queryKey: ["admin", "all"],
    queryFn: async (): Promise<AdminData> => {
      const supabase = createClient();
      const [
        days,
        riddles,
        schedule,
        punishments,
        answers,
        submissions,
        progress,
        players,
        settings,
        finale,
      ] = await Promise.all([
        supabase.from("days").select("*").order("day_number"),
        supabase.from("riddles").select("*"),
        supabase.from("unlock_schedule").select("*"),
        supabase.from("punishments").select("*"),
        supabase
          .from("answers")
          .select("*")
          .order("submitted_at", { ascending: false }),
        supabase
          .from("punishment_submissions")
          .select("*")
          .order("submitted_at", { ascending: false }),
        supabase.from("game_progress").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("game_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("finale").select("*").eq("id", 1).maybeSingle(),
      ]);

      const firstError =
        days.error ??
        riddles.error ??
        schedule.error ??
        punishments.error ??
        answers.error ??
        submissions.error ??
        progress.error ??
        players.error;
      if (firstError) throw firstError;

      return {
        days: (days.data ?? []) as Day[],
        riddles: (riddles.data ?? []) as Riddle[],
        schedule: (schedule.data ?? []) as UnlockSchedule[],
        punishments: (punishments.data ?? []) as Punishment[],
        answers: (answers.data ?? []) as Answer[],
        submissions: (submissions.data ?? []) as PunishmentSubmission[],
        progress: (progress.data ?? []) as GameProgress[],
        players: (players.data ?? []) as Profile[],
        settings: (settings.data ?? null) as GameSettings | null,
        finale: (finale.data ?? null) as Finale | null,
      };
    },
  });
}

function useAdminMutation<TVars>(
  fn: (supabase: ReturnType<typeof createClient>, vars: TVars) => Promise<void>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: TVars) => fn(createClient(), vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["map"] });
      queryClient.invalidateQueries({ queryKey: ["game-settings"] });
      queryClient.invalidateQueries({ queryKey: ["finale"] });
    },
  });
}

// ── Review actions ──────────────────────────────────────────────────

export function useReviewAnswer() {
  return useAdminMutation<{ id: string; status: "approved" | "rejected" }>(
    async (supabase, { id, status }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("answers")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    }
  );
}

export function useReviewProof() {
  return useAdminMutation<{ id: string; status: "approved" | "rejected" }>(
    async (supabase, { id, status }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("punishment_submissions")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    }
  );
}

// ── Content management ──────────────────────────────────────────────

export function useSaveDay() {
  return useAdminMutation<Partial<Day> & { day_number: number; title: string }>(
    async (supabase, day) => {
      const { error } = await supabase
        .from("days")
        .upsert(day, { onConflict: "day_number" });
      if (error) throw error;
    }
  );
}

export function useDeleteDay() {
  return useAdminMutation<{ id: string }>(async (supabase, { id }) => {
    const { error } = await supabase.from("days").delete().eq("id", id);
    if (error) throw error;
  });
}

export interface SaveRiddleInput {
  id?: string;
  day_id: string;
  riddle_number: number;
  title: string;
  story: string;
  question: string;
  image_url?: string | null;
  unlock_at: string; // ISO
  punishment_title: string;
  punishment_description: string;
}

export function useSaveRiddle() {
  return useAdminMutation<SaveRiddleInput>(async (supabase, input) => {
    const riddleRow: Record<string, unknown> = {
      day_id: input.day_id,
      riddle_number: input.riddle_number,
      title: input.title,
      story: input.story,
      question: input.question,
      image_url: input.image_url ?? null,
    };
    if (input.id) riddleRow.id = input.id;

    const { data: riddle, error } = await supabase
      .from("riddles")
      .upsert(riddleRow, { onConflict: "day_id,riddle_number" })
      .select()
      .single();
    if (error) throw error;

    const { error: schedError } = await supabase
      .from("unlock_schedule")
      .upsert(
        { riddle_id: riddle.id, unlock_at: input.unlock_at },
        { onConflict: "riddle_id" }
      );
    if (schedError) throw schedError;

    const { error: punError } = await supabase.from("punishments").upsert(
      {
        riddle_id: riddle.id,
        title: input.punishment_title,
        description: input.punishment_description,
      },
      { onConflict: "riddle_id" }
    );
    if (punError) throw punError;
  });
}

export function useDeleteRiddle() {
  return useAdminMutation<{ id: string }>(async (supabase, { id }) => {
    const { error } = await supabase.from("riddles").delete().eq("id", id);
    if (error) throw error;
  });
}

export function useSaveSettings() {
  return useAdminMutation<Partial<GameSettings>>(async (supabase, settings) => {
    const { error } = await supabase
      .from("game_settings")
      .update({ ...settings })
      .eq("id", 1);
    if (error) throw error;
  });
}

export function useSaveFinale() {
  return useAdminMutation<Partial<Finale>>(async (supabase, finale) => {
    const { error } = await supabase
      .from("finale")
      .update({ ...finale })
      .eq("id", 1);
    if (error) throw error;
  });
}

/** Upload a file to the public media bucket, returns its public URL. */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

/** Signed URL for a private proof file (admin preview). */
export async function getProofSignedUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("proofs")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
