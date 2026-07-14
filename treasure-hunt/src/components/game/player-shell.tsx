"use client";

import Link from "next/link";
import { LogOut, Map, Shield } from "lucide-react";
import { FloatingHearts } from "@/components/effects/floating-hearts";
import { Sparkles } from "@/components/effects/sparkles";
import { MusicToggle } from "@/components/game/music-toggle";
import { NotificationBell } from "@/components/game/notification-bell";
import { Button } from "@/components/ui/button";
import { useRealtimeSync } from "@/hooks/use-realtime";
import type { Profile } from "@/lib/types";

/** Shared chrome for every player page: ambient magic + top bar. */
export function PlayerShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  useRealtimeSync(profile.id);

  return (
    <div className="relative min-h-dvh">
      <Sparkles count={36} />
      <FloatingHearts count={10} />

      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/60 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/hunt"
            className="flex items-center gap-2 font-display text-lg text-romantic"
          >
            <Map className="h-5 w-5 text-pink-300" />
            <span className="hidden sm:inline">The Treasure Hunt</span>
            <span className="sm:hidden">❤️</span>
          </Link>

          <div className="flex items-center gap-2">
            {profile.role === "admin" && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin">
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              </Button>
            )}
            <MusicToggle />
            <NotificationBell />
            <form action="/auth/signout" method="post">
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                title="Sign out"
                className="rounded-full"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container relative z-10 py-8">{children}</main>
    </div>
  );
}
