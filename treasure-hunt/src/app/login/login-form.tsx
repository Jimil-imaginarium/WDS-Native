"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { Heart, KeyRound, Loader2, Mail } from "lucide-react";
import { signIn, type ActionResult } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    signIn,
    null,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="glass luxe-ring relative z-10 w-full max-w-md rounded-4xl p-8 sm:p-12"
    >
      <div className="mb-10 text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-luxe"
        >
          <Heart className="h-7 w-7 fill-white text-white" />
        </motion.div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          A story written for you
        </p>
        <h1 className="mt-3 font-serif text-5xl">
          Treasure <span className="text-gradient-rose italic">Hunt</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Twelve riddles. Four days. One treasure.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@ourstory.love"
              required
              className="pl-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your secret key"
              required
              className="pl-11"
            />
          </div>
        </div>

        {state?.error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
          >
            {state.error}
          </motion.p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Unlocking…
            </>
          ) : (
            "Begin the hunt"
          )}
        </Button>
      </form>

      <p className="mt-8 text-center font-serif text-sm italic text-muted-foreground">
        “X marks the heart.”
      </p>
    </motion.div>
  );
}
