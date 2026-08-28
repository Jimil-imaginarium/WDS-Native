import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { HuntNav } from "./hunt-nav";
import { PlayerRealtime } from "./player-realtime";

export default async function HuntLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // The admin has their own kingdom.
  if (profile?.role === "admin") redirect("/admin");

  const { data: treasureUnlocked } = await supabase.rpc("player_completed_all", {
    _player: user.id,
  });

  return (
    <div className="min-h-screen">
      <PlayerRealtime />
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link href="/hunt" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-luxe">
              <Heart className="h-4 w-4 fill-white text-white" />
            </span>
            <span className="hidden font-serif text-xl sm:block">
              Treasure <span className="italic text-gradient-rose">Hunt</span>
            </span>
          </Link>

          <HuntNav treasureUnlocked={!!treasureUnlocked} />

          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <ThemeToggle />
            <FullscreenToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="container pb-24 pt-8 sm:pt-12">{children}</main>
    </div>
  );
}
