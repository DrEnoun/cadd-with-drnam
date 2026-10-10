// Step 6 — Validation by redocking. RMSD is computed from the atom coordinates of the moved ligand.
import { h, svg, feedback } from '../../ui.js';

const S = 22; // px per Å in the overlay view
export function rmsd(atoms, p) {
  const cx = atoms.reduce((t, q) => t + q[0], 0) / atoms.length, cy = atoms.reduce((t, q) => t + q[1], 0) / atoms.length, r = p.rot * Math.PI / 180;
  return Math.sqrt(atoms.reduce((s, [x0, y0]) => { const x = x0 - cx, y = y0 - cy; const X = x * Math.cos(r) - y * Math.sin(r) + cx + p.dx, Y = x * Math.sin(r) + y * Math.cos(r) + cy + p.dy; return s + (X - x0) ** 2 + (Y - y0) ** 2; }, 0) / atoms.length);
}
export const moved = (atoms, p) => { const cx = atoms.reduce((t, q) => t + q[0], 0) / atoms.length, cy = atoms.reduce((t, q) => t + q[1], 0) / atoms.length, r = p.rot * Math.PI / 180; return atoms.map(([x0, y0]) => { const x = x0 - cx, y = y0 - cy; return [x * Math.cos(r) - y * Math.sin(r) + cx + p.dx, x * Math.sin(r) + y * Math.cos(r) + cy + p.dy]; }); };

export function render(host, api) {
  const v = api.data.validate;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'You cannot tell if your docking setup works by looking at new compounds, because you do not know the right answer for them. But for the original ligand you do: the crystal structure shows where it really sits. If your protocol cannot put it back where it belongs, it cannot be trusted for new compounds. This check is called ',
      h('strong', {}, 'redocking'), '.'),
    h('p', {}, h('strong', {}, 'RMSD'), ' (root-mean-square deviation) measures how far the docked atoms are from the crystal atoms, in Å. As a rule of thumb, ', h('strong', {}, '2 Å or less'), ' counts as a successful redocking.'));

  const verdicts = {}; const setups = h('div', { class: 'stack' });
  v.setups.forEach(s => {
    const view = svg('svg', { class: 'scene', viewBox: '-60 -60 400 270', style: 'max-width:420px', role: 'img', 'aria-label': `${s.title} overlay` });
    const info = h('div', {}); let sel = 0;
    const draw = () => {
      view.replaceChildren();
      const pose = s.poses[sel], crystal = v.atoms, dock = moved(v.atoms, pose);
      const bond = (a, b, col, dash) => view.append(svg('line', { x1: a[0] * S + 40, y1: a[1] * S + 40, x2: b[0] * S + 40, y2: b[1] * S + 40, stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': dash }));
      const chain = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [2, 6], [6, 7], [7, 8]];
      chain.forEach(([i, j]) => bond(crystal[i], crystal[j], 'var(--spark-400)'));
      chain.forEach(([i, j]) => bond(dock[i], dock[j], 'var(--coral-400)'));
      crystal.forEach((c, i) => { view.append(svg('line', { x1: c[0] * S + 40, y1: c[1] * S + 40, x2: dock[i][0] * S + 40, y2: dock[i][1] * S + 40, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: .5 })); });
      const r = rmsd(crystal, pose);
      info.replaceChildren(h('div', { class: 'kv' }, h('span', {}, `Pose ${pose.rank} · score ${pose.score}`), h('span', {}, 'RMSD'), h('b', {}, `${r.toFixed(1)} Å`), h('span', { class: 'tag' }, r <= 2 ? 'Success (≤ 2 Å)' : 'Failed (> 2 Å)')));
    };
    const tabs = h('div', { class: 'row' }, s.poses.map((p, i) => h('button', { class: 'sticker', type: 'button', 'aria-pressed': String(i === 0), onclick: e => { sel = i; tabs.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); draw(); api.log(`view_${s.id}_${p.rank}`, 1); } }, `Pose ${p.rank}${p.rank === 1 ? ' (best score)' : ''}`)));
    const choose = h('div', { class: 'row' }, h('span', {}, 'Your decision:'),
      [['valid', 'Protocol is valid'], ['fix', 'Go back and fix the setup'], ['caution', 'Setup is fine but scoring is unreliable']].map(([k, t]) => h('button', { class: 'sticker', type: 'button', 'aria-pressed': 'false', 'data-k': k, onclick: e => { verdicts[s.id] = k; choose.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); } }, t)));
    setups.append(h('div', { class: 'card sticker-static stack', 'data-id': s.id },
      h('h3', { style: 'margin:0' }, s.title), h('p', {}, s.desc),
      h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:var(--spark-400)' }), 'Crystal ligand (the truth)'), h('span', {}, h('i', { style: 'background:var(--coral-400)' }), 'Docked pose')),
      view, tabs, info, choose, h('div', { class: 'fbslot' })));
    draw();
  });
  const out = h('div', {});
  const btn = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
    if (v.setups.some(s => !verdicts[s.id])) { out.replaceChildren(feedback('bad', 'Make a decision for every setup first.')); return; }
    let right = 0;
    v.setups.forEach(s => {
      const ok = verdicts[s.id] === s.verdict; if (ok) right++;
      const msgs = { valid: 'The top-ranked pose is within 2 Å of the crystal pose, so this protocol reproduces the known answer. You can go on to dock new compounds.',
        fix: 'No pose is close to the crystal pose, so the setup is wrong (here: missing hydrogens and a box that is too small). Fix the preparation and the box, then redock before trusting anything.',
        caution: 'A good pose exists (rank 3, within 2 Å) but the scoring function ranks wrong poses higher. Docking can find the answer here but cannot rank it, so use more care: inspect poses by eye, try another scoring function or consensus scoring.' };
      list(s.id, ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', msgs[s.verdict]);
      api.log(`verdict_${s.id}`, verdicts[s.id]);
    });
    out.replaceChildren(h('strong', {}, `${right} of ${v.setups.length} correct.`));
    api.done({ correct: right, of: v.setups.length }); api.unlockNext();
  } }, 'Check my decisions');
  const list = (id, kind, t, b) => setups.querySelector(`[data-id="${id}"] .fbslot`).replaceChildren(feedback(kind, t, b));
  host.append(setups, h('div', { class: 'row', style: 'margin-top:16px' }, btn), out,
    h('div', { class: 'card sticker-static', style: 'margin-top:16px' }, h('h3', {}, 'Remember'), h('p', {}, 'Always validate before you screen. A protocol that fails redocking should be fixed first. Some groups also dock known active and inactive compounds to see if the protocol can tell them apart.')),
    api.nav(true));
}
