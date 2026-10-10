// 3D scenes for the virtual screening module: the library in property space, the screening funnel, and a molecule inspector.
import { h } from '../../ui.js';
import { createViewer, THREE, ligandGroup, labelSprite, glow, COLORS, alignPCA } from '../../viewer3d.js';
import { passes } from './stats.js';

export const GROUP = {
  coxib: { color: 0xd4ff3a, css: '#d4ff3a', label: 'COX-2 selective drugs' },
  nsaid: { color: 0x2dd4bf, css: '#2dd4bf', label: 'Other NSAIDs' },
  other: { color: 0x7fb0ff, css: '#7fb0ff', label: 'Drugs for other targets' },
  pains: { color: 0xff9f43, css: '#ff9f43', label: 'Assay-interference (PAINS) scaffolds' },
};
export const legendItems = () => Object.values(GROUP).map(g => ({ label: g.label, color: g.css }));

// ---------------------------------------------------------------- library in property space
const AX = { mw: [100, 620], logp: [-4, 7], tpsa: [0, 150] }, SPAN = [36, 28, 28];
const norm = (v, [a, b]) => (v - a) / (b - a) - 0.5;
export const cloudPos = c => [norm(c.mw, AX.mw) * SPAN[0], norm(c.logp, AX.logp) * SPAN[1], norm(c.tpsa, AX.tpsa) * SPAN[2]];

/** The library as glossy spheres in (molecular weight, cLogP, polar surface area) space, with a translucent "drug-like" box. */
export function cloudScene(v, lib, { onPick } = {}) {
  const root = new THREE.Group(), spheres = [];
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xd4ff3a, transparent: true, opacity: .9 }));
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xd4ff3a, transparent: true, opacity: .07, depthWrite: false }));
  root.add(body, edges);
  // axes
  const o = [-SPAN[0] / 2, -SPAN[1] / 2, -SPAN[2] / 2];
  const axis = (to, col) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...o), new THREE.Vector3(...to)]); root.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .8 }))); };
  axis([o[0] + SPAN[0], o[1], o[2]], 0x9fd8e6); axis([o[0], o[1] + SPAN[1], o[2]], 0x9fd8e6); axis([o[0], o[1], o[2] + SPAN[2]], 0x9fd8e6);
  const tag = (t, p) => { const s = labelSprite(t, { size: 8 }); s.position.set(...p); root.add(s); };
  tag('Molecular weight →', [o[0] + SPAN[0] * .62, o[1] - 1.8, o[2]]); tag('cLogP (greasiness) ↑', [o[0] - 3, o[1] + SPAN[1] * .55, o[2]]); tag('Polar surface area →', [o[0], o[1] - 1.8, o[2] + SPAN[2] * .55]);
  for (const c of lib) {
    const g = GROUP[c.group], p = cloudPos(c);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: g.color, roughness: .3, metalness: .1, emissive: g.color, emissiveIntensity: .25, transparent: true }));
    m.position.set(...p); m.scale.setScalar(c.active ? 1.5 : 1.2); m.userData.c = c;
    const halo = glow(p, g.color, 5.2, .35);
    root.add(m, halo); spheres.push({ c, m, halo });
  }
  const sel = glow([0, 0, 0], 0xffffff, 6.5, .9); sel.visible = false; root.add(sel);
  v.root.add(root);

  const api = {
    root, spheres,
    setLimits(lim) {
      const dim = k => lim[k] == null ? AX[k][1] : Math.min(lim[k], AX[k][1]);
      const hi = [(norm(dim('mw'), AX.mw)) * SPAN[0], norm(dim('logp'), AX.logp) * SPAN[1], norm(dim('tpsa'), AX.tpsa) * SPAN[2]];
      const sz = [hi[0] - o[0], hi[1] - o[1], hi[2] - o[2]];
      edges.scale.set(...sz); body.scale.set(...sz); const c = [o[0] + sz[0] / 2, o[1] + sz[1] / 2, o[2] + sz[2] / 2]; edges.position.set(...c); body.position.set(...c);
      for (const s of spheres) { const ok = passes(s.c, lim); s.m.material.opacity = ok ? 1 : .22; s.m.material.emissiveIntensity = ok ? .3 : 0; s.halo.visible = ok; s.m.scale.setScalar((s.c.active ? 1.5 : 1.2) * (ok ? 1 : .7)); }
      v.render();
    },
    select(id) { const s = spheres.find(x => x.c.id === id); sel.visible = !!s; if (s) sel.position.copy(s.m.position); v.render(); },
  };
  // click to pick (a drag does not count)
  const ray = new THREE.Raycaster(), pt = new THREE.Vector2(); let down = null;
  v.canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  v.canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; down = null;
    const r = v.canvas.getBoundingClientRect(); pt.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pt, v.camera); const hit = ray.intersectObjects(spheres.map(s => s.m))[0];
    if (hit) { api.select(hit.object.userData.c.id); onPick?.(hit.object.userData.c); }
  });
  return api;
}

