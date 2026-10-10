// The ligands used in the simulation, built from the real celecoxib coordinates in data/docking/cox2.json.
// Celecoxib is the reference. Compounds A, B and C are MOCK variations of it (no docking was run).
import { sub, add, scale, unit, dist, cross, contacts } from './geom.js';

export const ligandAtoms = data => data.structure.ligand.atoms.map(a => ({ el: a[0], p: [a[1], a[2], a[3]] }));
export const ligandPoints = data => data.structure.ligand.atoms.map(a => [a[1], a[2], a[3]]);

/** { atoms: [{el,p}], bonds: [[i,j]] } for 'ref' (celecoxib), 'A' (a larger compound), 'B' (an analogue) or 'C' (a small fragment). */
export function compound(data, id) {
  const st = data.structure, G = data.ligandGroups;
  let atoms = ligandAtoms(data).map(a => ({ ...a })), bonds = st.ligand.bonds.map(b => [...b]);
  if (id === 'B') atoms[G.methyl].el = 'CL'; // tolyl methyl replaced by chlorine
  if (id === 'C') {
    const keep = G.fragment, map = new Map(keep.map((k, i) => [k, i]));
    atoms = keep.map(k => atoms[k]); bonds = bonds.filter(([i, j]) => map.has(i) && map.has(j)).map(([i, j]) => [map.get(i), map.get(j)]);
  }
  if (id === 'A') { // no sulfonamide; instead an arm that reaches out to Arg120 at the channel entrance, then continues out of the pocket
    const drop = new Set([0, 23, 24, 25]), keep = atoms.map((_, i) => i).filter(i => !drop.has(i)), map = new Map(keep.map((k, i) => [k, i]));
    atoms = keep.map(k => atoms[k]); bonds = bonds.filter(([i, j]) => map.has(i) && map.has(j)).map(([i, j]) => [map.get(i), map.get(j)]);
    const arg = st.pocket.find(r => r.label === 'ARG120'); let best = null;
    for (const a of arg?.atoms ?? []) if (a[0] === 'N') atoms.forEach((l, i) => { if (l.el === 'C') { const d = dist(l.p, [a[1], a[2], a[3]]); if (!best || d < best.d) best = { d, i, n: [a[1], a[2], a[3]] }; } });
    if (best) {
      const S = atoms[best.i].p, T = add(best.n, scale(unit(sub(S, best.n)), 2.9)), u = unit(sub(T, S));
      let side = unit(cross(u, [0.3, 0.9, 0.3])); let prev = best.i;
      const push = (el, p) => { atoms.push({ el, p }); bonds.push([prev, atoms.length - 1]); prev = atoms.length - 1; };
      const gap = dist(S, T), K = Math.max(1, Math.round(gap / 1.5) - 1);
      for (let k = 1; k <= K; k++) push('C', add(S, scale(sub(T, S), k / (K + 1))));
      push('O', T);
      for (let k = 1; k <= 9; k++) push(k === 9 ? 'N' : 'C', add(add(T, scale(u, 1.4 * k)), scale(side, k % 2 ? 0.5 : -0.5)));
    }
  }
  return { atoms, bonds };
}

/** The four compounds with computed contacts: hydrogen-bond residues, hydrophobic residues, heavy atoms. */
export function analyseLigands(data) {
  return data.analyse.ligands.map(l => {
    const { atoms, bonds } = compound(data, l.id), c = contacts(atoms, data.structure.pocket);
    return { ...l, atoms, bonds, ha: atoms.length, hbonds: [...new Set(c.hbonds.map(h => h.res))], hbondList: c.hbonds, hydrophobic: c.hydrophobic };
  });
}
export const le = l => -l.score / l.ha;
