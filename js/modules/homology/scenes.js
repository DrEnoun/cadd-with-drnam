// 3D scenes for Module 4: smooth coloured C-alpha traces (backbone tubes) from real coordinates.
import { THREE, createViewer } from '../../viewer3d.js';
import { superpose } from './stats.js';

export const COL = { same: 0x2fd08a, like: 0xffd23a, diff: 0xff6b5e, gap: 0x8892a6, copied: 0x35c7c0, built: 0xff9f43, target: 0x4d8dff, tmpl: 0xd4ff3a, other: 0xc084fc, helix: 0xff5a7a, strand: 0xffd23a, coil: 0xa9b6cc };
export const css = c => '#' + c.toString(16).padStart(6, '0');

/** Smooth tube through the C-alpha atoms. colorAt(i) returns a hex colour for residue i. */
export function trace(ca, colorAt, { radius = .55, opacity = 1 } = {}) {
  const pts = ca.map(p => new THREE.Vector3(p[0], p[1], p[2])), n = pts.length, seg = 3;
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .5);
  const geo = new THREE.TubeGeometry(curve, (n - 1) * seg, radius, 6, false), ring = 7, col = new Float32Array(geo.attributes.position.count * 3), c = new THREE.Color();
  for (let k = 0; k < geo.attributes.position.count; k++) { const i = Math.min(n - 1, Math.round(Math.floor(k / ring) / seg)); c.setHex(colorAt(i)); col.set([c.r, c.g, c.b], k * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, metalness: .05, transparent: opacity < 1, opacity });
  return new THREE.Mesh(geo, mat);
}
/** Moves a coordinate list with a function and returns the new list. */
export const move = (ca, f) => ca.map(f);
/** Superpose structure B onto A using index pairs [[iA, iB]]; returns B's coordinates in A's frame. */
export function fitOnto(A, B, pairs) { const f = superpose(pairs.map(p => B[p[1]]), pairs.map(p => A[p[0]])); return B.map(f); }

/** A viewer that shows a list of traces; call set([{ca, color(i) | hex, radius, opacity}]) to replace them. */
export function traceViewer(host, { height = 440, dist = 95 } = {}) {
  const v = createViewer(host, { height, dist, yaw: .6, pitch: .25, autoRotate: false });
  if (!v) return null;
  const centre = new THREE.Vector3();
  v.set = (items, { fit = true } = {}) => {
    for (const ch of [...v.root.children]) { v.root.remove(ch); ch.geometry?.dispose(); ch.material?.dispose(); }
    const all = [];
    items.forEach(it => { const f = typeof it.color === 'function' ? it.color : () => it.color; v.root.add(trace(it.ca, f, { radius: it.radius, opacity: it.opacity })); all.push(...it.ca); });
    if (fit && all.length) { centre.set(0, 0, 0); all.forEach(p => centre.add(new THREE.Vector3(...p))); centre.multiplyScalar(1 / all.length); v.root.position.copy(centre).multiplyScalar(-1); }
    v.render();
  };
  return v;
}
/** Per-residue class colour for a target residue given an alignment (maps target index -> template index). */
export function classColour(target, template, pairs) {
  const m = new Map(pairs); return i => { const j = m.get(i); if (j == null) return COL.gap; const a = target[i], b = template[j]; return a === b ? COL.same : ('ILVM FYW KRH DE NQ ST AG'.split(' ').some(g => g.includes(a) && g.includes(b)) ? COL.like : COL.diff); };
}
export const ssColour = ss => i => ss[i] === 1 ? COL.helix : ss[i] === 2 ? COL.strand : COL.coil;
/** Deviation colour: blue (0 A) through yellow to red (6 A and more). */
export function devColour(d) { const t = Math.min(1, d / 6), c = new THREE.Color().setHSL(.6 - .6 * t, .85, .55); return c.getHex(); }
