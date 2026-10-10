// Step 4 — Prepare the library. Decide what to do with each kind of problem; see a prepared 3D molecule.
import { h, feedback } from '../../ui.js';
import { inspector } from './scenes.js';

const CHOICES = [['keep', 'Keep as is'], ['remove', 'Remove'], ['fix', 'Fix / standardise']];

export function render(host, api) {
  const items = api.data.teaching.prepare, lib = api.data.compounds;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Libraries come from many suppliers and are messy: salts, duplicates, flat drawings, wrong charges, assay-interference scaffolds. Shape and docking methods trust the structure they are given, so every mistake you leave in becomes a mistake in the ranking.'),
    h('p', {}, 'A prepared compound is clean, in the right charge state and has a realistic 3D shape. Rotate the examples below, then decide what to do with each problem.'));
  const insHost = h('div', {}), ins = inspector(insHost, { height: 300 });
  const examples = ['Ibuprofen', 'Diclofenac', 'Celecoxib', 'Naproxen', 'Piroxicam'].map(n => lib.find(c => c.name === n)).filter(Boolean);
  const sel = h('select', { 'aria-label': 'Example molecule', onchange: e => ins.show(examples[+e.target.value]) }, examples.map((c, i) => h('option', { value: i }, `${c.name}: 3D conformer`)));
  host.append(h('div', { class: 'row' }, h('span', {}, 'Example:'), sel), insHost, h('p', { class: 'hint' }, 'These 3D shapes were generated from flat structures and minimised (shown neutral for clarity; the carboxylic acids would be charged at body pH).'));
  ins.show(examples[0]);
  const picks = {}, list = h('div', { class: 'stack' });
  items.forEach(it => {
    const opts = h('div', { class: 'row' }, CHOICES.map(([k, t]) => h('button', { class: 'sticker', type: 'button', 'aria-pressed': 'false', 'data-k': k, onclick: () => { picks[it.id] = k; opts.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); } }, t)));
    list.append(h('div', { class: 'card sticker-static', 'data-id': it.id }, h('h3', { style: 'margin:0' }, it.item), h('p', { style: 'margin:4px 0' }, it.detail), opts, h('div', { class: 'fbslot' })));
  });
  const out = h('div', {});
  const btn = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
    if (items.some(i => !picks[i.id])) { out.replaceChildren(feedback('bad', 'Choose an action for every item first.')); return; }
    let right = 0; const wrong = [];
    items.forEach(it => {
      const ok = picks[it.id] === it.answer; if (ok) right++; else wrong.push(it.id);
      list.querySelector(`[data-id="${it.id}"] .fbslot`).replaceChildren(feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', ok ? it.why : `${it.why} Consequence of your choice: ${it.bad}`));
      api.log(`item_${it.id}`, picks[it.id]);
    });
    out.replaceChildren(h('p', {}, h('strong', {}, `${right} of ${items.length} correct.`), right === items.length ? ' Your library is ready to screen.' : ' Read the notes, change your answers and check again if you like.'));
    api.done({ correct: right, of: items.length, wrong: wrong.join(' ') }); api.unlockNext();
  } }, 'Check my choices');
  host.append(list, h('div', { class: 'row', style: 'margin-top:16px' }, btn), out, api.nav(true));
  return () => ins.dispose();
}
