// Step 5 — Scoring: what a docking score is made of, and how a score relates to Kd.
import { h } from '../../ui.js';
import { quizlet } from './quizlet.js';

const RT = 0.593; // kcal/mol at 298 K
export const kdFromDG = dg => Math.exp(dg / RT); // molar
export function fmtKd(m) {
  if (m >= 1e-3) return `${(m * 1e3).toFixed(1)} mM`; if (m >= 1e-6) return `${(m * 1e6).toFixed(1)} µM`;
  if (m >= 1e-9) return `${(m * 1e9).toFixed(1)} nM`; return `${(m * 1e12).toFixed(1)} pM`;
}

export function render(host, api) {
  const sc = api.data.scoring;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The score is the number everyone looks at first, so you must know what is inside it and how much to trust it. A score is a sum of simple physical ideas, and it is only an estimate.'),
    h('p', {}, 'Build a pose by switching on features. Each one adds or removes energy. More negative means stronger predicted binding (mock numbers in kcal/mol).'));
  const on = new Set();
  const total = h('b', {}, ''); const kd = h('b', {}, ''); const bars = h('div', { class: 'stack' });
  const rotPen = sc.rotBonds * sc.rotPenalty;
  const rows = [{ label: sc.base.label, value: sc.base.value, fixed: true }, { label: `Entropy cost: ${sc.rotBonds} rotatable bonds frozen on binding`, value: rotPen, fixed: true, desc: 'A floppy ligand loses freedom when it binds, which costs energy.' }, ...sc.terms];
  const list = h('div', { class: 'stack' });
  const update = () => {
    const sum = rows.reduce((t, r) => t + (r.fixed || on.has(r.id) ? r.value : 0), 0);
    total.textContent = sum.toFixed(1); kd.textContent = fmtKd(kdFromDG(sum));
    api.log('pose_score', sum.toFixed(1));
  };
  rows.forEach(r => {
    const row = r.fixed
      ? h('div', { class: 'card sticker-static' }, h('strong', {}, r.label), h('span', { style: 'float:right' }, `${r.value > 0 ? '+' : ''}${r.value.toFixed(1)}`), r.desc ? h('div', { class: 'muted', style: 'color:inherit;font-size:14px' }, r.desc) : null)
      : h('label', { class: 'card sticker-static', style: 'cursor:pointer;display:block' },
          h('input', { type: 'checkbox', style: 'margin-right:8px;accent-color:var(--uitm-purple)', onchange: e => { e.target.checked ? on.add(r.id) : on.delete(r.id); update(); } }),
          h('strong', {}, r.label), h('span', { style: 'float:right;font-weight:700' }, `${r.value > 0 ? '+' : ''}${r.value.toFixed(1)}`),
          h('div', { style: 'font-size:14px;opacity:.85' }, r.desc));
    list.append(row);
  });
  host.append(list,
    h('div', { class: 'row', style: 'margin-top:14px' }, h('div', { class: 'kv' }, h('span', {}, 'Total score'), total, h('span', {}, 'kcal/mol')), h('div', { class: 'kv' }, h('span', {}, 'Predicted Kd'), kd)));
  update();
  host.append(h('p', { class: 'muted' }, 'Try the best pose you can: switch on good features, and see what a clash does. Notice that a salt bridge also brings a desolvation cost.'));

  // score <-> Kd
  host.append(h('h3', { style: 'margin-top:24px' }, 'From score to binding constant'),
    h('p', {}, 'Binding free energy and the dissociation constant are linked by ', h('strong', {}, 'ΔG = RT ln Kd'), ' (RT = 0.593 kcal/mol at 25 °C). A smaller Kd means tighter binding. Every ', h('strong', {}, '1.4 kcal/mol'), ' of extra binding energy is about a ', h('strong', {}, '10-fold'), ' smaller Kd.'));
  const slider = h('input', { type: 'range', min: -14, max: -4, step: 0.1, value: -8, 'aria-label': 'Binding free energy' });
  const out = h('div', { class: 'kv' });
  const upd2 = () => { const v = +slider.value; out.replaceChildren(h('span', {}, 'ΔG'), h('b', {}, v.toFixed(1)), h('span', {}, 'kcal/mol  →  Kd ≈'), h('b', {}, fmtKd(kdFromDG(v)))); };
  slider.addEventListener('input', upd2); upd2();
  host.append(h('div', { class: 'row' }, h('div', { style: 'flex:1;min-width:220px' }, slider)), out);
  host.append(h('div', { class: 'card sticker-static', style: 'margin:16px 0' }, h('h3', {}, 'Trust the ranking more than the number'),
    h('p', {}, 'Scoring functions are fast approximations. They ignore or simplify water, protein movement and entropy. Errors of 1 to 3 kcal/mol are common, which is a 10- to 100-fold error in Kd. So docking scores are best used to ', h('strong', {}, 'rank'), ' compounds and to prioritise what to test, not to report exact affinities.')));
  host.append(h('h3', {}, 'Check your understanding'), quizlet(api, [
    { id: 'kd', q: 'Compound P scores -10 and compound Q scores -8.6 (kcal/mol). Roughly how different are their predicted Kd values?', options: ['About 10-fold (P tighter)', 'About 2-fold', 'About 1000-fold', 'They are identical'], answer: 0, why: 'The difference is 1.4 kcal/mol, which is about 10-fold in Kd.' },
    { id: 'trust', q: 'Which statement about docking scores is best?', options: ['They are good for ranking but are approximate, not exact affinities', 'They are exact measurements of Kd', 'They never need experimental checking', 'A score of 0 means strongest binding'], answer: 0, why: 'Use them to prioritise, then confirm experimentally.' },
  ], { onAll: () => { api.done({ lastScore: total.textContent }); api.unlockNext(); } }), api.nav(true));
}
