"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Music4, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  uploadMedia,
  useAdminData,
  useSaveFinale,
  useSaveSettings,
} from "@/hooks/use-admin-data";

export default function SettingsAdminPage() {
  const { data, isLoading } = useAdminData();
  const saveSettings = useSaveSettings();
  const saveFinale = useSaveFinale();

  // game settings
  const [gameTitle, setGameTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [musicUrl, setMusicUrl] = useState<string | null>(null);

  // finale
  const [treasureTitle, setTreasureTitle] = useState("");
  const [treasureMessage, setTreasureMessage] = useState("");
  const [loveLetter, setLoveLetter] = useState("");
  const [treasureImageUrl, setTreasureImageUrl] = useState<string | null>(null);
  const [finaleMusicUrl, setFinaleMusicUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!data || hydrated) return;
    setGameTitle(data.settings?.game_title ?? "The Treasure Hunt ❤️");
    setWelcomeMessage(data.settings?.welcome_message ?? "");
    setMusicUrl(data.settings?.music_url ?? null);
    setTreasureTitle(data.finale?.treasure_title ?? "The Final Treasure");
    setTreasureMessage(data.finale?.treasure_message ?? "");
    setLoveLetter(data.finale?.love_letter ?? "");
    setTreasureImageUrl(data.finale?.treasure_image_url ?? null);
    setFinaleMusicUrl(data.finale?.music_url ?? null);
    setHydrated(true);
  }, [data, hydrated]);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const upload = async (
    file: File | undefined,
    folder: string,
    setter: (url: string) => void,
    kind: string
  ) => {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadMedia(file, folder);
      setter(url);
      toast("📦 Uploaded! Don't forget to save.");
    } catch (e) {
      toast.error("Upload failed", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setUploading(null);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings.mutateAsync({
        game_title: gameTitle.trim() || "The Treasure Hunt ❤️",
        welcome_message: welcomeMessage.trim(),
        music_url: musicUrl,
      });
      toast("💾 Game settings saved");
    } catch (e) {
      toast.error("Couldn't save settings", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleSaveFinale = async () => {
    try {
      await saveFinale.mutateAsync({
        treasure_title: treasureTitle.trim() || "The Final Treasure",
        treasure_message: treasureMessage.trim(),
        love_letter: loveLetter,
        treasure_image_url: treasureImageUrl,
        music_url: finaleMusicUrl,
      });
      toast("💝 Finale saved — she'll see it after riddle 12");
    } catch (e) {
      toast.error("Couldn't save the finale", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl text-treasure">
          Settings & Finale
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The game's voice, its music, and the secret ending — configure it
          all here.
        </p>
      </div>

      {/* Game settings */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">🎮 Game settings</CardTitle>
          <CardDescription>Visible to her from day one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="game-title">Game title</Label>
            <Input
              id="game-title"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcome">Welcome message</Label>
            <Textarea
              id="welcome"
              rows={2}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Background music (mp3)</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading === "music"}
                onClick={() => document.getElementById("music-input")?.click()}
              >
                {uploading === "music" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Music4 className="h-4 w-4" />
                )}
                {musicUrl ? "Replace track" : "Upload track"}
              </Button>
              {musicUrl && (
                <>
                  <audio src={musicUrl} controls className="h-9 max-w-56" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMusicUrl(null)}
                  >
                    Remove
                  </Button>
                </>
              )}
              <input
                id="music-input"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) =>
                  upload(e.target.files?.[0], "music", setMusicUrl, "music")
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              No track? The app plays a built-in dreamy music-box loop instead.
            </p>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save settings
          </Button>
        </CardContent>
      </Card>

      {/* Finale */}
      <Card className="border-amber-300/30">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            🏆 The Final Treasure
          </CardTitle>
          <CardDescription>
            Kept secret by the database itself until all 12 riddles are
            approved. Then: chest, fireworks, love letter, reveal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="treasure-title">Treasure title</Label>
            <Input
              id="treasure-title"
              value={treasureTitle}
              onChange={(e) => setTreasureTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="treasure-message">The reveal message</Label>
            <Textarea
              id="treasure-message"
              rows={3}
              placeholder="You found it. The treasure was never gold…"
              value={treasureMessage}
              onChange={(e) => setTreasureMessage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="love-letter">💌 Love letter</Label>
            <Textarea
              id="love-letter"
              rows={8}
              placeholder={"My love,\n\nIf you are reading this…"}
              value={loveLetter}
              onChange={(e) => setLoveLetter(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Treasure image</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading === "treasure-image"}
                  onClick={() =>
                    document.getElementById("treasure-image-input")?.click()
                  }
                >
                  {uploading === "treasure-image" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {treasureImageUrl ? "Replace" : "Upload"}
                </Button>
                {treasureImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={treasureImageUrl}
                    alt="Treasure"
                    className="h-12 w-12 rounded-lg border border-border/60 object-cover"
                  />
                )}
              </div>
              <input
                id="treasure-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  upload(
                    e.target.files?.[0],
                    "finale",
                    setTreasureImageUrl,
                    "treasure-image"
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Finale music</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading === "finale-music"}
                  onClick={() =>
                    document.getElementById("finale-music-input")?.click()
                  }
                >
                  {uploading === "finale-music" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Music4 className="h-4 w-4" />
                  )}
                  {finaleMusicUrl ? "Replace" : "Upload"}
                </Button>
                {finaleMusicUrl && (
                  <audio src={finaleMusicUrl} controls className="h-9 max-w-44" />
                )}
              </div>
              <input
                id="finale-music-input"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) =>
                  upload(
                    e.target.files?.[0],
                    "finale",
                    setFinaleMusicUrl,
                    "finale-music"
                  )
                }
              />
            </div>
          </div>

          <Button
            variant="gold"
            onClick={handleSaveFinale}
            disabled={saveFinale.isPending}
          >
            {saveFinale.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save the finale
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
