import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AchievementsGrid } from "./achievements-grid";

export const metadata = { title: "Badges" };

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: all }, { data: mine }] = await Promise.all([
    supabase.from("achievements").select("*").order("sort"),
    supabase
      .from("player_achievements")
      .select("achievement_code, unlocked_at")
      .eq("player_id", user.id),
  ]);

  const unlockedMap = new Map(
    (mine ?? []).map((m) => [m.achievement_code, m.unlocked_at]),
  );

  return (
    <AchievementsGrid
      items={(all ?? []).map((a) => ({
        code: a.code,
        title: a.title,
        description: a.description,
        icon: a.icon,
        unlockedAt: unlockedMap.get(a.code) ?? null,
      }))}
    />
  );
}
