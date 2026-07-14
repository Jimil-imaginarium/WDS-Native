"use client";

import { useEffect, useRef } from "react";
import { Music, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMusicStore } from "@/stores/music-store";
import { useGameSettings } from "@/hooks/use-game-data";

/**
 * Background music toggle. Plays the track uploaded by the admin
 * (game_settings.music_url); if none is set, plays a soft generated
 * music-box loop via WebAudio so the toggle always does something lovely.
 */
export function MusicToggle({ overrideUrl }: { overrideUrl?: string | null }) {
  const { enabled, volume, toggle } = useMusicStore();
  const { data: settings } = useGameSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webAudioStop = useRef<(() => void) | null>(null);

  const url = overrideUrl ?? settings?.music_url ?? null;

  useEffect(() => {
    // cleanup any previous source
    const stopAll = () => {
      audioRef.current?.pause();
      audioRef.current = null;
      webAudioStop.current?.();
      webAudioStop.current = null;
    };

    if (!enabled) {
      stopAll();
      return;
    }

    if (url) {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = volume;
      audio.play().catch(() => {
        /* autoplay blocked until user interacts — toggle click counts */
      });
      audioRef.current = audio;
    } else {
      webAudioStop.current = startMusicBox(volume);
    }

    return stopAll;
  }, [enabled, url, volume]);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      title={enabled ? "Mute music" : "Play music"}
      className="rounded-full"
    >
      {enabled ? (
        <Music className="h-4 w-4 text-pink-300" />
      ) : (
        <VolumeX className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}

/** Gentle generated music-box arpeggio (fallback when no track uploaded). */
function startMusicBox(volume: number): () => void {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return () => {};

  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = volume * 0.5;
  master.connect(ctx.destination);

  // A dreamy progression: Am – F – C – G, arpeggiated.
  const chords = [
    [220.0, 261.63, 329.63], // A minor
    [174.61, 220.0, 261.63], // F major
    [130.81, 164.81, 196.0, 261.63], // C major
    [196.0, 246.94, 293.66], // G major
  ];

  let step = 0;
  let stopped = false;

  const playNote = (freq: number, t: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * 2; // music-box register
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };

  const interval = window.setInterval(() => {
    if (stopped) return;
    const chord = chords[Math.floor(step / 8) % chords.length];
    const note = chord[step % chord.length];
    playNote(note, ctx.currentTime, 1.6);
    if (step % 8 === 0) playNote(chord[0] / 2, ctx.currentTime, 3); // soft bass
    step++;
  }, 400);

  return () => {
    stopped = true;
    window.clearInterval(interval);
    void ctx.close();
  };
}
