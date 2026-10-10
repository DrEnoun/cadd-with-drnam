// Step 2 — Search and score. The student acts as the search algorithm, then watches the computer try many poses.
import { h, svg } from '../../ui.js';
import { quizlet } from './quizlet.js';

const S = 8; // pixels per Å
const W = 50, H = 37.5; // scene size in Å
const POCKET = [[13, 8], [36, 6], [43, 16], [41, 28], [26, 33], [11, 28], [7, 18]];
const LIG = [[-5, -2], [1, -2.5], [5, -1.2], [5.5, 1.5], [1, 2.5], [-5, 2]]; // ligand outline around its centre
const RING = [-3.4, 0], DONOR = [4.6, 0];
const IDEAL = { x: 25, y: 19, a: 25 };
const rot = ([x, y], a) => { const r = a * Math.PI / 180; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; };
const place = (p, pt) => { const [x, y] = rot(pt, p.a); return [p.x + x, p.y + y]; };
const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const GREASE = place(IDEAL, RING), ACCEPTOR = place(IDEAL, DONOR);

/** A toy scoring function: baseline fit, a hydrogen bond, a buried greasy ring, and penalties for atoms outside the pocket. */
export function score(p) {
  const hb = -2.5 * Math.exp(-((dist(place(p, DONOR), ACCEPTOR) / 1.6) ** 2));
  const hy = -3.5 * Math.exp(-((dist(place(p, RING), GREASE) / 2.6) ** 2));
  const out = LIG.filter(v => !inside(place(p, v), POCKET)).length;
  const s = -1.5 + hb + hy + out * 1.4;
  return { total: Math.min(s, 6), hb, hy, out };
}

