// 3D scenes for the virtual screening module: the library in property space, the screening funnel, and a molecule inspector.
import { h } from '../../ui.js';
import { createViewer, THREE, ligandGroup, labelSprite, glow, COLORS } from '../../viewer3d.js';
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
  const v = createViewer(host, { height, autoRotate: true, dist: 17, pitch: .2 });
  let cur = null;
  return {
    v,
    show(c) {
      if (!v) return; if (cur) v.root.remove(cur);
      const ctr = c.atoms.reduce((s, a) => [s[0] + a[1] / c.atoms.length, s[1] + a[2] / c.atoms.length, s[2] + a[3] / c.atoms.length], [0, 0, 0]);
      const atoms = c.atoms.map(a => ({ el: a[0], p: [a[1] - ctr[0], a[2] - ctr[1], a[3] - ctr[2]] }));
      cur = ligandGroup(atoms, c.bonds, { carbon: GROUP[c.group].color, halo: 2.4 }); v.root.add(cur); v.render();
    },
    dispose() { v?.dispose(); },
  };
}

// ---------------------------------------------------------------- the funnel
/** A glass funnel with compounds falling through gates. stages: [{ label, pass }] with pass = fraction that survive that gate. */
export function funnelScene(v, lib, stages) {
  const root = new THREE.Group(); v.root.add(root);
  const H = 34, top = H / 2, bottom = -H / 2, R0 = 13, R1 = 2.6;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(R0, R1, H, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x9fd8e6, transparent: true, opacity: .12, side: THREE.DoubleSide, roughness: .1, depthWrite: false }));
  root.add(cone);
  const rim = (y, r, col = 0x9fd8e6) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .12, 8, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .9 })); t.rotation.x = Math.PI / 2; t.position.y = y; root.add(t); return t; };
  rim(top, R0); const gates = stages.map((s, i) => { const y = top - H * (i + 1) / (stages.length + 1), r = R0 + (R1 - R0) * ((top - y) / H); rim(y, r, 0xd4ff3a); const l = labelSprite(s.label, { size: 8 }); l.position.set(r + 4 + l.scale.x / 2, y, 0); root.add(l); return { y, r }; });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(R1 * 1.05, R1 * .9, 7, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xb9f3ea, transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false })); tube.position.y = bottom - 3.5; root.add(tube);
  const out = glow([0, bottom - 5, 0], 0x6fe06f, 8, .6); root.add(out);
  // particles: each one has a fixed fate (the gate it stops at, or none if it survives all)
  const N = 70, ps = [];
  const rnd = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < N; i++) {
    const c = lib[i % lib.length], g = GROUP[c.group];
    const m = new THREE.Mesh(new THREE.SphereGeometry(.7, 14, 10), new THREE.MeshStandardMaterial({ color: g.color, roughness: .3, emissive: g.color, emissiveIntensity: .3, transparent: true }));
    let fate = stages.length; for (let k = 0; k < stages.length; k++) if (rnd() > stages[k].pass) { fate = k; break; }
    ps.push({ m, fate, a: rnd() * Math.PI * 2, rr: rnd(), y: top + rnd() * 30, v: 3 + rnd() * 2.5, hold: 0 }); root.add(m);
  }
  v.onFrame = dt => {
    for (const p of ps) {
      const stopY = p.fate < stages.length ? gates[p.fate].y : bottom - 5;
      if (p.hold > 0) { p.hold -= dt; p.m.material.opacity = Math.max(0, p.hold / 1.4); p.m.scale.setScalar(.7 * (.4 + p.hold / 1.4)); p.m.material.emissive.setHex(0xff5a5a); if (p.hold <= 0) respawn(p); continue; }
      p.y -= p.v * dt;
      const t = Math.max(0, Math.min(1, (top - p.y) / H)), r = (R0 + (R1 - R0) * t) * .82 * p.rr;
      p.m.position.set(Math.cos(p.a) * r, p.y, Math.sin(p.a) * r);
      if (p.y <= stopY) { if (p.fate < stages.length) p.hold = 1.4; else respawn(p); }
    }
    v.render();
  };
  function respawn(p) { p.y = top + rnd() * 8; p.a = rnd() * Math.PI * 2; p.rr = rnd(); p.m.material.opacity = 1; p.m.scale.setScalar(.7); p.m.material.emissive.setHex(p.m.material.color.getHex()); p.m.material.emissiveIntensity = .3; }
  return { root };
}
