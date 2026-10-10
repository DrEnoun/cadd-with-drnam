// Step 5 — Pathway enrichment with the hypergeometric test, Benjamini-Hochberg correction and a bubble chart.
import { h, feedback } from '../../ui.js';
import { st, sets, hubList } from './state.js';
import { enrich } from './stats.js';

const fmtP = p => p < 1e-3 ? p.toExponential(1) : p.toFixed(3);
function bubble(cv, rows, shown) {
  const W = 760, rowH = 34, H = 60 + rowH * Math.max(1, shown.length), x = cv.getContext('2d'); cv.width = W; cv.height = H; cv.style.aspectRatio = `${W}/${H}`;
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.font = '13px sans-serif'; x.fillStyle = '#334'; x.textAlign = 'right';
  const L = 330, R = 30, X = r => L + r * (W - L - R) / .8;
  for (let t = 0; t <= .8; t += .2) { x.textAlign = 'center'; x.fillStyle = '#556'; x.fillText(t.toFixed(1), X(t), H - 24); x.strokeStyle = '#e4e8f0'; x.beginPath(); x.moveTo(X(t), 14); x.lineTo(X(t), H - 40); x.stroke(); }
  x.fillStyle = '#334'; x.fillText('Gene ratio (hubs in pathway ÷ hubs in list)', L + (W - L - R) / 2, H - 6);
  shown.forEach((r, i) => { const y = 30 + i * rowH, t = Math.min(1, Math.max(0, -Math.log10(r.q) / 8)), col = `hsl(${220 - 220 * t},80%,50%)`; x.textAlign = 'right'; x.fillStyle = '#223'; x.fillText(r.name.length > 44 ? r.name.slice(0, 42) + '…' : r.name, L - 12, y + 4); x.fillStyle = col; x.beginPath(); x.arc(X(r.ratio), y, 5 + r.k * 2.4, 0, 7); x.fill(); });
}
export function render(host, api) {
  const D = api.data, T = D.teaching, { ct, dz, ov } = sets(D), hb = hubList(D);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'A list of hub proteins does not say what the drug does in the cell. Enrichment asks: do my proteins fall into some pathways more often than chance? That turns a gene list into biology you can test, such as “TNF signalling” or “arachidonic acid metabolism”.'),
    h('p', {}, 'The test asks how likely it is to draw this many pathway members by chance when you pick your list from a background. Because many pathways are tested, p-values are corrected (Benjamini-Hochberg, giving q). Only q below 0.05 counts.'));
  let list = 'hubs', bg = 'genome';
  const listSel = h('select', { 'aria-label': 'Gene list', onchange: e => { list = e.target.value; draw(); } }, h('option', { value: 'hubs' }, `My hubs (${hb.length} genes)`), h('option', { value: 'all' }, `All candidate targets (${ov.length} genes)`), h('option', { value: 'bad' }, 'Carbonic anhydrases only (CA2, CA9, CA12)')),
    bgSel = h('select', { 'aria-label': 'Background', onchange: e => { bg = e.target.value; draw(); api.log('background', bg); } }, h('option', { value: 'genome' }, 'Background: all human protein-coding genes (about 20,000)'), h('option', { value: 'network' }, 'Background: only the genes in this study (drug targets + disease genes)'));
  const cv = h('canvas', { style: 'width:100%;max-width:760px;border-radius:12px;background:#fff', role: 'img', 'aria-label': 'Bubble chart of enriched pathways' }), tbody = h('tbody'), msg = h('div', { class: 'stack' });
  host.append(h('div', { class: 'grid2' }, h('label', {}, 'Gene list ', listSel), h('label', {}, 'Background ', bgSel)), msg, cv, h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Pathway', 'Hits', 'Pathway size', 'p-value', 'q (corrected)', 'Genes'].map(t => h('th', {}, t)))), tbody)),
    h('p', { class: 'hint' }, 'The pathways and their sizes here are simplified teaching versions inspired by KEGG, not real KEGG output. Bubble size = number of genes; colour = significance (blue is weak, red is strong).'));
  const picked = new Set(st.enrichTop);
  const draw = () => {
    const genes = list === 'hubs' ? hb : list === 'all' ? ov : ['CA2', 'CA9', 'CA12'], universe = [...new Set([...ct, ...dz])];
    const rows = enrich(genes, D.pathways, { background: bg, genome: D.genome, universe }), sig = rows.filter(r => r.q < .05 && r.k >= 2), shown = rows.filter(r => r.k > 0).slice(0, 10);
    bubble(cv, rows, shown);
    tbody.replaceChildren(...rows.filter(r => r.k > 0).slice(0, 10).map(r => h('tr', { style: r.q < .05 ? 'font-weight:700' : '' }, h('td', {}, h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: picked.has(r.name), disabled: r.q >= .05, 'aria-label': `Report ${r.name}`, onchange: e => { e.target.checked ? picked.add(r.name) : picked.delete(r.name); st.enrichTop = [...picked]; } }), h('span', {}, r.name))), h('td', { class: 'num' }, `${r.k} of ${r.n}`), h('td', { class: 'num' }, `${r.K} of ${r.N}`), h('td', { class: 'num' }, fmtP(r.p)), h('td', { class: 'num' }, fmtP(r.q)), h('td', {}, r.genes.join(', ')))));
    const nominal = rows.filter(r => r.p < .05 && r.k >= 2).length;
    msg.replaceChildren(
      h('p', {}, `${sig.length} pathway${sig.length === 1 ? '' : 's'} with q < 0.05 (and at least 2 genes). Before correction, ${nominal} had p < 0.05.`),
      bg === 'network' ? feedback('ok', 'A stricter background', 'Here the background is only the genes you already selected for being related to the drug or the disease. Almost everything in it is related to inflammation, so far fewer pathways stand out. The choice of background changes the result a lot, and it should be stated in the methods.') : (list !== 'bad' ? feedback('bad', 'Is this too good to be true?', 'With the whole genome as background, any set of inflammation-related genes looks highly enriched in inflammation pathways. That is partly because you chose the genes for being inflammation-related. A significant p-value is not a discovery by itself.') : ''),
      list === 'bad' ? feedback('ok', 'A different story', 'The carbonic anhydrases map to a different pathway from the inflammation hubs. The method simply reports what the list contains; whether a pathway matters to your disease is your scientific judgement.') : '');
    api.log('enrichList', list); api.log('background', bg); api.done({ list, background: bg, significant: sig.length, nominal, reported: picked.size });
  };
  draw(); api.unlockNext();
  host.append(api.nav());
}
