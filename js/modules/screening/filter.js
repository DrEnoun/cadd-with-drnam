// Step 3 — Property filters (Lipinski and Veber). Move the limits and watch the cloud, the counts and the actives you lose.
import { h, feedback } from '../../ui.js';
import { createViewer, labelBar } from '../../viewer3d.js';
import { cloudScene, legendItems } from './scenes.js';
import { DEFAULT_LIMITS, PROPS, filterCounts, passes } from './stats.js';
import { quizlet } from '../docking/quizlet.js';

const PRESETS = { lipinski: { label: 'Lipinski + Veber (usual)', lim: { ...DEFAULT_LIMITS } }, lead: { label: 'Strict (lead-like)', lim: { mw: 350, logp: 3.5, hbd: 3, hba: 7, rotb: 7, tpsa: 100 } }, none: { label: 'No filter', lim: { mw: null, logp: null, hbd: null, hba: null, rotb: null, tpsa: null } } };

export function render(host, api) {
  const lib = api.data.compounds;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Property filters are the cheapest stage of the funnel. They remove compounds that are too big, too greasy or too polar to be absorbed as an oral drug. But they are rules of thumb, built from past drugs. If you set them too strictly you throw away real hits: these lost compounds are called false negatives.'),
    h('p', {}, 'The lime box is the "drug-like" region. Move the limits and watch spheres outside the box fade. Your goal: remove as many decoys as you can without losing the actives.'));
  const v = createViewer(host, { height: 440, dist: 50, yaw: .6, pitch: .25 });
  let cloud = null; if (v) { cloud = cloudScene(v, lib); host.append(labelBar(null, [...legendItems(), { label: 'Faded: removed by the filter', color: '#6b7a90' }])); }
  const limits = { ...DEFAULT_LIMITS };
  const stat = h('div', { class: 'stack' }), sliders = h('div', { class: 'stack' }), presetRow = h('div', { class: 'row' });
  const rows = {};
  const refresh = () => {
    cloud?.setLimits(limits);
    const c = filterCounts(lib, limits), dec = c.total - c.actives, lostDec = dec - c.decoysKept;
    stat.replaceChildren(
      h('div', { class: 'row' }, h('div', { class: 'kv' }, h('span', {}, 'Compounds kept'), h('b', {}, `${c.kept} / ${c.total}`)), h('div', { class: 'kv' }, h('span', {}, 'Actives kept'), h('b', {}, `${c.activesKept} / ${c.actives}`)), h('div', { class: 'kv' }, h('span', {}, 'Decoys removed'), h('b', {}, `${lostDec} / ${dec}`))),
      c.activesLost.length ? feedback('bad', `You lost ${c.activesLost.length} active compound${c.activesLost.length > 1 ? 's' : ''}`, `False negatives: ${c.activesLost.join(', ')}. A strict filter can throw away real hits.`) : feedback('ok', 'No actives lost', lostDec ? `You removed ${lostDec} decoy${lostDec > 1 ? 's' : ''} without losing an active.` : 'But nothing was removed either, so the filter did no work.'));
    for (const p of PROPS) { const r = rows[p.key]; if (r) r.val.textContent = limits[p.key] == null ? 'off' : `≤ ${limits[p.key]}${p.unit ? ' ' + p.unit : ''}`; }
    api.log('limits', JSON.stringify(limits)); api._c = c;
    if (c.activesKept >= c.actives - 0 && lostDec >= 3) api.done({ kept: c.kept, activesKept: c.activesKept, decoysRemoved: lostDec });
  };
  PROPS.forEach(p => {
    const val = h('b', { style: 'min-width:92px;display:inline-block' }), inp = h('input', { type: 'range', min: 0, max: p.max, step: p.key === 'logp' ? .1 : 1, value: limits[p.key], style: 'flex:1;min-width:160px', 'aria-label': `${p.label} limit`, oninput: e => { limits[p.key] = +e.target.value; refresh(); } });
    rows[p.key] = { val, inp }; sliders.append(h('label', { class: 'row' }, h('span', { style: 'min-width:200px' }, p.label), inp, val));
  });
  Object.values(PRESETS).forEach(pr => presetRow.append(h('button', { class: 'sticker', type: 'button', onclick: () => { Object.assign(limits, pr.lim); for (const p of PROPS) rows[p.key].inp.value = limits[p.key] == null ? p.max : limits[p.key]; refresh(); } }, pr.label)));
  host.append(h('div', { class: 'row', style: 'margin-top:10px' }, h('span', { class: 'muted' }, 'Presets:'), presetRow), sliders, stat);
  refresh();
  host.append(h('div', { class: 'card sticker-static', style: 'margin-top:14px' }, h('h3', {}, 'Rules of thumb, not laws'), h('p', {}, 'Lipinski\'s rule of five (molecular weight ≤ 500, cLogP ≤ 5, donors ≤ 5, acceptors ≤ 10) and Veber\'s rules (rotatable bonds ≤ 10, polar surface area ≤ 140 Å²) describe most oral drugs. Many good drugs break one of them. Use filters to remove the obvious misfits, not to decide the final list.')));
  host.append(h('h3', { style: 'margin-top:20px' }, 'Check your understanding'), quizlet(api, [
    { id: 'fn', q: 'You tighten the filters and a known active disappears from the list. What is this called?', options: ['A false negative', 'A false positive', 'A decoy', 'A duplicate'], answer: 0, why: 'A false negative is a real hit that is wrongly rejected.' },
    { id: 'use', q: 'What is the best way to use a property filter such as Lipinski\'s rules in a screen?', options: ['As a cheap first stage to remove obvious misfits, not as the final decision', 'As proof that a compound will be an effective medicine', 'As the only stage of the screen', 'Never, because every drug follows the rules'], answer: 0, why: 'Filters are cheap and useful early, but they are guides built from past drugs.' },
  ], { onAll: () => { api.done({ lostActives: api._c?.activesLost.length ?? 0 }); api.unlockNext(); } }), api.nav(true));
  return () => v?.dispose();
}
