import type { ReactNode } from "react";

export function Panel({ index, title, children }: { index?: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-8">
      <div className="flex items-baseline gap-3">
        {index && <span className="font-mono text-xs text-high">{index}</span>}
        <h2 className="font-display text-xl text-ink">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
