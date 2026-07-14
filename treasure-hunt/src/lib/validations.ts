import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const answerSchema = z.object({
  riddleId: z.string().uuid(),
  answer: z.string().trim().min(1, "Write your answer first, my love").max(2000),
});

export const proofSchema = z
  .object({
    punishmentId: z.string().uuid(),
    proofType: z.enum(["text", "image", "video"]),
    text: z.string().trim().max(4000).optional(),
    bucket: z.string().optional(),
    path: z.string().optional(),
  })
  .refine(
    (v) => (v.proofType === "text" ? !!v.text && v.text.length > 0 : !!v.path),
    { message: "Add your proof before submitting" },
  );

export const daySchema = z.object({
  id: z.string().uuid().optional(),
  dayNumber: z.coerce.number().int().min(1).max(30),
  title: z.string().trim().min(1, "Give this day a title").max(120),
  subtitle: z.string().trim().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
});

export const riddleSchema = z.object({
  id: z.string().uuid().optional(),
  dayId: z.string().uuid(),
  riddleNumber: z.coerce.number().int().min(1).max(10),
  title: z.string().trim().min(1, "Title is required").max(160),
  story: z.string().trim().max(20000).default(""),
  question: z.string().trim().max(4000).default(""),
  hint: z.string().trim().max(2000).optional(),
  correctAnswer: z.string().trim().max(2000).default(""),
  locationHint: z.string().trim().max(2000).optional(),
  specialNotes: z.string().trim().max(4000).optional(),
  unlockAt: z.string().min(1, "Set an unlock time"),
});

export const reviewSchema = z.object({
  submissionId: z.string().uuid(),
  approve: z.boolean(),
  feedback: z.string().trim().max(2000).optional(),
});

export const punishmentSchema = z.object({
  submissionId: z.string().uuid(),
  title: z.string().trim().min(1, "Name the forfeit").max(160),
  description: z.string().trim().min(1, "Describe the forfeit").max(4000),
});

export const punishmentUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
});

export const proofReviewSchema = z.object({
  proofId: z.string().uuid(),
  approve: z.boolean(),
  feedback: z.string().trim().max(2000).optional(),
});

export const treasureSchema = z.object({
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().max(2000),
  letter: z.string().trim().max(20000),
  locationReveal: z.string().trim().max(2000),
});

export const timelineEventSchema = z.object({
  id: z.string().uuid().optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional(),
  imagePath: z.string().optional(),
});

export const memorySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(160).optional(),
  caption: z.string().trim().max(1000).optional(),
  path: z.string().min(1, "Upload a photo or video"),
  mediaType: z.enum(["image", "video", "audio", "gif", "pdf", "other"]),
  takenOn: z.string().optional(),
});

export const noteSchema = z.object({
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().min(1, "Write something sweet").max(8000),
  unlockRiddleId: z.string().uuid().optional(),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  welcomeMessage: z.string().trim().max(2000).optional(),
});

export const mediaRecordSchema = z.object({
  context: z.enum([
    "riddle",
    "riddle_music",
    "punishment",
    "proof",
    "treasure_gallery",
    "treasure_music",
    "memory",
    "timeline",
    "misc",
  ]),
  riddleId: z.string().uuid().optional(),
  refId: z.string().uuid().optional(),
  bucket: z.string().min(1),
  path: z.string().min(1),
  mediaType: z.enum(["image", "video", "audio", "gif", "pdf", "other"]),
  caption: z.string().trim().max(500).optional(),
});
