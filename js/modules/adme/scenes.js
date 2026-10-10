// 3D scenes for the ADME module: the journey of a tablet through the body (stomach and gut, blood, liver, kidneys) and a molecule inspector.
import { THREE, glow, labelSprite, ligandGroup, createViewer, alignPCA } from '../../viewer3d.js';

const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: .05, ...o });
function lumpy(geo, amp = .06, seed = 1) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 1.7 + seed) * Math.cos(v.y * 1.9 + seed * 2) * Math.sin(v.z * 1.5 + seed * 3); p.setXYZ(i, v.x * (1 + amp * n), v.y * (1 + amp * n), v.z * (1 + amp * n)); }
  geo.computeVertexNormals(); return geo;
}
export const STAGE_COLORS = { A: 0xffb15a, M: 0x2dd4bf, D: 0xff5a6e, E: 0xffe14a };
export const STAGE_CSS = { A: '#ffb15a', D: '#ff5a6e', M: '#2dd4bf', E: '#ffe14a' };
export const DRUG_BLUE = 0x4da3ff, METAB_ORANGE = 0xff9f43;

// camera targets for each stage (x, y, z) and distance
const VIEW = { all: [[1, 4.5, 0], 50], A: [[1.2, 4, 0], 36], M: [[-3, 4, 0], 26], D: [[4, 12, 0], 40], E: [[0.5, -2.2, 0], 28] };
const mkTube = (pts, r, color, o = {}) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p)), false, 'centripetal'), o.seg ?? 80, r, o.rad ?? 12, false), mat(color, o.m ?? {}));
const vessel = (pts, r, color, op = .6) => { const c = new THREE.CatmullRomCurve3(pts.map(p => V3(...p)), false, 'centripetal'); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 80, r, 12, false), new THREE.MeshStandardMaterial({ color, roughness: .25, transparent: true, opacity: op, depthWrite: false })); return { mesh: m, curve: c }; };

/** A 3D human body (translucent) with the organs of ADME, following the layout of the overview picture:
 *  A: mouth, gullet, stomach, gut. First pass and M: portal vein and liver with CYP enzymes. D: heart, blood vessels, brain and muscle. E: kidneys, ureters, bladder.
 *  A tablet travels the real route; blue dots are the drug, orange dots are its metabolites. */
