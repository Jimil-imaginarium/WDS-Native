"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Gem,
  Inbox,
  LayoutDashboard,
  Sparkles,
  Theater,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/days", label: "Days & Riddles", icon: CalendarDays },
  { href: "/admin/submissions", label: "Reviews", icon: Inbox },
  { href: "/admin/punishments", label: "Forfeits", icon: Theater },
  { href: "/admin/treasure", label: "Treasure", icon: Gem },
  { href: "/admin/extras", label: "Extras", icon: Sparkles },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/85 backdrop-blur-xl md:static md:border-0 md:bg-transparent md:backdrop-blur-none">
      <ul className="flex items-center justify-around gap-1 px-2 py-2 md:justify-center md:gap-1 md:p-0">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-medium transition-all md:flex-row md:gap-2 md:rounded-full md:px-3.5 md:py-2 md:text-sm",
                  active
                    ? "bg-primary/12 text-primary md:bg-primary/15"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 md:h-4 md:w-4" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
