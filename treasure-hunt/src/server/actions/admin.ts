"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  daySchema,
  mediaRecordSchema,
  memorySchema,
  profileSchema,
  proofReviewSchema,
  punishmentSchema,
  punishmentUpdateSchema,
  reviewSchema,
  riddleSchema,
  timelineEventSchema,
  treasureSchema,
} from "@/lib/validations";
import type { Database } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

function fail(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

type AdminGuard =
  | { ok: true; supabase: SupabaseClient<Database> }
  | { ok: false; error: string };

async function requireAdmin(): Promise<AdminGuard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, error: "Admin only" };

  return { ok: true, supabase };
}

function refreshEverywhere() {
  revalidatePath("/admin", "layout");
  revalidatePath("/hunt", "layout");
}

// ── Days ─────────────────────────────────────────────────────────

export async function upsertDay(input: {
  id?: string;
  dayNumber: number;
  title: string;
  subtitle?: string;
  date: string;
}): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = daySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const row = {
    day_number: parsed.data.dayNumber,
    title: parsed.data.title,
    subtitle: parsed.data.subtitle || null,
    date: parsed.data.date,
  };

  const q = parsed.data.id
    ? guard.supabase.from("days").update(row).eq("id", parsed.data.id).select("id").single()
    : guard.supabase.from("days").insert(row).select("id").single();

  const { data, error } = await q;
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true, data: { id: data.id } };
}

export async function deleteDay(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const { error } = await guard.supabase.from("days").delete().eq("id", id);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

// ── Riddles ──────────────────────────────────────────────────────

export async function upsertRiddle(input: {
  id?: string;
  dayId: string;
  riddleNumber: number;
  title: string;
  story?: string;
  question?: string;
  hint?: string;
  correctAnswer?: string;
  locationHint?: string;
  specialNotes?: string;
  unlockAt: string;
}): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = riddleSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const unlockDate = new Date(parsed.data.unlockAt);
  if (Number.isNaN(unlockDate.getTime())) return fail("Invalid unlock time");

  const row = {
    day_id: parsed.data.dayId,
    riddle_number: parsed.data.riddleNumber,
    title: parsed.data.title,
    story: parsed.data.story ?? "",
    question: parsed.data.question ?? "",
    hint: parsed.data.hint || null,
    correct_answer: parsed.data.correctAnswer ?? "",
    location_hint: parsed.data.locationHint || null,
    special_notes: parsed.data.specialNotes || null,
    unlock_at: unlockDate.toISOString(),
  };

  const q = parsed.data.id
    ? guard.supabase.from("riddles").update(row).eq("id", parsed.data.id).select("id").single()
    : guard.supabase.from("riddles").insert(row).select("id").single();

  const { data, error } = await q;
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true, data: { id: data.id } };
}

