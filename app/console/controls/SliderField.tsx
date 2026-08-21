"use client";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

export function SliderField({ label, value, min, max, step, onChange, format }: Props) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-dim">{label}</span>
        <span className="font-mono tabular text-ink">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-high"
      />
    </label>
  );
}
