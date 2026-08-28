/**
 * Hand-maintained database types mirroring supabase/migrations.
 * Regenerate with `supabase gen types typescript` if you evolve the schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "player";

export type RiddleStatus =
  | "not_started"
  | "answer_pending"
  | "answer_rejected"
  | "punishment_assigned"
  | "proof_submitted"
  | "retry_unlocked"
  | "completed";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type PunishmentStatus =
  | "assigned"
  | "proof_submitted"
  | "proof_rejected"
  | "completed";

export type ProofStatus = "pending" | "approved" | "rejected";
export type ProofType = "text" | "image" | "video";

export type MediaType = "image" | "video" | "audio" | "gif" | "pdf" | "other";

export type MediaContext =
  | "riddle"
  | "riddle_music"
  | "punishment"
  | "proof"
  | "treasure_gallery"
  | "treasure_music"
  | "memory"
  | "timeline"
  | "misc";

export type NotificationType =
  | "riddle_unlocked"
  | "answer_submitted"
  | "answer_approved"
  | "answer_rejected"
  | "punishment_assigned"
  | "proof_uploaded"
  | "punishment_approved"
  | "punishment_rejected"
  | "treasure_found"
  | "achievement_unlocked"
  | "note_received";

// ── Row types ─────────────────────────────────────────────────────

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string;
  avatar_url: string | null;
  welcome_message: string | null;
  created_at: string;
}

export type Day = {
  id: string;
  day_number: number;
  title: string;
  subtitle: string | null;
  date: string;
  created_at: string;
}

export type Riddle = {
  id: string;
  day_id: string;
  riddle_number: number;
  title: string;
  story: string;
  question: string;
  hint: string | null;
  correct_answer: string;
  location_hint: string | null;
  special_notes: string | null;
  unlock_at: string;
  background_music_path: string | null;
  created_at: string;
  updated_at: string;
}

export type MediaRow = {
  id: string;
  context: MediaContext;
  riddle_id: string | null;
  ref_id: string | null;
  bucket: string;
  path: string;
  media_type: MediaType;
  caption: string | null;
  position: number;
  uploaded_by: string | null;
  created_at: string;
}

export type PlayerProgress = {
  id: string;
  player_id: string;
  riddle_id: string;
  status: RiddleStatus;
  attempts: number;
  completed_at: string | null;
  updated_at: string;
}

export type AnswerSubmission = {
  id: string;
  riddle_id: string;
  player_id: string;
  answer_text: string;
  status: SubmissionStatus;
  admin_feedback: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type Punishment = {
  id: string;
  submission_id: string;
  riddle_id: string;
  player_id: string;
  title: string;
  description: string;
  status: PunishmentStatus;
  admin_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export type PunishmentProof = {
  id: string;
  punishment_id: string;
  player_id: string;
  proof_type: ProofType;
  content_text: string | null;
  media_bucket: string | null;
  media_path: string | null;
  status: ProofStatus;
  admin_feedback: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type NotificationRow = {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type ActivityLog = {
  id: string;
  actor_id: string | null;
  action: string;
  detail: Json;
  created_at: string;
}

export type TimelineEvent = {
  id: string;
  event_date: string;
  title: string;
  description: string | null;
  image_path: string | null;
  position: number;
  created_at: string;
}

export type Memory = {
  id: string;
  title: string | null;
  caption: string | null;
  bucket: string;
  path: string;
  media_type: MediaType;
  taken_on: string | null;
  position: number;
  created_at: string;
}

export type SecretNote = {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  unlock_riddle_id: string | null;
  created_at: string;
}

export type Achievement = {
  code: string;
  title: string;
  description: string;
  icon: string;
  sort: number;
}

export type PlayerAchievement = {
  id: string;
  player_id: string;
  achievement_code: string;
  unlocked_at: string;
}

export type TreasureSettings = {
  id: boolean;
  title: string;
  message: string;
  letter: string;
  location_reveal: string;
  music_path: string | null;
  updated_at: string;
}

/** Row returned by the get_player_board() RPC. */
export type BoardEntry = {
  riddle_id: string;
  day_id: string;
  day_number: number;
  day_title: string;
  day_subtitle: string | null;
  day_date: string;
  riddle_number: number;
  title: string;
  unlock_at: string;
  status: RiddleStatus;
  completed_at: string | null;
  is_unlocked: boolean;
}

/** Row returned by the get_riddle_content() RPC. */
export type RiddleContent = {
  id: string;
  day_number: number;
  day_title: string;
  riddle_number: number;
  title: string;
  story: string;
  question: string;
  hint: string | null;
  unlock_at: string;
  background_music_path: string | null;
}

// ── supabase-js Database generic ─────────────────────────────────

type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      days: Table<Day>;
      riddles: Table<Riddle>;
      media: Table<MediaRow>;
      player_progress: Table<PlayerProgress>;
      answer_submissions: Table<AnswerSubmission>;
      punishments: Table<Punishment>;
      punishment_proofs: Table<PunishmentProof>;
      notifications: Table<NotificationRow>;
      activity_logs: Table<ActivityLog>;
      timeline_events: Table<TimelineEvent>;
      memories: Table<Memory>;
      secret_notes: Table<SecretNote>;
      achievements: Table<Achievement>;
      player_achievements: Table<PlayerAchievement>;
      treasure_settings: Table<TreasureSettings>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      can_access_riddle: {
        Args: { _riddle: string; _player: string };
        Returns: boolean;
      };
      player_completed_all: {
        Args: { _player: string };
        Returns: boolean;
      };
      get_player_board: {
        Args: Record<string, never>;
        Returns: BoardEntry[];
      };
      get_riddle_content: {
        Args: { _riddle: string };
        Returns: RiddleContent[];
      };
      submit_answer: {
        Args: { _riddle: string; _answer: string };
        Returns: string;
      };
      submit_proof: {
        Args: {
          _punishment: string;
          _type: ProofType;
          _text?: string | null;
          _bucket?: string | null;
          _path?: string | null;
        };
        Returns: string;
      };
      notify_riddle_unlocked: {
        Args: { _riddle: string };
        Returns: undefined;
      };
      mark_notifications_read: {
        Args: { _ids: string[] };
        Returns: undefined;
      };
      review_submission: {
        Args: { _submission: string; _approve: boolean; _feedback?: string | null };
        Returns: undefined;
      };
      assign_punishment: {
        Args: { _submission: string; _title: string; _description: string };
        Returns: string;
      };
      review_proof: {
        Args: { _proof: string; _approve: boolean; _feedback?: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      riddle_status: RiddleStatus;
      submission_status: SubmissionStatus;
      punishment_status: PunishmentStatus;
      proof_status: ProofStatus;
      proof_type: ProofType;
      media_type: MediaType;
      media_context: MediaContext;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
}
