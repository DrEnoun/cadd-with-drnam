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

/** Toy scoring function used in the "Search and score" step (mock units, kcal/mol).
 *  pts: ligand atoms [{el, p}] already placed. env: data.pocket3d. */
export function scorePose(atoms, env) {
  const pos = i => atoms[i].p;
  let hb = 0; const bonds = [];
  for (const h of env.hbondPairs) { const d = dist(pos(h.atom), env.residues[h.res].pos); const e = -1.0 * Math.exp(-(((d - 2.8) / 1.2) ** 2)); hb += e; bonds.push({ res: h.res, d, e }); }
  const ring = centroid(env.ring.map(pos));
  const hy = -3.0 * Math.exp(-((dist(ring, env.greaseCentre) / 2.5) ** 2));
  let clash = 0;
  for (const a of atoms) for (const r of Object.values(env.residues)) if (r.type === 'hydrophobic') clash += Math.max(0, 2.6 - dist(a.p, r.pos)) * 2.0;
  const out = atoms.filter(a => len(a.p) > env.cavityRadius).length;
  const total = Math.min(-1.5 + hb + hy + clash + out * 0.8, 6);
  return { total, hb, hy, clash, out, bonds };
}

/** RMSD between the crystal ligand and a mock docked pose given as { rot: [ax, ay, az, deg], t }. */
export const poseRmsd = (base, p) => rmsd(base, place(base, { R: rotMat(p.rot.slice(0, 3), p.rot[3]), t: p.t }));
/** Does a cube of side s centred at c fully contain a sphere of radius r at the origin? */
export const covers = (c, s, r) => c.every(x => s / 2 >= Math.abs(x) + r);
