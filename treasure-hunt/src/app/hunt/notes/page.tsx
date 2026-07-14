import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotesBoard } from "./notes-board";

export const metadata = { title: "Secret Notes" };

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS reveals riddle-locked notes only after the riddle is completed.
  const { data: notes } = await supabase
    .from("secret_notes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <NotesBoard
      notes={(notes ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        createdAt: n.created_at,
        mine: n.author_id === user.id,
      }))}
    />
  );
}
