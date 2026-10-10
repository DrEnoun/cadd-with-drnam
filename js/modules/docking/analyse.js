// Step 7 — Analyse results. Evidence is added layer by layer; the best pick often changes.
import { h, feedback } from '../../ui.js';
import { THREE, dashed } from '../../viewer3d.js';
import { viewer, ligandGroup, pocketGroup, compound } from './view.js';
import { quizlet } from './quizlet.js';

export const le = l => -l.score / l.ha;

export function render(host, api) {
  const { stages, ligands } = api.data.analyse; const key = api.data.target.keyResidues;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'This is the step students find hardest: the program has given you numbers and poses, so what now? The answer is to add layers of evidence. A compound that looks best on the score alone often looks different once you check interactions, size and the pose.'),
    h('p', {}, `Mock results for ${api.data.target.name}. A known reference inhibitor is included for comparison. Add one layer of evidence at a time and choose your current best compound after each.`));
  let level = 0; const picks = []; let pick = null;
  const tblWrap = h('div', { class: 'tblwrap' }); const stageBox = h('div', {});
  const cols = () => {
    const c = [{ k: 'name', t: 'Compound' }, { k: 'score', t: 'Score (kcal/mol)', num: true }];
    if (level >= 1) c.push({ k: 'hb', t: 'H-bonds', num: true }, { k: 'hy', t: 'Hydrophobic contacts', num: true });
    if (level >= 2) c.push({ k: 'key', t: `Key residues hit (of ${key.length})`, num: true });
    if (level >= 3) c.push({ k: 'ha', t: 'Heavy atoms', num: true }, { k: 'le', t: 'Ligand efficiency', num: true });
    if (level >= 4) c.push({ k: 'inside', t: 'Inside pocket', num: true }, { k: 'overlay', t: 'RMSD to reference (Å)', num: true });
    return c;
  };
  const cell = (l, k) => ({ name: l.name, score: l.score.toFixed(1), hb: l.hbonds.length, hy: l.hydrophobic.length, key: l.hbonds.filter(r => key.includes(r)).length, ha: l.ha, le: le(l).toFixed(2), inside: `${l.inside}%`, overlay: l.id === 'ref' ? '–' : l.overlay.toFixed(1) }[k]);
  let draw = () => {
    const c = cols();
    tblWrap.replaceChildren(h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'My pick'), c.map(x => h('th', { class: x.num ? 'num' : '' }, x.t)))),
      h('tbody', {}, ligands.map(l => h('tr', { class: pick === l.id ? 'is-pick' : '' },
        h('td', {}, l.id === 'ref' ? '—' : h('input', { type: 'radio', name: 'pick', 'aria-label': `Pick ${l.name}`, checked: pick === l.id || null, onchange: () => { pick = l.id; picks[level] = l.id; api.log(`pick_stage${level}`, l.id); draw(); } })),
        c.map(x => h('td', { class: x.num ? 'num' : '' }, cell(l, x.k))))))));
    const st = stages[level];
    stageBox.replaceChildren(
      h('p', {}, h('strong', {}, `Layer ${level + 1} of ${stages.length}: ${st.title}. `), st.lesson),
      level < stages.length - 1
        ? h('button', { class: 'btn-start btn-start--small', type: 'button', disabled: !pick || null, onclick: () => { level++; draw(); } }, `Add: ${stages[level + 1].title} →`)
        : finalBox());
  };
  const finalBox = () => {
    const changed = new Set(picks.filter(Boolean)).size > 1;
    api.done({ firstPick: picks[0] || '', finalPick: pick || '', changedMind: changed ? 1 : 0 });
    const wrap = h('div', { class: 'stack' });
    wrap.append(feedback(pick === 'B' ? 'ok' : 'bad', pick === 'B' ? 'Good: Compound B is the strongest candidate' : 'Look again: compound B is the strongest candidate',
      h('div', {}, h('p', {}, 'Compound B has a score better than the reference, all three key hydrogen bonds, ligand efficiency like the reference, and a pose that overlays the reference. ',
        h('strong', {}, 'Compound A'), ' has the best score, but it is large (45 heavy atoms, low efficiency), sits only 62% inside the pocket and misses the key residues: its score is inflated by size. ',
        h('strong', {}, 'Compound C'), ' scores lower but is small and efficient, so it could be a good starting point to grow.'))),
      h('p', { class: 'hint' }, 'The 3D view above shows your current pick. Turn it and compare compounds A, B and C.'));
    return wrap;
  };
  const hbAtom = (id, res) => ({ ASP86: 11, GLU64: 6, LYS33: 8, TYR90: id === 'A' ? 12 : -1 })[res];
  let v = null; const dyn = new THREE.Group();
  const show = () => {
    if (!v) return; [...dyn.children].forEach(c => dyn.remove(c));
    const l = ligands.find(x => x.id === (pick || 'ref')), env = api.data.pocket3d;
    const { atoms, bonds } = compound(api.data, l.id === 'ref' || l.id === 'B' ? 'B' : l.id);
    const resList = level >= 1 ? [...new Set([...l.hbonds, ...l.hydrophobic])] : [];
    dyn.add(pocketGroup(env, { showResidues: resList, highlight: level >= 2 ? key : [] }), ligandGroup(atoms, bonds));
    if (level >= 1) for (const r of l.hbonds) { const i = hbAtom(l.id, r); if (i >= 0 && atoms[i]) dyn.add(dashed(atoms[i].p, env.residues[r].pos)); }
    v.render();
  };
  host.append(h('h3', {}, 'Look at it in 3D'));
  v = viewer(host, { height: 420, dist: 50 }); if (v) { v.root.add(dyn); host.append(h('p', { class: 'hint' }, 'Yellow dots are hydrogen bonds. Grey balls are hydrophobic contacts. A red ring marks a key residue. Compound A sticks out of the pocket.')); }
  host.append(tblWrap, stageBox);
  const draw0 = draw; draw = () => { draw0(); show(); };
  draw();
  const quiz = h('div', { class: 'stack' }, h('h3', {}, 'Check your understanding'), quizlet(api, [
    { id: 'le', q: 'Why can a very large molecule have a better score than a small one even when it is not a better binder per atom?', options: ['It touches more of the protein, so it collects more interaction energy; ligand efficiency corrects for size', 'Large molecules are always better binders', 'Scores ignore size completely', 'Large molecules have fewer atoms'], answer: 0, why: 'Score tends to grow with size. Ligand efficiency (score divided by heavy atoms) shows binding per atom.' },
    { id: 'first', q: 'What is the first thing you check on a promising top pose?', options: ['Does it sit inside the pocket with chemically sensible interactions, especially key residues, and no clashes?', 'Whether the file name is short', 'Whether the score has two decimals', 'Whether the ligand is red'], answer: 0, why: 'A pose that is outside the pocket or misses key residues cannot be trusted, whatever its score.' },
  ], { onAll: () => api.unlockNext() }));
  host.append(quiz, api.nav(true));
  return () => v?.dispose();
}
