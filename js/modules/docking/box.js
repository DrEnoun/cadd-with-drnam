// Step 4 — The search box (grid box). Drag and resize it over the pocket.
import { h, svg, feedback } from '../../ui.js';
import { quizlet } from './quizlet.js';

const S = 8, W = 50, H = 37.5;
export function render(host, api) {
  const { pocket, ligandLen, goodMax, start } = api.data.box;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The program only searches inside the box. The box tells it where to look: too small and the right answer is outside the box, too big and the search wastes time and finds many false poses.'),
    h('p', {}, 'Drag the box so it covers the pocket (the dashed circle) and change its size. A common rule is to make the box a little larger than the ligand and its pocket, with a margin of several Å around them.'));
  const box = { ...start };
  const root = svg('svg', { class: 'scene', viewBox: `0 0 ${W * S} ${H * S}`, role: 'img', 'aria-label': 'Protein with a pocket and a movable search box' });
  root.append(
    svg('rect', { x: 4 * S, y: 3 * S, width: 44 * S, height: 31 * S, rx: 40, fill: 'color-mix(in srgb, var(--sky-300) 40%, transparent)', stroke: 'var(--glass-edge)', 'stroke-width': 3 }),
    svg('text', { x: 6 * S, y: 7 * S, 'font-size': 9 }, 'Protein surface (mock)'),
    svg('circle', { cx: pocket.x * S, cy: pocket.y * S, r: pocket.r * S, fill: 'color-mix(in srgb, var(--coral-400) 22%, transparent)', stroke: 'var(--coral-400)', 'stroke-dasharray': '7 5', 'stroke-width': 3 }),
    svg('text', { x: pocket.x * S, y: pocket.y * S + 4, 'text-anchor': 'middle', 'font-size': 8.5 }, 'binding pocket'));
  const rect = svg('rect', { fill: 'color-mix(in srgb, var(--spark-400) 18%, transparent)', stroke: 'var(--spark-400)', 'stroke-width': 4, style: 'cursor:move' });
  const lbl = svg('text', { 'font-size': 8.5 });
  root.append(rect, lbl);
  const info = h('div', {});
  const meterFill = h('i');
  const draw = () => {
    rect.setAttribute('x', (box.x - box.s / 2) * S); rect.setAttribute('y', (box.y - box.s / 2) * S); rect.setAttribute('width', box.s * S); rect.setAttribute('height', box.s * S);
    lbl.setAttribute('x', (box.x - box.s / 2) * S + 6); lbl.setAttribute('y', (box.y - box.s / 2) * S + 18); lbl.textContent = `${box.s.toFixed(0)} × ${box.s.toFixed(0)} Å`;
    const half = box.s / 2, covers = half >= Math.abs(box.x - pocket.x) + pocket.r && half >= Math.abs(box.y - pocket.y) + pocket.r;
    const cut = !covers; const big = box.s > goodMax;
    const rel = Math.pow(box.s / 22, 3);
    meterFill.style.width = `${Math.min(100, rel * 35)}%`;
    const verdict = cut ? ['bad', 'Too small or off-centre', 'Part of the pocket is outside the box, so the correct pose may be impossible to find. Move or enlarge the box.']
      : big ? ['bad', 'Too large', `Search volume is about ${rel.toFixed(1)} times that of a 22 Å box. The program is slower and more likely to return false poses far from the pocket.`]
      : ['ok', 'Good box', 'The whole pocket is inside, with a margin. This is a sensible search space.'];
    info.replaceChildren(feedback(verdict[0], verdict[1], verdict[2]));
    box.verdict = verdict[1];
    if (verdict[0] === 'ok' && !api._done) { api._done = true; api.done({ size: box.s }); api.log('good_box', `${box.s.toFixed(0)} Å`); }
  };
  let drag = null; const toScene = e => { const b = root.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.height * H]; };
  rect.addEventListener('pointerdown', e => { e.preventDefault(); drag = { o: toScene(e), b: { ...box } }; rect.setPointerCapture(e.pointerId); });
  rect.addEventListener('pointermove', e => { if (!drag) return; const c = toScene(e); box.x = drag.b.x + c[0] - drag.o[0]; box.y = drag.b.y + c[1] - drag.o[1]; draw(); });
  rect.addEventListener('pointerup', () => { drag = null; }); rect.addEventListener('pointercancel', () => { drag = null; });
  const size = h('input', { type: 'range', min: 8, max: 44, step: 1, value: box.s, 'aria-label': 'Box size in angstrom', oninput: e => { box.s = +e.target.value; draw(); } });
  const nudge = (dx, dy, t) => h('button', { class: 'sticker', type: 'button', 'aria-label': `Move box ${t}`, onclick: () => { box.x += dx; box.y += dy; draw(); } }, t);
  host.append(root,
    h('div', { class: 'row', style: 'margin-top:12px' }, h('label', { for: 'bs' }, 'Box size:'), h('div', { style: 'flex:1;min-width:200px' }, size), nudge(-1, 0, '←'), nudge(1, 0, '→'), nudge(0, -1, '↑'), nudge(0, 1, '↓')),
    h('div', { class: 'row' }, h('span', {}, 'Relative search time'), h('div', { class: 'meter', style: 'flex:1;min-width:160px' }, meterFill)),
    info,
    h('p', { class: 'muted' }, `For scale: the ligand in this project is about ${ligandLen} Å long.`));
  draw();
  host.append(h('h3', {}, 'Check your understanding'), quizlet(api, [
    { id: 'big', q: 'A student makes the box very large "to be safe". What is the most likely downside?', options: ['Slower runs and more false poses far from the pocket', 'The ligand disappears', 'The score becomes exact', 'The protein unfolds'], answer: 0, why: 'More space means a bigger search. A box around the pocket with a sensible margin is best.' },
    { id: 'where', q: 'Where is the usual place to centre the box when a co-crystal ligand is known?', options: ['On the co-crystallised ligand (the known binding site)', 'At the edge of the protein', 'Anywhere, it does not matter', 'On the nearest water molecule'], answer: 0, why: 'The known ligand marks the real pocket. If no ligand is known, pocket-finding tools or "blind docking" over the whole protein are used, with less reliability.' },
  ], { onAll: () => api.unlockNext() }), api.nav(true));
}
