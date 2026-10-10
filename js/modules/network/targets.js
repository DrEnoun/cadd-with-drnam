// Step 2 — Collect compound targets and disease genes, apply thresholds, and find the overlap (Venn).
import { h, feedback } from '../../ui.js';
import { st, sets } from './state.js';
import { COL, css } from './scenes.js';

function venn(c, a, b, ov) {
  const W = 520, H = 230, x = c.getContext('2d'); x.clearRect(0, 0, W, H); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  const r = 88, ca = 190, cb = 330, cy = 118, fit = Math.max(0.35, Math.min(1, ov / Math.max(1, Math.min(a, b)))), gap = 2 * r * (1 - .15 - .55 * fit);
  const ax = W / 2 - gap / 2, bx = W / 2 + gap / 2;
  x.globalAlpha = .55; x.fillStyle = css(COL.target); x.beginPath(); x.arc(ax, cy, r, 0, 7); x.fill(); x.fillStyle = css(COL.disease); x.beginPath(); x.arc(bx, cy, r, 0, 7); x.fill(); x.globalAlpha = 1;
  x.fillStyle = '#17202f'; x.font = '700 15px sans-serif'; x.textAlign = 'center'; x.fillText('Celecoxib targets', ax - 40, 22); x.fillText('Inflammation genes', bx + 40, 22);
  x.font = '700 26px sans-serif'; x.fillText(a - ov, (ax - r + bx - r) / 2 + 10, cy + 8); x.fillText(ov, W / 2, cy + 8); x.fillText(b - ov, (ax + r + bx + r) / 2 - 10, cy + 8);
  x.font = '13px sans-serif'; x.fillText('overlap', W / 2, cy + 28);
}
export function render(host, api) {
  const D = api.data, T = D.teaching;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The overlap between “proteins the drug may bind” and “genes involved in the disease” is your list of candidate targets. Whatever you put into the two lists decides what comes out, so the thresholds are scientific choices, not formalities.'),
    h('p', {}, 'Two kinds of prediction tools suggest drug targets: tool A compares the shape of the drug with known ligands and gives a probability; tool B fits the drug into 3D pharmacophores and only lists targets. Disease genes come from gene-disease databases with a score. Move the sliders and watch the overlap.'));
  const mk = (label, min, max, step, key, fmt) => { const out = h('b', {}), inp = h('input', { type: 'range', min, max, step, value: st[key], 'aria-label': label, oninput: () => { st[key] = +inp.value; draw(); api.log(key, st[key]); } }); return { out, el: h('label', {}, `${label}: `, out, inp), set: () => { out.textContent = fmt(st[key]); } }; };
  const sp = mk('Tool A: minimum probability', 0, .5, .01, 'minProb', v => v.toFixed(2)), sg = mk('Disease score 1: relevance at least', 0, 60, 1, 'gc', v => v), sd = mk('Disease score 2: association at least', 0, .5, .01, 'dg', v => v.toFixed(2));
  const cbA = h('input', { type: 'checkbox', checked: st.useA, onchange: e => { st.useA = e.target.checked; draw(); } }), cbB = h('input', { type: 'checkbox', checked: st.useB, onchange: e => { st.useB = e.target.checked; draw(); } });
  const cv = h('canvas', { width: 520, height: 230, style: 'width:100%;max-width:560px;border-radius:12px;background:#fff', role: 'img', 'aria-label': 'Venn diagram of celecoxib targets and inflammation genes' });
  const info = h('div', { class: 'stack' }), tbody = h('tbody'), warn = h('div', { class: 'stack' });
  host.append(h('div', { class: 'grid2' }, h('div', { class: 'stack' }, h('label', { class: 'opt' }, cbA, h('span', {}, 'Use tool A (structure similarity)')), h('label', { class: 'opt' }, cbB, h('span', {}, 'Use tool B (pharmacophore fit), keep every target it lists')), sp.el), h('div', { class: 'stack' }, sg.el, sd.el)), cv, info, warn,
    h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Candidate target', 'Protein', 'Tool A probability', 'Tool B', 'Evidence', 'Disease scores'].map(t => h('th', {}, t)))), tbody)),
    h('p', { class: 'hint' }, 'Evidence “known” means described in the literature as a celecoxib target (please check). “Predicted” means only a computer suggestion in this teaching data. Rule of thumb in the protocol: probability of 0.1 or more counts as a real prediction; 0.000 is noise. Use thresholds, not an arbitrary “top 50”.'));
  const draw = () => {
    [sp, sg, sd].forEach(s => s.set());
    const { ct, dz, ov } = sets(D); venn(cv, ct.length, dz.length, ov.length);
    const pct = ct.length ? Math.round(ov.length / dz.length * 100) : 0;
    info.replaceChildren(h('p', {}, `${ct.length} drug targets, ${dz.length} disease genes, `, h('b', {}, `${ov.length} in both`), ` (${pct}% of the disease genes).`));
    tbody.replaceChildren(...ov.map(g => { const t = D.targets[g], d = D.disease[g]; return h('tr', {}, h('td', {}, h('strong', {}, g)), h('td', {}, D.genes[g].name), h('td', { class: 'num' }, t.probA.toFixed(2)), h('td', {}, t.inB ? '✓' : '–'), h('td', {}, t.evidence), h('td', { class: 'num' }, `${d.gc} / ${d.dg.toFixed(2)}`)); }));
    const known = Object.keys(D.targets).filter(g => D.targets[g].evidence === 'known'), lostFilter = known.filter(g => !ct.includes(g)), lostDisease = known.filter(g => ct.includes(g) && !dz.includes(g));
    warn.replaceChildren(
      lostFilter.length ? feedback('bad', 'A known celecoxib target was dropped by your cut-off', `${lostFilter.join(', ')} ${lostFilter.length > 1 ? 'are' : 'is'} reported as a target of celecoxib but ${lostFilter.length > 1 ? 'are' : 'is'} no longer in your list. Strict thresholds remove real targets with low scores, especially for unusual compounds.`) : '',
      lostDisease.length ? feedback('ok', 'Not every known target is a candidate', `${lostDisease.join(', ')} ${lostDisease.length > 1 ? 'are' : 'is'} a known target but ${lostDisease.length > 1 ? 'are' : 'is'} not in the inflammation gene list, so ${lostDisease.length > 1 ? 'they do' : 'it does'} not appear in the overlap. The overlap only shows what both lists share. Celecoxib effects through other proteins (for example carbonic anhydrases) stay outside this disease picture.`) : '',
      ov.length < 6 ? feedback('bad', 'Very small overlap', 'With so few candidates there is no network to analyse. Your thresholds may be too strict.') : '',
      ov.length > 30 ? feedback('bad', 'Very large overlap', 'When almost everything overlaps, the lists are too permissive and the result says little. Tighten the thresholds.') : '');
    api.done({ minProb: st.minProb, gc: st.gc, dg: st.dg, useA: st.useA, useB: st.useB, drugTargets: ct.length, diseaseGenes: dz.length, overlap: ov.length, lostKnown: lostFilter.length });
  };
  draw();
  host.append(h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'sticker', type: 'button', onclick: () => { Object.assign(st, { minProb: .1, useA: true, useB: true, gc: 20, dg: .1 }); host.querySelectorAll('input[type=range]').forEach(r => { r.value = { 'Tool A: minimum probability': .1, 'Disease score 1: relevance at least': 20, 'Disease score 2: association at least': .1 }[r.getAttribute('aria-label')]; }); cbA.checked = cbB.checked = true; draw(); } }, 'Reset to the protocol values (0.1, 20, 0.1)')), api.nav());
}
