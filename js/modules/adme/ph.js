// Step 3 — pH and ionisation. Henderson-Hasselbalch curves and a membrane where only the neutral form can cross ("ion trapping").
import { h, feedback } from '../../ui.js';
import { fractionNeutral, trapRatio, PH } from './stats.js';
import { quizlet } from '../docking/quizlet.js';

const SITES = { stomach: ['Stomach', PH.stomach], duodenum: ['Duodenum', PH.duodenum], intestine: ['Small intestine', PH.intestine], blood: ['Blood', PH.blood] };

export function render(host, api) {
  const drugs = api.data.teaching.ion.drugs;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Most drugs are weak acids or weak bases. Their charge depends on the pH around them, and the charge decides whether they can cross the fatty cell membrane. Only the neutral form crosses easily. The gut changes from very acidic (stomach) to nearly neutral (intestine), so the same drug is absorbed differently at different places.'),
    h('p', {}, 'For an acid, the neutral fraction is 1 ÷ (1 + 10^(pH − pKa)). For a base it is 1 ÷ (1 + 10^(pKa − pH)). This is the Henderson-Hasselbalch relationship. Pick a drug and a place in the gut.'));
  let drug = drugs[1], site = 'stomach';
  const drugSel = h('select', { 'aria-label': 'Drug', onchange: e => { drug = drugs[+e.target.value]; reset(); draw(); } }, drugs.map((d, i) => h('option', { value: i, selected: i === 1 || null }, `${d.name}: ${d.kind === 'neutral' ? 'not ionised' : `${d.kind}, pKa ${d.pKa}`}`)));
  const siteRow = h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Gut side:'), ['stomach', 'duodenum', 'intestine'].map(k => h('button', { class: 'sticker', type: 'button', 'aria-pressed': String(k === site), 'data-k': k, onclick: () => { site = k; siteRow.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k))); reset(); draw(); api.log('site', k); } }, `${SITES[k][0]} (pH ${SITES[k][1]})`)));
  const sim = h('canvas', { style: 'width:100%;max-width:760px;aspect-ratio:3/1.7;display:block;margin:auto;border-radius:16px;border:3px solid var(--glass-edge)', role: 'img', 'aria-label': 'Drug molecules on both sides of a cell membrane' });
  const curve = h('canvas', { style: 'width:100%;max-width:760px;aspect-ratio:3/1.4;display:block;margin:12px auto 0;border-radius:16px;border:3px solid var(--glass-edge)', role: 'img', 'aria-label': 'Fraction of drug that is neutral against pH' });
  const info = h('div', { class: 'stack' });

  // ---------------- particles
  const N = 70; let parts = [], raf = 0, alive = true, W = 760, H = 430;
  const rnd = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  function reset() {
    const fA = fractionNeutral(drug.kind, drug.pKa, SITES[site][1]), fB = fractionNeutral(drug.kind, drug.pKa, PH.blood);
    parts = []; for (let i = 0; i < N * 2; i++) { const side = i < N ? 0 : 1, f = side ? fB : fA; parts.push({ side, neutral: (i % N) / N < f, x: side ? W * .55 + rnd() * W * .4 : W * .05 + rnd() * W * .4, y: 30 + rnd() * (H - 60), vx: (rnd() - .5) * 60, vy: (rnd() - .5) * 60 }); }
  }
  const MEM = { x0: W * .46, x1: W * .54 };
  function step(dt) {
    for (const p of parts) {
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.y < 14 || p.y > H - 14) p.vy *= -1;
      const L = p.side ? MEM.x1 + 8 : 8, R = p.side ? W - 8 : MEM.x0 - 8;
      if (p.neutral && Math.abs(p.x - (MEM.x0 + MEM.x1) / 2) < 22 && rnd() < dt * 1.1) { p.side = 1 - p.side; p.x = p.side ? MEM.x1 + 10 : MEM.x0 - 10; p.vx = (p.side ? 1 : -1) * Math.abs(p.vx); }
      if (p.x < L) { p.x = L; p.vx = Math.abs(p.vx); } if (p.x > R) { p.x = R; p.vx = -Math.abs(p.vx); }
      if (rnd() < dt * 2) { p.vx += (rnd() - .5) * 40; p.vy += (rnd() - .5) * 40; p.vx = Math.max(-70, Math.min(70, p.vx)); p.vy = Math.max(-70, Math.min(70, p.vy)); }
    }
  }
  function draw() {
    const dpr = Math.min(devicePixelRatio || 1, 2); sim.width = W * dpr; sim.height = H * dpr; const x = sim.getContext('2d'); x.scale(dpr, dpr);
    const phA = SITES[site][1], phB = PH.blood, bgL = ['#3a1018', '#33140f'], tint = ph => ph < 3 ? 'rgba(255,70,70,.30)' : ph < 6.2 ? 'rgba(255,170,60,.22)' : ph < 7.1 ? 'rgba(80,220,160,.18)' : 'rgba(255,90,110,.2)';
    x.fillStyle = '#07101f'; x.fillRect(0, 0, W, H); x.fillStyle = tint(phA); x.fillRect(0, 0, MEM.x0, H); x.fillStyle = tint(phB); x.fillRect(MEM.x1, 0, W - MEM.x1, H);
    // lipid bilayer: rows of glossy head groups with tails
    for (let side = 0; side < 2; side++) for (let y = 12; y < H; y += 20) { const xh = side ? MEM.x1 - 4 : MEM.x0 + 4, dir = side ? -1 : 1; const g = x.createRadialGradient(xh - 3, y - 3, 1, xh, y, 9); g.addColorStop(0, '#ffe9b0'); g.addColorStop(1, '#d9983a'); x.fillStyle = g; x.beginPath(); x.arc(xh, y, 8, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,200,120,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(xh + dir * 8, y - 3); x.quadraticCurveTo(xh + dir * 20, y - 5, xh + dir * 28, y - 2); x.moveTo(xh + dir * 8, y + 3); x.quadraticCurveTo(xh + dir * 20, y + 5, xh + dir * 28, y + 2); x.stroke(); }
    x.fillStyle = '#e3eef8'; x.font = '700 18px "League Spartan", sans-serif'; x.textAlign = 'center'; x.fillText(`${SITES[site][0]}  pH ${phA}`, MEM.x0 / 2, 24); x.fillText(`Blood  pH ${phB}`, (MEM.x1 + W) / 2, 24);
    x.font = '14px Questrial, sans-serif'; x.fillStyle = '#b9d7e0'; x.fillText('gut wall (lipid membrane)', W / 2, H - 6);
    for (const p of parts) {
      const col = p.neutral ? ['#eaffa0', '#9ad400', '#d4ff3a'] : (drug.kind === 'acid' ? ['#bcd6ff', '#2a62d9', '#4d8dff'] : ['#ffc2c2', '#d63a3a', '#ff6b6b']);
      x.save(); if (p.neutral) { x.shadowColor = '#d4ff3a'; x.shadowBlur = 10; } const g = x.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, 8); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, 7, 0, 7); x.fill(); x.restore();
      if (!p.neutral) { x.fillStyle = '#fff'; x.font = '700 11px sans-serif'; x.textAlign = 'center'; x.fillText(drug.kind === 'acid' ? '−' : '+', p.x, p.y + 4); }
    }
    // second chart: neutral fraction vs pH
    const c = curve, cw = 760, ch = 354; c.width = cw * dpr; c.height = ch * dpr; const y2 = c.getContext('2d'); y2.scale(dpr, dpr);
    const L = 58, R = cw - 18, T = 18, B = ch - 50, px = ph => L + ph / 14 * (R - L), py = f => B - f * (B - T);
    y2.fillStyle = '#07101f'; y2.fillRect(0, 0, cw, ch); y2.strokeStyle = 'rgba(159,216,230,.14)'; y2.fillStyle = '#9fd8e6'; y2.font = '13px Questrial, sans-serif'; y2.textAlign = 'center';
    for (let p = 0; p <= 14; p += 2) { y2.beginPath(); y2.moveTo(px(p), T); y2.lineTo(px(p), B); y2.stroke(); y2.fillText(p, px(p), B + 18); } for (let f = 0; f <= 1; f += .25) { y2.beginPath(); y2.moveTo(L, py(f)); y2.lineTo(R, py(f)); y2.stroke(); y2.textAlign = 'right'; y2.fillText(`${Math.round(f * 100)}%`, L - 8, py(f) + 5); y2.textAlign = 'center'; }
    y2.fillStyle = '#e3eef8'; y2.font = '700 15px "League Spartan", sans-serif'; y2.fillText('pH →', (L + R) / 2, ch - 10); y2.save(); y2.translate(16, (T + B) / 2); y2.rotate(-Math.PI / 2); y2.fillText('Neutral fraction →', 0, 0); y2.restore();
    y2.save(); y2.shadowColor = '#d4ff3a'; y2.shadowBlur = 12; y2.strokeStyle = '#d4ff3a'; y2.lineWidth = 4; y2.beginPath(); for (let p = 0; p <= 14; p += .1) { const f = fractionNeutral(drug.kind, drug.pKa, p); p ? y2.lineTo(px(p), py(f)) : y2.moveTo(px(p), py(f)); } y2.stroke(); y2.restore();
    if (drug.kind !== 'neutral') { y2.setLineDash([5, 5]); y2.strokeStyle = '#fff'; y2.beginPath(); y2.moveTo(px(drug.pKa), T); y2.lineTo(px(drug.pKa), B); y2.stroke(); y2.setLineDash([]); y2.fillStyle = '#fff'; y2.textAlign = 'left'; y2.fillText(`pKa ${drug.pKa} (50% neutral)`, px(drug.pKa) + 6, T + 14); }
    for (const [ph, name, col] of [[phA, SITES[site][0], '#ffb15a'], [phB, 'Blood', '#ff5a6e']]) { const f = fractionNeutral(drug.kind, drug.pKa, ph); y2.fillStyle = col; y2.strokeStyle = '#fff'; y2.lineWidth = 2; y2.beginPath(); y2.arc(px(ph), py(f), 7, 0, 7); y2.fill(); y2.stroke(); y2.textAlign = 'center'; y2.fillText(`${name}: ${(f * 100).toFixed(f < .01 ? 2 : 0)}%`, Math.min(Math.max(px(ph), L + 50), R - 60), f > .85 ? py(f) + 26 : py(f) - 14); }
    const fa = fractionNeutral(drug.kind, drug.pKa, phA), fb = fractionNeutral(drug.kind, drug.pKa, phB), ratio = trapRatio(drug.kind, drug.pKa, phA, phB);
    info.replaceChildren(h('div', { class: 'row' }, h('div', { class: 'kv' }, h('span', {}, `Neutral in ${SITES[site][0].toLowerCase()}`), h('b', {}, `${(fa * 100).toFixed(fa < .01 ? 2 : 0)}%`)), h('div', { class: 'kv' }, h('span', {}, 'Neutral in blood'), h('b', {}, `${(fb * 100).toFixed(fb < .01 ? 2 : 0)}%`)), h('div', { class: 'kv' }, h('span', {}, 'At equilibrium: blood ÷ gut'), h('b', {}, drug.kind === 'neutral' ? '1' : ratio >= 10 ? `${Math.round(ratio)}×` : ratio.toFixed(2) + '×'))),
      drug.kind === 'neutral' ? feedback('ok', 'Not ionised at these pH values', 'Caffeine is not an acid or a base in this range, so pH does not change its absorption.') : feedback(fa > .5 ? 'ok' : 'bad', fa > .5 ? 'Mostly neutral here: it crosses the membrane easily' : 'Mostly ionised here: it crosses slowly', ratio > 5 ? 'Once across, the drug meets a higher pH, ionises and is "trapped" in the blood: this pulls more drug across (ion trapping).' : ratio < .2 ? 'The drug would build up on the gut side (ion trapping the other way).' : 'There is little trapping between these two sides.'));
  }
  let last = performance.now();
  const loop = now => { if (!alive) return; const dt = Math.min(.05, (now - last) / 1000); last = now; if (sim.isConnected) { step(dt); draw(); } raf = requestAnimationFrame(loop); };
  reset(); draw(); raf = requestAnimationFrame(loop);
  host.append(h('div', { class: 'row' }, h('span', {}, 'Drug:'), drugSel), siteRow, sim,
    h('div', { class: 'legend', style: 'justify-content:center;margin:8px 0' }, h('span', {}, h('i', { style: 'background:#d4ff3a;border-radius:50%' }), 'neutral: can cross'), h('span', {}, h('i', { style: 'background:#4d8dff;border-radius:50%' }), 'acid, ionised (−)'), h('span', {}, h('i', { style: 'background:#ff6b6b;border-radius:50%' }), 'base, ionised (+)')), info, curve);
  host.append(h('div', { class: 'card sticker-static', style: 'margin-top:14px' }, h('h3', {}, 'Rule of thumb'), h('p', {}, 'Acids are mostly neutral at a pH below their pKa. Bases are mostly neutral at a pH above their pKa. So aspirin (an acid) is mostly neutral in the stomach, whereas propranolol (a base) is mostly ionised in the stomach and gut and enters the blood more slowly there. The small intestine still absorbs most drugs, even when most of a drug is ionised, because its folds and villi give it a very large surface area and the blood keeps removing the neutral drug.')));
  host.append(h('h3', { style: 'margin-top:20px' }, 'Check your understanding'), quizlet(api, [
    { id: 'acid', q: 'A weak acid has pKa 4.4. In the stomach (pH 1.5) it is mostly…', options: ['Neutral (un-ionised)', 'Ionised', 'Destroyed', 'Half and half'], answer: 0, why: 'The pH is far below the pKa, so the acid keeps its proton and stays neutral.' },
    { id: 'base', q: 'A weak base has pKa 9.5. In the intestine (pH 6.8) it is mostly…', options: ['Ionised (positively charged)', 'Neutral', 'Negatively charged', 'Unaffected by pH'], answer: 0, why: 'When pH is below the pKa of a base, the base gains a proton and is charged.' },
    { id: 'cross', q: 'Which form of a drug crosses the lipid membrane most easily?', options: ['The neutral form', 'The ionised form', 'Both equally', 'Neither'], answer: 0, why: 'Charged molecules are surrounded by water and do not enter the fatty membrane easily.' },
  ], { onAll: () => { api.done({ drug: drug.name }); api.unlockNext(); } }), api.nav(true));
  return () => { alive = false; cancelAnimationFrame(raf); };
}
