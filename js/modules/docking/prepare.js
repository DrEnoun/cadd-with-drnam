// Step 3 — Prepare the structure and the ligand. Decide what to do with each item in a raw structure file.
import { h, feedback } from '../../ui.js';

const CHOICES = [['keep', 'Keep as is'], ['remove', 'Remove'], ['fix', 'Fix / add / assign']];

export function render(host, api) {
  const items = api.data.prepare;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'A structure file straight from the Protein Data Bank is a record of a crystal, not a ready-to-use model. Docking software trusts the file completely, so every mistake you leave in becomes a mistake in the result ("garbage in, garbage out").'),
    h('p', {}, `This is the raw file for ${api.data.target.name} (mock). For each item, choose what a careful scientist would do.`));
  const picks = {}; const list = h('div', { class: 'stack' });
  items.forEach(it => {
    const opts = h('div', { class: 'row' }, CHOICES.map(([k, t]) => h('button', { class: 'sticker', type: 'button', 'aria-pressed': 'false', 'data-k': k, onclick: e => {
      picks[it.id] = k; opts.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    } }, t)));
    list.append(h('div', { class: 'card sticker-static', 'data-id': it.id }, h('h3', { style: 'margin:0' }, it.item), h('p', { class: 'muted', style: 'color:inherit' }, it.detail), opts, h('div', { class: 'fbslot' })));
  });
  const out = h('div', {});
  const btn = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
    if (items.some(i => !picks[i.id])) { out.replaceChildren(feedback('bad', 'Choose an action for every item first.')); return; }
    let right = 0; const wrong = [];
    items.forEach(it => {
      const ok = picks[it.id] === it.answer; if (ok) right++; else wrong.push(it.id);
      const slot = list.querySelector(`[data-id="${it.id}"] .fbslot`);
      slot.replaceChildren(feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', ok ? it.why : `${it.why} Consequence of your choice: ${it.bad}`));
      api.log(`item_${it.id}`, picks[it.id]);
    });
    out.replaceChildren(h('p', {}, h('strong', {}, `${right} of ${items.length} correct.`), right === items.length ? ' Your structure is ready for docking.' : ' Read the notes above, then change your answers and check again if you like.'));
    api.done({ correct: right, of: items.length, wrong: wrong.join(' ') });
    api.unlockNext();
  } }, 'Check my choices');
  host.append(list, h('div', { class: 'row', style: 'margin-top:16px' }, btn), out,
    h('div', { class: 'card sticker-static', style: 'margin-top:16px' }, h('h3', {}, 'Remember'), h('p', {}, 'Preparation is where most beginners lose accuracy. In real software the names of the buttons differ, but the ideas are the same: clean, complete, charge, and prepare the ligand.')),
    api.nav(true));
}
