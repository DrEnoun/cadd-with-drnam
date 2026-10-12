// Step 6 — Decide: is the docked pose stable? Which run can be used for an energy estimate? Justify, and download a report.
import { h, feedback, download } from '../../ui.js';
import { store } from '../../store.js';
import { summarise, verdict } from './stats.js';
import { saveCase } from '../../case.js';

const VTEXT = { stable: 'the pose stayed in the pocket and the system settled', left: 'the drug left the pocket', drifting: 'the system did not settle', unclear: 'unclear: the drug moved around a lot' };

export function render(host, api) {
  const D = api.data, T = D.teaching, R = D.runs, keys = Object.keys(R), S = Object.fromEntries(keys.map(k => [k, summarise(R[k], D.time, 20)])), V = Object.fromEntries(keys.map(k => [k, verdict(S[k])]));
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The end of an MD study is a decision: do we trust this pose, and what do we claim? A free-energy estimate from a run that has not settled, or from a drug that has left the pocket, is not worth quoting. Good scientists say what the simulation supports and what it does not.'),
    h('p', {}, 'Here are the numbers from your three runs (frames after 20 ns). The binding free-energy estimates use MM-GBSA, a quick end-point method; they are simulated for teaching. Choose the pose you would continue with and decide what you can claim.'));
  const tbody = h('tbody'); let pick = null;
  keys.forEach(k => { const s = S[k], r = R[k]; tbody.append(h('tr', { style: 'cursor:pointer', 'data-id': k, onclick: () => { pick = k; tbody.querySelectorAll('tr').forEach(t => t.classList.toggle('is-pick', t.dataset.id === pick)); tbody.querySelector(`[data-id="${k}"] input`).checked = true; } },
    h('td', {}, h('input', { type: 'radio', name: 'run', 'aria-label': `Choose ${r.name}` })), h('td', {}, h('strong', {}, r.name)), h('td', { class: 'num' }, `${s.prot.mean.toFixed(1)}`), h('td', { class: 'num' }, `${s.lig.mean.toFixed(1)}`), h('td', { class: 'num' }, s.escape != null ? `${s.escape.toFixed(0)} ns` : 'never'), h('td', { class: 'num' }, `${(s.occ * 100).toFixed(0)}%`), h('td', { class: 'num' }, `${s.settled.drift.toFixed(1)}`), h('td', { class: 'num' }, `${s.dG.mean.toFixed(1)} ± ${s.dG.sem.toFixed(1)}`))); });
  host.append(h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['', 'Run', 'Protein RMSD (Å)', 'Ligand RMSD (Å)', 'Drug leaves', 'Frames with an H-bond', 'Protein RMSD drift (Å/100 ns)', 'MM-GBSA ΔG (kcal/mol, simulated)'].map(t => h('th', {}, t)))), tbody)));
  const dec = Object.entries(D.decomposition).sort((a, b) => a[1] - b[1]).slice(0, 6);
  host.append(h('details', { class: 'fine' }, h('summary', {}, 'Residue contributions to the binding energy (run A, simulated)'), h('ul', {}, dec.map(([r, e]) => h('li', {}, `${r}: ${e} kcal/mol`)), h('li', { class: 'muted' }, 'Per-residue energy splitting is a rough guide to which residues matter. It needs checking, for example by mutating them.'))));
  const use = h('select', { 'aria-label': 'What can you claim?' }, h('option', { value: '' }, 'Choose a statement…'), T.decide.claims.map(c => h('option', { value: c.id }, c.text)));
  const next = new Set(), text = h('textarea', { rows: 4, placeholder: 'In two or three sentences: why this run? What would make you doubt it? What would you repeat?', 'aria-label': 'Your justification' }), out = h('div', { class: 'stack' });
  host.append(h('h3', { style: 'margin-top:14px' }, 'What can you claim?'), use, h('h3', {}, 'What will you do next? (tick all that apply)'), h('div', { class: 'opts' }, T.decide.next.map(n => h('label', { class: 'opt' }, h('input', { type: 'checkbox', onchange: e => { e.target.checked ? next.add(n.id) : next.delete(n.id); } }), h('span', {}, n.text)))), h('h3', {}, 'Justify your choice'), text);
  const btn = h('button', { class: 'btn-start', type: 'button', onclick: () => {
    if (!pick) return out.replaceChildren(feedback('bad', 'Choose a run first.'));
    if (!use.value) return out.replaceChildren(feedback('bad', 'Choose what you can claim.'));
    if (text.value.trim().length < 30) return out.replaceChildren(feedback('bad', 'Write a short justification (at least a sentence or two).'));
    const C = T.decide.claims.find(c => c.id === use.value), v = V[pick], good = v === 'stable', right = T.decide.next.filter(n => n.right && next.has(n.id)).length, wrong = T.decide.next.filter(n => !n.right && next.has(n.id)).length, s = S[pick];
    api.log('run', pick); api.log('verdict', v); api.log('claim', use.value); api.log('nextRight', right); api.log('nextWrong', wrong); store.setNote('md', 'justification', text.value.trim());
    saveCase('md', { run: pick, runName: R[pick].name, verdict: v, verdictText: VTEXT[v] });
    api.done({ run: pick, verdict: v, chosenStable: good ? 1 : 0, claimOk: C.ok ? 1 : 0, nextRight: right, nextWrong: wrong, words: text.value.trim().split(/\s+/).length });
    const body = ['MOLECULAR DYNAMICS SUMMARY (simulated teaching curves; not a real MD run)', `Participant code: ${store.get('code') || '-'}`, '', `System: celecoxib in COX-2 (structure 3LN1), 100 ns, first 20 ns discarded`, `Chosen run: ${R[pick].name} (judged ${v})`,
      `Protein RMSD ${s.prot.mean.toFixed(2)} +/- ${s.prot.sem.toFixed(2)} A; ligand RMSD ${s.lig.mean.toFixed(2)} +/- ${s.lig.sem.toFixed(2)} A; frames with an H-bond ${(s.occ * 100).toFixed(0)}%; MM-GBSA ${s.dG.mean.toFixed(1)} +/- ${s.dG.sem.toFixed(1)} kcal/mol`, `My conclusion: ${C.text}`, '', 'Next steps I selected:', ...T.decide.next.filter(n => next.has(n.id)).map(n => `- ${n.text}`), '', 'My justification:', text.value.trim(), '',
      'Limitations: a single 100 ns run; results depend on the force field and the start; MM-GBSA is a rough ranking tool; the curves in this exercise are simulated.'].join('\n');
    out.replaceChildren(
      good ? feedback('ok', 'A sensible choice', 'This run settled and the drug stayed in the pocket, so the pose is a reasonable one to continue with.') : feedback('bad', 'This run does not support the pose', v === 'left' ? 'The drug left the pocket in this run, so its energy estimate (at the end the drug is outside!) says little about the starting pose.' : 'The system has not settled, so averages and energies from it are not reliable.'),
      feedback(C.ok ? 'ok' : 'bad', C.ok ? 'A careful statement' : 'Too strong', C.why),
      wrong ? feedback('bad', 'Check your next steps', 'One run is not a result. Repeat with different starting velocities, test with experiments, and do not treat MM-GBSA as a precise binding energy.') : '',
      h('h3', {}, 'Your report'), h('pre', { style: 'white-space:pre-wrap;background:var(--surface-100);padding:14px;border-radius:12px;font-family:inherit' }, body),
      h('button', { class: 'sticker', type: 'button', onclick: () => download(`md-report-${store.get('code') || 'anon'}.txt`, body) }, 'Download my report (.txt)'));
    api.unlockNext();
  } }, 'Submit my choice');
  host.append(h('div', { class: 'row', style: 'margin-top:12px' }, btn), out, api.nav(true));
}
