// Step 5 — Check the model: Ramachandran plot, environment check, expected error; then reveal the truth.
import { h, feedback } from '../../ui.js';
import { labelBar } from '../../viewer3d.js';
import { quality, modelDihedrals, ramaStats, expectedRmsd, buildModel, compareToTruth } from './stats.js';
import { st, alignment, nameOf, TPL_IDS } from './state.js';
import { traceViewer, devColour, COL, css } from './scenes.js';

function ramaPlot(rama, pts, outl) {
  const W = 360, cv = h('canvas', { width: W, height: W, style: 'width:100%;max-width:380px;border-radius:12px;background:#fff', role: 'img', 'aria-label': 'Ramachandran plot of the model' }), c = cv.getContext('2d'), M = 30, S = (W - M) / 360;
  for (let i = 0; i < 36; i++) for (let j = 0; j < 36; j++) { const v = rama[i][j]; c.fillStyle = v === 2 ? '#bfe5c9' : v === 1 ? '#e9f3d0' : '#fff'; c.fillRect(M + j * 10 * S, (35 - i) * 10 * S, 10 * S + .5, 10 * S + .5); }
  c.strokeStyle = '#9aa'; c.strokeRect(M, 0, W - M, W - M); c.fillStyle = '#334'; c.font = '11px sans-serif'; c.fillText('φ →', W - 28, W - 4); c.fillText('ψ', 6, 12); c.fillText('-180', M, W - M + 12); c.fillText('180', W - 24, W - M + 12);
  const outSet = new Set(outl);
  pts.forEach((p, k) => { if (p.phi == null) return; c.fillStyle = outSet.has(k) ? '#d6336c' : 'rgba(40,80,200,.55)'; c.beginPath(); c.arc(M + (p.phi + 180) * S, (180 - p.psi) * S, outSet.has(k) ? 3.4 : 2.1, 0, 7); c.fill(); });
  return cv;
}
const pct = x => `${(x * 100).toFixed(1)}%`;
export function render(host, api) {
  const D = api.data, Tg = D.S.target; st.tpl ||= 't1';
  const pickBar = h('div', { class: 'row' }), body = h('div', { class: 'stack' }), reveal = h('div', {});
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'A model always looks like a protein, but it can still be wrong. Validation tools look for signs of trouble. Learn what each one can and cannot tell you.'),
    h('p', {}, 'Below are three checks on your model. Then you can switch to another template and compare, and finally reveal the truth.'), pickBar, body, reveal);
  let v = null, shown = false;
  const draw = () => {
    const X = D.S[st.tpl], a = alignment(D, st.tpl), q = quality(Tg, X, a.pairs, D.rama, Tg), pts = modelDihedrals(Tg, X, a.pairs), exp = expectedRmsd(q.st.identityAligned);
    pickBar.replaceChildren(h('span', { class: 'muted' }, 'Template:'), ...TPL_IDS.map(id => h('button', { type: 'button', class: 'sticker', 'aria-pressed': String(id === st.tpl), onclick: () => { st.tpl = id; st.aln = null; shown = false; draw(); api.log('tryTemplate', id); } }, nameOf(D, id))));
    const rs = ramaStats(D.rama, pts.filter(r => r.phi != null).map((r, k) => ({ ...r })));
    const outIdx = rs.outliers, env = q.env;
    body.replaceChildren(
      h('div', { class: 'grid2' },
        h('div', { class: 'card sticker-static' }, h('h3', { style: 'margin-top:0' }, '1. Ramachandran plot'), ramaPlot(D.rama, pts.filter(r => r.phi != null), outIdx),
          h('p', {}, `${pct(rs.favoured)} favoured, ${pct(rs.allowed)} allowed, ${pct(rs.outlier)} outliers (${rs.n} residues).`), h('p', { class: 'hint' }, 'Each dot is one residue. Green areas are common backbone angles in real proteins; dots outside are unusual. Good models have over 90% in the favoured region. The angles here are inherited from the template.')),
        h('div', { class: 'card sticker-static' }, h('h3', { style: 'margin-top:0' }, '2. Environment check'), h('p', {}, `Buried residues that are hydrophobic: ${pct(env.buriedHydrophobic)}`), h('p', {}, `Exposed residues that are polar or charged: ${pct(env.exposedPolar)}`), h('p', {}, `Overall fit: ${pct(env.score)}`), h('p', { class: 'hint' }, 'A folded protein hides its oily residues inside and shows its charged ones on the surface. Many bad fits suggest a wrong alignment or template. This is a rough check: real programs (for example Verify3D, ProSA) are more detailed.'),
          h('h3', {}, '3. Expected error'), h('p', {}, `From ${pct(q.st.identityAligned)} identity of the aligned residues: about ${exp.toFixed(1)} Å in the core.`), h('p', { class: 'hint' }, 'This is the Chothia and Lesk curve you saw in step 1. Alignment errors make the real error larger.'))),
      q.st.identityAligned < .3 && rs.favoured > .85 ? feedback('bad', 'Surprise?', `This template shares only ${pct(q.st.identityAligned)} identity, yet the Ramachandran plot looks fine. That is because the angles are copied from a real protein, so they always look reasonable. A good Ramachandran plot does not prove the fold is right.`) : '',
      q.st.identityAligned >= .3 ? feedback('ok', 'No warning from identity', `${pct(q.st.identityAligned)} is high enough for a conserved fold. The alignment still matters.`) : '');
    api.log('rama', +rs.favoured.toFixed(3)); api.log('env', +env.score.toFixed(3));
    reveal.replaceChildren(h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn-start', type: 'button', onclick: () => { shown = true; showTruth(); } }, 'Reveal the true structure'), h('span', { class: 'muted' }, 'Compares this model with the real structure of the target (the "truth").')));
    api.done({ template: st.tpl, rama: +rs.favoured.toFixed(3), env: +env.score.toFixed(3), expected: +exp.toFixed(2) });
    if (shown) showTruth();
  };
  const showTruth = () => {
    v?.dispose();
    const X = D.S[st.tpl], a = alignment(D, st.tpl), m = buildModel(Tg, X, a.pairs), cmp = compareToTruth(m, Tg, a.pairs.map(p => p[0])), copiedCmp = cmp.rmsd;
    api.log('reveal', `${st.tpl}:${cmp.rmsd.toFixed(2)}`); api.done({ revealed: st.tpl, rmsd: +cmp.rmsd.toFixed(2), rmsdAll: +cmp.rmsdAll.toFixed(2) });
    reveal.replaceChildren(h('h3', {}, 'The truth'), h('p', {}, `Backbone error of the aligned residues: `, h('b', { class: 'num' }, `${cmp.rmsd.toFixed(2)} Å`), ` (all residues including built loops: ${cmp.rmsdAll.toFixed(2)} Å). Expected from identity: ${expectedRmsd(a.pairs.length ? a.pairs.filter(([i, j]) => Tg.seq[i] === X.seq[j]).length / a.pairs.length : 0).toFixed(1)} Å.`));
    v = traceViewer(reveal, { height: 420, dist: 95 });
    if (v) {
      let mode = 'dev'; const items = () => [{ ca: Tg.ca, color: 0xffffff, radius: .3, opacity: .4 }, { ca: cmp.moved, color: i => mode === 'dev' ? devColour(cmp.dev[i]) : COL.copied, radius: .65 }];
      v.set(items());
      reveal.append(labelBar(null, [{ label: 'Blue: close to the truth', color: css(devColour(0)) }, { label: 'Green: about 3 Å', color: css(devColour(3)) }, { label: 'Red: 6 Å or more', color: css(devColour(6)) }, { label: 'Pale ghost: true structure', color: '#bbbbbb' }]));
    }
    reveal.append(feedback(cmp.rmsd < 3 ? 'ok' : 'bad', cmp.rmsd < 3 ? 'A good model' : 'A wrong model', cmp.rmsd < 3 ? 'The core is close to the truth. Loops are usually the worst parts: look at the red regions.' : 'The Ramachandran plot looked fine, but the model has the wrong fold. Only the choice of a related template, and a trustworthy alignment, can protect you from this.'), h('p', { class: 'hint' }, 'In a real project you would not have this reveal. That is why you must choose the template and alignment carefully, and compare several models.'));
  };
  draw();
  host.append(api.nav(true)); setTimeout(() => api.unlockNext());
  return () => v?.dispose();
}
