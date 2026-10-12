// Step 5 — Reading a trajectory: RMSD, RMSF, radius of gyration, hydrogen bonds; discard equilibration; check statistics.
import { h, feedback } from '../../ui.js';
import { summarise, verdict, fromTime, equilibrationTime, blockStats } from './stats.js';
import { linePlot, COLORS } from './plot.js';

const VERDICT = { stable: ['ok', 'Looks stable', 'Both the protein and the drug have settled, and the drug stays within a small distance of its starting pose.'], left: ['bad', 'The drug left the pocket', 'The drug moved far away and did not come back. The starting pose is not stable in this simulation.'], drifting: ['bad', 'Not settled', 'The protein RMSD keeps climbing, so the system has not reached a plateau. The run is not (yet) interpretable, or the system is unstable.'], unclear: ['bad', 'Unclear', 'Neither clearly stable nor clearly unbound. You would need a longer run or repeats.'] };
export function render(host, api) {
  const D = api.data, R = D.runs, keys = Object.keys(R);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'An MD run produces millions of numbers. A few standard graphs turn them into answers: has the protein settled (RMSD), is the drug where it started (ligand RMSD, distance), which parts move (RMSF), does the protein keep its shape (radius of gyration) and are the key contacts kept (hydrogen bonds)?'),
    h('p', {}, `Three 100 ns runs of the celecoxib–COX-2 complex are shown (simulated for teaching). Look at each run and decide which starting pose you would trust. Move the “discard” slider to throw away the early frames.`));
  let key = keys[0], t0 = 20;
  const bar = h('div', { class: 'row' }, keys.map(k => h('button', { type: 'button', class: 'sticker', 'aria-pressed': String(k === key), 'data-k': k, onclick: () => { key = k; bar.querySelectorAll('button[data-k]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); draw(); api.log('view', k); } }, R[k].name)));
  const mk = label => h('canvas', { style: 'width:100%;border-radius:12px;background:#fff', role: 'img', 'aria-label': label });
  const c1 = mk('RMSD of the protein and the ligand'), c2 = mk('Ligand distance from the pocket'), c3 = mk('Radius of gyration'), c4 = mk('Hydrogen bonds'), c5 = mk('RMSF per residue');
  const val = h('b'), sl = h('input', { type: 'range', min: 0, max: 60, step: 1, value: t0, 'aria-label': 'Discard the first part of the run (ns)', oninput: () => { t0 = +sl.value; draw(); api.log('discard', t0); } });
  const table = h('div', { class: 'tblwrap' }), msg = h('div', { class: 'stack' }), seen = new Set(), done = new Set();
  host.append(bar, h('label', { style: 'display:block;margin-top:8px' }, 'Discard the first ', val, ' ns as equilibration: ', sl), h('div', { style: 'display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr))' }, c1, c2, c3, c4), c5, msg, table);
  const draw = () => {
    val.textContent = t0; const r = R[key], tm = D.time, s = summarise(r, tm, t0), v = verdict(s), shade = { x0: 0, x1: t0, color: 'rgba(120,130,150,.18)' };
    linePlot(c1, [{ x: tm, y: r.protRmsd, label: 'Protein', color: COLORS[0] }, { x: tm, y: r.ligRmsd, label: 'Ligand', color: COLORS[1] }], { w: 420, h: 250, xlabel: 'Time (ns)', ylabel: 'RMSD (Å)', ymin: 0, ymax: 14, shade, hlines: [{ y: 2, label: '2 Å guide', color: '#c2255c' }] });
    linePlot(c2, [{ x: tm, y: r.dist, label: 'Distance (Å)', color: COLORS[3] }], { w: 420, h: 250, xlabel: 'Time (ns)', ylabel: 'Distance (Å)', ymin: 0, ymax: 16, shade });
    linePlot(c3, [{ x: tm, y: r.rg, label: 'Rg (Å)', color: COLORS[2] }], { w: 420, h: 250, xlabel: 'Time (ns)', ylabel: 'Radius of gyration (Å)', ymin: D.rg0 - 1, ymax: D.rg0 + 3, shade });
    linePlot(c4, [{ x: tm, y: r.hbonds, label: 'Hydrogen bonds', color: COLORS[4] }], { w: 420, h: 250, xlabel: 'Time (ns)', ylabel: 'Number of H-bonds', ymin: 0, ymax: 6, shade });
    linePlot(c5, [{ x: D.resnum, y: D.rmsfExp, label: 'From crystal B-factors (real)', color: '#999', dash: [5, 4] }, { x: D.resnum, y: r.rmsf, label: 'Simulated RMSF', color: COLORS[0] }], { w: 760, h: 240, xlabel: 'Residue number', ylabel: 'RMSF (Å)', ymin: 0 });
    const eq = equilibrationTime(tm, r.protRmsd);
    msg.replaceChildren(
      feedback(VERDICT[v][0], `${r.name}: ${VERDICT[v][1]}`, VERDICT[v][2]),
      h('p', { class: 'hint' }, `Protein RMSD settles after about ${eq.toFixed(0)} ns. Grey area = discarded. Drift of the protein RMSD over the second half: ${s.settled.drift.toFixed(2)} Å per 100 ns${s.escape != null ? `. The drug leaves the pocket at about ${s.escape.toFixed(0)} ns` : ''}.`),
      t0 < eq - 2 ? feedback('bad', 'Too much equilibration kept', 'You kept frames from before the system settled. Averages will be biased. Move the slider to the right.') : t0 > 50 ? feedback('bad', 'Wasteful', 'Discarding more than half the run throws away good data and makes the error bigger.') : '');
    table.replaceChildren(h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Quantity (frames after the discard)', 'Mean', '± error (block average)', 'Wrongly small error if frames were independent'].map(x => h('th', {}, x)))), h('tbody', {},
      [['Protein RMSD (Å)', s.prot], ['Ligand RMSD (Å)', s.lig], ['Radius of gyration (Å)', s.rg], ['Hydrogen bonds', s.hb]].map(([n, b]) => h('tr', {}, h('td', {}, n), h('td', { class: 'num' }, b.mean.toFixed(2)), h('td', { class: 'num' }, b.sem.toFixed(2)), h('td', { class: 'num' }, b.naiveSem.toFixed(3)))))));
    seen.add(key); if (v) done.add(`${key}:${v}`); api.log('verdict', `${key}:${v}`);
    api.done({ viewed: seen.size, discard: t0, [`run${key}`]: v, [`slope${key}`]: +s.settled.drift.toFixed(2) }); if (seen.size >= 3) api.unlockNext();
  };
  draw();
  host.append(h('p', { class: 'hint' }, 'RMSD (root-mean-square deviation) measures how far the atoms have moved from the starting structure after fitting the protein. Ligand RMSD is measured after fitting on the protein, so it shows the drug moving inside the pocket. About 2 Å is a common guide for a stable complex, never a rule. Frames next to each other are strongly correlated, so the real error is larger than a simple formula suggests: the table compares the two. All curves are simulated for teaching, except the grey line in the RMSF graph, which comes from the real crystal B-factors of 3LN1.'), api.nav(true));
}
