"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mediaTypeFromMime, safeFileName } from "@/lib/utils";
import type { MediaType } from "@/lib/database.types";

export interface UploadResult {
  bucket: string;
  path: string;
  mediaType: MediaType;
}

/**
 * Uploads a file straight from the browser to Supabase Storage
 * (so large videos never pass through the Next.js server), returning
 * the storage path to record via a Server Action.
 */
export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  const upload = async (
    file: File,
    bucket: "media" | "proofs",
    folder: string,
  ): Promise<UploadResult> => {
    setUploading(true);
    setProgressLabel(`Uploading ${file.name}…`);
    try {
      const supabase = createClient();
      const path = `${folder}/${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) throw new Error(error.message);
      return { bucket, path, mediaType: mediaTypeFromMime(file.type) };
    } finally {
      setUploading(false);
      setProgressLabel(null);
    }
  };

  return { upload, uploading, progressLabel };
}
