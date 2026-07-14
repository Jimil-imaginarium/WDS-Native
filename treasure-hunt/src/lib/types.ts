// Shared domain types mirroring the database schema (supabase/schema.sql).

export type Role = "admin" | "player";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type ProofType = "photo" | "video" | "text" | "audio";
export type ProgressStatus = "in_progress" | "completed";

export interface Profile {
  id: string;
  role: Role;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Day {
  id: string;
  day_number: number;
  title: string;
  story: string;
  island_name: string;
  created_at: string;
  updated_at: string;
}

export interface Riddle {
  id: string;
  day_id: string;
  riddle_number: number;
  title: string;
  story: string;
  question: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnlockSchedule {
  id: string;
  riddle_id: string;
  unlock_at: string;
  created_at: string;
  updated_at: string;
}

export interface Punishment {
  id: string;
  riddle_id: string;
  title: string;
  description: string;
  proof_types: ProofType[];
  created_at: string;
  updated_at: string;
}

export interface Answer {
  id: string;
  riddle_id: string;
  player_id: string;
  answer_text: string;
  status: ReviewStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface PunishmentSubmission {
  id: string;
  punishment_id: string;
  answer_id: string;
  player_id: string;
  proof_type: ProofType;
  proof_url: string | null;
  proof_text: string | null;
  status: ReviewStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface GameProgress {
  id: string;
  player_id: string;
  riddle_id: string;
  status: ProgressStatus;
  attempts: number;
  punishments_served: number;
  started_at: string;
  completed_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface GameSettings {
  id: number;
  game_title: string;
  welcome_message: string;
  music_url: string | null;
  updated_at: string;
}

export interface Finale {
  id: number;
  treasure_title: string;
  treasure_message: string;
  love_letter: string;
  treasure_image_url: string | null;
  music_url: string | null;
  updated_at: string;
}

/** Row returned by the get_map() RPC — safe fields only. */
export interface MapNode {
  riddle_id: string;
  day_id: string;
  day_number: number;
  day_title: string;
  island_name: string;
  riddle_number: number;
  riddle_title: string | null; // null while locked
  unlock_at: string | null;
  unlocked: boolean;
  completed: boolean;
}

/** The player-facing state machine for a single riddle. */
export type RiddleState =
  | "locked"
  | "available"
  | "answer_pending"
  | "punishment_required"
  | "punishment_pending"
  | "completed";

/** Riddle joined with its day/punishment for admin views. */
export interface RiddleWithRelations extends Riddle {
  days?: Day;
  unlock_schedule?: UnlockSchedule[] | UnlockSchedule | null;
  punishments?: Punishment[] | Punishment | null;
}

export interface AnswerWithRiddle extends Answer {
  riddles?: Riddle;
}

export interface SubmissionWithRelations extends PunishmentSubmission {
  punishments?: Punishment;
  answers?: Answer;
}
