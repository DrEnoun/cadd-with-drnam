// Pure maths for the virtual screening module (no DOM, testable in Node).
export const DEFAULT_LIMITS = { mw: 500, logp: 5, hbd: 5, hba: 10, rotb: 10, tpsa: 140 };
export const PROPS = [
  { key: 'mw', label: 'Molecular weight', unit: 'Da', max: 700 }, { key: 'logp', label: 'cLogP', unit: '', max: 8 }, { key: 'hbd', label: 'H-bond donors', unit: '', max: 8 },
  { key: 'hba', label: 'H-bond acceptors', unit: '', max: 14 }, { key: 'rotb', label: 'Rotatable bonds', unit: '', max: 14 }, { key: 'tpsa', label: 'Polar surface area (TPSA)', unit: 'Å²', max: 200 },
];
/** Passes when every property is at or below its limit. Lipinski = mw, logp, hbd, hba. Veber = rotb, tpsa. */
export const passes = (c, limits) => Object.entries(limits).every(([k, v]) => v == null || c[k] <= v);
export const failedProps = (c, limits) => Object.entries(limits).filter(([k, v]) => v != null && c[k] > v).map(([k]) => k);
export function filterCounts(lib, limits) {
  const kept = lib.filter(c => passes(c, limits)), act = lib.filter(c => c.active);
  return { total: lib.length, kept: kept.length, actives: act.length, activesKept: kept.filter(c => c.active).length, activesLost: act.filter(c => !passes(c, limits)).map(c => c.name), decoysKept: kept.filter(c => !c.active).length };
}
/** ids ranked best first by a numeric score (higher is better). Ties keep library order. */
export const rankBy = (items, score) => items.map((c, i) => ({ c, i, s: score(c) })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.c);
/** Average of the ranks from several rankings (a simple consensus). Returns a score where higher is better. */
export function consensusScore(items, scores) {
  const rk = scores.map(sc => { const m = new Map(rankBy(items, sc).map((c, i) => [c.id, i + 1])); return m; });
  return c => -rk.reduce((s, m) => s + m.get(c.id), 0) / rk.length;
}
/** ROC points [fpr, tpr] walking down the ranking, and the area under it. */
export function roc(items, score) {
  const r = rankBy(items, score), P = items.filter(c => c.active).length, N = items.length - P; let tp = 0, fp = 0; const pts = [[0, 0]];
  for (const c of r) { c.active ? tp++ : fp++; pts.push([fp / N, tp / P]); }
  let auc = 0; for (let i = 1; i < pts.length; i++) auc += (pts[i][0] - pts[i - 1][0]) * (pts[i][1] + pts[i - 1][1]) / 2;
  return { pts, auc };
}
/** Enrichment factor at a fraction of the ranked list: hit rate in the selection divided by the hit rate of the whole library. */
export function enrichment(items, score, frac) {
  const r = rankBy(items, score), n = Math.max(1, Math.round(items.length * frac)), hits = r.slice(0, n).filter(c => c.active).length, base = items.filter(c => c.active).length / items.length;
  return { n, hits, ef: hits / n / base, recall: hits / items.filter(c => c.active).length };
}
export const topN = (items, score, n) => rankBy(items, score).slice(0, n);
/** Greedy diversity: walk down the ranking, skip compounds more similar than `maxSim` to one already picked. */
export function diversePick(items, score, sim, indexOf, n, maxSim = 0.35) {
  const out = [];
  for (const c of rankBy(items, score)) { if (out.length >= n) break; if (out.every(o => sim[indexOf(c)][indexOf(o)] <= maxSim)) out.push(c); }
  return out;
}