// ---------------------------------------------------------------- molecule inspector (rotating ball-and-stick)
export function inspector(host, { height = 280 } = {}) {
  const v = createViewer(host, { height, autoRotate: true, dist: 20, pitch: .15, yaw: 0 });
  let cur = null;
  return {
    v,
    show(c) {
      if (!v) return; if (cur) v.root.remove(cur);
      const P = alignPCA(c.atoms.map(a => [a[1], a[2], a[3]])), atoms = c.atoms.map((a, i) => ({ el: a[0], p: P[i] }));
      cur = ligandGroup(atoms, c.bonds, { carbon: GROUP[c.group].color, halo: 2.4 }); v.root.add(cur); v.render();
    },
    dispose() { v?.dispose(); },
  };
}

// ---------------------------------------------------------------- the funnel
const fmtN = n => n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)} M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)} k` : String(Math.round(n));
/** A glass funnel with compounds falling through gates. stages: [{ label, pass }] with pass = fraction that survives each gate (0 to 1),
 *  start = number of compounds that enter. Each gate shows how many are left; compounds that fail a gate flash red and drop out.
 *  Returns { update(stages, start) } so the funnel can follow sliders. */
export function funnelScene(v, lib, stages0, start0 = 2000000) {
  const root = new THREE.Group(); v.root.add(root);
  const H = 36, top = H / 2, bottom = -H / 2, R0 = 13, R1 = 2.6, N = 110;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(R0, R1, H, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x9fd8e6, transparent: true, opacity: .12, side: THREE.DoubleSide, roughness: .1, depthWrite: false }));
  root.add(cone);
  const ring = (y, r, col) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .13, 8, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .95 })); t.rotation.x = Math.PI / 2; t.position.y = y; return t; };
  root.add(ring(top, R0, 0x9fd8e6));
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(R1 * 1.05, R1 * .9, 7, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xb9f3ea, transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false })); tube.position.y = bottom - 3.5; root.add(tube);
  const out = glow([0, bottom - 5, 0], 0x6fe06f, 8, .6); root.add(out);
  const inTag = labelSprite('In: 2 M', { size: 7, color: '#9fd8e6' }); inTag.position.set(R0 + 8, top, 0); root.add(inTag);
  const outTag = labelSprite('To the lab: 0', { size: 8, color: '#b9f3ea' }); outTag.position.set(7, bottom - 5, 0); root.add(outTag);
  let stages = [], gates = [], gateObjs = [], start = start0, flash = [];
  const rnd = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const ps = [];
  for (let i = 0; i < N; i++) {
    const g = GROUP[lib[i % lib.length].group];
    const m = new THREE.Mesh(new THREE.SphereGeometry(.7, 14, 10), new THREE.MeshStandardMaterial({ color: g.color, roughness: .3, emissive: g.color, emissiveIntensity: .3, transparent: true }));
    ps.push({ m, g, u: rnd(), fate: 99, a: rnd() * Math.PI * 2, rr: rnd(), y: top + rnd() * 30, v: 3 + rnd() * 2.5, hold: 0 }); root.add(m);
  }
  function rebuild(newStages, newStart) {
    stages = newStages; start = newStart ?? start;
    gateObjs.forEach(o => { root.remove(o); o.traverse?.(c => c.material?.map?.dispose?.()); }); gateObjs = []; gates = []; flash = [];
    let left = start; const counts = [];
    stages.forEach(s => { left *= s.pass; counts.push(left); });
    stages.forEach((s, i) => {
      const y = top - H * (i + 1) / (stages.length + 1), r = R0 + (R1 - R0) * ((top - y) / H), rg = ring(y, r, 0xd4ff3a), l = labelSprite(`${s.label}: ${fmtN(Math.max(1, counts[i]))} left`, { size: 7.5 });
      l.position.set(r + 3 + l.scale.x / 2, y, 0); root.add(rg, l); gateObjs.push(rg, l); gates.push({ y, r, ring: rg });
    });
    inTag.material.map.dispose(); const t = labelSprite(`In: ${fmtN(start)}`, { size: 7, color: '#9fd8e6' }); inTag.material.map = t.material.map; inTag.scale.copy(t.scale); inTag.position.x = R0 + 3 + t.scale.x / 2;
    const fin = Math.max(1, counts[counts.length - 1] ?? start); const t2 = labelSprite(`To the lab: ${fmtN(fin)}`, { size: 8, color: '#b9f3ea' }); outTag.material.map.dispose(); outTag.material.map = t2.material.map; outTag.scale.copy(t2.scale);
    // each particle keeps a fixed random number u; it is stopped at the first gate whose cumulative survival is below u, so the visible drop-out matches the real fractions
    ps.forEach(p => { let cum = 1; p.fate = stages.length; for (let k = 0; k < stages.length; k++) { cum *= stages[k].pass; if (p.u > cum) { p.fate = k; break; } } p.hold = 0; p.y = top + rnd() * 30; p.m.material.opacity = 1; p.m.scale.setScalar(.7); p.m.material.emissive.copy(p.m.material.color); });
    v.render();
  }
  v.onFrame = dt => {
    for (const p of ps) {
      const stopY = p.fate < stages.length ? gates[p.fate].y : bottom - 5;
      if (p.hold > 0) { p.hold -= dt; const k = Math.max(0, p.hold / 1.2); p.m.material.opacity = k; p.m.scale.setScalar(.7 * (.5 + k)); if (p.hold <= 0) respawn(p); continue; }
      p.y -= p.v * dt;
      const t = Math.max(0, Math.min(1, (top - p.y) / H)), r = (R0 + (R1 - R0) * t) * .82 * p.rr;
      p.m.position.set(Math.cos(p.a) * r, p.y, Math.sin(p.a) * r);
      if (p.y <= stopY) {
        if (p.fate < stages.length) { p.hold = 1.2; p.m.material.emissive.setHex(0xff3b3b); p.m.material.emissiveIntensity = 1; const g = gates[p.fate]; g.pulse = 1; }
        else { respawn(p); outPulse = 1; }
      }
    }
    for (const g of gates) if (g.pulse > 0) { g.pulse = Math.max(0, g.pulse - dt * 2.2); g.ring.material.color.setHex(g.pulse > .05 ? 0xff5a5a : 0xd4ff3a); g.ring.scale.setScalar(1 + g.pulse * .07); }
    if (outPulse > 0) { outPulse = Math.max(0, outPulse - dt * 2); out.material.opacity = .6 + .4 * outPulse; }
    v.render();
  };
  let outPulse = 0;
  function respawn(p) { p.y = top + rnd() * 8; p.a = rnd() * Math.PI * 2; p.rr = rnd(); p.u = rnd(); let cum = 1; p.fate = stages.length; for (let k = 0; k < stages.length; k++) { cum *= stages[k].pass; if (p.u > cum) { p.fate = k; break; } } p.m.material.opacity = 1; p.m.scale.setScalar(.7); p.m.material.emissive.copy(p.m.material.color); p.m.material.emissiveIntensity = .3; }
  rebuild(stages0, start0);
  return { root, update: rebuild };
}
