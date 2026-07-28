import { Suspense } from "react";
import { BuilderShell } from "@/components/builder/BuilderShell";

export const metadata = { title: "Builder — DivyaForge" };

export default function BuilderPage() {
  return (
    <Suspense fallback={null}>
      <BuilderShell />
    </Suspense>
  );
}
