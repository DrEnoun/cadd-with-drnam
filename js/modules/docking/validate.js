// Step 6 — Validation by redocking, in 3D. RMSD is computed from the atom coordinates of the moved ligand.
import { h, feedback } from '../../ui.js';
import { THREE, dashed, callout, labelBar } from '../../viewer3d.js';
import { rotMat, place, rmsd, poseRmsd } from './geom.js';
import { viewer, ligandGroup, pocketGroup, ligandAtoms, ligandPoints, KEYCOL } from './view.js';

export { poseRmsd };

export function render(host, api) {
  const D = api.data, V = D.validate, st = D.structure, base = ligandPoints(D), els = st.ligand.atoms.map(a => a[0]);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'You cannot tell if your docking setup works by looking at new compounds, because you do not know the right answer for them. But for the original ligand you do: the crystal structure shows where it really sits. If your protocol cannot put it back where it belongs, it cannot be trusted for new compounds. This check is called ',
      h('strong', {}, 'redocking'), '.'),
    h('p', {}, h('strong', {}, 'RMSD'), ' (root-mean-square deviation) measures how far the docked atoms are from the crystal atoms, in Å. As a rule of thumb, ', h('strong', {}, '2 Å or less'), ' counts as a successful redocking.'),
    h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:#d4ff3a' }), 'Crystal ligand (the truth)'), h('span', {}, h('i', { style: 'background:#fc7a7a' }), 'Docked pose'), h('span', {}, 'Dotted lines join matching atoms')));
  const v = viewer(host, { height: 440, dist: 34 });
  const dyn = new THREE.Group();
  if (v) v.root.add(pocketGroup(st, { show: ['HIS90', 'GLN192', 'ARG513'] }), ligandGroup(ligandAtoms(D), st.ligand.bonds, { halo: 3 }), dyn);
  let si = 0, pi = 0, nameT = null, nameD = null; const names = new THREE.Group();
  if (v) { nameT = callout('Crystal ligand: the truth', [0, 0, 0], [-12, 8, 4], KEYCOL.ligand); nameD = callout('Docked pose: the prediction', [0, 0, 0], [12, -8, 4], KEYCOL.docked); names.add(nameT, nameD); v.root.add(names); host.append(labelBar(names, [{ label: 'Crystal ligand: where the drug really sits', color: KEYCOL.ligand }, { label: 'Docked pose: where the program put it', color: KEYCOL.docked }, { label: 'Dotted lines: distance between matching atoms', color: '#ffffff' }])); }
  const info = h('div', {}), setupTabs = h('div', { class: 'row' }), poseTabs = h('div', { class: 'row' });
  const draw = () => {
    const s = V.setups[si], p = s.poses[pi], q = place(base, { R: rotMat(p.rot.slice(0, 3), p.rot[3]), t: p.t });
    const r = rmsd(base, q);
    if (v) {
      [...dyn.children].forEach(c => dyn.remove(c));
      dyn.add(ligandGroup(q.map((pp, i) => ({ el: els[i], p: pp })), st.ligand.bonds, { carbon: 0xfc7a7a, halo: 3 }));
      base.forEach((b, i) => dyn.add(dashed(b, q[i], 0xffffff, 5)));
      const cen = q.reduce((c, pp) => [c[0] + pp[0] / q.length, c[1] + pp[1] / q.length, c[2] + pp[2] / q.length], [0, 0, 0]);
      nameD.userData.set(cen, [12, -8, 4]);
      v.render();
    }
    info.replaceChildren(h('p', {}, s.desc), h('div', { class: 'kv' }, h('span', {}, `Pose ${p.rank} · score ${p.score}`), h('span', {}, 'RMSD'), h('b', {}, `${r.toFixed(1)} Å`), h('span', { class: 'tag' }, r <= 2 ? 'Success (≤ 2 Å)' : 'Failed (> 2 Å)')));
    setupTabs.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === si)));
    poseTabs.replaceChildren(h('span', { class: 'muted' }, 'Poses:'), ...s.poses.map((pp, k) => h('button', { class: 'sticker', type: 'button', 'aria-pressed': String(k === pi), onclick: () => { pi = k; draw(); api.log(`view_${s.id}_${pp.rank}`, 1); } }, `Pose ${pp.rank}${pp.rank === 1 ? ' (best score)' : ''}`)));
  };
  V.setups.forEach((s, i) => setupTabs.append(h('button', { class: 'sticker', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { si = i; pi = 0; draw(); } }, s.title)));
  host.append(h('div', { class: 'row', style: 'margin-top:10px' }, h('span', { class: 'muted' }, 'Setup:'), setupTabs), poseTabs, info,
    h('p', { class: 'hint' }, 'Drag to turn the view. Look at each setup and its three poses, then decide below.'));
  draw();

  const verdicts = {}, list = h('div', { class: 'stack' });
  V.setups.forEach(s => {
    const choose = h('div', { class: 'row' }, [['valid', 'Protocol is valid'], ['fix', 'Go back and fix the setup'], ['caution', 'Setup is fine but scoring is unreliable']].map(([k, t]) =>
      h('button', { class: 'sticker', type: 'button', 'aria-pressed': 'false', 'data-k': k, onclick: () => { verdicts[s.id] = k; choose.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); } }, t)));
    list.append(h('div', { class: 'card sticker-static stack', 'data-id': s.id }, h('h3', { style: 'margin:0' }, `Your decision for ${s.title}`), choose, h('div', { class: 'fbslot' })));
  });
  const out = h('div', {});
  const msgs = { valid: 'The top-ranked pose is within 2 Å of the crystal pose, so this protocol reproduces the known answer. You can go on to dock new compounds.',
    fix: 'No pose is close to the crystal pose, so the setup is wrong (here: missing hydrogens and a box that is too small). Fix the preparation and the box, then redock before trusting anything.',
    caution: 'A good pose exists (rank 3, within 2 Å) but the scoring function ranks wrong poses higher. Docking can find the answer here but cannot rank it, so use more care: inspect poses by eye, try another scoring function or consensus scoring.' };
  const btn = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
    if (V.setups.some(s => !verdicts[s.id])) { out.replaceChildren(feedback('bad', 'Make a decision for every setup first.')); return; }
    let right = 0;
    V.setups.forEach(s => {
      const ok = verdicts[s.id] === s.verdict; if (ok) right++;
      list.querySelector(`[data-id="${s.id}"] .fbslot`).replaceChildren(feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', msgs[s.verdict]));
      api.log(`verdict_${s.id}`, verdicts[s.id]);
    });
    out.replaceChildren(h('strong', {}, `${right} of ${V.setups.length} correct.`));
    api.done({ correct: right, of: V.setups.length }); api.unlockNext();
  } }, 'Check my decisions');
  host.append(list, h('div', { class: 'row', style: 'margin-top:16px' }, btn), out,
    h('div', { class: 'card sticker-static', style: 'margin-top:16px' }, h('h3', {}, 'Remember'), h('p', {}, 'Always validate before you screen. A protocol that fails redocking should be fixed first. Some groups also dock known active and inactive compounds to see if the protocol can tell them apart.')),
    api.nav(true));
  return () => v?.dispose();
}
