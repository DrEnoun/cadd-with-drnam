// Step 3 — Build the protein-protein interaction network from the candidate targets, with an adjustable confidence cut-off.
import { h, feedback } from '../../ui.js';
import { labelBar } from '../../viewer3d.js';
import { st, sets } from './state.js';
import { buildGraph, components } from './stats.js';
import { networkViewer, COL, css } from './scenes.js';

export function render(host, api) {
  const D = api.data, { ov } = sets(D);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The candidate targets do not work alone. Proteins pass signals to each other, so we link the candidates by known or predicted interactions. A network shows which proteins sit at the centre and which stand alone. The confidence cut-off decides how many links you believe.'),
    h('p', {}, `The ${ov.length} candidate targets are the nodes. Lines are interactions with a confidence from 0 to 1 (in a real study these come from STRING). Move the cut-off.`));
  const v = networkViewer(host, { height: 460, dist: 72 }), read = h('div', { class: 'row', style: 'gap:18px' }), warn = h('div', { class: 'stack' }), val = h('b', {});
  const sl = h('input', { type: 'range', min: .15, max: .95, step: .05, value: st.conf, 'aria-label': 'Interaction confidence cut-off', oninput: () => { st.conf = +sl.value; draw(); } });
  host.append(h('label', {}, 'Confidence cut-off: ', val, sl), read, warn);
  const draw = () => {
    val.textContent = st.conf.toFixed(2); const g = buildGraph(ov, D.edges, st.conf), c = components(g), iso = c.sizes.filter(s => s === 1).length, dens = ov.length > 1 ? g.edges.length / (ov.length * (ov.length - 1) / 2) : 0;
    v?.set({ nodes: ov, edges: g.edges, color: n => D.targets[n]?.evidence === 'known' ? COL.drug : COL.both, size: n => .9 + .12 * g.adj[g.idx.get(n)].length, labels: true });
    read.replaceChildren(...[['Nodes', ov.length], ['Interactions', g.edges.length], ['Separate groups', c.count], ['Alone (no link)', iso], ['Density', `${Math.round(dens * 100)}%`]].map(([k, x]) => h('div', {}, h('div', { class: 'muted' }, k), h('b', { class: 'num', style: 'font-size:1.3em' }, x))));
    warn.replaceChildren(
      st.conf < .4 ? feedback('bad', 'A “hairball”', 'At a low cut-off almost everything connects to everything. You cannot tell which links matter, and many are weak or speculative.') : '',
      iso > ov.length / 3 ? feedback('bad', 'Falling apart', `${iso} proteins are alone and the network has ${c.count} pieces. A very strict cut-off removes real links, especially for less-studied proteins.`) : '',
      st.conf >= .65 && st.conf <= .75 ? feedback('ok', 'The usual choice', 'A cut-off of 0.7 (“high confidence”) is the standard in the protocol. 0.4 (“medium”) is used for small gene sets, 0.9 only for very well-studied systems.') : '');
    api.log('conf', st.conf); api.done({ conf: st.conf, nodes: ov.length, edges: g.edges.length, groups: c.count, alone: iso });
  };
  draw();
  if (v) host.append(labelBar(null, [{ label: 'Yellow: reported celecoxib target', color: css(COL.drug) }, { label: 'Green: predicted candidate', color: css(COL.both) }, { label: 'Bigger node = more links', color: '#bbbbbb' }]));
  host.append(h('p', { class: 'hint' }, 'Interaction scores here are teaching values. In STRING, a score combines experiments, databases, text mining and co-expression, so a high score means “well supported”, not always “direct physical contact”.'), api.nav());
  return () => v?.dispose();
}
