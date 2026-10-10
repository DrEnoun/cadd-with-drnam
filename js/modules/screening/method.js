// Step 5 — Two methods. Ligand-based (shape overlay on celecoxib) and structure-based (docking-style score) rankings in 3D.
import { h, feedback } from '../../ui.js';
import { createViewer, THREE, ligandGroup, pocketGroup, callout, labelBar, glow } from '../../viewer3d.js';
import { rankBy, enrichment } from './stats.js';
import { GROUP } from './scenes.js';
import { quizlet } from '../docking/quizlet.js';

export const METHODS = {
  lb: { name: 'Ligand-based: 3D shape overlay on celecoxib', score: c => c.shape, show: c => c.shape.toFixed(2), unit: 'shape overlap (0 to 1)', needs: 'a known active (celecoxib)', strong: 'Fast. Finds compounds that look like the known drug, even in a huge library.', weak: 'Misses actives with a different scaffold, and can favour compounds that merely look similar.' },
  sb: { name: 'Structure-based: docking-style score in the COX-2 pocket', score: c => -c.dock, show: c => c.dock.toFixed(1), unit: 'mock docking score (kcal/mol)', needs: 'a 3D structure of the target (3LN1)', strong: 'Does not need a known active. Can find new scaffolds that fit the pocket.', weak: 'Slower, and scoring functions are approximate: it can rank big or polar compounds too well.' },
};

