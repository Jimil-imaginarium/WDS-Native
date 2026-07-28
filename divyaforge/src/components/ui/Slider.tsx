"use client";

interface SliderProps {
  label: string;
  labelHi?: string;
  value: number; // 0..1
  onChange: (value: number) => void;
  minLabel?: string;
  maxLabel?: string;
}

export function Slider({ label, labelHi, value, onChange, minLabel, maxLabel }: SliderProps) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-stone-800">
          {label}
          {labelHi && <span className="ml-1.5 text-xs text-stone-500">{labelHi}</span>}
        </span>
        <span className="text-xs tabular-nums text-stone-400">
          {Math.round(value * 100)}
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-saffron-500"
      />
      {(minLabel || maxLabel) && (
        <span className="flex justify-between text-[10px] text-stone-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </span>
      )}
    </label>
  );
}
