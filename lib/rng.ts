/**
 * A seeded LCG, carried explicitly.
 *
 * Same corpus generation seed must produce byte-identical output on a laptop
 * and in CI, so `Math.random()` is banned everywhere below `app/`.
 *
 * Numerical Recipes constants; 32-bit state.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Avoid the zero fixed point, and keep the state in uint32.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 0x1_0000_0000;
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Rng.pick: empty array");
    return items[this.int(items.length)] as T;
  }

  /** In-place Fisher–Yates. Returns the same array for convenience. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const a = items[i] as T;
      const b = items[j] as T;
      items[i] = b;
      items[j] = a;
    }
    return items;
  }
}

/**
 * Mixes a base seed with a label so that independent streams (contact
 * generation vs account generation vs a specific pathology pass) never
 * accidentally share one.
 */
export function derive(seed: number, label: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < label.length; i++) {
    h = (Math.imul(h ^ label.charCodeAt(i), 16777619) + 1) >>> 0;
  }
  return h;
}
