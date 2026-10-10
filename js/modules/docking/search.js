// Step 2 — Search and score, in 3D. The student acts as the search algorithm, then watches the computer try many poses.
import { h } from '../../ui.js';
import { modeBar, THREE } from '../../viewer3d.js';
import { rotMat, mul, makePose, place, scorePose, IDENT, cross, scale, add, unit } from './geom.js';
import { viewer, ligandGroup, pocketGroup, ligandAtoms, ligandPoints } from './view.js';
import { quizlet } from './quizlet.js';

const rnd = () => Math.random(), gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.7;
const randAxis = () => unit([gauss(), gauss(), gauss()]);

export function render(host, api) {
  const D = api.data, env = { ...D.pocket3d, ring: D.ligand3d.ring }, base = ligandPoints(D), els = D.ligand3d.atoms.map(a => a[0]);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Every docking program does two jobs: it ', h('strong', {}, 'searches'), ' many positions and orientations of the ligand, and it ', h('strong', {}, 'scores'), ' each one. Understanding this pair explains almost everything else, including why the search box matters and why scores are only estimates.'),
    h('p', {}, 'Try it yourself: put the ligand into the pocket. Use the buttons to choose what dragging does. A ', h('strong', {}, 'good pose'), ' makes three hydrogen bonds (yellow dots between the ligand and the red or blue residue tips), sits the flat ring against the greasy residues (grey balls), and keeps every atom inside the pocket.'));
  const pose = { R: rotMat([1, 1, 0], 110), t: [7, -5, -3] }; let best = Infinity;
  const v = viewer(host, { height: 460, dist: 46 });
  const lig = ligandGroup(ligandAtoms(D), D.ligand3d.bonds); const ghosts = new THREE.Group();
  const hbLines = new THREE.Group();
  if (v) { v.root.add(pocketGroup(D.pocket3d, { highlight: ['ASP86', 'GLU64', 'LYS33'] }), lig, ghosts, hbLines); v.view({ yaw: .15, pitch: .15 }); }

  const meter = h('div', { class: 'meter' }, h('i')), sc = h('b', {}), stats = h('div', { class: 'pose-stats' }), bestLbl = h('p', {}), result = h('p', {});
  const placed = () => place(base, pose).map((p, i) => ({ el: els[i], p }));
  const redraw = (skipBest = false) => {
    const atoms = placed(); lig.userData.setAtoms(atoms);
    const s = scorePose(atoms, env);
    sc.textContent = s.total.toFixed(1); meter.firstChild.style.width = `${Math.max(0, Math.min(100, -s.total / 8 * 100))}%`;
    const formed = s.bonds.filter(b => b.e < -0.5).length;
    stats.replaceChildren(...[['Hydrogen bonds', `${formed} of 3`], ['Ring in greasy pocket', `${(-s.hy).toFixed(1)}`], ['Clashes', s.clash.toFixed(1)], ['Atoms outside pocket', s.out]].map(([k, val]) => h('span', {}, `${k}: `, h('b', {}, val))));
    if (!skipBest && s.total < best) { best = s.total; bestLbl.textContent = `Your best so far: ${best.toFixed(1)} kcal/mol (mock units).`; }
    if (s.total < -6 && !api._found) { api._found = true; api.log('manual_found', s.total.toFixed(1)); }
    hbLines.clear?.(); [...hbLines.children].forEach(c => hbLines.remove(c));
    if (v) for (const b of s.bonds) if (b.e < -0.3) { const hp = env.hbondPairs.find(x => x.res === b.res); hbLines.add(dashedLine(atoms[hp.atom].p, env.residues[b.res].pos)); }
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
    for (let i = 0; i < 500; i++) { const p = { R: rotMat(randAxis(), rnd() * 360), t: scale(unit([gauss(), gauss(), gauss()]), rnd() * 6) }; const s = evalPose(p); trials.push({ p, s }); if (!top || s < top.s) top = { p, s }; }
    trials.sort((a, b) => a.s - b.s);
    if (v) trials.slice(1, 4).forEach(({ p }) => { const g = ligandGroup(place(base, p).map((q, i) => ({ el: els[i], p: q })), D.ligand3d.bonds, { opacity: .3, outline: false }); ghosts.add(g); });
    for (let k = 0; k < 900; k++) { const f = 1 - k / 900; const q = { R: mul(rotMat(randAxis(), gauss() * 7 * f + .3), top.p.R), t: add(top.p.t, scale([gauss(), gauss(), gauss()], .45 * f + .03)) }; const s = evalPose(q); if (s < top.s) top = { p: q, s }; }
    pose.R = top.p.R; pose.t = top.p.t; redraw(true);
    result.textContent = `The computer tried 500 random poses (faint copies show the next best ones), then improved the best one with 900 small steps. Best score: ${top.s.toFixed(1)}${best <= top.s + .05 ? `. Your best was ${best.toFixed(1)}, as good or better!` : `. Your best was ${best.toFixed(1)}.`} Real programs do this far more cleverly, but the idea is the same.`;
    api.log('auto_search', top.s.toFixed(1)); api.done({ manualBest: +best.toFixed(2), autoBest: +top.s.toFixed(2) }); quizSlot.hidden = false;
  }
  host.append(
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