export function journeyScene(v, { onStage } = {}) {
  const root = new THREE.Group(); v.root.add(root);
  const labels = new THREE.Group(); root.add(labels);
  // ---------------------------------------------------------------- body shell
  const body = new THREE.Group(); root.add(body);
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xa8d8ff, roughness: .3, metalness: 0, transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false });
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: .1, side: THREE.BackSide, depthWrite: false });
  const prof = [[0, -11], [4.2, -11], [6.4, -10.2], [7.1, -8], [6.5, -2.5], [6.1, 1.5], [7.0, 6], [7.9, 9.5], [7.6, 11.5], [5.2, 12.8], [2.3, 13.2], [1.9, 14.2], [0, 14.2]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), shellMat); torso.scale.set(1, 1, .55); body.add(torso);
  const torso2 = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), rimMat); torso2.scale.set(1.03, 1.01, .58); body.add(torso2);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), shellMat); head.scale.set(4.1, 4.9, 3.9); head.position.set(0, 18.2, 0); body.add(head);
  const head2 = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), rimMat); head2.scale.set(4.25, 5.05, 4.05); head2.position.copy(head.position); body.add(head2);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(2.3, 10, 10, 20), shellMat); arm.position.set(10.2, 4.8, 0); arm.rotation.z = .06; body.add(arm);
  const arm2 = new THREE.Mesh(new THREE.CapsuleGeometry(2.45, 10.2, 10, 20), rimMat); arm2.position.copy(arm.position); arm2.rotation.z = .06; body.add(arm2);
  const larm = new THREE.Mesh(new THREE.CapsuleGeometry(2.3, 10, 10, 20), shellMat); larm.position.set(-10.2, 4.8, 0); larm.rotation.z = -.06; body.add(larm);
  body.renderOrder = 8; body.children.forEach(c => c.renderOrder = 8);
  // ---------------------------------------------------------------- organs
  const organ = (mesh, stage) => { root.add(mesh); (organs[stage] ??= []).push(mesh); return mesh; };
  const organs = {};
  const brain = organ(new THREE.Mesh(lumpy(new THREE.SphereGeometry(1, 48, 32), .13, 7), mat(0xe9a7bd, { roughness: .45 })), 'D'); brain.scale.set(3.2, 2.6, 2.7); brain.position.set(0, 18.7, 0);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.8, .22, 10, 24), mat(0xd9605f, { roughness: .4 })); mouth.scale.set(1.5, .55, .6); mouth.position.set(0, 16.2, 3.55); root.add(mouth);
  organ(mkTube([[0, 15.4, 2.2], [0, 12.5, 1.4], [.1, 9.5, 1.0], [1.4, 6.9, .9], [2.6, 5.7, .9]], .55, 0xe39a9a, { m: { roughness: .5 } }), 'A');
  const stomach = organ(new THREE.Mesh(lumpy(new THREE.SphereGeometry(1, 40, 28), .07, 2), mat(0xe58f9a, { roughness: .45 })), 'A'); stomach.scale.set(2.6, 3.3, 2); stomach.position.set(3.5, 3.6, 1); stomach.rotation.z = .55;
  // small intestine (coil) and large intestine (frame)
  const coilPts = [[1.5, .9, 1.2], [-1.5, -.9, 1.3], [-3.6, -2.2, 1.3], [-1.2, -3.2, 1.3], [1.8, -2.4, 1.3], [3.6, -3.8, 1.3], [1.2, -4.9, 1.3], [-2.2, -5.2, 1.3], [-3.8, -6.5, 1.3], [-.8, -7.4, 1.3], [2.8, -6.8, 1.3], [3.2, -8, 1.2]];
  organ(mkTube(coilPts, .95, 0xf2a07a, { seg: 220, rad: 14, m: { roughness: .55 } }), 'A');
  organ(mkTube([[-5.3, -8.6, .8], [-5.4, -4, .8], [-5.2, -1.4, .8], [-2, -1.0, .9], [2, -1.0, .9], [5.2, -1.4, .8], [5.4, -4, .8], [5.2, -8.4, .8], [3.2, -9.8, .6]], 1.05, 0xd98a82, { seg: 160, rad: 14, m: { roughness: .6 } }), 'A');
  // liver, gall bladder, enzymes (green blobs)
  const liver = organ(new THREE.Mesh(lumpy(new THREE.SphereGeometry(1, 48, 32), .1, 5), mat(0x9a3f33, { roughness: .35 })), 'M'); liver.scale.set(5.4, 2.9, 2.5); liver.position.set(-3.9, 3.9, .9); liver.rotation.z = .18;
  const gall = organ(new THREE.Mesh(new THREE.SphereGeometry(.7, 20, 16), mat(0x7fa84a, { roughness: .3 })), 'M'); gall.scale.set(1, 1.5, 1); gall.position.set(-2.2, 2, 2.3);
  const enzymes = new THREE.Group(); [[-5.2, 4.4, 2.6, .85], [-3.6, 3.2, 2.7, .7], [-4.4, 5.1, 2.5, .6], [-2.6, 4.6, 2.5, .6], [-5.8, 3.2, 2.5, .55]].forEach(([x, y, z, r], i) => { const e = new THREE.Mesh(lumpy(new THREE.SphereGeometry(r, 24, 18), .28, i + 1), mat(0x2fa860, { roughness: .3, emissive: 0x0f6b3a, emissiveIntensity: .6 })); e.position.set(x, y, z); enzymes.add(e); }); root.add(enzymes);
  // heart (+ great vessels drawn later)
  const heart = organ(new THREE.Mesh(lumpy(new THREE.SphereGeometry(1, 36, 26), .09, 9), mat(0xc0242e, { roughness: .35 })), 'D'); heart.scale.set(1.7, 2.1, 1.6); heart.position.set(1.2, 8.6, 1.2); heart.rotation.z = -.35;
  // kidneys (behind), ureters, bladder
  const bean = () => { const g = new THREE.SphereGeometry(1, 36, 26), p = g.attributes.position, q = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { q.fromBufferAttribute(p, i); const dent = Math.exp(-((q.x - .95) ** 2) / .12) * Math.exp(-(q.y ** 2) / .5) * .5; p.setX(i, q.x - dent); } g.computeVertexNormals(); return g; };
  const kmat = () => mat(0xc4573f, { roughness: .35, emissive: 0x6a2112, emissiveIntensity: .55 }), k1 = organ(new THREE.Mesh(bean(), kmat()), 'E'), k2 = organ(new THREE.Mesh(bean(), kmat()), 'E');
  k1.scale.set(-1.8, 3.0, 1.5); k1.position.set(-3.3, 1.0, -1.8); k2.scale.set(1.8, 3.0, 1.5); k2.position.set(3.3, 1.0, -1.8);
  organ(mkTube([[-3.0, -1.0, -1.5], [-3.0, -3.5, -.8], [-1.8, -7.4, -.1], [-.6, -9.0, .3]], .24, 0xffe14a, { rad: 8, m: { emissive: 0xaa8a00, emissiveIntensity: .4 } }), 'E');
  organ(mkTube([[3.0, -1.0, -1.5], [3.0, -3.5, -.8], [1.8, -7.4, -.1], [.6, -9.0, .3]], .24, 0xffe14a, { rad: 8, m: { emissive: 0xaa8a00, emissiveIntensity: .4 } }), 'E');
  const bladder = organ(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat(0xe8c85a, { roughness: .2, emissive: 0x8a6a00, emissiveIntensity: .35, transparent: true, opacity: .92 })), 'E'); bladder.scale.set(1.7, 1.45, 1.4); bladder.position.set(0, -9.5, .3);
  // muscle (in the arm) with fibres
  const muscle = organ(new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 6.5, 8, 18), mat(0xc4504a, { roughness: .5 })), 'D'); muscle.position.set(10.2, 5.4, .4);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, f = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 9, 6), mat(0x7a2a2a)); f.position.set(10.2 + Math.cos(a) * 1.5, 5.4, .4 + Math.sin(a) * 1.5); root.add(f); }
  // ---------------------------------------------------------------- blood vessels (arterial red, venous blue, portal violet)
  const R = 0xd2364b, B = 0x3a6fe0, P = 0x7a5cd6;
  const vs = {};
  vs.aorta = vessel([[1.6, 10.2, .7], [1, 11, .2], [.7, 9.4, -.5], [.7, 4, -.6], [.7, -1, -.6], [.7, -6.5, -.6]], .5, R);
  vs.cava = vessel([[-.7, -6.5, -.6], [-.7, -1, -.6], [-.7, 4, -.6], [-.5, 7.3, -.2], [.5, 8.4, .4]], .55, B);
  vs.carotid = vessel([[1.2, 10.4, .6], [.9, 12.5, .2], [.8, 15, 0], [.5, 17.5, 0]], .32, R);
  vs.jugular = vessel([[-.2, 17.5, -.3], [-.6, 15, -.3], [-.7, 12.5, -.3], [-.3, 10.4, .1]], .32, B);
  vs.arm = vessel([[2, 10.3, .5], [6, 10.8, .3], [9.5, 9.8, .4], [10.2, 7, .5]], .3, R);
  vs.armBack = vessel([[10.8, 7, .1], [10.4, 10.2, -.1], [6.5, 11.2, -.2], [2.5, 9.9, .1]], .3, B);
  vs.portal = vessel([[-3.0, -6.2, 1], [-2.7, -3, 1.1], [-2.5, 0, 1.1], [-2.9, 2.2, 1.1], [-3.4, 3.2, 1.1]], .36, P, .7);
  vs.hepatic = vessel([[-3.2, 4.3, .8], [-1.8, 5.8, .1], [-.8, 6.8, -.3]], .34, B);
  vs.renalL = vessel([[-.7, .8, -.7], [-1.8, 1.1, -1.3], [-2.6, 1.3, -1.6]], .28, R); vs.renalR = vessel([[.8, .8, -.7], [1.9, 1.1, -1.3], [2.6, 1.3, -1.6]], .28, R);
  for (const k in vs) root.add(vs[k].mesh);
  // red blood cells
  const cells = [], rbc = new THREE.TorusGeometry(.2, .1, 8, 14); rbc.scale(1, 1, .7);
  const flows = [['aorta', 14, 0xc0182f, .05], ['cava', 14, 0x8a1020, .05], ['carotid', 5, 0xc0182f, .06], ['jugular', 5, 0x8a1020, .06], ['arm', 5, 0xc0182f, .06], ['armBack', 5, 0x8a1020, .06], ['portal', 6, 0x9b6bd6, .05], ['hepatic', 4, 0x8a1020, .06]];
  for (const [k, n, col, sp] of flows) for (let i = 0; i < n; i++) { const m = new THREE.Mesh(rbc, mat(col, { roughness: .35 })); m.userData = { k, t: Math.random(), sp: sp * (.7 + Math.random() * .6), off: [Math.random() - .5, Math.random() - .5] }; cells.push(m); root.add(m); }
  // ---------------------------------------------------------------- the route of the tablet
  const route = [
    ['A', 0, 17.2, 7], ['A', 0, 16.3, 3.9], ['A', 0, 15.2, 2.1], ['A', 0, 12.5, 1.4], ['A', .1, 9.5, 1], ['A', 1.4, 6.9, .9], ['A', 2.8, 5.6, 1], ['A', 3.7, 3.4, 1.1], ['A', 3, 1.2, 1.2],
    ['A', 1.5, .9, 1.2], ['A', -1.5, -.9, 1.3], ['A', -3.6, -2.2, 1.3], ['A', -1.2, -3.2, 1.3], ['A', 1.8, -2.4, 1.3], ['A', 3.6, -3.8, 1.3], ['A', 1.2, -4.9, 1.3], ['A', -2.2, -5.2, 1.3], ['A', -3.0, -6.2, 1.1],
    ['M', -2.7, -3, 1.1], ['M', -2.5, 0, 1.1], ['M', -2.9, 2.2, 1.1], ['M', -3.8, 3.4, 1.4], ['M', -5, 4.6, 1.6], ['M', -3.2, 4.4, 1.6], ['M', -4.4, 3.2, 1.5], ['M', -3.2, 4.3, .8], ['M', -1.8, 5.8, .1], ['M', -.8, 6.8, -.3], ['M', -.2, 7.8, 0],
    ['D', 1.0, 8.9, .9], ['D', 1.3, 10.3, .6], ['D', .9, 12.5, .2], ['D', .8, 15, 0], ['D', .4, 17.4, 0], ['D', -1.2, 18.6, .5], ['D', 1, 19, -.4], ['D', -.4, 17.5, -.3], ['D', -.7, 12.5, -.3],
    ['D', 1.5, 10.2, .5], ['D', 6, 10.8, .3], ['D', 9.5, 9.8, .4], ['D', 10.2, 6.5, .5], ['D', 10.8, 7.2, .1], ['D', 10.4, 10.2, -.1], ['D', 6.5, 11.2, -.2], ['D', 2.5, 9.9, .1],
    ['E', .7, 5, -.6], ['E', .7, 2.2, -.6], ['E', 2.0, 1.2, -1.3], ['E', 3.2, 1.9, -1.8], ['E', 4.0, .7, -1.8], ['E', 3.4, -.5, -1.6], ['E', 3.0, -2.6, -.9], ['E', 2.0, -6.5, -.3], ['E', .9, -8.7, .1], ['E', .2, -9.4, .3]];
  const path = new THREE.CatmullRomCurve3(route.map(r => V3(r[1], r[2], r[3])), false, 'centripetal');
  // stage boundaries: the point of the curve nearest to the first control point of each stage
  const sample = path.getSpacedPoints(800), nearestU = pt => { let bi = 0, bd = 1e9; sample.forEach((q, i) => { const d = q.distanceToSquared(pt); if (d < bd) { bd = d; bi = i; } }); return bi / 800; };
  const bounds = {}; for (const k of ['A', 'M', 'D', 'E']) { const i = route.findIndex(r => r[0] === k); bounds[k] = i === 0 ? 0 : nearestU(V3(route[i][1], route[i][2], route[i][3])); }
  const order = ['A', 'M', 'D', 'E'], stageOf = u => { let st = 'A'; for (const k of order) if (u >= bounds[k]) st = k; return st; };
  // halos behind each region
  const CEN = { A: [1, 3.5, -3.5], M: [-3.9, 3.9, -2], D: [4.5, 12, -3], E: [0, 0.5, -3] }, SIZE = { A: 24, M: 17, D: 30, E: 20 }, halos = {};
  for (const k of order) { const g = glow(CEN[k], STAGE_COLORS[k], SIZE[k], 0); halos[k] = g; root.add(g); }
  // the tablet and the drug (blue) and metabolite (orange) dots
  const pill = new THREE.Group(), h1 = new THREE.Mesh(new THREE.CapsuleGeometry(.4, .7, 8, 16), mat(0x8a4bd6, { roughness: .25 })), h2 = new THREE.Mesh(new THREE.CapsuleGeometry(.4, .7, 8, 16), mat(0xffffff, { roughness: .25 }));
  h1.position.y = .55; h2.position.y = -.55; pill.add(h1, h2); const pillGlow = glow([0, 0, 0], 0xd4ff3a, 4, .8); const tablet = new THREE.Group(); tablet.add(pill, pillGlow); root.add(tablet);
  const dots = []; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), new THREE.MeshBasicMaterial({ color: DRUG_BLUE })); m.visible = false; dots.push(m); root.add(m); }
  // labels
  const tag = (text, at, big = false, color = '#ffffff') => { const sp = labelSprite(text, { size: big ? 5 : 3.5, color, bg: big ? 'rgba(6,13,27,.86)' : 'rgba(6,13,27,.72)' }); sp.position.set(...at); labels.add(sp); return sp; };
  tag('Mouth', [-4.6, 16.4, 4.4]); tag('Brain', [-5.6, 20.6, 2]); tag('Stomach', [7.4, 2.6, 2.5]); tag('Small intestine', [-1, -10.8, 3]); tag('Large intestine', [8.8, -5.5, 2.4]); tag('Liver', [-8.9, 6.2, 3]); tag('Enzymes (CYP)', [-9.6, 2.1, 3.4], false, '#8ff0b4'); tag('Heart', [4.4, 9.4, 3]); tag('Muscle', [14.4, 6.2, 2.4]); tag('Kidneys', [-8.4, -1.4, 1.2]); tag('Bladder: urine', [5.2, -11.6, 2]); tag('Blood vessels', [-6.5, 12.8, 2]); tag('Gall bladder', [-7.4, -1.1, 3.3]);
  let s = 0, playing = true, follow = false, speed = .028, focus = null, lastStage = 'A', pulseT = 0;
  const viewTarget = V3(...VIEW.all[0]), tgt = { t: V3(...VIEW.all[0]), d: VIEW.all[1] };
  const st = v.state;
  v.onFrame = dt => {
    if (playing) { s += dt * speed; if (s >= 1) s = 0; }
    const u = s, p = path.getPointAt(Math.min(u, .9999)), tan = path.getTangentAt(Math.min(u, .9999)), stage = stageOf(u);
    tablet.position.copy(p); pill.quaternion.setFromUnitVectors(V3(0, 1, 0), tan.clone().normalize());
    const inGut = u > (bounds.A + .06) || stage !== 'A', dissolved = stage !== 'A' || u > .075;
    h1.visible = h2.visible = !dissolved; pillGlow.scale.setScalar(dissolved ? 4.8 : 3.6);
    // dots: blue drug, orange metabolites (more orange after the liver)
    const frac = stage === 'A' ? 0 : stage === 'M' ? .25 : stage === 'D' ? .35 + .2 * ((u - bounds.D) / Math.max(.01, bounds.E - bounds.D)) : .6 + .35 * ((u - bounds.E) / Math.max(.01, 1 - bounds.E));
    dots.forEach((d, i) => { d.visible = dissolved; d.material.color.setHex(i / dots.length < frac ? METAB_ORANGE : DRUG_BLUE); const a = (i / dots.length) * Math.PI * 2 + u * 40, r = .7 + .35 * (i % 3); d.position.set(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.z + ((i % 5) - 2) * .25); });
    // blood flow
    cells.forEach(c => { const f = vs[c.userData.k].curve; c.userData.t = (c.userData.t + c.userData.sp * dt) % 1; const q = f.getPointAt(c.userData.t); c.position.set(q.x + c.userData.off[0] * .35, q.y, q.z + c.userData.off[1] * .35); c.rotation.set(c.userData.t * 9, c.userData.t * 7, 0); });
    enzymes.children.forEach((e, i) => { e.rotation.y += dt * .6; e.scale.setScalar(1 + .06 * Math.sin(performance.now() / 300 + i)); });
    // spotlight: organs of the stage the tablet is in stay solid, the others turn glassy so the kidneys, liver and the rest can always be seen
    for (const k of order) { const target = k === (focus || stage) ? 1 : (focus || follow ? .1 : .3); for (const m of organs[k] ?? []) { const mt = m.material; mt.opacity += (target - mt.opacity) * Math.min(1, dt * 4); mt.transparent = mt.opacity < .99; mt.depthWrite = mt.opacity > .55; } }
    // halos and camera
    pulseT += dt; const active = focus || stage;
    for (const k of order) halos[k].material.opacity = k === active ? .55 + .2 * Math.sin(pulseT * 3.2) : 0;
    let goalT, goalD; if (focus) { [goalT, goalD] = VIEW[focus]; } else if (follow) { goalT = p; goalD = 34; } else { [goalT, goalD] = VIEW.all; }
    const gt = Array.isArray(goalT) ? V3(...goalT) : goalT, k = Math.min(1, dt * 2.2); goalD *= Math.max(1, .95 / (v.camera.aspect || 1)); // narrow screens (phones) need to stand further back
    if (st && (focus || follow || st._settling !== false)) { st.target.lerp(gt, k); st.dist += (goalD - st.dist) * k; v.view({}); if (!focus && !follow && st.target.distanceTo(gt) < .05) st._settling = false; }
    if (stage !== lastStage) { lastStage = stage; if (!focus) onStage?.(stage); }
    v.render();
  };
  if (st) { st.target.copy(viewTarget); st.dist = VIEW.all[1] * Math.max(1, .95 / (v.camera.aspect || 1)); v.view({}); }
  return {
    root, labels,
    setStage(k) { focus = k; follow = false; if (st) st._settling = true; if (k) { s = Math.min(.999, bounds[k] + (({ A: .05, M: .035, D: .04, E: .04 })[k] ?? .03)); playing = true; onStage?.(k); } },
    play() { focus = null; playing = true; if (st) st._settling = true; },
    pause() { playing = false; },
    follow(on) { follow = on; focus = null; if (st) st._settling = true; },
    overview() { focus = null; follow = false; if (st) st._settling = true; },
    get playing() { return playing; },
    get stage() { return lastStage; },
    setSpeed(x) { speed = .028 * x; },
  };
}

/** Rotating ball-and-stick molecule with optional glowing atoms. highlight: [{ atom, color }] */
export function inspector(host, { height = 280 } = {}) {
  const v = createViewer(host, { height, autoRotate: true, dist: 20, pitch: .15, yaw: 0 });
  let cur = null;
  return {
    v,
    show(d, highlight = [], carbon = 0xd4ff3a) {
      if (!v) return; if (cur) v.root.remove(cur);
      const P = alignPCA(d.atoms.map(a => [a[1], a[2], a[3]])), atoms = d.atoms.map((a, i) => ({ el: a[0], p: P[i] }));
      cur = new THREE.Group(); cur.add(ligandGroup(atoms, d.bonds, { carbon, halo: 2 }));
      for (const h of highlight) { const a = atoms[h.atom]; if (a) cur.add(glow(a.p, h.color, 4.6, .95)); }
      v.root.add(cur); v.render();
    },
    dispose() { v?.dispose(); },
  };
}
