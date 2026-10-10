// Step 2 — Search and score, in 3D. The student acts as the search algorithm, then watches the computer try many poses.
import { h } from '../../ui.js';
import { modeBar, THREE, bond3d, callout } from '../../viewer3d.js';
import { rotMat, mul, place, scorePose, makeEnv, scale, add, unit } from './geom.js';
import { viewer, ligandGroup, pocketGroup, ligandAtoms, ligandPoints, nameParts, labelBar, KEYCOL } from './view.js';
import { quizlet } from './quizlet.js';

const rnd = () => Math.random(), gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.7;
const randAxis = () => unit([gauss(), gauss(), gauss()]);

export function render(host, api) {
  const D = api.data, st = D.structure, env = makeEnv(st, D.ligandGroups.grease), base = ligandPoints(D), els = st.ligand.atoms.map(a => a[0]);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Every docking program does two jobs: it ', h('strong', {}, 'searches'), ' many positions and orientations of the ligand, and it ', h('strong', {}, 'scores'), ' each one. Understanding this pair explains almost everything else, including why the search box matters and why scores are only estimates.'),
    h('p', {}, 'Try it yourself: put the ligand into the pocket. Use the buttons to choose what dragging does. A ', h('strong', {}, 'good pose'), ' makes the hydrogen bonds of the sulfonamide group (yellow dots), tucks the greasy rings and CF₃ group into the hydrophobic channel, and has no clashes with the protein. Hint: the sulfonamide (the yellow S with two red O and a blue N) belongs near His90, Gln192 and Arg513.'));
  const pose = { R: rotMat([0, 1, 1], 70), t: [3, -2, 2] }; let best = Infinity;
  const v = viewer(host, { height: 460, dist: 34 });
  const lig = ligandGroup(ligandAtoms(D), st.ligand.bonds, { halo: 3 }); const ghosts = new THREE.Group();
  const hbLines = new THREE.Group();
  if (v) { v.root.add(pocketGroup(st, { show: ['HIS90', 'GLN192', 'ARG513', 'LEU352', 'SER353'], labels: ['HIS90', 'GLN192', 'ARG513'], highlight: D.target.keyResidues, focus: ['HIS90', 'GLN192', 'ARG513', 'LEU352', 'SER353'] }), lig, ghosts, hbLines); v.view({ yaw: .15, pitch: .15 }); }

  let parts = null, hbCall = null;
  if (v) { parts = nameParts(v, st, ['ligand', 'residue', 'hbond'], { residueLabel: 'ARG513' }); hbCall = callout('Hydrogen bond', [0, 0, 0], [-9, -9, 5], KEYCOL.hbond); hbCall.visible = false; parts.group.add(hbCall); }
  const meter = h('div', { class: 'meter' }, h('i')), sc = h('b', {}), stats = h('div', { class: 'pose-stats' }), bestLbl = h('p', {}), result = h('p', {});
  const placed = () => place(base, pose).map((p, i) => ({ el: els[i], p }));
  const redraw = (skipBest = false) => {
    const atoms = placed(); lig.userData.setAtoms(atoms);
    const s = scorePose(atoms, env);
    sc.textContent = s.total.toFixed(1); meter.firstChild.style.width = `${Math.max(0, Math.min(100, -s.total / 8 * 100))}%`;
    const formed = s.bonds.filter(b => b.e < -0.5).length;
    stats.replaceChildren(...[['Hydrogen bonds', `${formed} of ${s.bonds.length}`], ['Ring in greasy pocket', `${(-s.hy).toFixed(1)}`], ['Atoms clashing with the protein', s.clashAtoms]].map(([k, val]) => h('span', {}, `${k}: `, h('b', {}, val))));
    if (!skipBest && s.total < best) { best = s.total; bestLbl.textContent = `Your best so far: ${best.toFixed(1)} kcal/mol (mock units).`; }
    if (s.total < -7 && !api._found) { api._found = true; api.log('manual_found', s.total.toFixed(1)); }
    hbLines.clear?.(); [...hbLines.children].forEach(c => hbLines.remove(c));
    if (v) for (const b of s.bonds) if (b.e < -0.3) { hbLines.add(bond3d(atoms[b.atom].p, b.pos)); }
    if (parts) {
      const c = atoms.reduce((q, a) => [q[0] + a.p[0] / atoms.length, q[1] + a.p[1] / atoms.length, q[2] + a.p[2] / atoms.length], [0, 0, 0]);
      parts.ligand.userData.set(c, [10, -7, 5]);
      const f = s.bonds.filter(b => b.e < -0.3).sort((a, b) => a.e - b.e)[0];
      hbCall.visible = !!f; if (f) hbCall.userData.set([(atoms[f.atom].p[0] + f.pos[0]) / 2, (atoms[f.atom].p[1] + f.pos[1]) / 2, (atoms[f.atom].p[2] + f.pos[2]) / 2], [-9, -9, 5]);
    }
    v?.render(); return s;
  };
  function dashedLine(a, b) { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const t = (i + .5) / 6, m = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd23a })); m.position.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); g.add(m); } return g; }

  if (v) v.onDrag = (mode, dx, dy, c) => {
    if (mode === 'move') pose.t = add(pose.t, add(scale(c.right, dx * c.perPx), scale(c.up, -dy * c.perPx)));
    else if (mode === 'turn') pose.R = mul(mul(rotMat(c.up, dx * .7), rotMat(c.right, dy * .7)), pose.R);
    redraw();
  };
  const spin = (axis, deg, t) => h('button', { class: 'sticker', type: 'button', 'aria-label': `Turn ligand ${t}`, onclick: () => { pose.R = mul(rotMat(axis, deg), pose.R); redraw(); } }, t);
  const slide = (i, name) => h('label', { class: 'row' }, h('span', { style: 'min-width:90px' }, name), h('input', { type: 'range', min: -12, max: 12, step: .2, value: pose.t[i], 'aria-label': `Move ligand ${name}`, style: 'flex:1;min-width:160px', oninput: e => { pose.t[i] = +e.target.value; redraw(); } }));
  const fine = h('details', { class: 'fine' }, h('summary', {}, 'Fine controls (sliders and buttons)'),
    slide(0, 'left / right'), slide(1, 'down / up'), slide(2, 'back / front'),
    h('div', { class: 'row' }, 'Turn:', spin([1, 0, 0], 20, '↻ x'), spin([0, 1, 0], 20, '↻ y'), spin([0, 0, 1], 20, '↻ z'), spin([1, 0, 0], -20, '↺ x'), spin([0, 1, 0], -20, '↺ y'), spin([0, 0, 1], -20, '↺ z')));

  const auto = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: runSearch }, 'Let the computer search');
  function runSearch() {
    ghosts.clear?.(); [...ghosts.children].forEach(c => ghosts.remove(c));
    const trials = []; let top = null;
    const evalPose = p => scorePose(place(base, p).map((q, i) => ({ el: els[i], p: q })), env).total;
    for (let i = 0; i < 250; i++) { const p = { R: rotMat(randAxis(), rnd() * 360), t: scale(unit([gauss(), gauss(), gauss()]), rnd() * 5) }; const s = evalPose(p); trials.push({ p, s }); if (!top || s < top.s) top = { p, s }; }
    trials.sort((a, b) => a.s - b.s);
    if (v) trials.slice(1, 4).forEach(({ p }) => { const g = ligandGroup(place(base, p).map((q, i) => ({ el: els[i], p: q })), st.ligand.bonds, { opacity: .3, outline: false }); ghosts.add(g); });
    for (let k = 0; k < 300; k++) { const f = 1 - k / 300; const q = { R: mul(rotMat(randAxis(), gauss() * 6 * f + .3), top.p.R), t: add(top.p.t, scale([gauss(), gauss(), gauss()], .4 * f + .03)) }; const s = evalPose(q); if (s < top.s) top = { p: q, s }; }
    pose.R = top.p.R; pose.t = top.p.t; redraw(true);
    result.textContent = `The computer tried 250 random poses (faint copies show the next best ones), then improved the best one with 300 small steps. Best score: ${top.s.toFixed(1)}${best <= top.s + .05 ? `. Your best was ${best.toFixed(1)}, as good or better!` : `. Your best was ${best.toFixed(1)}.`} Real programs do this far more cleverly, but the idea is the same.`;
    api.log('auto_search', top.s.toFixed(1)); api.done({ manualBest: +best.toFixed(2), autoBest: +top.s.toFixed(2) }); quizSlot.hidden = false;
  }
  host.append(
    parts ? labelBar(parts.group, parts.items) : null,
    v ? modeBar(v, [['view', 'Rotate the view'], ['move', 'Move the ligand'], ['turn', 'Turn the ligand']]) : h('p', {}, 'Use the fine controls below.'),
    h('p', { class: 'hint' }, 'Tip: pinch or scroll to zoom. Switch to "Rotate the view" to look at the pocket from other sides, because depth is hard to judge from one angle.'),
    h('div', { class: 'row', style: 'margin-top:12px' }, h('div', { class: 'kv' }, h('span', {}, 'Score (kcal/mol, mock)'), sc), h('div', { style: 'flex:1;min-width:160px' }, meter)), stats, bestLbl, fine,
    h('div', { class: 'row', style: 'margin-top:12px' }, auto), result);
  redraw();

  const quizSlot = h('div', { class: 'stack', hidden: true }, h('h3', {}, 'Check your understanding'), quizlet(api, [
    { id: 'sc', q: 'In this activity, which part ranked the poses?', options: ['The scoring function', 'The search box', 'The protein structure file', 'The ligand name'], answer: 0, why: 'The score ranks the poses. The search decides which poses get tried.' },
    { id: 'rb', q: 'A ligand with many rotatable bonds (very flexible) is harder to dock because…', options: ['the number of possible poses grows enormously', 'the protein becomes smaller', 'the score is always better', 'hydrogens disappear'], answer: 0, why: 'Each rotatable bond adds more shapes to try, so the search space explodes. That is why ligand preparation and sensible settings matter.' },
  ], { onAll: () => api.unlockNext() }));
  host.append(quizSlot,
    h('div', { class: 'card sticker-static', style: 'margin-top:20px' }, h('h3', {}, 'Rigid or flexible?'),
      h('p', {}, 'The first idea of binding was a rigid ', h('strong', {}, 'lock and key'), '. Real proteins move a little to fit the ligand (', h('strong', {}, 'induced fit'), '). Most docking programs keep the protein rigid, or allow only a few side chains to move, to stay fast. That is one reason a docking result is a prediction to be tested, not a fact.')),
    api.nav(true));
  return () => v?.dispose();
}
