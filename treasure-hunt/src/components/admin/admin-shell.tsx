"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LayoutDashboard, LogOut, Map, Settings, Scroll } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/game/notification-bell";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/riddles", label: "Days & Riddles", icon: Scroll },
  { href: "/admin/settings", label: "Settings & Finale", icon: Settings },
];

export function AdminShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  useRealtimeSync(profile.id);
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/70 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 font-display text-lg"
            >
              <Compass className="h-5 w-5 text-amber-300" />
              <span className="text-treasure hidden sm:inline">
                Treasure Keeper
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" title="View as player">
              <Link href="/hunt">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Player view</span>
              </Link>
            </Button>
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

      <main className="container py-8">{children}</main>
    </div>
  );
}
