// Step 4 — Build the model: copy the template backbone where the alignment says so, make up loops where it does not.
import { h } from '../../ui.js';
import { labelBar } from '../../viewer3d.js';
import { buildModel, alignStats, modelDihedrals } from './stats.js';
import { st, alignment, nameOf } from './state.js';
import { traceViewer, fitOnto, classColour, ssColour, COL, css } from './scenes.js';

export function render(host, api) {
  const D = api.data, Tg = D.S.target; st.tpl ||= 't1';
  const X = D.S[st.tpl], a = alignment(D, st.tpl), model = buildModel(Tg, X, a.pairs), s = alignStats(Tg.seq, X.seq, a.pairs);
  const copied = model.kind.filter(k => k === 'copied').length, built = model.kind.length - copied;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'This is the step that creates the model. Seeing which parts are copied from the template and which are guessed shows where the model is trustworthy and where it is not.'),
    h('p', {}, `The model of the target is made from ${nameOf(D, st.tpl)} using your alignment. Where the alignment pairs a target residue with a template residue, the position of the template backbone atom is copied. Where there is no partner (a gap), the program has to invent a loop to join the two ends.`));
  const v = traceViewer(host, { height: 460, dist: 95 });
  const legend = h('div', {}), info = h('div', { class: 'row', style: 'gap:18px;margin-top:8px' });
  info.append(...[['Residues in the model', model.kind.length], ['Copied from template', copied], ['Built without a template', built], ['Loops / ends to build', model.loops.length]].map(([k, val]) => h('div', {}, h('div', { class: 'muted' }, k), h('b', { class: 'num', style: 'font-size:1.3em' }, val))));
  if (v) {
    const modes = {
      kind: { name: 'Copied or built', col: i => model.kind[i] === 'copied' ? COL.copied : COL.built, leg: [{ label: 'Copied from the template', color: css(COL.copied) }, { label: 'Built by the program (guess)', color: css(COL.built) }] },
      id: { name: 'Residue identity', col: classColour(Tg.seq, X.seq, a.pairs), leg: [{ label: 'Identical', color: css(COL.same) }, { label: 'Similar', color: css(COL.like) }, { label: 'Different', color: css(COL.diff) }, { label: 'No partner', color: css(COL.gap) }] },
      ss: { name: 'Helix / strand / loop', col: i => { const j = new Map(a.pairs).get(i); return j == null ? COL.gap : ssColour(X.ss)(j); }, leg: [{ label: 'Helix', color: css(COL.helix) }, { label: 'Strand', color: css(COL.strand) }, { label: 'Loop', color: css(COL.coil) }, { label: 'Built', color: css(COL.gap) }] },
    };
    let mode = 'kind', showT = false;
    const draw = () => {
      const items = [{ ca: model.ca, color: modes[mode].col, radius: .7 }];
      if (showT) items.unshift({ ca: X.ca, color: 0xffffff, radius: .3, opacity: .45, _t: 1 });
      v.set(items); legend.replaceChildren(labelBar(null, modes[mode].leg));
    };
    const bar = h('div', { class: 'row', style: 'margin-top:8px' }, Object.entries(modes).map(([k, m]) => h('button', { type: 'button', class: 'sticker', 'aria-pressed': String(k === mode), onclick: ev => { mode = k; bar.querySelectorAll('button[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === k))); draw(); api.log('colour', k); }, 'data-m': k }, m.name)));
    host.append(bar, legend, info); draw();
  } else host.append(info);
  host.append(
    h('div', { class: 'card sticker-static', style: 'margin-top:12px' }, h('h3', { style: 'margin-top:0' }, 'What happened'), h('ol', {},
      h('li', {}, `${copied} of ${model.kind.length} residues had a partner and took the template's backbone position.`),
      h('li', {}, `${built} residues had no partner. Their positions were guessed by joining the ends of the loop with a smooth arch (real programs search a database of loops or use energy functions).`),
      h('li', {}, 'Residues that are not identical keep the template backbone, but their side chains must be replaced. This simplified teaching model only shows the backbone, so it does not model side chains. Real programs (MODELLER, SWISS-MODEL) add and optimise them, then refine the whole model.'))),
    h('p', { class: 'hint' }, `Identity ${Math.round(s.identity * 100)}%. A model keeps the strengths of its template, and the weaknesses of your alignment.`));
  api.log('copied', copied); api.log('built', built); api.done({ template: st.tpl, copied, built, loops: model.loops.length });
  host.append(api.nav());
  return () => v?.dispose();
}
