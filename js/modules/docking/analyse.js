// Step 7 — Analyse results. Evidence is added layer by layer; the best pick often changes.
// Hydrogen bonds, hydrophobic contacts, key residues and efficiency are computed from the 3D coordinates.
import { h, feedback } from '../../ui.js';
import { THREE, bond3d, callout, labelBar } from '../../viewer3d.js';
import { viewer, ligandGroup, pocketGroup, analyseLigands, le, KEYCOL } from './view.js';
import { quizlet } from './quizlet.js';

export function render(host, api) {
  const { stages } = api.data.analyse, key = api.data.target.keyResidues, st = api.data.structure, ligands = analyseLigands(api.data);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'This is the step students find hardest: the program has given you numbers and poses, so what now? The answer is to add layers of evidence. A compound that looks best on the score alone often looks different once you check interactions, size and the pose.'),
    h('p', {}, `Mock results for ${api.data.target.name}. Celecoxib, the known drug, is included for comparison. Add one layer of evidence at a time and choose your current best compound after each.`));
  let level = 0; const picks = []; let pick = null, v = null; const dyn = new THREE.Group(), names = new THREE.Group();
  const tblWrap = h('div', { class: 'tblwrap' }), stageBox = h('div', {});
  const cols = () => {
    const c = [{ k: 'name', t: 'Compound' }, { k: 'score', t: 'Score (kcal/mol)', num: true }];
    if (level >= 1) c.push({ k: 'hb', t: 'H-bond residues', num: true }, { k: 'hy', t: 'Hydrophobic contacts', num: true });
    if (level >= 2) c.push({ k: 'key', t: `Key residues hit (of ${key.length})`, num: true });
    if (level >= 3) c.push({ k: 'ha', t: 'Heavy atoms', num: true }, { k: 'le', t: 'Ligand efficiency', num: true });
    if (level >= 4) c.push({ k: 'inside', t: 'Inside pocket', num: true }, { k: 'overlay', t: 'RMSD to celecoxib (Å)', num: true });
    return c;
  };
  const cell = (l, k) => ({ name: l.name, score: l.score.toFixed(1), hb: l.hbonds.length, hy: l.hydrophobic.length, key: l.hbonds.filter(r => key.includes(r)).length, ha: l.ha, le: le(l).toFixed(2), inside: `${l.inside}%`, overlay: l.id === 'ref' ? '–' : l.overlay.toFixed(1) }[k]);
  const show = () => {
    if (!v) return; [...dyn.children].forEach(c => dyn.remove(c));
    const l = ligands.find(x => x.id === (pick || 'ref'));
    const res = level >= 1 ? [...new Set([...l.hbonds, ...l.hydrophobic])] : [];
    dyn.add(pocketGroup(st, { show: res, labels: level >= 1 ? l.hbonds : [], highlight: level >= 2 ? key : [], focus: level >= 1 ? l.hbonds : [] }), ligandGroup(l.atoms, l.bonds, { halo: 3 }));
    if (level >= 1) for (const b of l.hbondList) dyn.add(bond3d(l.atoms[b.atom].p, b.pos));
    [...names.children].forEach(c => names.remove(c));
    const cen = l.atoms.reduce((q, a) => [q[0] + a.p[0] / l.atoms.length, q[1] + a.p[1] / l.atoms.length, q[2] + a.p[2] / l.atoms.length], [0, 0, 0]);
    names.add(callout(`The ligand: ${l.id === 'ref' ? 'celecoxib' : 'compound ' + l.id}`, cen, [10, -7, 5], KEYCOL.ligand));
    const rl = level >= 1 ? l.hbondList[0] : null, rr = rl && st.pocket.find(r => r.label === rl.res);
    if (rr) { const at = rr.atoms.reduce((q, a) => [q[0] + a[1] / rr.atoms.length, q[1] + a[2] / rr.atoms.length, q[2] + a[3] / rr.atoms.length], [0, 0, 0]); names.add(callout(`Residue: ${rr.label}`, at, [-9, 3, 5], KEYCOL.residue)); }
    if (rl) names.add(callout('Hydrogen bond', [(l.atoms[rl.atom].p[0] + rl.pos[0]) / 2, (l.atoms[rl.atom].p[1] + rl.pos[1]) / 2, (l.atoms[rl.atom].p[2] + rl.pos[2]) / 2], [-10, -9, 5], KEYCOL.hbond));
    v.render();
  };
  const draw = () => {
    const c = cols();
    tblWrap.replaceChildren(h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'My pick'), c.map(x => h('th', { class: x.num ? 'num' : '' }, x.t)))),
      h('tbody', {}, ligands.map(l => h('tr', { class: pick === l.id ? 'is-pick' : '' },
        h('td', {}, l.id === 'ref' ? '—' : h('input', { type: 'radio', name: 'pick', 'aria-label': `Pick ${l.name}`, checked: pick === l.id || null, onchange: () => { pick = l.id; picks[level] = l.id; api.log(`pick_stage${level}`, l.id); draw(); } })),
        c.map(x => h('td', { class: x.num ? 'num' : '' }, cell(l, x.k))))))));
    const sg = stages[level];
    stageBox.replaceChildren(
      h('p', {}, h('strong', {}, `Layer ${level + 1} of ${stages.length}: ${sg.title}. `), sg.lesson),
      level < stages.length - 1
        ? h('button', { class: 'btn-start btn-start--small', type: 'button', disabled: !pick || null, onclick: () => { level++; draw(); } }, `Add: ${stages[level + 1].title} →`)
        : finalBox());
    show();
  };
  const finalBox = () => {
    const changed = new Set(picks.filter(Boolean)).size > 1;
    api.done({ firstPick: picks[0] || '', finalPick: pick || '', changedMind: changed ? 1 : 0 });
    return h('div', { class: 'stack' }, feedback(pick === 'B' ? 'ok' : 'bad', pick === 'B' ? 'Good: Compound B is the strongest candidate' : 'Look again: compound B is the strongest candidate',
      h('p', {}, 'Compound B keeps all the key hydrogen bonds of celecoxib, scores better than celecoxib, has similar ligand efficiency, and its pose overlays the celecoxib pose. ',
        h('strong', {}, 'Compound A'), ' has the best score, but it is large (low efficiency), sits only 62% inside the pocket and has no sulfonamide hydrogen bonds to His90, Gln192 or Arg513: its score is inflated by size. ',
        h('strong', {}, 'Compound C'), ' scores lower but is small and efficient, so it could be a good starting point to grow.')),
      h('p', { class: 'hint' }, 'The 3D view above shows your current pick. Turn it and compare compounds A, B and C.'));
  };
  host.append(h('h3', {}, 'Look at it in 3D'));
  v = viewer(host, { height: 440, dist: 34 });
  if (v) { v.root.add(dyn, names); host.append(labelBar(names, [{ label: 'Ligand: the compound in the pocket', color: KEYCOL.ligand }, { label: 'Residue: a protein amino acid that bonds to it', color: KEYCOL.residue }, { label: 'Hydrogen bond: the glowing beads', color: KEYCOL.hbond }])); host.append(h('p', { class: 'hint' }, 'Glowing yellow beads are hydrogen bonds. Bright sticks are the residues that bond to the compound, and a red glow marks a key residue. Faded sticks are other contacts. Compound A has no sulfonamide: it reaches out of the pocket instead. Residue numbers follow the usual COX-2 literature.')); }
  host.append(tblWrap, stageBox);
  draw();
  host.append(h('div', { class: 'stack' }, h('h3', {}, 'Check your understanding'), quizlet(api, [
    { id: 'le', q: 'Why can a very large molecule have a better score than a small one even when it is not a better binder per atom?', options: ['It touches more of the protein, so it collects more interaction energy; ligand efficiency corrects for size', 'Large molecules are always better binders', 'Scores ignore size completely', 'Large molecules have fewer atoms'], answer: 0, why: 'Score tends to grow with size. Ligand efficiency (score divided by heavy atoms) shows binding per atom.' },
    { id: 'first', q: 'What is the first thing you check on a promising top pose?', options: ['Does it sit inside the pocket with chemically sensible interactions, especially key residues, and no clashes?', 'Whether the file name is short', 'Whether the score has two decimals', 'Whether the ligand is red'], answer: 0, why: 'A pose that is outside the pocket or misses key residues cannot be trusted, whatever its score.' },
  ], { onAll: () => api.unlockNext() })), api.nav(true));
  return () => v?.dispose();
}
