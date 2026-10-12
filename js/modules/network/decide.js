// Step 6 — Decide: choose targets and pathways to test in the lab, say what the network proves, justify, download a report.
import { h, feedback, download } from '../../ui.js';
import { store } from '../../store.js';
import { saveCase } from '../../case.js';
import { st, sets, hubList } from './state.js';
import { buildGraph, hubTable, enrich } from './stats.js';

const MAXPICK = 3;
export function render(host, api) {
  const D = api.data, T = D.teaching, { ct, dz, ov } = sets(D), hb = hubList(D), g = buildGraph(ov, D.edges, st.conf), tab = hubTable(g), byGene = new Map(tab.map(t => [t.gene, t]));
  const rows = enrich(hb, D.pathways, { background: 'genome', genome: D.genome }), sig = rows.filter(r => r.q < .05 && r.k >= 2);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The network and the pathways are a map for the lab, not the destination. The skill is to turn them into a short list of things to test, and to say honestly what the computer has and has not shown.'),
    h('p', {}, `From your work: ${ov.length} candidate targets, ${hb.length} hubs (${hb.join(', ') || 'none'}) and ${sig.length} enriched pathway${sig.length === 1 ? '' : 's'}. Choose up to ${MAXPICK} proteins to test first, in the lab.`));
  const picks = new Set(), status = h('div', { class: 'row' }, h('b', {}, `Picked 0 of ${MAXPICK}`)), tbody = h('tbody');
  const cands = [...new Set([...hb, ...ov])];
  cands.forEach(gene => { const t = byGene.get(gene), isHub = hb.includes(gene), cb = h('input', { type: 'checkbox', 'aria-label': `Pick ${gene}`, onchange: e => { if (e.target.checked) { if (picks.size >= MAXPICK) { e.target.checked = false; return; } picks.add(gene); } else picks.delete(gene); status.firstChild.textContent = `Picked ${picks.size} of ${MAXPICK}`; } });
    tbody.append(h('tr', {}, h('td', {}, cb), h('td', {}, h('strong', {}, gene)), h('td', {}, D.genes[gene].name), h('td', {}, isHub ? 'hub' : ''), h('td', { class: 'num' }, t ? t.degree : '–'), h('td', {}, D.targets[gene]?.evidence ?? ''), h('td', { class: 'num' }, D.targets[gene] ? D.targets[gene].probA.toFixed(2) : ''))); });
  host.append(h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Pick', 'Gene', 'Protein', 'Hub?', 'Degree', 'Evidence', 'Tool A probability'].map(t => h('th', {}, t)))), tbody)), status);
  const next = new Set(), claim = h('select', { 'aria-label': 'What does the network show?' }, h('option', { value: '' }, 'Choose a statement…'), T.decide.claims.map(c => h('option', { value: c.id }, c.text))), text = h('textarea', { rows: 4, placeholder: 'In two or three sentences: why these proteins? What could be wrong with the network? What result would change your mind?', 'aria-label': 'Your justification' }), out = h('div', { class: 'stack' });
  host.append(h('h3', { style: 'margin-top:14px' }, 'What does this analysis show?'), claim,
    h('h3', {}, 'What will you do next? (tick all that apply)'), h('div', { class: 'opts' }, T.decide.next.map(n => h('label', { class: 'opt' }, h('input', { type: 'checkbox', onchange: e => { e.target.checked ? next.add(n.id) : next.delete(n.id); } }), h('span', {}, n.text)))), h('h3', {}, 'Justify your choice'), text);
  const btn = h('button', { class: 'btn-start', type: 'button', onclick: () => {
    if (!picks.size) return out.replaceChildren(feedback('bad', 'Pick at least one protein first.'));
    if (!claim.value) return out.replaceChildren(feedback('bad', 'Choose what the analysis shows.'));
    if (text.value.trim().length < 30) return out.replaceChildren(feedback('bad', 'Write a short justification (at least a sentence or two).'));
    const arr = [...picks], hubPicked = arr.filter(x => hb.includes(x)).length, control = arr.some(x => D.targets[x]?.evidence === 'known'), C = T.decide.claims.find(c => c.id === claim.value), right = T.decide.next.filter(n => n.right && next.has(n.id)).length, wrong = T.decide.next.filter(n => !n.right && next.has(n.id)).length;
    api.log('picks', arr.join('+')); api.log('claim', claim.value); api.log('nextRight', right); api.log('nextWrong', wrong); store.setNote('network', 'justification', text.value.trim()); saveCase('network', { picks: arr });
    api.done({ picks: arr.length, hubPicked, control: control ? 1 : 0, claimOk: C.ok ? 1 : 0, nextRight: right, nextWrong: wrong, words: text.value.trim().split(/\s+/).length });
    const body = ['NETWORK PHARMACOLOGY SUMMARY (teaching data set: celecoxib and inflammation; values are illustrative)', `Participant code: ${store.get('code') || '-'}`, '',
      `Thresholds: tool A probability >= ${st.minProb}${st.useB ? ' or listed by tool B' : ''}; disease relevance >= ${st.gc} or association >= ${st.dg}; interaction confidence >= ${st.conf}`,
      `Drug targets ${ct.length}; disease genes ${dz.length}; candidate targets ${ov.length}; hubs: ${hb.join(', ')}`, `Enriched pathways (q < 0.05): ${sig.map(r => `${r.name} (q=${r.q.toExponential(1)})`).join('; ') || 'none'}`, '',
      `Proteins chosen to test: ${arr.join(', ')}`, `My conclusion: ${C.text}`, '', 'Next steps I selected:', ...T.decide.next.filter(n => next.has(n.id)).map(n => `- ${n.text}`), '', 'My justification:', text.value.trim(), '',
      'Limitations: predictions need experimental confirmation; study bias inflates hubs; thresholds and background change the result; the data in this exercise are a teaching set, not database exports.'].join('\n');
    out.replaceChildren(
      C.ok ? feedback('ok', 'A careful statement', C.why) : feedback('bad', 'Too strong', C.why),
      control ? feedback('ok', 'You included a reported target', 'A protein with prior evidence works as a positive control: if your assay cannot show the effect there, it will not be trusted for the new targets.') : feedback('bad', 'No positive control', 'Consider including a protein that celecoxib is already known to affect, so that you can tell whether the experiment works.'),
      hubPicked === 0 ? feedback('bad', 'No hub chosen', 'You can test a non-hub, but say why in the justification (for example a link to the disease or a druggable pocket).') : '',
      wrong ? feedback('bad', 'Check your next steps', 'A network is a hypothesis. It does not replace experiments, and a significant p-value does not prove a mechanism.') : '',
      h('h3', {}, 'Your report'), h('pre', { style: 'white-space:pre-wrap;background:var(--surface-100);padding:14px;border-radius:12px;font-family:inherit' }, body),
      h('button', { class: 'sticker', type: 'button', onclick: () => download(`network-report-${store.get('code') || 'anon'}.txt`, body) }, 'Download my report (.txt)'));
    api.unlockNext();
  } }, 'Submit my choice');
  host.append(h('div', { class: 'row', style: 'margin-top:12px' }, btn), out, api.nav(true));
}
