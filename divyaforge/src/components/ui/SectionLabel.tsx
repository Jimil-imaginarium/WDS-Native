interface SectionLabelProps {
  en: string;
  hi?: string;
  hint?: string;
}

export function SectionLabel({ en, hi, hint }: SectionLabelProps) {
  return (
    <div className="mb-2 mt-5 first:mt-0">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-stone-700">
        {en}
        {hi && <span className="ml-1.5 font-normal normal-case text-stone-400">{hi}</span>}
      </h3>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