export async function deleteRiddle(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const { error } = await guard.supabase.from("riddles").delete().eq("id", id);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

export async function setRiddleMusic(
  riddleId: string,
  path: string | null,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const { error } = await guard.supabase
    .from("riddles")
    .update({ background_music_path: path })
    .eq("id", riddleId);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

// ── Media records ────────────────────────────────────────────────

export async function recordMedia(input: {
  context: Database["public"]["Enums"]["media_context"];
  riddleId?: string;
  refId?: string;
  bucket: string;
  path: string;
  mediaType: Database["public"]["Enums"]["media_type"];
  caption?: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = mediaRecordSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const {
    data: { user },
  } = await guard.supabase.auth.getUser();

  const { error } = await guard.supabase.from("media").insert({
    context: parsed.data.context,
    riddle_id: parsed.data.riddleId ?? null,
    ref_id: parsed.data.refId ?? null,
    bucket: parsed.data.bucket,
    path: parsed.data.path,
    media_type: parsed.data.mediaType,
    caption: parsed.data.caption || null,
    uploaded_by: user?.id,
  });
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);

  const { data: row } = await guard.supabase
    .from("media")
    .select("bucket, path")
    .eq("id", id)
    .single();

  const { error } = await guard.supabase.from("media").delete().eq("id", id);
  if (error) return fail(error.message);

  if (row) {
    await guard.supabase.storage.from(row.bucket).remove([row.path]);
  }
  refreshEverywhere();
  return { ok: true };
}

// ── Reviews (answers) ────────────────────────────────────────────

export async function reviewSubmission(input: {
  submissionId: string;
  approve: boolean;
  feedback?: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { error } = await guard.supabase.rpc("review_submission", {
    _submission: parsed.data.submissionId,
    _approve: parsed.data.approve,
    _feedback: parsed.data.feedback ?? null,
  });
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

// ── Punishments ──────────────────────────────────────────────────

export async function createPunishment(input: {
  submissionId: string;
  title: string;
  description: string;
}): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = punishmentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { data, error } = await guard.supabase.rpc("assign_punishment", {
    _submission: parsed.data.submissionId,
    _title: parsed.data.title,
    _description: parsed.data.description,
  });
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true, data: { id: data as string } };
}

export async function updatePunishment(input: {
  id: string;
  title: string;
  description: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = punishmentUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { error } = await guard.supabase
    .from("punishments")
    .update({ title: parsed.data.title, description: parsed.data.description })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

export async function deletePunishment(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);

  // Reset the player's progress on that riddle back to a retryable state
  // if the punishment being removed was still blocking her.
  const { data: p } = await guard.supabase
    .from("punishments")
    .select("player_id, riddle_id, status")
    .eq("id", id)
    .single();

  const { error } = await guard.supabase.from("punishments").delete().eq("id", id);
  if (error) return fail(error.message);

  if (p && p.status !== "completed") {
    await guard.supabase
      .from("player_progress")
      .update({ status: "retry_unlocked" })
      .eq("player_id", p.player_id)
      .eq("riddle_id", p.riddle_id)
      .neq("status", "completed");
  }

  refreshEverywhere();
  return { ok: true };
}

export async function reviewProof(input: {
  proofId: string;
  approve: boolean;
  feedback?: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = proofReviewSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { error } = await guard.supabase.rpc("review_proof", {
    _proof: parsed.data.proofId,
    _approve: parsed.data.approve,
    _feedback: parsed.data.feedback ?? null,
  });
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

// ── Final treasure ───────────────────────────────────────────────

export async function updateTreasure(input: {
  title: string;
  message: string;
  letter: string;
  locationReveal: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = treasureSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { error } = await guard.supabase
    .from("treasure_settings")
    .update({
      title: parsed.data.title,
      message: parsed.data.message,
      letter: parsed.data.letter,
      location_reveal: parsed.data.locationReveal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

export async function setTreasureMusic(path: string | null): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const { error } = await guard.supabase
    .from("treasure_settings")
    .update({ music_path: path, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

// ── Love timeline ────────────────────────────────────────────────

export async function upsertTimelineEvent(input: {
  id?: string;
  eventDate: string;
  title: string;
  description?: string;
  imagePath?: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = timelineEventSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const row = {
    event_date: parsed.data.eventDate,
    title: parsed.data.title,
    description: parsed.data.description || null,
    image_path: parsed.data.imagePath || null,
  };

  const { error } = parsed.data.id
    ? await guard.supabase.from("timeline_events").update(row).eq("id", parsed.data.id)
    : await guard.supabase.from("timeline_events").insert(row);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

export async function deleteTimelineEvent(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const { error } = await guard.supabase.from("timeline_events").delete().eq("id", id);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

// ── Memory gallery ───────────────────────────────────────────────

export async function upsertMemory(input: {
  id?: string;
  title?: string;
  caption?: string;
  path: string;
  mediaType: Database["public"]["Enums"]["media_type"];
  takenOn?: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = memorySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const row = {
    title: parsed.data.title || null,
    caption: parsed.data.caption || null,
    path: parsed.data.path,
    media_type: parsed.data.mediaType,
    taken_on: parsed.data.takenOn || null,
  };

  const { error } = parsed.data.id
    ? await guard.supabase.from("memories").update(row).eq("id", parsed.data.id)
    : await guard.supabase.from("memories").insert(row);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}

export async function deleteMemory(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);

  const { data: row } = await guard.supabase
    .from("memories")
    .select("bucket, path")
    .eq("id", id)
    .single();

  const { error } = await guard.supabase.from("memories").delete().eq("id", id);
  if (error) return fail(error.message);
  if (row) await guard.supabase.storage.from(row.bucket).remove([row.path]);

  refreshEverywhere();
  return { ok: true };
}

// ── Player profile (personalized welcome) ────────────────────────

export async function updatePlayerProfile(input: {
  playerId: string;
  displayName: string;
  welcomeMessage?: string;
}): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error);
  const parsed = profileSchema.safeParse({
    displayName: input.displayName,
    welcomeMessage: input.welcomeMessage,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { error } = await guard.supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      welcome_message: parsed.data.welcomeMessage || null,
    })
    .eq("id", input.playerId);
  if (error) return fail(error.message);
  refreshEverywhere();
  return { ok: true };
}