export function render(host, api) {
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Every docking program does two jobs: it ', h('strong', {}, 'searches'), ' many positions and shapes of the ligand, and it ', h('strong', {}, 'scores'), ' each one. Understanding this pair explains almost everything else, including why the search box matters and why scores are only estimates.'),
    h('p', {}, 'Try it yourself. Drag the ligand into the pocket and turn it. The score updates live. A ',
      h('strong', {}, 'good pose'), ' puts the blue donor atom next to the acceptor (a hydrogen bond), buries the grey ring in the greasy patch, and keeps every atom inside the pocket.'));

  const pose = { x: 12, y: 28, a: -40 };
  const best = { total: Infinity };
  const root = svg('svg', { class: 'scene', viewBox: `0 0 ${W * S} ${H * S}`, role: 'img', 'aria-label': 'Ligand and protein pocket' });
  const px = pts => pts.map(([x, y]) => `${x * S},${y * S}`).join(' ');
  root.append(
    svg('polygon', { points: px(POCKET), fill: 'color-mix(in srgb, var(--sky-300) 55%, transparent)', stroke: 'var(--glass-edge)', 'stroke-width': 3 }),
    svg('circle', { cx: GREASE[0] * S, cy: GREASE[1] * S, r: 3.2 * S, fill: 'color-mix(in srgb, var(--slate-400) 30%, transparent)', stroke: 'var(--slate-400)', 'stroke-dasharray': '6 5', 'stroke-width': 2 }),
    svg('text', { x: GREASE[0] * S, y: GREASE[1] * S - 3.6 * S, 'text-anchor': 'middle', 'font-size': 8 }, 'greasy patch'),
    svg('circle', { cx: ACCEPTOR[0] * S, cy: ACCEPTOR[1] * S, r: 1.1 * S, fill: 'none', stroke: 'var(--coral-400)', 'stroke-width': 3 }),
    svg('text', { x: ACCEPTOR[0] * S, y: ACCEPTOR[1] * S + 3 * S, 'text-anchor': 'middle', 'font-size': 8 }, 'acceptor (ASP86)'),
    svg('text', { x: 14, y: 24, 'font-size': 9 }, 'Protein pocket (mock)'));
  const trials = svg('g', {}); root.append(trials);
  const lig = svg('g', { style: 'cursor:grab' });
  const body = svg('polygon', { fill: 'var(--spark-400)', stroke: 'var(--sticker-ink)', 'stroke-width': 3, 'stroke-linejoin': 'round', opacity: .95 });
  const ring = svg('circle', { r: 1.7 * S, fill: 'var(--slate-400)', stroke: 'var(--sticker-ink)', 'stroke-width': 2 });
  const don = svg('circle', { r: 1 * S, fill: 'var(--bright-blue-400)', stroke: 'var(--sticker-ink)', 'stroke-width': 2 });
  lig.append(body, ring, don); root.append(lig);

  const meter = h('div', { class: 'meter' }, h('i'));
  const sc = h('b', {}, ''); const info = h('p', { class: 'muted' }); const bestLbl = h('p', {});
  const draw = () => {
    body.setAttribute('points', LIG.map(v => place(pose, v).map(c => c * S).join(',')).join(' '));
    const r = place(pose, RING), d = place(pose, DONOR);
    ring.setAttribute('cx', r[0] * S); ring.setAttribute('cy', r[1] * S); don.setAttribute('cx', d[0] * S); don.setAttribute('cy', d[1] * S);
    const s = score(pose);
    sc.textContent = s.total.toFixed(1);
    meter.firstChild.style.width = `${Math.max(0, Math.min(100, (-s.total / 8) * 100))}%`;
    info.textContent = `Hydrogen bond: ${(-s.hb).toFixed(1)} · buried ring: ${(-s.hy).toFixed(1)} · atoms outside pocket: ${s.out}`;
    if (s.total < best.total) { best.total = s.total; bestLbl.textContent = `Your best so far: ${best.total.toFixed(1)} kcal/mol (mock units).`; }
    if (s.total < -7 && !api._found) { api._found = true; api.log('manual_found', s.total.toFixed(1)); }
  };

  // dragging
  let drag = null;
  const toScene = e => { const b = root.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.height * H]; };
  lig.addEventListener('pointerdown', e => { e.preventDefault(); drag = { o: toScene(e), p: { ...pose } }; lig.setPointerCapture(e.pointerId); lig.style.cursor = 'grabbing'; });
  lig.addEventListener('pointermove', e => { if (!drag) return; const c = toScene(e); pose.x = Math.max(2, Math.min(W - 2, drag.p.x + c[0] - drag.o[0])); pose.y = Math.max(2, Math.min(H - 2, drag.p.y + c[1] - drag.o[1])); draw(); });
  const end = () => { drag = null; lig.style.cursor = 'grab'; };
  lig.addEventListener('pointerup', end); lig.addEventListener('pointercancel', end);
  const rotBtn = (txt, d) => h('button', { class: 'sticker', type: 'button', 'aria-label': `Rotate ${txt}`, onclick: () => { pose.a += d; draw(); } }, txt);
  const move = (dx, dy, t) => h('button', { class: 'sticker', type: 'button', 'aria-label': `Move ${t}`, onclick: () => { pose.x += dx; pose.y += dy; draw(); } }, t);

  const auto = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: runSearch }, 'Let the computer search (300 poses)');
  const result = h('p', {});
  function runSearch() {
    trials.innerHTML = '';
    let top = null;
    for (let i = 0; i < 300; i++) {
      const p = { x: 8 + Math.random() * 34, y: 8 + Math.random() * 24, a: Math.random() * 360 };
      const s = score(p).total;
      if (!top || s < top.s) top = { p, s };
      trials.append(svg('circle', { cx: p.x * S, cy: p.y * S, r: 3, fill: s < -6 ? 'var(--spark-400)' : s < -3 ? 'var(--title-accent)' : 'var(--slate-400)', opacity: .65 }));
    }
    // short local refinement, like the final optimisation in real programs
    for (let k = 0; k < 150; k++) {
      const q = { x: top.p.x + (Math.random() - .5) * 1.2, y: top.p.y + (Math.random() - .5) * 1.2, a: top.p.a + (Math.random() - .5) * 12 };
      const s = score(q).total; if (s < top.s) top = { p: q, s };
    }
    Object.assign(pose, top.p); draw();
    result.textContent = `The computer tried 300 random poses plus a short refinement. Best score: ${top.s.toFixed(1)}${best.total < Infinity && best.total <= top.s ? ` (yours: ${best.total.toFixed(1)}, as good or better!)` : ` (yours was ${best.total.toFixed(1)})`}. Dots are the tried positions: lime = good scores, grey = poor.`;
    api.log('auto_search', top.s.toFixed(1));
    api.done({ manualBest: best.total, autoBest: top.s });
    unlockQuiz();
  }

  host.append(root,
    h('div', { class: 'row', style: 'margin-top:12px' }, h('div', { class: 'kv' }, h('span', {}, 'Score (kcal/mol, mock)'), sc), h('div', { style: 'flex:1;min-width:160px' }, meter)),
    info, bestLbl,
    h('div', { class: 'row' }, 'Turn:', rotBtn('↺ 15°', -15), rotBtn('↻ 15°', 15), 'Nudge:', move(-1, 0, '←'), move(1, 0, '→'), move(0, -1, '↑'), move(0, 1, '↓')),
    h('div', { class: 'row', style: 'margin-top:12px' }, auto), result);
  draw();

  const quizSlot = h('div', { class: 'stack', hidden: true });
  const quiz = quizlet(api, [
    { id: 'sc', q: 'In this activity, which part ranked the poses?', options: ['The scoring function', 'The search box', 'The protein structure file', 'The ligand name'], answer: 0, why: 'The score ranks the poses. The search decides which poses get tried.' },
    { id: 'rb', q: 'A ligand with many rotatable bonds (very flexible) is harder to dock because…', options: ['the number of possible poses grows enormously', 'the protein becomes smaller', 'the score is always better', 'hydrogens disappear'], answer: 0, why: 'Each rotatable bond adds more shapes to try, so the search space explodes. That is why ligand preparation and sensible settings matter.' },
  ], { onAll: () => { api.unlockNext(); } });
  quizSlot.append(h('h3', {}, 'Check your understanding'), quiz);
  const unlockQuiz = () => { quizSlot.hidden = false; };
  host.append(quizSlot,
    h('div', { class: 'card sticker-static', style: 'margin-top:20px' }, h('h3', {}, 'Rigid or flexible?'),
      h('p', {}, 'The first idea of binding was a rigid ', h('strong', {}, 'lock and key'), '. Real proteins move a little to fit the ligand (', h('strong', {}, 'induced fit'), '). Most docking programs keep the protein rigid, or allow only a few side chains to move, to stay fast. That is one reason a docking result is a prediction to be tested, not a fact.')),
    api.nav(true));
}
