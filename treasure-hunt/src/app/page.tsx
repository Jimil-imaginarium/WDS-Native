import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Root: route each visitor to their world. */
export default async function Home() {
  let profile = null;
  try {
    profile = await getProfile();
  } catch {
    // Supabase not configured yet — send to login which explains setup.
  }

  if (!profile) redirect("/login");
  redirect(profile.role === "admin" ? "/admin" : "/hunt");
}
