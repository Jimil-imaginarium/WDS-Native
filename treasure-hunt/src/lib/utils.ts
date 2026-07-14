import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(date: string | Date) {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function relativeTime(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** Guess a MediaType from a File's MIME type. */
export function mediaTypeFromMime(mime: string) {
  if (mime === "image/gif") return "gif" as const;
  if (mime.startsWith("image/")) return "image" as const;
  if (mime.startsWith("video/")) return "video" as const;
  if (mime.startsWith("audio/")) return "audio" as const;
  if (mime === "application/pdf") return "pdf" as const;
  return "other" as const;
}

/** Sanitize a filename for storage paths. */
export function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const stamp = Date.now().toString(36);
  return ext ? `${base || "file"}-${stamp}.${ext}` : `${base || "file"}-${stamp}`;
}
