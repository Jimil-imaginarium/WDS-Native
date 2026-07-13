"use client";

/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

interface OptionCardProps {
  label: string;
  labelHi?: string;
  selected: boolean;
  onSelect: () => void;
  thumbnailUrl?: string;
  /** Rule reason when the option is blocked by the sacred-rules engine. */
  disabledReason?: string;
  children?: ReactNode;
}

export function OptionCard({
  label, labelHi, selected, onSelect, thumbnailUrl, disabledReason, children,
}: OptionCardProps) {
  const disabled = Boolean(disabledReason);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabledReason}
      className={[
        "relative flex w-full flex-col items-stretch rounded-xl border p-2 text-left transition",
        selected
          ? "border-saffron-500 bg-saffron-50 ring-2 ring-saffron-400"
          : "border-stone-200 bg-white hover:border-saffron-300",
        disabled ? "cursor-not-allowed opacity-45" : "",
      ].join(" ")}
    >
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt=""
          className="mx-auto h-12 w-12"
          loading="lazy"
        />
      )}
      {children}
      <span className="mt-1 text-xs font-medium leading-tight text-stone-800">
        {label}
      </span>
      {labelHi && (
        <span className="text-[10px] leading-tight text-stone-500">{labelHi}</span>
      )}
      {disabled && (
        <span className="mt-1 text-[10px] leading-tight text-maroon-700">
          {disabledReason}
        </span>
      )}
    </button>
  );
}
