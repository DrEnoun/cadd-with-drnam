// Step 6 — Compare models from every template, choose one, say what it may be used for, and write a short report.
import { h, feedback, download } from '../../ui.js';
import { store } from '../../store.js';
import { quality, align } from './stats.js';
import { nameOf, TPL_IDS } from './state.js';

export function render(host, api) {
  const D = api.data, T = D.teaching, Tg = D.S.target;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'In a real project you would build models from several templates and then decide which one to trust, and for what. A model is a hypothesis. This step asks you to make that decision and defend it.'),
    h('p', {}, 'Models were built from all five candidates, using the standard alignment settings. The table shows what you could see without the true structure. Select the model you would continue with.'));
  const rows = TPL_IDS.map(id => { const X = D.S[id], a = align(Tg.seq, X.seq, 10, .5), q = quality(Tg, X, a.pairs, D.rama, Tg); return { id, X, q }; });
  const tbody = h('tbody'); let pick = null, revealed = false;
  const hid = [];
  rows.forEach(r => {
    const rd = h('td', { class: 'num' }, '?'); hid.push([r, rd]);
    tbody.append(h('tr', { style: 'cursor:pointer', 'data-id': r.id, onclick: () => { pick = r.id; tbody.querySelectorAll('tr').forEach(t => t.classList.toggle('is-pick', t.dataset.id === pick)); tbody.querySelector(`[data-id="${r.id}"] input`).checked = true; } },
      h('td', {}, h('input', { type: 'radio', name: 'mod', 'aria-label': `Choose the model from ${nameOf(D, r.id)}` })), h('td', {}, h('strong', {}, nameOf(D, r.id))),
      h('td', { class: 'num' }, `${Math.round(r.q.st.identity * 100)}%`), h('td', { class: 'num' }, `${Math.round(r.q.st.coverage * 100)}%`), h('td', { class: 'num' }, r.X.resolution ? `${r.X.resolution} Å` : '–'),
      h('td', { class: 'num' }, `${(r.q.rama.favoured * 100).toFixed(0)}%`), h('td', { class: 'num' }, `${(r.q.env.score * 100).toFixed(0)}%`), h('td', { class: 'num' }, `${r.q.expected.toFixed(1)} Å`), rd));
  });
  host.append(h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['', 'Template', 'Identity', 'Coverage', 'Resolution', 'Ramachandran favoured', 'Environment fit', 'Expected error', 'Real error (hidden)'].map(t => h('th', {}, t)))), tbody)),
    h('p', { class: 'hint' }, 'Notice which columns separate good models from bad ones, and which do not. The last column is revealed when you submit.'));
  const use = h('select', { 'aria-label': 'What will you use the model for?' }, h('option', { value: '' }, 'Choose a use…'), T.decide.uses.map(u => h('option', { value: u.id }, u.text)));
  const next = new Set(), text = h('textarea', { rows: 4, placeholder: 'In two or three sentences: why this template? What worries you about the model, and what would you check next?', 'aria-label': 'Your justification' }), out = h('div', { class: 'stack' });
  host.append(h('h3', { style: 'margin-top:14px' }, 'What will you use the model for?'), use,
    h('h3', {}, 'What will you do next? (tick all that apply)'), h('div', { class: 'opts' }, T.decide.nextSteps.map(n => h('label', { class: 'opt' }, h('input', { type: 'checkbox', onchange: e => { e.target.checked ? next.add(n.id) : next.delete(n.id); } }), h('span', {}, n.text)))), h('h3', {}, 'Justify your choice'), text);
  const btn = h('button', { class: 'btn-start', type: 'button', onclick: () => {
    if (!pick) return out.replaceChildren(feedback('bad', 'Choose a model first.'));
    if (!use.value) return out.replaceChildren(feedback('bad', 'Choose what you will use the model for.'));
    if (text.value.trim().length < 30) return out.replaceChildren(feedback('bad', 'Write a short justification (at least a sentence or two).'));
    revealed = true; hid.forEach(([r, td]) => { td.textContent = `${r.X.rmsdTruth.toFixed(1)} Å`; td.style.fontWeight = 700; });
    const r = rows.find(x => x.id === pick), U = T.decide.uses.find(u => u.id === use.value), best = Math.min(...rows.map(x => x.X.rmsdTruth));
    const nextRight = T.decide.nextSteps.filter(n => n.right && next.has(n.id)).length, nextWrong = T.decide.nextSteps.filter(n => !n.right && next.has(n.id)).length;
    api.log('model', pick); api.log('use', use.value); api.log('rmsd', r.X.rmsdTruth); api.log('nextRight', nextRight); api.log('nextWrong', nextWrong);
    store.setNote('homology', 'justification', text.value.trim());
    api.done({ model: pick, rmsdTruth: r.X.rmsdTruth, isBest: r.X.rmsdTruth <= best + .15, unrelated: pick === 't4' || pick === 't5', use: use.value, useOk: U.ok, nextRight, nextWrong, words: text.value.trim().split(/\s+/).length });
    const body = ['HOMOLOGY MODELLING SUMMARY (real structures from the Protein Data Bank; simplified C-alpha model)', `Participant code: ${store.get('code') || '-'}`, '',
      `Target: ${T.target.name} (hidden structure ${T.target.pdb})`, `Chosen template: ${nameOf(D, pick)} (identity ${Math.round(r.q.st.identity * 100)}%, coverage ${Math.round(r.q.st.coverage * 100)}%, resolution ${r.X.resolution ?? 'not recorded'})`,
      `Ramachandran favoured: ${(r.q.rama.favoured * 100).toFixed(0)}%; environment fit: ${(r.q.env.score * 100).toFixed(0)}%; expected error from identity: ${r.q.expected.toFixed(1)} A`, `Real error against the true structure: ${r.X.rmsdTruth.toFixed(1)} A`, '',
      `Intended use: ${U.text}`, `Comment: ${U.needs}`, '', 'Next steps I selected:', ...T.decide.nextSteps.filter(n => next.has(n.id)).map(n => `- ${n.text}`), '', 'My justification:', text.value.trim(), '',
      'Limitations: simplified C-alpha model (no side chains, no refinement); the structure of the target is public and was hidden for teaching only; a model is a hypothesis that needs experimental testing.'].join('\n');
    out.replaceChildren(
      r.X.rmsdTruth > 10 ? feedback('bad', 'This model has the wrong fold', 'The template is unrelated to the target. Look at the first two columns of the table: low identity and low coverage were the warning, and the quality checks did not catch it.') : r.X.rmsdTruth <= best + .15 ? feedback('ok', 'A strong choice', `Your model is within about ${r.X.rmsdTruth.toFixed(1)} Å of the true structure.`) : feedback('ok', 'A good model, but not the best', `Error about ${r.X.rmsdTruth.toFixed(1)} Å. Another template gave ${best.toFixed(1)} Å. Higher resolution or a better matching state can matter.`),
      feedback(U.ok ? 'ok' : 'bad', U.ok ? 'A sensible use' : 'Be careful with this use', U.needs),
      nextWrong ? feedback('bad', 'Check your next steps', 'A model is a hypothesis. It should be checked, compared and tested, not treated as an experimental structure.') : '',
      h('h3', {}, 'Your report'), h('pre', { style: 'white-space:pre-wrap;background:var(--surface-100);padding:14px;border-radius:12px;font-family:inherit' }, body),
      h('button', { class: 'sticker', type: 'button', onclick: () => download(`homology-report-${store.get('code') || 'anon'}.txt`, body) }, 'Download my report (.txt)'));
    api.unlockNext();
  } }, 'Submit my choice');
  host.append(h('div', { class: 'row', style: 'margin-top:12px' }, btn), out, api.nav(true));
}
