"use client";

interface SwatchProps {
  color: string;
  selected?: boolean;
  onSelect: (color: string) => void;
}

export function Swatch({ color, selected, onSelect }: SwatchProps) {
  return (
    <button
      type="button"
      aria-label={`Colour ${color}`}
      onClick={() => onSelect(color)}
      className={[
        "h-8 w-8 rounded-full border-2 transition",
        selected ? "border-stone-800 scale-110" : "border-white shadow",
      ].join(" ")}
      style={{ backgroundColor: color }}
    />
  );
}
