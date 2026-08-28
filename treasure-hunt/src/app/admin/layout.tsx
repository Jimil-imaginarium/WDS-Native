import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { AdminNav } from "./admin-nav";
import { AdminRealtime } from "./admin-realtime";

export default async function AdminLayout({
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
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/hunt");

  return (
    <div className="min-h-screen">
      <AdminRealtime />
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 shadow-luxe">
              <Crown className="h-4 w-4 text-white" />
            </span>
            <span className="hidden font-serif text-xl sm:block">
              Keeper&apos;s <span className="italic text-gradient-rose">Court</span>
            </span>
          </Link>

          <AdminNav />

          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="container pb-24 pt-8">{children}</main>
    </div>
  );
}
