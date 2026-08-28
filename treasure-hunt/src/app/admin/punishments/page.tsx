import { createClient } from "@/lib/supabase/server";
import { signedUrl, signedUrlMap, storageKey } from "@/lib/storage";
import {
  PunishmentsBoard,
  type AdminProofView,
  type AdminPunishmentView,
} from "./punishments-board";

export const metadata = { title: "Forfeits" };

export default async function PunishmentsPage() {
  const supabase = await createClient();

  const [{ data: punishments }, { data: proofs }, { data: riddles }, { data: media }] =
    await Promise.all([
      supabase
        .from("punishments")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("punishment_proofs")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("riddles").select("id, title, riddle_number"),
      supabase
        .from("media")
        .select("*")
        .eq("context", "punishment")
        .order("position"),
    ]);

  const riddleMap = new Map((riddles ?? []).map((r) => [r.id, r]));

  const mediaUrls = await signedUrlMap(
    supabase,
    (media ?? []).map((m) => ({ bucket: m.bucket, path: m.path })),
  );

  const proofViews = await Promise.all(
    (proofs ?? []).map(async (p): Promise<AdminProofView> => {
      return {
        id: p.id,
        punishmentId: p.punishment_id,
        proofType: p.proof_type,
        contentText: p.content_text,
        mediaUrl: await signedUrl(supabase, p.media_bucket, p.media_path),
        status: p.status,
        adminFeedback: p.admin_feedback,
        createdAt: p.created_at,
      };
    }),
  );

  const views: AdminPunishmentView[] = (punishments ?? []).map((p) => {
    const riddle = riddleMap.get(p.riddle_id);
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      createdAt: p.created_at,
      riddleTitle: riddle?.title ?? "Unknown riddle",
      riddleNumber: riddle?.riddle_number ?? 0,
      media: (media ?? [])
        .filter((m) => m.ref_id === p.id)
        .map((m) => ({
          id: m.id,
          url: mediaUrls.get(storageKey(m.bucket, m.path)) ?? "",
          mediaType: m.media_type,
          caption: m.caption,
        }))
        .filter((m) => m.url),
      proofs: proofViews.filter((pr) => pr.punishmentId === p.id),
    };
  });

  return <PunishmentsBoard punishments={views} />;
}
