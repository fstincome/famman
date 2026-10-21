import { ALL_SUBCATEGORIES } from "./budgetConfig";

export interface EnvelopeLike { subcategory: string; allocated_amount: number; spent_amount: number; }
export interface AllocationLine { subcategory: string; category: string; deficitCovered: number; regular: number; before: number; after: number; }

/** Splits an amount by sub-category percentages using largest remainder (sum is exact). */
export function splitByPercentages(amount: number): Record<string, number> {
  const total = ALL_SUBCATEGORIES.reduce((s, x) => s + x.percentage, 0);
  const raw = ALL_SUBCATEGORIES.map(s => ({ sub: s.subcategory, v: (amount * s.percentage) / total }));
  const out: Record<string, number> = {};
  let used = 0;
  raw.forEach(r => { out[r.sub] = Math.floor(r.v); used += out[r.sub]; });
  let rest = Math.round(amount) - used;
  [...raw].sort((a, b) => (b.v % 1) - (a.v % 1)).forEach(r => { if (rest > 0) { out[r.sub]++; rest--; } });
  return out;
}

/** If coverDeficits: first fills negative envelopes (largest deficit first), then splits the remainder. */
export function computeIncomeAllocation(amount: number, envelopes: EnvelopeLike[], coverDeficits: boolean): AllocationLine[] {
  const deficit: Record<string, number> = {};
  let remaining = Math.round(amount);
  if (coverDeficits) {
    const neg = envelopes
      .map(e => ({ sub: e.subcategory, d: Math.max(0, e.spent_amount - e.allocated_amount) }))
      .filter(x => x.d > 0)
      .sort((a, b) => b.d - a.d);
    for (const n of neg) {
      if (remaining <= 0) break;
      const take = Math.min(n.d, remaining);
      deficit[n.sub] = take;
      remaining -= take;
    }
  }
  const regular = splitByPercentages(remaining);
  return ALL_SUBCATEGORIES.map(s => {
    const env = envelopes.find(e => e.subcategory === s.subcategory);
    const before = env ? env.allocated_amount - env.spent_amount : 0;
    const dc = deficit[s.subcategory] || 0;
    const rg = regular[s.subcategory] || 0;
    return { subcategory: s.subcategory, category: s.category, deficitCovered: dc, regular: rg, before, after: before + dc + rg };
  });
}
