// Step 4 — Hubs: degree, betweenness and closeness; remove a node to test the network; beware of study bias.
import { h, feedback } from '../../ui.js';
import { labelBar } from '../../viewer3d.js';
import { st, sets } from './state.js';
import { buildGraph, hubTable, hubs as pickHubs, components } from './stats.js';
import { networkViewer, COL, css } from './scenes.js';

const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
export function render(host, api) {
  const D = api.data, T = D.teaching, { ov } = sets(D); st.removed.clear();
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'In a network some proteins are far more connected than others. These hubs are good candidates to look at first. But “well connected” can mean “well studied” or “connected to everything”, so a hub is a lead to test, not an answer.'),
    h('p', {}, 'Three measures are used. Degree: how many links a protein has. Betweenness: how often it lies on the shortest path between two other proteins (a bridge). Closeness: how near it is to all others on average. The protocol keeps proteins with a high degree that also score high on the other two.'));
  const v = networkViewer(host, { height: 440, dist: 72 }), tbody = h('tbody'), info = h('div', { class: 'stack' }), val = h('b', {});
  const n = h('input', { type: 'range', min: 3, max: 15, step: 1, value: st.hubN, 'aria-label': 'Number of hubs to keep', oninput: () => { st.hubN = +n.value; draw(); api.log('hubN', st.hubN); } });
  host.append(h('label', {}, 'Number of hubs to keep: ', val, n), v ? h('div', {}) : '');
  host.append(h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Hub', 'Protein', 'Degree', 'Betweenness', 'Closeness', 'Studied (teaching rating)', 'Test'].map(t => h('th', {}, t)))), tbody)), info);
  const draw = () => {
    val.textContent = st.hubN;
    const nodes = ov.filter(g => !st.removed.has(g)), g = buildGraph(nodes, D.edges, st.conf), tab = hubTable(g), hb = new Set(pickHubs(tab, st.hubN)), comp = components(g);
    v?.set({ nodes, edges: g.edges, color: x => hb.has(x) ? COL.hub : D.targets[x]?.evidence === 'known' ? COL.drug : COL.both, size: x => .8 + .13 * g.adj[g.idx.get(x)].length, labels: true });
    tbody.replaceChildren(...tab.slice(0, 15).map(t => h('tr', { style: hb.has(t.gene) ? 'font-weight:700' : '' }, h('td', {}, `${hb.has(t.gene) ? '★ ' : ''}${t.gene}`), h('td', {}, D.genes[t.gene].name), h('td', { class: 'num' }, `${t.degree} (#${t.rankDegree})`), h('td', { class: 'num' }, `${t.betweenness.toFixed(3)} (#${t.rankBetweenness})`), h('td', { class: 'num' }, `${t.closeness.toFixed(2)} (#${t.rankCloseness})`), h('td', {}, stars(D.genes[t.gene].studied)),
      h('td', {}, h('button', { class: 'sticker', type: 'button', onclick: () => { st.removed.add(t.gene); api.log('remove', t.gene); draw(); } }, 'Remove')))));
    const studiedHigh = tab.filter(t => D.genes[t.gene].studied >= 5), studiedLow = tab.filter(t => D.genes[t.gene].studied <= 4), mean = a => a.length ? a.reduce((s, t) => s + t.degree, 0) / a.length : 0;
    info.replaceChildren(
      h('p', {}, `Hubs chosen (purple): ${[...hb].join(', ') || 'none'}. Network now: ${nodes.length} proteins, ${g.edges.length} links, ${comp.count} separate group${comp.count > 1 ? 's' : ''}; largest group ${comp.largest}.`),
      st.removed.size ? h('div', { class: 'row' }, feedback('bad', `Removed: ${[...st.removed].join(', ')}`, comp.count > 1 ? 'Removing it split the network. That protein held the pieces together.' : 'The network stays in one piece, so other proteins can take over its role in this teaching network.'), h('button', { class: 'sticker', type: 'button', onclick: () => { st.removed.clear(); draw(); } }, 'Put them back')) : '',
      h('p', { class: 'hint' }, `Study bias: proteins rated 5 stars have an average degree of ${mean(studiedHigh).toFixed(1)}, the others ${mean(studiedLow).toFixed(1)}. Well-studied proteins have more recorded interactions simply because more experiments exist. Less-studied proteins may be hubs nobody has noticed.`));
    api.done({ hubN: st.hubN, hubs: [...hb].join(','), removed: [...st.removed].join(','), conf: st.conf });
  };
  draw();
  if (v) host.append(labelBar(null, [{ label: 'Purple: hub', color: css(COL.hub) }, { label: 'Yellow: reported celecoxib target', color: css(COL.drug) }, { label: 'Green: other candidate', color: css(COL.both) }]));
  // reasoning question
  host.append(h('h3', { style: 'margin-top:18px' }, T.hubs.q));
  const out = h('div', {}), sel = h('select', { 'aria-label': T.hubs.q }, h('option', { value: '' }, 'Choose…'), T.hubs.options.map((o, i) => h('option', { value: i }, o)));
  host.append(sel, h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => { if (sel.value === '') return out.replaceChildren(feedback('bad', 'Choose an answer first.')); const ok = +sel.value === T.hubs.answer; api.log('hubQ', sel.value); api.done({ hubQ: ok ? 1 : 0 }); out.replaceChildren(feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', T.hubs.why)); api.unlockNext(); } }, 'Check')), out, api.nav(true));
  return () => v?.dispose();
}
