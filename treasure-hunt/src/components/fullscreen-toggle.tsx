"use client";

import { Maximize, Minimize } from "lucide-react";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { cn } from "@/lib/utils";

export function FullscreenToggle({ className }: { className?: string }) {
  const { isFullscreen, toggle } = useFullscreen();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      className={cn(
        "glass hidden h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition hover:shadow-luxe sm:flex",
        className,
      )}
    >
      {isFullscreen ? (
        <Minimize className="h-4 w-4" />
      ) : (
        <Maximize className="h-4 w-4" />
      )}
    </button>
  );
}
