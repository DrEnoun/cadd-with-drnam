// Step 6 — Did it work? ROC curves, AUC and enrichment factors for four ways of ranking the same library.
import { h, feedback } from '../../ui.js';
import { roc, enrichment, consensusScore } from './stats.js';
import { quizlet } from '../docking/quizlet.js';

const COL = { tc: '#9fb3b8', shape: '#d4ff3a', dock: '#5eead4', cons: '#ff9f43' };
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function render(host, api) {
  const lib = api.data.compounds, nAct = lib.filter(c => c.active).length;
  const dockS = c => -c.dock, shapeS = c => c.shape;
  const methods = [
    { id: 'tc', name: '2D similarity to celecoxib', score: c => c.tanimoto },
    { id: 'shape', name: '3D shape overlay (ligand-based)', score: shapeS },
    { id: 'dock', name: 'Docking-style score (structure-based, mock)', score: dockS },
    { id: 'cons', name: 'Consensus: average of shape and docking ranks', score: consensusScore(lib, [shapeS, dockS]) },
  ];
  methods.forEach(m => { m.roc = roc(lib, m.score); m.ef = [0.05, 0.1, 0.2].map(f => enrichment(lib, m.score, f)); });
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'A ranked list always looks convincing. The only way to know if a screen works is to check it against compounds whose answer you already know: the actives and the decoys. A good screen puts the actives near the top. The ROC curve and the enrichment factor measure exactly that.'),
    h('p', {}, `Your library has ${nAct} known actives and ${lib.length - nAct} decoys. Each curve walks down a ranked list: it goes up when it meets an active and right when it meets a decoy. A curve that climbs fast (top-left) is good. The dashed diagonal is random ranking.`));
  const on = new Set(methods.map(m => m.id)), canvas = h('canvas', { style: 'width:100%;max-width:720px;aspect-ratio:3/2;display:block;margin:auto;border-radius:16px;border:3px solid var(--glass-edge)', role: 'img', 'aria-label': 'ROC curves for four screening methods' });
  const chips = h('div', { class: 'row', style: 'justify-content:center' }, methods.map(m => h('button', { class: 'sticker', type: 'button', 'aria-pressed': 'true', style: `border-color:${COL[m.id]}`, onclick: e => { on.has(m.id) ? on.delete(m.id) : on.add(m.id); e.currentTarget.setAttribute('aria-pressed', String(on.has(m.id))); draw(); api.log('toggle', m.id); } }, h('span', { style: `display:inline-block;width:12px;height:12px;border-radius:50%;background:${COL[m.id]};margin-right:8px` }), m.name)));
  let cut = .2;
  function draw() {
    const dpr = Math.min(devicePixelRatio || 1, 2), W = 720, H = 480; canvas.width = W * dpr; canvas.height = H * dpr;
    const x = canvas.getContext('2d'); x.scale(dpr, dpr);
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0d2036'); bg.addColorStop(1, '#050b16'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    const L = 70, R = W - 24, T = 24, B = H - 62, px = f => L + f * (R - L), py = f => B - f * (B - T);
    x.strokeStyle = 'rgba(159,216,230,.15)'; x.lineWidth = 1; x.fillStyle = '#9fd8e6'; x.font = '14px Questrial, sans-serif'; x.textAlign = 'center';
    for (let i = 0; i <= 5; i++) { const f = i / 5; x.beginPath(); x.moveTo(px(f), T); x.lineTo(px(f), B); x.moveTo(L, py(f)); x.lineTo(R, py(f)); x.stroke(); x.fillText(f.toFixed(1), px(f), B + 20); x.textAlign = 'right'; x.fillText(f.toFixed(1), L - 10, py(f) + 5); x.textAlign = 'center'; }
    x.fillStyle = '#e3eef8'; x.font = '700 16px "League Spartan", sans-serif'; x.fillText('False positive rate (decoys picked) →', (L + R) / 2, H - 14); x.save(); x.translate(18, (T + B) / 2); x.rotate(-Math.PI / 2); x.fillText('True positive rate (actives found) →', 0, 0); x.restore();
    x.setLineDash([6, 6]); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px(0), py(0)); x.lineTo(px(1), py(1)); x.stroke(); x.setLineDash([]);
    for (const m of methods) if (on.has(m.id)) {
      x.save(); x.shadowColor = COL[m.id]; x.shadowBlur = 14; x.strokeStyle = COL[m.id]; x.lineWidth = 3.5; x.lineJoin = 'round'; x.beginPath();
      m.roc.pts.forEach(([fx, fy], i) => { i ? x.lineTo(px(fx), py(fy)) : x.moveTo(px(fx), py(fy)); }); x.stroke(); x.restore();
    }
    // early-enrichment marker: where each curve is after the top "cut" of the list
    const k = Math.max(1, Math.round(lib.length * cut));
    for (const m of methods) if (on.has(m.id)) { const [fx, fy] = m.roc.pts[k]; x.fillStyle = COL[m.id]; x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.arc(px(fx), py(fy), 6, 0, 7); x.fill(); x.stroke(); }
  }
  const tbl = h('div', { class: 'tblwrap' }), cutLab = h('b', {});
  function table() {
    const efs = methods.map(m => enrichment(lib, m.score, cut)), bestAuc = Math.max(...methods.map(m => m.roc.auc)), bestEf = Math.max(...efs.map(e => e.ef));
    cutLab.textContent = `${Math.round(cut * 100)}% (${Math.max(1, Math.round(lib.length * cut))} compounds)`;
    tbl.replaceChildren(h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Method', 'AUC', `Actives in top ${Math.round(cut * 100)}%`, 'Enrichment factor'].map(t => h('th', {}, t)))),
      h('tbody', {}, methods.map((m, i) => h('tr', {}, h('td', {}, h('span', { style: `display:inline-block;width:12px;height:12px;border-radius:50%;background:${COL[m.id]};margin-right:8px` }), m.name),
        h('td', { class: 'num', style: m.roc.auc === bestAuc ? 'font-weight:800' : '' }, m.roc.auc.toFixed(2)), h('td', { class: 'num' }, `${efs[i].hits} of ${efs[i].n}`), h('td', { class: 'num', style: efs[i].ef === bestEf ? 'font-weight:800' : '' }, efs[i].ef.toFixed(1)))))));
  }
  const slider = h('input', { type: 'range', min: 5, max: 50, value: 20, style: 'flex:1;min-width:160px', 'aria-label': 'Fraction of the ranked list to take', oninput: e => { cut = +e.target.value / 100; draw(); table(); } });
  host.append(canvas, chips, h('div', { class: 'row', style: 'margin-top:12px' }, h('span', {}, 'Take the top'), slider, cutLab, h('span', { class: 'muted' }, '(dots on the curves)')), tbl);
  draw(); table(); api.done({});
  matchMedia('(prefers-color-scheme: dark)'); // charts keep their own dark panel in both themes

  const aucBest = [...methods].sort((a, b) => b.roc.auc - a.roc.auc)[0], bestSingle = [...methods.slice(0, 3)].sort((a, b) => b.roc.auc - a.roc.auc)[0], cons = methods[3];
  const opts = methods.map(m => m.name), consBeat = cons.roc.auc > bestSingle.roc.auc;
  host.append(h('div', { class: 'card sticker-static', style: 'margin-top:14px' }, h('h3', {}, 'How to read it'),
    h('p', {}, h('strong', {}, 'AUC'), ' is the area under the curve: 0.5 is random, 1.0 is perfect. ', h('strong', {}, 'Enrichment factor'), ' compares the hit rate in the top of the list with the hit rate of the whole library. In a real screen you only test the top, so early enrichment matters more than the whole curve.'),
    h('p', {}, h('strong', {}, 'Careful: '), 'a method can look good on a small library and fail on a big one, or be biased if the decoys are too easy. Real benchmarks use many decoys that match the actives in size and polarity.')));
  host.append(h('h3', { style: 'margin-top:20px' }, 'Check your understanding'), quizlet(api, [
    { id: 'auc', q: 'Which method has the highest AUC here?', options: opts, answer: opts.indexOf(aucBest.name), why: `${aucBest.name} has AUC ${aucBest.roc.auc.toFixed(2)}. Compare it with the diagonal: 0.5 is random.` },
    { id: 'cons', q: 'Did the consensus beat the best single method (by AUC)?', options: ['Yes, it beat every single method', 'No, the best single method was better', 'They are exactly equal'], answer: consBeat ? 0 : 1, why: consBeat ? 'Combining methods helped here.' : `Not here. Combining methods does not always help: if one method is much better than the other, averaging can dilute it. Always measure.` },
    { id: 'decoy', q: 'Why do we need decoys (known inactives) to judge a screen?', options: ['Without them we cannot tell whether a method ranks actives above inactives: a method that scores everything high would look good but be useless', 'Decoys make the actives more potent', 'Decoys speed up docking', 'We do not; actives alone are enough'], answer: 0, why: 'A screen is only useful if it separates actives from inactives. That needs both groups.' },
  ], { onAll: () => api.unlockNext() }), api.nav(true));
}
