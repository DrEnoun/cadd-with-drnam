// Step 2 — Absorption: a BOILED-Egg style map for 45 real drugs, a probe you can move, and a solubility estimate (ESOL).
import { h, feedback } from '../../ui.js';
import { EGG, eggClass, EGG_TEXT, solClass, SOL_ORDER, dissolves } from './stats.js';
import { inspector } from './scenes.js';
import { quizlet } from '../docking/quizlet.js';

const GROUP = { coxib: ['#d4ff3a', 'COX-2 selective drugs'], nsaid: ['#2dd4bf', 'Other NSAIDs'], other: ['#7fb0ff', 'Drugs for other targets'], pains: ['#ff9f43', 'Assay-interference (PAINS)'] };
const XR = [0, 160], YR = [-4, 7];

export function render(host, api) {
  const D = api.data.drugs;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'To be absorbed from the gut, a molecule must dissolve in water and also pass through the fatty cell membranes of the gut wall. Too polar and it cannot cross the membrane; too greasy and it will not dissolve. Two numbers, the polar surface area (TPSA) and the greasiness (cLogP), capture most of this balance and can be calculated from the structure in milliseconds.'),
    h('p', {}, 'This map is a simplified version of the BOILED-Egg model. A compound inside the ', h('strong', {}, 'white'), ' is likely to be absorbed by passive diffusion in the gut. Inside the ', h('strong', {}, 'yolk'), ' it may also cross the blood-brain barrier. Click a dot to look at the drug, or move the probe.'));
  const canvas = h('canvas', { style: 'width:100%;max-width:760px;aspect-ratio:3/2;display:block;margin:auto;border-radius:16px;border:3px solid var(--glass-edge);cursor:crosshair', role: 'img', 'aria-label': 'Egg map of polar surface area against cLogP for 45 drugs' });
  const probe = { tpsa: 70, logp: 2 }; let sel = D.find(d => d.name === 'Ibuprofen'), pts = [];
  function draw() {
    const dpr = Math.min(devicePixelRatio || 1, 2), W = 760, H = 507; canvas.width = W * dpr; canvas.height = H * dpr;
    const x = canvas.getContext('2d'); x.scale(dpr, dpr);
    const L = 64, R = W - 20, T = 22, B = H - 58, px = t => L + (t - XR[0]) / (XR[1] - XR[0]) * (R - L), py = l => B - (l - YR[0]) / (YR[1] - YR[0]) * (B - T);
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0d2036'); bg.addColorStop(1, '#050b16'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(159,216,230,.14)'; x.lineWidth = 1; x.fillStyle = '#9fd8e6'; x.font = '14px Questrial, sans-serif';
    for (let t = 0; t <= 160; t += 40) { x.beginPath(); x.moveTo(px(t), T); x.lineTo(px(t), B); x.stroke(); x.textAlign = 'center'; x.fillText(t, px(t), B + 20); }
    for (let l = -4; l <= 7; l += 2) { x.beginPath(); x.moveTo(L, py(l)); x.lineTo(R, py(l)); x.stroke(); x.textAlign = 'right'; x.fillText(l, L - 10, py(l) + 5); }
    x.fillStyle = '#e3eef8'; x.font = '700 16px "League Spartan", sans-serif'; x.textAlign = 'center'; x.fillText('Polar surface area, TPSA (Å²) →', (L + R) / 2, H - 14); x.save(); x.translate(18, (T + B) / 2); x.rotate(-Math.PI / 2); x.fillText('Greasiness, cLogP →', 0, 0); x.restore();
    const ell = (e, fill, edge, glowc) => { x.save(); x.beginPath(); x.ellipse(px(e.cx), py(e.cy), e.a / (XR[1] - XR[0]) * (R - L), e.b / (YR[1] - YR[0]) * (B - T), 0, 0, 7); x.clip(); x.fillStyle = fill; x.fillRect(L, T, R - L, B - T); x.restore(); x.save(); x.shadowColor = glowc; x.shadowBlur = 14; x.strokeStyle = edge; x.lineWidth = 3; x.beginPath(); x.ellipse(px(e.cx), py(e.cy), e.a / (XR[1] - XR[0]) * (R - L), e.b / (YR[1] - YR[0]) * (B - T), 0, 0, 7); x.stroke(); x.restore(); };
    const w = EGG.white, y = EGG.yolk;
    const gw = x.createRadialGradient(px(w.cx), py(w.cy), 10, px(w.cx), py(w.cy), 330); gw.addColorStop(0, 'rgba(255,255,255,.34)'); gw.addColorStop(1, 'rgba(255,255,255,.12)'); ell(w, gw, 'rgba(255,255,255,.85)', 'rgba(255,255,255,.7)');
    const gy = x.createRadialGradient(px(y.cx) - 10, py(y.cy) - 10, 5, px(y.cx), py(y.cy), 150); gy.addColorStop(0, 'rgba(255,214,90,.75)'); gy.addColorStop(1, 'rgba(255,150,40,.5)'); ell(y, gy, 'rgba(255,196,60,.95)', 'rgba(255,170,40,.8)');
    x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '700 14px "League Spartan", sans-serif'; x.textAlign = 'left'; x.fillText('white: gut absorption', px(98), py(-1.6)); x.fillStyle = '#ffe9a8'; x.fillText('yolk: also brain', px(4), py(5.6));
    pts = [];
    for (const d of D) { const X = px(d.tpsa), Yv = py(d.wlogp); pts.push({ d, X, Y: Yv }); const c = GROUP[d.group][0]; x.save(); x.shadowColor = c; x.shadowBlur = 10; x.fillStyle = c; x.strokeStyle = d === sel ? '#fff' : 'rgba(0,0,0,.6)'; x.lineWidth = d === sel ? 3 : 1.5; x.beginPath(); x.arc(X, Yv, d === sel ? 8 : 5.5, 0, 7); x.fill(); x.stroke(); x.restore(); }
    if (sel) { x.fillStyle = '#fff'; x.font = '700 14px "League Spartan", sans-serif'; x.textAlign = 'left'; x.fillText(sel.name, px(sel.tpsa) + 12, py(sel.wlogp) - 10); }
    const X = px(probe.tpsa), Yp = py(probe.logp); x.save(); x.strokeStyle = '#fff'; x.setLineDash([4, 4]); x.lineWidth = 2; x.beginPath(); x.arc(X, Yp, 11, 0, 7); x.stroke(); x.setLineDash([]); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(X, Yp - 4); x.lineTo(X, Yp + 4); x.moveTo(X - 4, Yp); x.lineTo(X + 4, Yp); x.stroke(); x.restore();
    canvas._map = { px, py, L, R, T, B };
  }
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect(), sx = 760 / r.width, X = (e.clientX - r.left) * sx, Y = (e.clientY - r.top) * sx;
    let best = null; for (const p of pts) { const dd = Math.hypot(p.X - X, p.Y - Y); if (dd < 16 && (!best || dd < best.dd)) best = { p, dd }; }
    if (best) select(best.p.d);
  });
  const info = h('div', { class: 'card sticker-static stack' }), insHost = h('div', {}), ins = inspector(insHost, { height: 250 });
  function select(d) {
    sel = d; ins.show(d, [], d.group === 'coxib' ? 0xd4ff3a : d.group === 'nsaid' ? 0x2dd4bf : d.group === 'pains' ? 0xff9f43 : 0x7fb0ff);
    const e = eggClass(d), cls = solClass(d.esol);
    info.replaceChildren(h('h3', { style: 'margin:0' }, d.name), h('p', { style: 'margin:0' }, h('span', { class: 'tag' }, GROUP[d.group][1])), h('p', { style: 'margin:0' }, d.note ?? ''),
      h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('tbody', {}, [['TPSA', `${d.tpsa} Å²`], ['cLogP', d.wlogp], ['Molecular weight', `${d.mw} Da`], ['Solubility (ESOL logS)', `${d.esol}: ${cls}`], ['Egg map', e === 'yolk' ? 'Yolk' : e === 'white' ? 'White' : 'Outside']].map(([a, b]) => h('tr', {}, h('td', {}, a), h('td', { class: 'num' }, b)))))),
      h('p', { style: 'margin:0;font-size:15px' }, EGG_TEXT[e]));
    api.log('select', d.name); draw();
  }
  const sliderRow = (label, key, min, max, step) => { const val = h('b', { style: 'min-width:60px;display:inline-block' }, String(probe[key])); return h('label', { class: 'row' }, h('span', { style: 'min-width:150px' }, label), h('input', { type: 'range', min, max, step, value: probe[key], 'aria-label': label, style: 'flex:1;min-width:160px', oninput: e => { probe[key] = +e.target.value; val.textContent = probe[key]; upd(); } }), val); };
  const probeOut = h('div', {});
  const upd = () => { const e = eggClass({ tpsa: probe.tpsa, wlogp: probe.logp }); probeOut.replaceChildren(feedback(e === 'out' ? 'bad' : 'ok', `Probe: ${e === 'yolk' ? 'in the yolk' : e === 'white' ? 'in the white' : 'outside the egg'}`, EGG_TEXT[e])); draw(); api.log('probe', `${probe.tpsa}/${probe.logp}`); };
  host.append(canvas, h('div', { class: 'legend', style: 'justify-content:center;margin:8px 0' }, Object.values(GROUP).map(([c, t]) => h('span', {}, h('i', { style: `background:${c};border-radius:50%` }), t))),
    h('div', { class: 'grid2', style: 'margin-top:12px' }, insHost, info), h('h3', { style: 'margin-top:14px' }, 'Move the probe'), sliderRow('Polar surface area (Å²)', 'tpsa', 0, 160, 1), sliderRow('Greasiness (cLogP)', 'logp', -4, 7, .1), probeOut);
  select(sel); upd();

  // ---- solubility
  host.append(h('h3', { style: 'margin-top:26px' }, 'Does it dissolve?'), h('p', {}, 'A tablet must dissolve before it can be absorbed. ESOL estimates the solubility (logS, in mol/L) from cLogP, molecular weight, rotatable bonds and the proportion of aromatic atoms. Pick a drug and a dose, and see if the dose would dissolve in a glass of water (250 mL). This is a rough estimate of one factor, because stomach and gut fluids are not plain water.'));
  const drugSel = h('select', { 'aria-label': 'Drug', onchange: () => sol() }, ['Celecoxib', 'Ibuprofen', 'Naproxen', 'Aspirin', 'Caffeine', 'Atorvastatin', 'Tamoxifen', 'Paracetamol', 'Metformin'].map(n => h('option', { value: n }, n)));
  const dose = h('input', { type: 'range', min: 25, max: 1000, step: 25, value: 200, 'aria-label': 'Dose in mg', style: 'flex:1;min-width:160px', oninput: () => sol() }), doseLab = h('b', {}), solOut = h('div', { class: 'stack' });
  function sol() {
    const d = D.find(x => x.name === drugSel.value), mg = +dose.value, ok = dissolves(d, mg), cls = solClass(d.esol), cap = d.solmgml * 250;
    doseLab.textContent = `${mg} mg`;
    const idx = SOL_ORDER.indexOf(cls);
    solOut.replaceChildren(h('div', { class: 'row' }, h('div', { class: 'kv' }, h('span', {}, 'logS'), h('b', {}, String(d.esol))), h('div', { class: 'kv' }, h('span', {}, 'Class'), h('b', { style: 'font-size:22px' }, cls)), h('div', { class: 'kv' }, h('span', {}, 'Dissolves in 250 mL'), h('b', { style: 'font-size:22px' }, cap >= 1 ? `${cap.toFixed(0)} mg` : `${cap.toFixed(2)} mg`))),
      h('div', { class: 'meter' }, h('i', { style: `width:${Math.min(100, mg / Math.max(cap, 1e-6) * 100)}%;background:${ok ? 'var(--spark-400)' : 'var(--coral-400)'}` })),
      feedback(ok ? 'ok' : 'bad', ok ? `The ${mg} mg dose would dissolve (estimate)` : `The ${mg} mg dose would NOT fully dissolve (estimate)`, ok ? 'Solubility is unlikely to limit absorption of this dose.' : 'Poor solubility can limit absorption. Formulation tricks (smaller particles, salts, lipid carriers) can help, but they add cost.'));
    api.log('solubility', `${d.name}:${mg}`);
  }
  host.append(h('div', { class: 'row' }, h('span', {}, 'Drug:'), drugSel), h('label', { class: 'row' }, h('span', { style: 'min-width:60px' }, 'Dose'), dose, doseLab), solOut); sol();
  host.append(h('div', { class: 'card sticker-static', style: 'margin-top:14px' }, h('h3', {}, 'Limits to remember'), h('p', {}, 'The egg map only looks at passive diffusion. It ignores ionisation (see the next page), plasma protein binding, active transporters such as P-glycoprotein and metabolism in the gut wall. For example, many acidic drugs fall in the yolk, but in reality very little reaches the brain, because they are ionised and strongly bound to plasma proteins. Use the map to flag problems, not to promise success.')));
  host.append(h('h3', { style: 'margin-top:20px' }, 'Check your understanding'), quizlet(api, [
    { id: 'tpsa', q: 'A compound has a very high polar surface area (about 150 Å²). What is the most likely problem?', options: ['It is too polar to cross the fatty membrane of the gut wall', 'It is too greasy to dissolve', 'It will cross the blood-brain barrier easily', 'It has too few hydrogen bonds'], answer: 0, why: 'High TPSA means many polar groups. They love water but resist leaving it to pass through the membrane.' },
    { id: 'yolk', q: 'What extra thing does the yolk of the egg predict compared with the white?', options: ['The compound may also cross the blood-brain barrier', 'The compound is toxic', 'The compound is metabolised faster', 'The compound is more soluble'], answer: 0, why: 'The yolk is a smaller region with lower TPSA, where passive entry into the brain is likely.' },
    { id: 'limit', q: 'Why is the egg map only a guide?', options: ['It ignores ionisation, protein binding, transporters and metabolism', 'It is calculated by hand', 'It only works for acids', 'It uses the docking score'], answer: 0, why: 'It looks at passive diffusion based on two properties only.' },
  ], { onAll: () => { api.done({ explored: 1 }); api.unlockNext(); } }), api.nav(true));
  return () => ins.dispose();
}
