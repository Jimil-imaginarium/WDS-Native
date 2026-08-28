import Link from "next/link";
import { Map } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Map className="h-12 w-12 text-rose-400" />
      <div>
        <h1 className="font-serif text-3xl">Off the treasure map</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          This page isn&apos;t part of our story. Let&apos;s get you back on
          the trail.
        </p>
      </div>
      <Link
        href="/"
        className={buttonVariants({ variant: "default", size: "default" })}
      >
        Return home
      </Link>
    </div>
  );
}
