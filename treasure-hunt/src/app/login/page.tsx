import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { FloatingHearts } from "@/components/floating-hearts";

export const metadata: Metadata = { title: "Welcome" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <FloatingHearts count={10} className="opacity-40" />
      <LoginForm />
    </main>
  );
}
