"use client";

import confetti from "canvas-confetti";

/** Quick celebratory burst — used when an answer is approved. */
export function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 75,
    origin: { y: 0.65 },
    colors: ["#f472b6", "#fbbf24", "#fb7185", "#fde68a", "#ffffff"],
  });
}

/** Heart-shaped confetti drizzle. */
export function fireHearts() {
  const heart = confetti.shapeFromText({ text: "❤️", scalar: 2 });
  confetti({
    particleCount: 30,
    spread: 90,
    scalar: 2,
    shapes: [heart],
    origin: { y: 0.6 },
  });
}

/**
 * Full fireworks show for the finale — repeated bursts from random
 * positions for `durationMs`. Returns a stop function.
 */
export function startFireworks(durationMs = 8000): () => void {
  const end = Date.now() + durationMs;
  let raf = 0;
  let stopped = false;

  const colors = ["#f472b6", "#fbbf24", "#a78bfa", "#fb7185", "#ffffff", "#fde68a"];

  const frame = () => {
    if (stopped || Date.now() > end) return;
    confetti({
      particleCount: 40,
      startVelocity: 32,
      spread: 360,
      ticks: 60,
      origin: { x: 0.1 + Math.random() * 0.8, y: Math.random() * 0.5 },
      colors,
    });
    raf = window.setTimeout(frame, 350) as unknown as number;
  };
  frame();

  return () => {
    stopped = true;
    window.clearTimeout(raf);
  };
}
