// 3D network scene: spheres for proteins, lines for interactions, a drug node, deterministic force layout.
import { THREE, createViewer, labelSprite } from '../../viewer3d.js';
import { layout3d } from './stats.js';

export const COL = { drug: 0xffd23a, target: 0x4d8dff, disease: 0xff6b5e, both: 0x2fd08a, hub: 0xc084fc, dim: 0x56627a };
export const css = c => '#' + c.toString(16).padStart(6, '0');

/** A viewer that draws a network. set({ nodes:[gene], edges:[[a,b,conf]], color(gene)->hex, size(gene)->radius, labels:boolean, extra:[{id, pos?}] }) */
export function networkViewer(host, { height = 460, dist = 70 } = {}) {
  const v = createViewer(host, { height, dist, yaw: .5, pitch: .2, autoRotate: true });
  if (!v) return null;
  v.state.dist = dist; let posCache = new Map();
  v.set = ({ nodes, edges, color = () => COL.target, size = () => 1.2, labels = true, fixed = null, pulse = null, faded = null }) => {
    for (const ch of [...v.root.children]) { v.root.remove(ch); ch.geometry?.dispose?.(); ch.material?.map?.dispose?.(); ch.material?.dispose?.(); }
    // reuse earlier positions for nodes that were already placed so the picture does not jump around
    const P = layout3d(nodes, edges, { iter: 220 });
    nodes.forEach((n, i) => { if (!posCache.has(n)) posCache.set(n, P[i]); });
    const pos = new Map(nodes.map((n, i) => [n, fixed?.[n] || P[i]]));
    const lines = [], lc = [];
    for (const [a, b, s] of edges) { if (!pos.has(a) || !pos.has(b)) continue; lines.push(new THREE.Vector3(...pos.get(a)), new THREE.Vector3(...pos.get(b))); const c = new THREE.Color(0x9fb4d6).multiplyScalar(.45 + .55 * (s ?? 1)); lc.push(c.r, c.g, c.b, c.r, c.g, c.b); }
    const lg = new THREE.BufferGeometry().setFromPoints(lines); lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    v.root.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .75 })));
    const geo = new THREE.SphereGeometry(1, 20, 14);
    for (const n of nodes) {
      const r = size(n), m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: color(n), roughness: .35, metalness: .1, emissive: color(n), emissiveIntensity: .25, transparent: !!faded?.(n), opacity: faded?.(n) ? .3 : 1 }));
      m.scale.setScalar(r); m.position.set(...pos.get(n)); v.root.add(m);
      if (labels) { const l = labelSprite(n, { size: 4.6 }); l.position.set(pos.get(n)[0], pos.get(n)[1] + r + 1.4, pos.get(n)[2]); v.root.add(l); }
    }
    v.render();
  };
  v.fit = r => { v.state.dist = r; v.view({ dist: r }); };
  return v;
}
