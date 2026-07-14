"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { answerSchema, noteSchema, proofSchema } from "@/lib/validations";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

function fail(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

/** Submit an answer — it lands in "Pending admin review". */
export async function submitAnswer(input: {
  riddleId: string;
  answer: string;
}): Promise<ActionResult> {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_answer", {
    _riddle: parsed.data.riddleId,
    _answer: parsed.data.answer,
  });
  if (error) return fail(error.message);

  revalidatePath("/hunt", "layout");
  return { ok: true };
}

/** Submit punishment proof (text, or an already-uploaded image/video). */
export async function submitProof(input: {
  punishmentId: string;
  proofType: "text" | "image" | "video";
  text?: string;
  bucket?: string;
  path?: string;
}): Promise<ActionResult> {
  const parsed = proofSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data: proofId, error } = await supabase.rpc("submit_proof", {
    _punishment: parsed.data.punishmentId,
    _type: parsed.data.proofType,
    _text: parsed.data.text ?? null,
    _bucket: parsed.data.bucket ?? null,
    _path: parsed.data.path ?? null,
  });
  if (error) return fail(error.message);

  // Register the uploaded file in the media library (player-owned proof).
  if (parsed.data.path && parsed.data.bucket) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("media").insert({
      context: "proof",
      ref_id: typeof proofId === "string" ? proofId : undefined,
      bucket: parsed.data.bucket,
      path: parsed.data.path,
      media_type: parsed.data.proofType === "video" ? "video" : "image",
      uploaded_by: user?.id,
    });
  }

  revalidatePath("/hunt", "layout");
  return { ok: true };
}

/** Fired by the countdown at zero — creates the unlock notification. */
export async function notifyRiddleUnlocked(riddleId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(riddleId)) return;
  const supabase = await createClient();
  await supabase.rpc("notify_riddle_unlocked", { _riddle: riddleId });
  revalidatePath("/hunt", "layout");
}

/** Leave a secret note for the other sweetheart. */
export async function createSecretNote(input: {
  title?: string;
  body: string;
  unlockRiddleId?: string;
}): Promise<ActionResult> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Not signed in");

  // A database trigger notifies the other sweetheart automatically.
  const { error } = await supabase.from("secret_notes").insert({
    author_id: user.id,
    title: parsed.data.title || null,
    body: parsed.data.body,
    unlock_riddle_id: parsed.data.unlockRiddleId ?? null,
  });
  if (error) return fail(error.message);

  revalidatePath("/hunt/notes");
  revalidatePath("/admin/extras");
  return { ok: true };
}

export async function deleteSecretNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("secret_notes").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/hunt/notes");
  revalidatePath("/admin/extras");
  return { ok: true };
}
