// Step 7 — Analyse results. Evidence is added layer by layer; the best pick often changes.
import { h, svg, feedback } from '../../ui.js';
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
  const draw = () => {
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
      interactionPlot(ligands.find(l => l.id === (pick && pick !== 'ref' ? pick : 'B'))));
    return wrap;
  };
  const interactionPlot = l => {
    const n = l.hbonds.length + l.hydrophobic.length, R = 120, cx = 190, cy = 150;
    const root = svg('svg', { class: 'scene', viewBox: '0 0 380 300', style: 'max-width:480px', role: 'img', 'aria-label': `Interaction diagram for ${l.name}` });
    root.append(svg('circle', { cx, cy, r: 34, fill: 'var(--spark-400)', stroke: 'var(--sticker-ink)', 'stroke-width': 3 }), svg('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', 'font-size': 15, style: 'fill:var(--on-spark)' }, l.id === 'ref' ? 'Ref' : l.id));
    [...l.hbonds.map(r => [r, 'h']), ...l.hydrophobic.map(r => [r, 'p'])].forEach(([r, t], i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * R * 1.2, y = cy + Math.sin(a) * R * .85, isKey = key.includes(r);
      root.append(svg('line', { x1: cx + Math.cos(a) * 34, y1: cy + Math.sin(a) * 34, x2: x - Math.cos(a) * 20, y2: y - Math.sin(a) * 18, stroke: t === 'h' ? 'var(--bright-blue-400)' : 'var(--slate-400)', 'stroke-width': t === 'h' ? 3 : 2, 'stroke-dasharray': t === 'h' ? '6 4' : '2 4' }),
        svg('ellipse', { cx: x, cy: y, rx: 36, ry: 16, fill: t === 'h' ? 'color-mix(in srgb, var(--bright-blue-400) 28%, var(--surface-000))' : 'var(--surface-100)', stroke: isKey ? 'var(--coral-400)' : 'var(--glass-edge)', 'stroke-width': isKey ? 3 : 2 }),
        svg('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 12 }, r));
    });
    return h('div', { class: 'stack' }, h('h3', {}, `Interactions of ${l.name}`), root,
      h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--bright-blue-400)' }), 'hydrogen bond'), h('span', {}, h('i', { style: 'background:var(--slate-400)' }), 'hydrophobic contact'), h('span', {}, h('i', { style: 'border:2px solid var(--coral-400)' }), 'key residue')));
  };
  host.append(tblWrap, stageBox);
  draw();
  const quiz = h('div', { class: 'stack' }, h('h3', {}, 'Check your understanding'), quizlet(api, [
    { id: 'le', q: 'Why can a very large molecule have a better score than a small one even when it is not a better binder per atom?', options: ['It touches more of the protein, so it collects more interaction energy; ligand efficiency corrects for size', 'Large molecules are always better binders', 'Scores ignore size completely', 'Large molecules have fewer atoms'], answer: 0, why: 'Score tends to grow with size. Ligand efficiency (score divided by heavy atoms) shows binding per atom.' },
    { id: 'first', q: 'What is the first thing you check on a promising top pose?', options: ['Does it sit inside the pocket with chemically sensible interactions, especially key residues, and no clashes?', 'Whether the file name is short', 'Whether the score has two decimals', 'Whether the ligand is red'], answer: 0, why: 'A pose that is outside the pocket or misses key residues cannot be trusted, whatever its score.' },
  ], { onAll: () => api.unlockNext() }));
  host.append(quiz, api.nav(true));
}
