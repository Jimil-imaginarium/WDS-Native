"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  GalleryHorizontalEnd,
  HeartHandshake,
  Home,
  Mail,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/hunt", label: "Hunt", icon: Home, exact: true },
  { href: "/hunt/timeline", label: "Our Story", icon: HeartHandshake },
  { href: "/hunt/memories", label: "Memories", icon: GalleryHorizontalEnd },
  { href: "/hunt/notes", label: "Notes", icon: Mail },
  { href: "/hunt/achievements", label: "Badges", icon: Award },
];

export function HuntNav({ treasureUnlocked }: { treasureUnlocked: boolean }) {
  const pathname = usePathname();

  const all = treasureUnlocked
    ? [...links, { href: "/hunt/treasure", label: "Treasure", icon: Sparkles }]
    : links;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/85 backdrop-blur-xl md:static md:border-0 md:bg-transparent md:backdrop-blur-none">
      <ul className="flex items-center justify-around gap-1 px-2 py-2 md:justify-center md:gap-1.5 md:p-0">
        {all.map(({ href, label, icon: Icon, ...rest }) => {
          const active =
            "exact" in rest && rest.exact
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[11px] font-medium transition-all md:flex-row md:gap-2 md:rounded-full md:px-4 md:py-2 md:text-sm",
                  active
                    ? "bg-primary/12 text-primary md:bg-primary/15"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 md:h-4 md:w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
