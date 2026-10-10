// Pure 3D maths for the docking simulations (no DOM, no three.js), so it can be tested in Node.
// Poses are { R: 3x3 row-major rotation, t: [x,y,z] }. A pose turns the ligand about its own centre, then shifts it by t.
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const dist = (a, b) => len(sub(a, b));
export const unit = a => { const l = len(a) || 1; return scale(a, 1 / l); };
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const apply = (R, v) => [dot(R[0], v), dot(R[1], v), dot(R[2], v)];
export const mul = (A, B) => A.map(row => [0, 1, 2].map(j => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
/** Rotation matrix for an angle (degrees) about an axis (Rodrigues). */
export function rotMat(axis, deg) {
  const [x, y, z] = unit(axis), a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), k = 1 - c;
  return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s], [y * x * k + z * s, c + y * y * k, y * z * k - x * s], [z * x * k - y * s, z * y * k + x * s, c + z * z * k]];
}
export const centroid = pts => scale(pts.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / pts.length);
export const makePose = (axis = [0, 0, 1], deg = 0, t = [0, 0, 0]) => ({ R: rotMat(axis, deg), t });
/** Move ligand positions (array of [x,y,z]) by a pose about the centre c. */
export const place = (pts, pose, c = centroid(pts)) => pts.map(p => add(add(apply(pose.R, sub(p, c)), c), pose.t));
export const rmsd = (a, b) => Math.sqrt(a.reduce((s, p, i) => s + dist(p, b[i]) ** 2, 0) / a.length);

const isPolar = el => el === 'N' || el === 'O';
/** Hydrogen bonds (N/O to N/O within 3.4 Å) and hydrophobic residues (2 or more C-C contacts within 4.2 Å) of a set of ligand atoms [{el,p}]
 *  against structure.pocket residues. */
export function contacts(atoms, pocket, { hb = 3.4, hy = 4.2 } = {}) {
  const hbonds = [], hydrophobic = [];
  for (const r of pocket) {
    let nC = 0;
    r.atoms.forEach(([el, x, y, z, name]) => {
      atoms.forEach((a, i) => {
        const d = dist(a.p, [x, y, z]);
        if (isPolar(el) && isPolar(a.el) && d <= hb) hbonds.push({ res: r.label, atomName: name, atom: i, d, pos: [x, y, z] });
        if (el === 'C' && (a.el === 'C' || a.el === 'F') && d <= hy) nC++;
      });
    });
    if (nC >= 2) hydrophobic.push(r.label);
  }
  return { hbonds, hydrophobic };
}
/** Build the scoring environment from a prepared structure (data/docking/cox2.json) and the crystal ligand atoms. */
export function makeEnv(structure, greaseIdx, prefer = ['HIS90', 'GLN192', 'ARG513', 'LEU352']) {
  const lig = structure.ligand.atoms.map(a => ({ el: a[0], p: [a[1], a[2], a[3]] }));
  const seen = new Set(), pairs = [], all = contacts(lig, structure.pocket).hbonds.sort((a, b) => a.d - b.d);
  for (const r of prefer) { const h = all.find(x => x.res === r); if (h && !seen.has(r)) { seen.add(r); pairs.push(h); } }
  return { hbondPairs: pairs, greaseIdx, greaseCentre: centroid(greaseIdx.map(i => lig[i].p)), near: structure.near.map(n => ({ el: n[0], p: [n[1], n[2], n[3]] })) };
}
/** Toy scoring function used in the "Search and score" step (mock units, kcal/mol). atoms: placed ligand [{el,p}]. */
export function scorePose(atoms, env) {
  let hb = 0; const bonds = [];
  for (const h of env.hbondPairs) { const d = dist(atoms[h.atom].p, h.pos); const e = -0.9 * Math.exp(-(((d - 2.9) / 1.0) ** 2)); hb += e; bonds.push({ res: h.res, atom: h.atom, pos: h.pos, d, e }); }
  const hy = -3.0 * Math.exp(-((dist(centroid(env.greaseIdx.map(i => atoms[i].p)), env.greaseCentre) / 3.5) ** 2));
  let clash = 0, clashAtoms = 0;
  for (const a of atoms) { let hit = false; for (const n of env.near) {
    const d = dist(a.p, n.p), lim = isPolar(a.el) && isPolar(n.el) ? 2.5 : 3.0;
    if (d < lim) { clash += (lim - d) * 1.5; hit = true; }
  } if (hit) clashAtoms++; }
  let burial = 0; for (const a of atoms) { let n = 0; for (const q of env.near) if (dist(a.p, q.p) < 6) n++; burial -= Math.min(n, 14) / 14 * 0.06; }
  const total = Math.min(-0.8 + hb + hy + Math.min(clash, 5) + burial, 6);
  return { total, hb, hy, clash, clashAtoms, burial, out: 0, bonds };
}

/** RMSD between the crystal ligand and a mock docked pose given as { rot: [ax, ay, az, deg], t }. */
export const poseRmsd = (base, p) => rmsd(base, place(base, { R: rotMat(p.rot.slice(0, 3), p.rot[3]), t: p.t }));
/** Does a cube of side s centred at c fully contain a sphere of radius r at the origin? */
export const covers = (c, s, r) => c.every(x => s / 2 >= Math.abs(x) + r);
