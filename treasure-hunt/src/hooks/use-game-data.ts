"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  Answer,
  Finale,
  GameSettings,
  MapNode,
  Notification,
  Profile,
  ProofType,
  Punishment,
  PunishmentSubmission,
  Riddle,
} from "@/lib/types";

// ── Queries ──────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data as Profile | null;
    },
    staleTime: 60_000,
  });
}

export function useGameSettings() {
  return useQuery({
    queryKey: ["game-settings"],
    queryFn: async (): Promise<GameSettings | null> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("game_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      return data as GameSettings | null;
    },
    staleTime: 60_000,
  });
}

/** The treasure map — safe metadata for all 12 riddles via RPC. */
export function useMap() {
  return useQuery({
    queryKey: ["map"],
    queryFn: async (): Promise<MapNode[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_map");
      if (error) throw error;
      return (data ?? []) as MapNode[];
    },
    refetchInterval: 30_000, // safety net alongside realtime + countdowns
  });
}

/** Full riddle content — only succeeds once the riddle is unlocked (RLS). */
export function useRiddle(riddleId: string | null) {
  return useQuery({
    queryKey: ["riddle", riddleId],
    enabled: !!riddleId,
    queryFn: async (): Promise<Riddle | null> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("riddles")
        .select("*")
        .eq("id", riddleId!)
        .maybeSingle();
      return data as Riddle | null;
    },
  });
}

export function usePunishment(riddleId: string | null) {
  return useQuery({
    queryKey: ["punishment", riddleId],
    enabled: !!riddleId,
    queryFn: async (): Promise<Punishment | null> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("punishments")
        .select("*")
        .eq("riddle_id", riddleId!)
        .maybeSingle();
      return data as Punishment | null;
    },
  });
}

/** All of the current player's answers (RLS scopes to own rows). */
export function useMyAnswers() {
  return useQuery({
    queryKey: ["my-answers"],
    queryFn: async (): Promise<Answer[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("answers")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Answer[];
    },
  });
}

export function useMySubmissions() {
  return useQuery({
    queryKey: ["my-submissions"],
    queryFn: async (): Promise<PunishmentSubmission[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("punishment_submissions")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PunishmentSubmission[];
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

/** Finale content — the RPC returns nothing until the hunt is complete. */
export function useFinale(enabled: boolean) {
  return useQuery({
    queryKey: ["finale"],
    enabled,
    queryFn: async (): Promise<Finale | null> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_finale");
      if (error) throw error;
      const rows = (data ?? []) as Finale[];
      return rows[0] ?? null;
    },
  });
}

// ── Mutations ────────────────────────────────────────────────────────

export function useSubmitAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { riddleId: string; answerText: string }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("answers").insert({
        riddle_id: params.riddleId,
        player_id: user.id,
        answer_text: params.answerText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-answers"] });
      queryClient.invalidateQueries({ queryKey: ["map"] });
    },
  });
}

export function useSubmitProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      punishmentId: string;
      answerId: string;
      proofType: ProofType;
      file?: File | null;
      text?: string;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let proofUrl: string | null = null;
      if (params.file) {
        const ext = params.file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${params.answerId}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("proofs")
          .upload(path, params.file, { upsert: false });
        if (uploadError) throw uploadError;
        proofUrl = path;
      }

      const { error } = await supabase.from("punishment_submissions").insert({
        punishment_id: params.punishmentId,
        answer_id: params.answerId,
        player_id: user.id,
        proof_type: params.proofType,
        proof_url: proofUrl,
        proof_text: params.text ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["map"] });
    },
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** Signed URL for a private proof file. */
export async function getProofUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("proofs")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
