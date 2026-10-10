// Step 2 — Choose a template from five real candidates (sequence identity and coverage come from a quick alignment).
import { h, feedback } from '../../ui.js';
import { align, alignStats } from './stats.js';
import { st, TPL_IDS, nameOf } from './state.js';

export function render(host, api) {
  const D = api.data, T = D.teaching, Tg = D.S.target;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The template is the single most important choice in homology modelling. The model can only be as good as the structure it is copied from, and a model cannot be better than the alignment to it. A wise choice looks at the numbers, not at the name.'),
    h('p', {}, `Five structures were found by searching the Protein Data Bank with the sequence of the ${T.target.name} (${Tg.seq.length} residues). Compare them and choose one template. The structure of the target itself is hidden.`));
  const rows = TPL_IDS.map(id => {
    const X = D.S[id], a = align(Tg.seq, X.seq), s = alignStats(Tg.seq, X.seq, a.pairs);
    return { id, X, s };
  });
  let pick = st.tpl;
  const tbody = h('tbody'), out = h('div', { class: 'stack' });
  rows.forEach(r => {
    const X = r.X;
    tbody.append(h('tr', { style: 'cursor:pointer', 'data-id': r.id, onclick: () => { pick = r.id; tbody.querySelectorAll('tr').forEach(t => t.classList.toggle('is-pick', t.dataset.id === pick)); tbody.querySelector(`[data-id="${r.id}"] input`).checked = true; } },
      h('td', {}, h('input', { type: 'radio', name: 'tpl', 'aria-label': `Choose ${nameOf(D, r.id)}`, value: r.id })),
      h('td', {}, h('strong', {}, nameOf(D, r.id)), h('div', { class: 'muted' }, X.molecule || 'not recorded in the file')),
      h('td', { class: 'num' }, `${Math.round(r.s.identity * 100)}%`), h('td', { class: 'num' }, `${Math.round(r.s.coverage * 100)}%`),
      h('td', { class: 'num' }, X.resolution ? `${X.resolution} Å` : 'not recorded'), h('td', {}, X.organism || 'not recorded'), h('td', {}, X.note)));
  });
  host.append(h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['', 'Structure', 'Identity', 'Coverage', 'Resolution', 'Organism', 'Description'].map(t => h('th', {}, t)))), tbody)),
    h('p', { class: 'hint' }, 'Identity: identical residues divided by the length of the target. Coverage: share of the target that can be aligned. Resolution: smaller is sharper (below 2.5 Å is good; above 3.5 Å is poor). Click a row to choose it.'));
  host.append(h('details', { class: 'fine' }, h('summary', {}, 'Where do these structures come from?'), h('ul', {}, rows.filter(r => r.X.paper).map(r => h('li', {}, `${nameOf(D, r.id)}: ${r.X.paper}. ${r.X.ref.replace(/\s+/g, ' ')}${r.X.doi ? ', doi:' + r.X.doi.toLowerCase() : ''}.`)), h('li', {}, 'Adenylate kinase (1AKE) and the DNA methyltransferase (3MHT) are included as deliberately unrelated proteins; their details are not recorded in the copy of the file used here.'))));
  const reasons = new Set();
  host.append(h('h3', { style: 'margin-top:14px' }, 'Why this one? (tick all that apply)'), h('div', { class: 'opts' }, T.template.reasons.map(r => h('label', { class: 'opt' }, h('input', { type: 'checkbox', onchange: e => { e.target.checked ? reasons.add(r.id) : reasons.delete(r.id); } }), h('span', {}, r.text)))));
  const btn = h('button', { class: 'btn-start', type: 'button', onclick: () => {
    if (!pick) return out.replaceChildren(feedback('bad', 'Choose a template first.'));
    if (!reasons.size) return out.replaceChildren(feedback('bad', 'Tick at least one reason.'));
    st.tpl = pick; st.aln = null; const r = rows.find(x => x.id === pick), best = Math.max(...rows.map(x => x.s.identity));
    const good = T.template.reasons.filter(x => x.ok && reasons.has(x.id)).length, bad = T.template.reasons.filter(x => !x.ok && reasons.has(x.id)).length;
    api.log('template', pick); api.log('reasonsGood', good); api.log('reasonsBad', bad);
    api.done({ template: pick, identity: +r.s.identity.toFixed(3), unrelated: pick === 't4' || pick === 't5', goodReasons: good, badReasons: bad });
    const lowRes = r.X.resolution && r.X.resolution > 3.5;
    out.replaceChildren(
      r.s.identity < .3 ? feedback('bad', 'Very low identity', `${Math.round(r.s.identity * 100)}% identity is in the twilight zone: this protein is probably not a relative. The model will be wrong even if it looks tidy. Compare it with the others and choose again if you wish.`) : feedback('ok', 'A related protein', `${Math.round(r.s.identity * 100)}% identity and ${Math.round(r.s.coverage * 100)}% coverage: a good basis for a model.`),
      lowRes ? feedback('bad', 'Poor resolution', `At ${r.X.resolution} Å the template coordinates are blurry. Between close relatives, prefer the sharper structure.`) : '',
      r.id === 't3' ? feedback('bad', 'Check the state', 'This GluA3 structure is in a different, "super-open" shape. A template in the wrong state gives a model in the wrong state, even when the identity is high. Is it the shape you want?') : '',
      bad ? feedback('bad', 'Rethink your reasons', 'Fame and date of publication say nothing about model quality.') : '',
      h('p', { class: 'muted' }, 'Your choice is saved. You can come back and change it.'));
    api.unlockNext();
  } }, 'Use this template');
  host.append(h('div', { class: 'row', style: 'margin-top:12px' }, btn), out, api.nav(true));
  if (pick) { tbody.querySelector(`[data-id="${pick}"]`)?.click(); }
}
