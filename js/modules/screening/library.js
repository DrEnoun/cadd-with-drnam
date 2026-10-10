// Step 2 — The library: 45 real drugs in property space. Click a sphere to inspect the molecule in 3D.
import { h, feedback } from '../../ui.js';
import { createViewer, labelBar } from '../../viewer3d.js';
import { cloudScene, inspector, legendItems, GROUP } from './scenes.js';
import { DEFAULT_LIMITS, PROPS, passes } from './stats.js';
import { quizlet } from '../docking/quizlet.js';

export function render(host, api) {
  const lib = api.data.compounds;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Before you screen anything, look at what is in the library. Compounds differ in size, greasiness and polarity, and those properties decide whether a compound could ever become a medicine. Some compounds are real actives against the target and some are not: you need to know which is which to judge a screen later.'),
    h('p', {}, `This is a library of ${lib.length} real drugs, small enough to see every one. Each glowing sphere is a compound, placed by its molecular weight, cLogP (how greasy it is) and polar surface area. `, h('strong', {}, `${lib.filter(c => c.active).length} are known COX inhibitors (the actives)`), ' and the rest are not (the decoys). Turn the cloud, then click a sphere.'));
  const v = createViewer(host, { height: 460, dist: 50, yaw: .6, pitch: .25 });
  let cloud = null;
  const panel = h('div', { class: 'card sticker-static stack' }, h('p', { class: 'muted', style: 'color:inherit' }, 'Click a sphere to inspect the compound.'));
  const insHost = h('div', {});
  const ins = inspector(insHost, { height: 260 });
  if (v) { cloud = cloudScene(v, lib, { onPick: show }); cloud.setLimits(DEFAULT_LIMITS); host.append(labelBar(null, legendItems())); }
  host.append(h('div', { class: 'grid2', style: 'margin-top:12px' }, insHost, panel));
  function show(c) {
    ins.show(c); cloud?.select(c.id);
    panel.replaceChildren(h('h3', { style: 'margin:0' }, c.name), h('p', { style: 'margin:0' }, h('span', { class: 'tag' }, GROUP[c.group].label), ' ', c.active ? h('strong', {}, 'Known COX inhibitor (active)') : 'Not a COX inhibitor (decoy)'), h('p', { style: 'margin:0' }, c.note),
      h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('tbody', {}, PROPS.map(p => h('tr', {}, h('td', {}, p.label), h('td', { class: 'num' }, `${c[p.key]}${p.unit ? ' ' + p.unit : ''}`), h('td', {}, DEFAULT_LIMITS[p.key] != null && c[p.key] > DEFAULT_LIMITS[p.key] ? '⚠ over the usual limit' : '✓')))))),
      ...(c.pains ? [feedback('bad', 'PAINS alert', 'This scaffold often looks active in many assays for the wrong reasons.')] : []));
    api.log('inspect', c.name);
  }
  show(lib.find(c => c.name === 'Celecoxib'));

  const by = (k, dir = 1) => [...lib].sort((a, b) => dir * (b[k] - a[k]))[0];
  const names = lib.map(c => c.name);
  const opts = (right, k = 4) => { const rest = names.filter(n => n !== right).sort(() => Math.random() - .5).slice(0, k - 1); return [right, ...rest].sort(() => Math.random() - .5); };
  const mk = (id, q, right, why) => { const o = opts(right); return { id, q, options: o, answer: o.indexOf(right), why }; };
  const hi = by('mw'), grease = by('logp'), pol = by('tpsa'), act = lib.filter(c => c.active).length;
  host.append(h('h3', { style: 'margin-top:20px' }, 'Check your understanding'), quizlet(api, [
    mk('mw', 'Which compound in the library has the highest molecular weight?', hi.name, `${hi.name} (${hi.mw} Da) is the heaviest. Above 500 Da, a compound breaks Lipinski's size rule.`),
    mk('logp', 'Which compound is the most greasy (highest cLogP)?', grease.name, `${grease.name} has cLogP ${grease.logp}. Very greasy compounds dissolve poorly and often bind many proteins by accident.`),
    { id: 'act', q: `How many of the ${lib.length} compounds are known COX inhibitors (the actives)?`, options: [String(act), String(act - 6), String(act + 9), String(Math.round(lib.length / 2))], answer: 0, why: `${act} are actives. The rest are decoys: compounds known not to be COX inhibitors, which let us test whether a screen can tell them apart.` },
  ], { onAll: () => { api.done({ inspected: 1 }); api.unlockNext(); } }), api.nav(true));
  return () => { v?.dispose(); ins.dispose(); };
}