export function render(host, api) {
  const lib = api.data.compounds, st = api.data.structure, nAct = lib.filter(c => c.active).length;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The two main ways to rank a library ask different questions. Ligand-based methods ask "which compounds look like a known active?". Structure-based methods ask "which compounds fit the pocket?". Each finds things the other misses, and knowing their strengths and weaknesses tells you when to use which.'),
    h('p', {}, 'The faint lime molecule is the crystal celecoxib in the COX-2 pocket. Each compound was overlaid on it in 3D. Pick a method, click compounds in the list to see their overlay, then take the top of the list as your hits.'));
  let method = 'lb', cur = lib.find(c => c.name === 'Celecoxib'), N = 9, revealed = false;
  const v = createViewer(host, { height: 440, dist: 34, yaw: .15, pitch: .15 });
  const dyn = new THREE.Group(), names = new THREE.Group();
  if (v) {
    const ref = st.ligand.atoms.map(a => ({ el: a[0], p: [a[1], a[2], a[3]] }));
    v.root.add(pocketGroup(st, { show: ['HIS90', 'GLN192', 'ARG513', 'ARG120'], labels: ['HIS90', 'GLN192', 'ARG513', 'ARG120'], focus: ['HIS90', 'GLN192', 'ARG513'] }), ligandGroup(ref, st.ligand.bonds, { opacity: .35, outline: false }), dyn, names);
    host.append(labelBar(names, [{ label: 'Reference: crystal celecoxib', color: '#d4ff3a' }, { label: 'The compound you picked, overlaid', color: '#fc7a7a' }, { label: 'Red glow: atoms that clash with the protein', color: '#ff5a5a' }]));
  }
  function showCompound(c) {
    cur = c; if (!v) return; [...dyn.children].forEach(x => dyn.remove(x)); [...names.children].forEach(x => names.remove(x));
    const atoms = c.atoms.map(a => ({ el: a[0], p: [a[1], a[2], a[3]] }));
    dyn.add(ligandGroup(atoms, c.bonds, { carbon: 0xfc7a7a, halo: 2.6 }));
    const near = st.near.map(n => [n[1], n[2], n[3]]);
    atoms.forEach(a => { if (near.some(q => Math.hypot(q[0] - a.p[0], q[1] - a.p[1], q[2] - a.p[2]) < 2.6)) dyn.add(glow(a.p, 0xff3b3b, 3.4, .85)); });
    const ctr = atoms.reduce((s, a) => [s[0] + a.p[0] / atoms.length, s[1] + a.p[1] / atoms.length, s[2] + a.p[2] / atoms.length], [0, 0, 0]);
    names.add(callout(c.name, ctr, [11, -8, 6], '#fc7a7a'), callout('Crystal celecoxib', [0, 0, 0], [-10, 9, 4], '#d4ff3a'));
    v.render(); api.log('view', c.name);
  }
  const tab = h('div', { class: 'row' }), info = h('div', { class: 'card sticker-static stack' }), tableWrap = h('div', { class: 'tblwrap', style: 'max-height:380px;overflow:auto' }), result = h('div', { class: 'stack' });
  const nLab = h('b', {});
  const draw = () => {
    const M = METHODS[method], ranked = rankBy(lib, M.score);
    tab.replaceChildren(...Object.entries(METHODS).map(([k, m]) => h('button', { class: 'sticker', type: 'button', 'aria-pressed': String(k === method), onclick: () => { method = k; revealed = false; draw(); api.log('method', k); } }, k === 'lb' ? 'Ligand-based' : 'Structure-based')));
    info.replaceChildren(h('h3', { style: 'margin:0' }, M.name), h('p', { style: 'margin:0' }, h('strong', {}, 'Needs: '), M.needs), h('p', { style: 'margin:0' }, h('strong', {}, 'Strength: '), M.strong), h('p', { style: 'margin:0' }, h('strong', {}, 'Weakness: '), M.weak));
    tableWrap.replaceChildren(h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['#', 'Compound', M.unit, revealed ? 'Real active?' : ''].map(t => h('th', {}, t)))),
      h('tbody', {}, ranked.map((c, i) => h('tr', { class: `${i < N ? 'is-pick' : ''}${c.id === cur.id ? ' is-cur' : ''}`, style: 'cursor:pointer', onclick: () => { showCompound(c); draw(); } },
        h('td', {}, i + 1), h('td', {}, c.name), h('td', { class: 'num' }, M.show(c)), h('td', {}, revealed && i < N ? (c.active ? '✓ active' : '✗ decoy') : ''))))));
    nLab.textContent = `${N} compounds (${Math.round(N / lib.length * 100)}%)`;
    result.replaceChildren(revealed ? summary(ranked) : null);
  };
  function summary(ranked) {
    const e = enrichment(lib, M().score, N / lib.length), missed = lib.filter(c => c.active && ranked.indexOf(c) >= N).map(c => c.name);
    api.log('reveal', `${method}:${e.hits}/${N}`); api.done({ [`${method}_hits`]: e.hits, [`${method}_n`]: N });
    return feedback(e.hits / N > nAct / lib.length ? 'ok' : 'bad', `${e.hits} of your top ${N} are real actives (random picking would give about ${(N * nAct / lib.length).toFixed(1)})`, h('div', {}, h('p', {}, `Enrichment factor: ${e.ef.toFixed(1)}. You found ${e.hits} of the ${nAct} actives (${Math.round(e.recall * 100)}%).`), missed.length ? h('p', {}, h('strong', {}, 'Actives you missed: '), missed.join(', ')) : null));
  }
  const M = () => METHODS[method];
  const slider = h('input', { type: 'range', min: 3, max: 20, value: N, style: 'flex:1;min-width:160px', 'aria-label': 'Number of compounds to take', oninput: e => { N = +e.target.value; revealed = false; draw(); } });
  host.append(tab, info, h('div', { class: 'row', style: 'margin-top:10px' }, h('span', {}, 'Take the top'), slider, nLab,
    h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => { revealed = true; draw(); } }, 'Reveal the real actives')), tableWrap, result);
  showCompound(cur); draw();
  host.append(h('p', { class: 'hint' }, 'Tip: try both methods with the same number of compounds. Notice which actives each one misses.'),
    h('h3', { style: 'margin-top:20px' }, 'Check your understanding'), quizlet(api, [
      { id: 'need', q: 'You have the 3D structure of a new target but no known active. Which method can you use?', options: ['Structure-based (docking)', 'Ligand-based similarity or shape', 'Neither', 'Only property filters'], answer: 0, why: 'Ligand-based methods need a reference active. Docking only needs the protein structure.' },
      { id: 'miss', q: 'Why can a shape search for celecoxib miss ibuprofen-like NSAIDs, which are also COX inhibitors?', options: ['They have a different scaffold, so they do not resemble celecoxib', 'Because ibuprofen is not an active', 'Because shape searches cannot read acids', 'Because they are too small to rank'], answer: 0, why: 'Similarity to one drug finds look-alikes. Actives with a different shape or scaffold are missed, which is why a second method helps.' },
    ], { onAll: () => api.unlockNext() }), api.nav(true));
  return () => v?.dispose();
}
