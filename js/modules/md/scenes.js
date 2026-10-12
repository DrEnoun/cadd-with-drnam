// 3D scenes for Module 6: the docked complex with a moving ligand (illustrative), and a live particle box.
import { THREE, createViewer, pocketGroup, ligandGroup } from '../../viewer3d.js';

/** Particle box viewer driven by an LJSim. Returns { v, sim, setSteps }. */
export function particleView(host, sim, { height = 380 } = {}) {
  const v = createViewer(host, { height, dist: 3.2 * sim.L, yaw: .6, pitch: .3, autoRotate: false });
  if (!v) return null;
  const geo = new THREE.SphereGeometry(.5, 14, 10), mat = new THREE.MeshStandardMaterial({ color: 0x4d8dff, roughness: .35, emissive: 0x16306b, emissiveIntensity: .5 }), mesh = new THREE.InstancedMesh(geo, mat, sim.N);
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sim.L, sim.L, sim.L)), new THREE.LineBasicMaterial({ color: 0x9fb4d6 })), m4 = new THREE.Matrix4(), col = new THREE.Color();
  v.root.add(mesh, box); v.root.position.set(0, 0, 0); v.state.target.set(0, 0, 0);
  const ctl = { steps: 4, run: true, color: 'speed' };
  const draw = () => {
    for (let i = 0; i < sim.N; i++) {
      const x = sim.x[3 * i] - sim.L / 2, y = sim.x[3 * i + 1] - sim.L / 2, z = sim.x[3 * i + 2] - sim.L / 2, s = Math.min(1.6, Math.hypot(sim.v[3 * i], sim.v[3 * i + 1], sim.v[3 * i + 2]) / 2.2 + .3);
      if (!Number.isFinite(x + y + z)) { m4.makeScale(0, 0, 0); } else m4.makeTranslation(x, y, z);
      mesh.setMatrixAt(i, m4); col.setHSL(.62 - .6 * Math.min(1, s / 1.6), .85, .55); mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; v.render();
  };
  v.onFrame = () => { if (ctl.run) { for (let k = 0; k < ctl.steps; k++) sim.step(); ctl.onStep?.(); } draw(); };
  draw();
  return { v, ctl, draw };
}

/** The COX-2 pocket with celecoxib that is displaced by the (simulated) ligand distance. Illustrative motion, not a real trajectory. */
export function complexScene(host, st, { height = 440 } = {}) {
  const v = createViewer(host, { height, dist: 44, yaw: .7, pitch: .25 });
  if (!v) return null;
  const lig = ligandGroup(st.ligand.atoms.map(a => ({ el: a[0], p: [a[1], a[2], a[3]] })), st.ligand.bonds, { halo: 3 }), dir = new THREE.Vector3(.55, .35, .76).normalize();
  v.root.add(pocketGroup(st, { show: 'all', labels: [], highlight: [], focus: [] }), lig);
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  v.setDisplacement = (d, wob = .25) => { lig.position.set(dir.x * d + (rnd() - .5) * wob, dir.y * d + (rnd() - .5) * wob, dir.z * d + (rnd() - .5) * wob); v.render(); };
  return v;
}
