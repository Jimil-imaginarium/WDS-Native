"use client";

import { useEffect } from "react";
import { HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <HeartCrack className="h-12 w-12 text-rose-400" />
      <div>
        <h1 className="font-serif text-3xl">A small heartbreak…</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Something went wrong loading this page. Don&apos;t worry — the
          treasure is safe.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
