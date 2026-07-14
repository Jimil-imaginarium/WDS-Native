"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/server/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Sign out"
        className="glass flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition hover:shadow-luxe"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </form>
  );
}
