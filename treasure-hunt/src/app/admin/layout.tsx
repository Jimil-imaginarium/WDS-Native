import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
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
  if (profile.role !== "admin") redirect("/hunt");

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
