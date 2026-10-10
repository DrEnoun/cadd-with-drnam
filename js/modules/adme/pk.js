// Step 5 — Excretion and half-life: a concentration-time simulator (one-compartment oral model), with repeated doses.
import { h, feedback } from '../../ui.js';
import { conc1, concMulti, tmaxCmax, auc, rateFromHalfLife, clearance, accumulation, avgSteady, timeToSteady } from './stats.js';
import { quizlet } from '../docking/quizlet.js';

export function render(host, api) {
  const presets = api.data.teaching.pk.presets;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Absorption puts a drug into the blood and metabolism plus excretion take it out. The balance of the two decides how high the level goes (Cmax), how long it lasts (half-life) and how often a patient must take it. A compound with a perfect ADME profile on paper can still fail if its half-life is far too short or too long.'),
    h('p', {}, 'This is a one-compartment model of an oral dose: the drug enters the blood at rate ka, is spread in a volume V and is removed with half-life t½. Choose a real drug as a starting point, then change the numbers. The values are typical, rounded adult values for teaching.'));
  const P = { ...presets[0], doses: 1 };
  const keys = [['dose', 'Dose (mg)', 25, 1000, 25], ['F', 'Fraction absorbed, F', .1, 1, .05], ['V', 'Volume of distribution, V (L)', 5, 450, 1], ['tHalf', 'Half-life, t½ (h)', .5, 24, .5], ['ka', 'Absorption rate, ka (1/h)', .2, 4, .1], ['tau', 'Dosing interval (h)', 4, 24, 2], ['doses', 'Number of doses', 1, 12, 1]];
  const canvas = h('canvas', { style: 'width:100%;max-width:760px;aspect-ratio:3/1.8;display:block;margin:auto;border-radius:16px;border:3px solid var(--glass-edge)', role: 'img', 'aria-label': 'Drug concentration in the blood against time' });
  const note = h('p', { class: 'muted' }), stats = h('div', { class: 'stack' }), inputs = {};
  const sel = h('select', { 'aria-label': 'Drug', onchange: e => { Object.assign(P, presets[+e.target.value], { doses: P.doses }); for (const [k] of keys) if (inputs[k]) { inputs[k].inp.value = P[k]; } update(); api.log('preset', P.name); } }, presets.map((p, i) => h('option', { value: i }, p.name)));
  const params = () => ({ F: P.F, D: P.dose, V: P.V, ka: P.ka, ke: rateFromHalfLife(P.tHalf) });
  function draw() {
    const p = params(), tau = P.tau, n = P.doses, tEnd = Math.max(n * tau + 3 * P.tHalf, 12, 6 * P.tHalf), dpr = Math.min(devicePixelRatio || 1, 2), W = 760, H = 456; canvas.width = W * dpr; canvas.height = H * dpr;
    const x = canvas.getContext('2d'); x.scale(dpr, dpr);
    const pts = []; let cmaxAll = 0; for (let t = 0; t <= tEnd; t += tEnd / 400) { const c = concMulti(t, p, tau, n); pts.push([t, c]); cmaxAll = Math.max(cmaxAll, c); }
    const YM = Math.max(cmaxAll * 1.15, 0.01), L = 70, R = W - 20, T = 22, B = H - 56, px = t => L + t / tEnd * (R - L), py = c => B - c / YM * (B - T);
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0d2036'); bg.addColorStop(1, '#050b16'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(159,216,230,.14)'; x.fillStyle = '#9fd8e6'; x.font = '13px Questrial, sans-serif'; x.textAlign = 'center';
    const st = Math.pow(10, Math.floor(Math.log10(tEnd / 5))); const stepT = [1, 2, 5, 10].map(m => m * st).find(v => tEnd / v <= 8) ?? 10 * st;
    for (let t = 0; t <= tEnd; t += stepT) { x.beginPath(); x.moveTo(px(t), T); x.lineTo(px(t), B); x.stroke(); x.fillText(Math.round(t * 10) / 10, px(t), B + 18); }
    for (let k = 0; k <= 4; k++) { const c = YM * k / 4; x.beginPath(); x.moveTo(L, py(c)); x.lineTo(R, py(c)); x.stroke(); x.textAlign = 'right'; x.fillText(c >= 10 ? c.toFixed(0) : c.toFixed(1), L - 8, py(c) + 5); x.textAlign = 'center'; }
    x.fillStyle = '#e3eef8'; x.font = '700 15px "League Spartan", sans-serif'; x.fillText('Time after the first dose (hours) →', (L + R) / 2, H - 12); x.save(); x.translate(18, (T + B) / 2); x.rotate(-Math.PI / 2); x.fillText('Blood concentration (mg/L) →', 0, 0); x.restore();
    for (let k = 0; k < n; k++) { x.strokeStyle = 'rgba(255,255,255,.35)'; x.setLineDash([3, 5]); x.beginPath(); x.moveTo(px(k * tau), B); x.lineTo(px(k * tau), T + 30); x.stroke(); x.setLineDash([]); x.fillStyle = '#fff'; x.font = '16px sans-serif'; x.fillText('💊', px(k * tau), T + 24); }
    const ga = x.createLinearGradient(0, T, 0, B); ga.addColorStop(0, 'rgba(212,255,58,.35)'); ga.addColorStop(1, 'rgba(212,255,58,0)'); x.beginPath(); x.moveTo(px(0), B); pts.forEach(([t, c]) => x.lineTo(px(t), py(c))); x.lineTo(px(tEnd), B); x.closePath(); x.fillStyle = ga; x.fill();
    x.save(); x.shadowColor = '#d4ff3a'; x.shadowBlur = 12; x.strokeStyle = '#d4ff3a'; x.lineWidth = 3.5; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([t, c], i) => i ? x.lineTo(px(t), py(c)) : x.moveTo(px(t), py(c))); x.stroke(); x.restore();
    const { tmax, cmax } = tmaxCmax(p); if (n === 1 || true) { x.fillStyle = '#fff'; x.beginPath(); x.arc(px(tmax), py(cmax), 6, 0, 7); x.fill(); x.font = '700 13px "League Spartan", sans-serif'; x.textAlign = 'left'; x.fillText(`Cmax ${cmax.toFixed(cmax < 10 ? 2 : 1)} mg/L at ${tmax.toFixed(1)} h`, px(tmax) + 10, py(cmax) - 8); }
    // half-life marker on the falling limb of a single dose
    if (n === 1) { const th = tmax + P.tHalf * 1.0; x.setLineDash([4, 4]); x.strokeStyle = '#ffb15a'; x.beginPath(); x.moveTo(px(tmax), py(cmax / 2)); x.lineTo(px(th), py(cmax / 2)); x.stroke(); x.setLineDash([]); }
    if (n > 1) { const avg = avgSteady(p, tau); x.setLineDash([6, 6]); x.strokeStyle = '#ff9f43'; x.lineWidth = 2; x.beginPath(); x.moveTo(L, py(avg)); x.lineTo(R, py(avg)); x.stroke(); x.setLineDash([]); x.fillStyle = '#ff9f43'; x.textAlign = 'right'; x.font = '700 13px "League Spartan", sans-serif'; x.fillText(`average at steady state ${avg.toFixed(avg < 10 ? 2 : 1)} mg/L`, R - 4, py(avg) - 6); }
  }
  function update() {
    const p = params(), { tmax, cmax } = tmaxCmax(p), CL = clearance(P.V, P.tHalf), A = auc(p), R = accumulation(p.ke, P.tau);
    draw();
    stats.replaceChildren(h('div', { class: 'row' }, ...[['Cmax', `${cmax.toFixed(cmax < 10 ? 2 : 1)} mg/L`], ['Tmax', `${tmax.toFixed(1)} h`], ['t½', `${P.tHalf} h`], ['Clearance', `${CL.toFixed(CL < 10 ? 1 : 0)} L/h`], ['AUC', `${A.toFixed(A < 100 ? 1 : 0)} mg·h/L`]].map(([a, b]) => h('div', { class: 'kv' }, h('span', {}, a), h('b', { style: 'font-size:22px' }, b)))),
      P.doses > 1 ? h('p', { style: 'margin:0' }, `Accumulation: at steady state the level is about ${R.toFixed(1)} times higher than after one dose. Steady state is reached after about ${timeToSteady(P.tHalf).toFixed(0)} hours (about 4 half-lives).`) : h('p', { style: 'margin:0' }, `After one half-life (${P.tHalf} h) the level falls to half. After 5 half-lives (${(5 * P.tHalf).toFixed(0)} h) about 3% remains.`));
    note.textContent = P.note ?? 'Custom values.'; api.log('pk', `${P.name}:${P.dose}/${P.tHalf}/${P.doses}`);
  }
  const rows = keys.map(([k, label, min, max, step]) => { const val = h('b', { style: 'min-width:64px;display:inline-block' }), inp = h('input', { type: 'range', min, max, step, value: P[k], 'aria-label': label, style: 'flex:1;min-width:160px', oninput: e => { P[k] = +e.target.value; val.textContent = P[k]; P.note = null; update(); } }); val.textContent = P[k]; inputs[k] = { inp, val }; return h('label', { class: 'row' }, h('span', { style: 'min-width:220px' }, label), inp, val); });
  sel.addEventListener('change', () => { for (const [k] of keys) { inputs[k].inp.value = P[k]; inputs[k].val.textContent = P[k]; } });
  host.append(h('div', { class: 'row' }, h('span', {}, 'Start from:'), sel), note, canvas, stats, h('div', { class: 'stack', style: 'margin-top:10px' }, rows));
  update();
  host.append(h('div', { class: 'card sticker-static', style: 'margin-top:14px' }, h('h3', {}, 'What to try'), h('ul', {}, ['Halve the half-life. What happens to Cmax, AUC and the time the drug stays in the blood?', 'Double the volume of distribution. What happens to the peak? (The drug is spread more thinly.)', 'Choose ibuprofen and set 6 doses, 8 hours apart. Then lengthen the interval to 24 hours. When does the drug build up, and when does it disappear between doses?', 'Choose celecoxib: why does it rise slowly and last so long?'].map(t => h('li', {}, t))), h('p', {}, 'Excretion and metabolism together set the clearance (CL = 0.693 × V ÷ t½). A high clearance means a short half-life and more frequent dosing. Kidney disease lowers clearance of drugs that leave by the kidneys, so doses must be reduced.')));
  host.append(h('h3', { style: 'margin-top:20px' }, 'Check your understanding'), quizlet(api, [
    { id: 'half', q: 'A drug has a half-life of 4 hours. A patient takes it every 4 hours. What happens to the level in the blood over the first few days?', options: ['It builds up (accumulates) until it reaches a steady state', 'It keeps falling to zero', 'It stays at the first peak', 'It doubles every dose'], answer: 0, why: 'Half of each dose is still there when the next dose arrives, so the level climbs until removal between doses equals the dose.' },
    { id: 'auc', q: 'You increase clearance (the liver removes the drug faster) but keep the dose the same. What happens to the AUC (total exposure)?', options: ['It falls', 'It rises', 'It stays the same', 'It cannot be calculated'], answer: 0, why: 'AUC = F × dose ÷ clearance. Higher clearance means a lower AUC.' },
    { id: 'vd', q: 'A drug with a very large volume of distribution (it leaves the blood and enters tissues) will usually have…', options: ['A lower peak concentration in the blood for the same dose', 'A higher peak concentration in the blood', 'No half-life', 'No absorption'], answer: 0, why: 'The drug is spread in a larger volume, so each litre of blood holds less.' },
  ], { onAll: () => { api.done({ explored: P.name }); api.unlockNext(); } }), api.nav(true));
}
