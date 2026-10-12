// Step 4 — The set-up workflow: put the steps of an MD study in the right order.
import { h, feedback, shuffle } from '../../ui.js';

export function render(host, api) {
  const S = api.data.teaching.workflow.steps;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'An MD run is the last of many steps, and skipping or reordering one can ruin it. Many failed simulations are not bad science in the run itself but a mistake in the set-up. Knowing the order, and the reason for each step, lets you read any MD protocol.'),
    h('p', {}, 'A docked complex has to be turned into a realistic system before it is simulated. The steps below are in the wrong order. Use the arrows to put them in the right order, then check.'));
  let order = shuffle(S.map(s => s.id));
  while (order.join() === S.map(s => s.id).join()) order = shuffle(order);
  const list = h('ol', { class: 'stack', style: 'list-style:none;padding:0' }), out = h('div', { class: 'stack' });
  const draw = (mark = null) => {
    list.replaceChildren(...order.map((id, i) => { const s = S.find(x => x.id === id), ok = mark ? S[i].id === id : null;
      return h('li', { class: 'card sticker-static', style: `display:flex;gap:10px;align-items:center;${ok === true ? 'border-color:var(--spark-400)' : ok === false ? 'border-color:var(--coral-400)' : ''}` },
        h('b', { class: 'num', style: 'min-width:1.6em' }, i + 1), h('span', { style: 'flex:1' }, s.text),
        h('button', { class: 'sticker', type: 'button', 'aria-label': `Move up: ${s.text}`, disabled: i === 0, onclick: () => { [order[i - 1], order[i]] = [order[i], order[i - 1]]; draw(); api.log('move', id); } }, '↑'),
        h('button', { class: 'sticker', type: 'button', 'aria-label': `Move down: ${s.text}`, disabled: i === order.length - 1, onclick: () => { [order[i + 1], order[i]] = [order[i], order[i + 1]]; draw(); api.log('move', id); } }, '↓')); }));
  };
  draw();
  const btn = h('button', { class: 'btn-start', type: 'button', onclick: () => {
    const right = order.filter((id, i) => S[i].id === id).length; draw(true); api.log('inPlace', right);
    api.done({ inPlace: right, of: S.length, perfect: right === S.length ? 1 : 0 });
    out.replaceChildren(right === S.length ? feedback('ok', 'Perfect order', 'Every step is in the right place. Read the reason for each step below.') : feedback('bad', `${right} of ${S.length} in the right place`, 'Green outlines are right, red are not. Think about what each step needs from the one before. You can keep moving them and check again.'),
      h('div', { class: 'card sticker-static' }, h('h3', { style: 'margin-top:0' }, 'Why this order'), h('ol', {}, S.map(s => h('li', {}, h('strong', {}, s.short + ': '), s.why)))));
    api.unlockNext();
  } }, 'Check the order');
  host.append(list, h('div', { class: 'row', style: 'margin-top:12px' }, btn), out, h('p', { class: 'hint' }, 'Follows the usual GROMACS-style protocol (for example the NAM-NPeasy tutorial: solvate in a TIP3P water box, neutralise with Na⁺ and Cl⁻ ions, energy minimise, NVT at 300 K, NPT at 1 bar, then 100 ns production). Other programs use different names for the same ideas.'), api.nav(true));
}
