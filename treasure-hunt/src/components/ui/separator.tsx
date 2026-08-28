import { cn } from "@/lib/utils";

export function Separator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn("h-px w-full bg-border/70", className)}
      {...props}
    />
  );
}

/** A romantic divider: line — heart — line. */
export function HeartDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-rose-300/60" />
      <span className="text-rose-400/80 text-sm">❦</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-rose-300/60" />
    </div>
  );
}
