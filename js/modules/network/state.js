// Choices carry from step to step (kept in memory for this visit).
import { compoundTargets, diseaseGenes, intersect, buildGraph, hubTable, hubs } from './stats.js';
export const st = { minProb: .1, useA: true, useB: true, gc: 20, dg: .1, conf: .7, hubN: 10, removed: new Set(), enrichTop: [] };
export function sets(data) {
  const ct = compoundTargets(data.targets, st), dz = diseaseGenes(data.disease, st), ov = intersect(ct, dz);
  return { ct, dz, ov };
}
export function hubList(data) { const { ov } = sets(data), g = buildGraph(ov.filter(x => !st.removed.has(x)), data.edges, st.conf); return hubs(hubTable(g), st.hubN); }
