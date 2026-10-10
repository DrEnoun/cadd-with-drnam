// Step 1 — Why screen? The funnel in 3D, your own funnel numbers, and matching situations to methods.
import { h, feedback } from '../../ui.js';
import { createViewer, labelBar } from '../../viewer3d.js';
import { funnelScene, legendItems } from './scenes.js';

const fmt = n => n >= 1e6 ? `${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)} million` : n >= 1e3 ? `${Math.round(n).toLocaleString('en')}` : String(Math.round(n));

export function render(host, api) {
  const T = api.data.teaching.why, lib = api.data.compounds;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'A real compound library has millions of molecules. Testing them all in the lab is far too slow and costly, and docking every one with the most accurate method is also too slow. A funnel solves both problems: cheap, fast filters go first, and the expensive, accurate methods only run on the survivors.'),
    h('p', { class: 'lead' }, 'Watch the funnel below. Each glowing ring is a gate. Compounds that fail a gate turn red and drop out. Only a few reach the tube at the bottom, and those are the ones you take to the lab.'));
  const v = createViewer(host, { height: 460, dist: 58, yaw: .3, pitch: .1 });
  let funnel = null;
  if (v) {
    funnel = funnelScene(v, lib, T.stages.slice(1).map(s => ({ label: s.label, pass: s.pass })), 2000000);
    host.append(labelBar(null, [...legendItems(), { label: 'Red flash: removed at that gate', color: '#ff5a5a' }]), h('p', { class: 'hint' }, 'The funnel follows the sliders below: the numbers at each gate and how many compounds drop out change when you change a stage.'));
  }
  // your own funnel
  host.append(h('h3', { style: 'margin-top:22px' }, 'Build your own funnel'), h('p', {}, 'Choose the library size and how much each stage keeps. See how few compounds remain, and compare it with testing everything.'));
  const size = h('select', { 'aria-label': 'Library size' }, [100000, 500000, 2000000, 10000000].map(n => h('option', { value: n, selected: n === 2000000 || null }, `${fmt(n)} compounds`)));
  const stages = T.stages.slice(1), vals = stages.map(s => Math.round(s.pass * 100)), rows = h('div', { class: 'stack' }), out = h('div', { class: 'stack' });
  const upd = () => {
    const N = +size.value; let n = N; const parts = [];
    stages.forEach((s, i) => { n *= vals[i] / 100; parts.push(`${s.label}: ${fmt(Math.max(1, n))} left`); });
    const survivors = Math.max(1, Math.round(n)), daysAll = N / T.perDay;
    out.replaceChildren(h('div', { class: 'kv' }, h('span', {}, 'Compounds left for the lab'), h('b', {}, fmt(survivors))),
      h('p', {}, parts.join('  →  ')),
      h('p', { class: 'muted' }, `For scale: a fast robotic lab screen tests about ${fmt(T.perDay)} compounds a day (illustrative). Testing all ${fmt(N)} would take about ${daysAll >= 1 ? Math.round(daysAll) + ' days' : 'a day'}; testing ${fmt(survivors)} takes ${survivors / T.perDay < 1 ? 'less than a day' : Math.ceil(survivors / T.perDay) + ' days'}.`));
    funnel?.update(stages.map((s, i) => ({ label: s.label, pass: vals[i] / 100 })), N);
    api.log('funnel', `${N}->${survivors}`);
  };
  stages.forEach((s, i) => { const lab = h('b', { style: 'min-width:48px;display:inline-block' }, `${vals[i]}%`); rows.append(h('label', { class: 'row' }, h('span', { style: 'min-width:170px' }, `${s.label} keeps`), h('input', { type: 'range', min: 1, max: 100, value: vals[i], style: 'flex:1;min-width:160px', 'aria-label': `${s.label} keeps percent`, oninput: e => { vals[i] = +e.target.value; lab.textContent = `${vals[i]}%`; upd(); } }), lab)); });
  size.addEventListener('change', upd);
  host.append(h('div', { class: 'row' }, h('span', {}, 'Library:'), size), rows, out);
  upd();

  host.append(h('h3', { style: 'margin-top:22px' }, 'Match each situation to the screening tool'));
  const picks = {}, list = h('div', { class: 'stack' });
  T.scenarios.forEach(s => list.append(h('div', { class: 'card sticker-static', 'data-s': s.id }, h('p', {}, s.text),
    h('select', { 'aria-label': s.text, onchange: e => { picks[s.id] = e.target.value; } }, h('option', { value: '' }, 'Choose a tool…'), T.methods.map(m => h('option', { value: m.id }, m.text))), h('div', { class: 'fbslot' }))));
  const out2 = h('span', { class: 'muted' });
  const check = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
    let right = 0;
    T.scenarios.forEach(s => {
      const slot = list.querySelector(`[data-s="${s.id}"] .fbslot`); slot.innerHTML = '';
      if (!picks[s.id]) { slot.append(feedback('bad', 'Choose an answer first.')); return; }
      const ok = picks[s.id] === s.answer; if (ok) right++; api.log(`match_${s.id}`, picks[s.id]);
      slot.append(feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', ok ? s.why : `${s.why} (Best match: ${T.methods.find(m => m.id === s.answer).text}.)`));
    });
    api.done({ matched: right, of: T.scenarios.length }); api.unlockNext(); out2.textContent = `${right} of ${T.scenarios.length} matched.`;
  } }, 'Check my matches');
  host.append(list, h('div', { class: 'row' }, check, out2), api.nav(true));
  return () => v?.dispose();
}
