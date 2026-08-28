import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { PlayerShell } from "@/components/game/player-shell";

export const dynamic = "force-dynamic";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let profile = null;
  try {
    profile = await getProfile();
  } catch {
    redirect("/login");
  }
  if (!profile) redirect("/login");

  return <PlayerShell profile={profile}>{children}</PlayerShell>;
}
