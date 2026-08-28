import { createClient } from "@/lib/supabase/server";
import { DaysManager } from "./days-manager";

export const metadata = { title: "Days & Riddles" };

export default async function DaysPage() {
  const supabase = await createClient();

  const [{ data: days }, { data: riddles }] = await Promise.all([
    supabase.from("days").select("*").order("day_number"),
    supabase
      .from("riddles")
      .select("*")
      .order("riddle_number"),
  ]);

  return <DaysManager days={days ?? []} riddles={riddles ?? []} />;
}
