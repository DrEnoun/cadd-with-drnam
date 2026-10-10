// Step 4 — The search box (grid box), in 3D. Move and resize it so it covers the pocket.
import { h, feedback } from '../../ui.js';
import { modeBar, boxGroup, THREE, callout } from '../../viewer3d.js';
import { add, scale, covers } from './geom.js';
import { viewer, ligandGroup, pocketGroup, ligandAtoms, nameParts, labelBar, KEYCOL } from './view.js';
import { quizlet } from './quizlet.js';

export function render(host, api) {
  const B = api.data.box, box = { c: [...B.start.c], s: B.start.s };
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The program only searches inside the box. The box tells it where to look: too small and the right answer is outside the box, too big and the search wastes time and finds many false poses.'),
    h('p', {}, 'The red glow marks the region the box must cover: the whole binding pocket around celecoxib, the known ligand. Move the box over it and set its size. A common rule is a box a little larger than the pocket, with a margin of several Å around it.'));
  const v = viewer(host, { height: 460, dist: 56 });
  const bg = boxGroup(); let parts = null, boxCall = null;
  if (v) {
    const glow = new THREE.Mesh(new THREE.SphereGeometry(B.pocketRadius, 32, 24), new THREE.MeshBasicMaterial({ color: 0xfc7a7a, transparent: true, opacity: .22, depthWrite: false }));
    v.root.add(pocketGroup(api.data.structure, { show: [] }), ligandGroup(ligandAtoms(api.data), api.data.structure.ligand.bonds, { halo: 3 }), glow, bg);
    parts = nameParts(v, api.data.structure, ['ligand', 'protein'], { ligandText: 'The ligand (celecoxib)' });
    parts.group.add(callout('Binding pocket: the box must cover this', [0, B.pocketRadius * .7, B.pocketRadius * .7], [-14, 9, 4], '#ff9b9b'));
    boxCall = callout('Search box', box.c, [10, 12, 0], KEYCOL.ligand); parts.group.add(boxCall);
    parts.items.push({ label: 'Pocket: the region the box must cover', color: '#ff9b9b' }, { label: 'Search box: where the program looks', color: KEYCOL.ligand });
    v.onDrag = (mode, dx, dy, c) => { if (mode === 'move') { box.c = add(box.c, add(scale(c.right, dx * c.perPx), scale(c.up, -dy * c.perPx))); draw(); } };
  }
  const info = h('div', {}), fill = h('i');
  function draw() {
    const ok = covers(box.c, box.s, B.pocketRadius), big = box.s > B.goodMax, rel = (box.s / 22) ** 3;
    bg.userData.set(box.c, box.s, ok && !big);
    boxCall?.userData.set([box.c[0] + box.s / 2, box.c[1] + box.s / 2, box.c[2]], [7, -2, 0]);
    fill.style.width = `${Math.min(100, rel * 35)}%`;
    const verdict = !ok ? ['bad', 'Too small or off-centre', 'Part of the pocket is outside the box, so the correct pose may be impossible to find. Move or enlarge the box.']
      : big ? ['bad', 'Too large', `Search volume is about ${rel.toFixed(1)} times that of a 22 Å box. The program is slower and more likely to return false poses far from the pocket.`]
      : ['ok', 'Good box', 'The whole pocket is inside, with a margin. This is a sensible search space.'];
    info.replaceChildren(feedback(verdict[0], verdict[1], verdict[2]));
    sizeLbl.textContent = `${box.s.toFixed(0)} × ${box.s.toFixed(0)} × ${box.s.toFixed(0)} Å`;
    if (verdict[0] === 'ok' && !api._done) { api._done = true; api.done({ size: box.s }); api.log('good_box', `${box.s.toFixed(0)} Å`); }
    v?.render();
  }
  const size = h('input', { type: 'range', min: 8, max: 44, step: 1, value: box.s, 'aria-label': 'Box size in angstrom', style: 'flex:1;min-width:200px', oninput: e => { box.s = +e.target.value; draw(); } });
  const sizeLbl = h('b', {});
  const nudge = (axis, d, t) => h('button', { class: 'sticker', type: 'button', 'aria-label': `Move box ${t}`, onclick: () => { box.c[axis] += d; draw(); } }, t);
  host.append(
    parts ? labelBar(parts.group, parts.items) : null,
    v ? modeBar(v, [['view', 'Rotate the view'], ['move', 'Move the box']]) : null,
    h('div', { class: 'row', style: 'margin-top:12px' }, h('span', {}, 'Box size:'), size, sizeLbl),
    h('div', { class: 'row' }, 'Move box:', nudge(0, -2, '← left'), nudge(0, 2, 'right →'), nudge(1, 2, '↑ up'), nudge(1, -2, '↓ down'), nudge(2, 2, 'front'), nudge(2, -2, 'back')),
    h('div', { class: 'row' }, h('span', {}, 'Relative search time'), h('div', { class: 'meter', style: 'flex:1;min-width:160px' }, fill)),
    info,
    h('p', { class: 'muted' }, `For scale: the ligand in this project is about ${B.ligandLen} Å long. Turn the view to check the box from every side: it must cover the pocket in all three directions.`));
  draw();
  host.append(h('h3', {}, 'Check your understanding'), quizlet(api, [
    { id: 'big', q: 'A student makes the box very large "to be safe". What is the most likely downside?', options: ['Slower runs and more false poses far from the pocket', 'The ligand disappears', 'The score becomes exact', 'The protein unfolds'], answer: 0, why: 'More space means a bigger search. A box around the pocket with a sensible margin is best.' },
    { id: 'where', q: 'Where is the usual place to centre the box when a co-crystal ligand is known?', options: ['On the co-crystallised ligand (the known binding site)', 'At the edge of the protein', 'Anywhere, it does not matter', 'On the nearest water molecule'], answer: 0, why: 'The known ligand marks the real pocket. If no ligand is known, pocket-finding tools or "blind docking" over the whole protein are used, with less reliability.' },
  ], { onAll: () => api.unlockNext() }), api.nav(true));
  return () => v?.dispose();
}
