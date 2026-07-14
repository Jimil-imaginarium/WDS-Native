import { createClient } from "@/lib/supabase/server";
import { SubmissionsBoard, type SubmissionView } from "./submissions-board";

export const metadata = { title: "Reviews" };

export default async function SubmissionsPage() {
  const supabase = await createClient();

  const [{ data: submissions }, { data: riddles }, { data: days }, { data: punishments }] =
    await Promise.all([
      supabase
        .from("answer_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("riddles").select("id, title, riddle_number, day_id, correct_answer"),
      supabase.from("days").select("id, day_number"),
      supabase.from("punishments").select("id, submission_id"),
    ]);

  const dayMap = new Map((days ?? []).map((d) => [d.id, d.day_number]));
  const riddleMap = new Map((riddles ?? []).map((r) => [r.id, r]));
  const punishedSubmissions = new Set((punishments ?? []).map((p) => p.submission_id));

  const views: SubmissionView[] = (submissions ?? []).map((s) => {
    const riddle = riddleMap.get(s.riddle_id);
    return {
      id: s.id,
      answerText: s.answer_text,
      status: s.status,
      adminFeedback: s.admin_feedback,
      createdAt: s.created_at,
      reviewedAt: s.reviewed_at,
      riddleTitle: riddle?.title ?? "Unknown riddle",
      riddleNumber: riddle?.riddle_number ?? 0,
      dayNumber: riddle ? (dayMap.get(riddle.day_id) ?? 0) : 0,
      correctAnswer: riddle?.correct_answer ?? "",
      hasPunishment: punishedSubmissions.has(s.id),
    };
  });

  return <SubmissionsBoard submissions={views} />;
}
