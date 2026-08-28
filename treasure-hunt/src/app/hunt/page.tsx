import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlayerDashboard } from "./dashboard";

export default async function HuntPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: board }, { data: profile }, { data: badges }] =
    await Promise.all([
      supabase.rpc("get_player_board"),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("player_achievements")
        .select("achievement_code")
        .eq("player_id", user.id),
    ]);

  return (
    <PlayerDashboard
      board={board ?? []}
      displayName={profile?.display_name ?? "My Love"}
      welcomeMessage={profile?.welcome_message}
      badgeCount={badges?.length ?? 0}
    />
  );
}
