// Step 8 — Decide and justify, then produce a short docking report.
import { h, feedback, download } from '../../ui.js';
import { store } from '../../store.js';
import { saveCase } from '../../case.js';
import { analyseLigands, le } from './compounds.js';

export function render(host, api) {
  const d = api.data.decide, ligands = analyseLigands(api.data), key = api.data.target.keyResidues;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Docking ends with a decision, not a number. A good computational scientist can say which compound to test, give the evidence, and state what is still uncertain. This is also what supervisors and reviewers look for in a docking report.'),
    h('p', {}, `Your lab can test only one compound from this docking study of ${api.data.target.name}. Choose it, justify it, and say what you will do next.`));
  let choice = null; const ev = new Set(), nx = new Set();
  const cands = ligands.filter(l => l.id !== 'ref');
  const row = h('div', { class: 'row' }, cands.map(l => h('button', { class: 'sticker', type: 'button', 'aria-pressed': 'false', 'data-id': l.id, onclick: () => { choice = l.id; row.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === l.id))); } },
    `${l.name} (${l.score.toFixed(1)})`)));
  const check = (list, set, field) => h('div', { class: 'opts' }, list.map(e => h('label', { class: 'opt' }, h('input', { type: 'checkbox', onchange: x => { x.target.checked ? set.add(e.id) : set.delete(e.id); } }), h('span', {}, e.text))));
  const text = h('textarea', { rows: 4, placeholder: 'In two or three sentences: which compound, and why? What are you unsure about?', 'aria-label': 'Your justification' });
  const out = h('div', { class: 'stack' });
  const btn = h('button', { class: 'btn-start', type: 'button', onclick: () => {
    if (!choice) return out.replaceChildren(feedback('bad', 'Choose a compound first.'));
    if (text.value.trim().length < 30) return out.replaceChildren(feedback('bad', 'Write a short justification (at least a sentence or two).'));
    const evRight = d.evidence.filter(e => !e.wrong && ev.has(e.id)).length, evWrong = d.evidence.filter(e => e.wrong && ev.has(e.id));
    const nxRight = d.nextSteps.filter(n => n.right && nx.has(n.id)).length, nxWrong = d.nextSteps.filter(n => !n.right && nx.has(n.id)).length;
    api.log('choice', choice); api.log('evidence_right', evRight); api.log('evidence_wrong', evWrong.length); api.log('nextsteps_right', nxRight); api.log('nextsteps_wrong', nxWrong);
    store.setNote('docking', 'justification', text.value.trim());
    api.done({ choice, evidenceRight: evRight, evidenceWrong: evWrong.length, nextRight: nxRight, nextWrong: nxWrong, words: text.value.trim().split(/\s+/).length });
    const l = ligands.find(x => x.id === choice); saveCase('docking', { choice, name: `Compound ${choice}`, ok: choice === 'B' || choice === 'C', score: l.score });
    const msg = choice === 'B' ? feedback('ok', 'Strong choice', 'Compound B has the most complete evidence: the key hydrogen bonds of celecoxib, a pose like the reference, and a score that is not inflated by size.')
      : choice === 'C' ? feedback('ok', 'A defensible choice', 'Compound C is small and efficient, so it is a good starting point to grow, but its score and interactions are weaker. Say clearly that you chose it as a starting fragment.')
      : feedback('bad', 'Think again', 'Compound A has the best score but a poor pose (only 62% in the pocket), no sulfonamide hydrogen bonds to the key residues and low efficiency. Its score is inflated by its size.');
    out.replaceChildren(...[msg,
      evWrong.length ? feedback('bad', 'Check your evidence', h('ul', {}, evWrong.map(e => h('li', {}, `“${e.text}” ${e.why}`)))) : null,
      evRight < d.evidence.filter(e => !e.wrong).length && choice === 'B' ? feedback('bad', 'You can add more evidence', 'More of the correct statements apply to your compound. Re-read the list.') : null,
      nxWrong ? feedback('bad', 'Check your next steps', 'Docking never confirms activity, and validation is never skipped.') : null,
      h('h3', {}, 'Your report'), report(l)].filter(Boolean));
    api.unlockNext();
  } }, 'Submit my decision');
  const report = l => {
    const lines = [
      `DOCKING SUMMARY (mock teaching data) — ${api.data.target.name}`, `Participant code: ${store.get('code') || '-'}`, '',
      `Chosen compound: ${l.name}`, `Docking score: ${l.score.toFixed(1)} kcal/mol (reference ${ligands[0].score.toFixed(1)})`, `Hydrogen-bond residues: ${l.hbonds.join(', ') || 'none'}`,
      `Hydrophobic contacts: ${l.hydrophobic.length} residues`, `Key residues contacted: ${l.hbonds.filter(r => key.includes(r)).length} of ${key.length}`,
      `Ligand efficiency: ${le(l).toFixed(2)}`, `Inside pocket: ${l.inside}%`, '',
      'Evidence I selected:', ...d.evidence.filter(e => ev.has(e.id)).map(e => `- ${e.text}`), '',
      'Next steps I selected:', ...d.nextSteps.filter(n => nx.has(n.id)).map(n => `- ${n.text}`), '',
      'My justification:', text.value.trim(), '',
      'Limitations: docking scores are approximate; the receptor was treated as rigid; results need experimental confirmation.'];
    const body = lines.join('\n');
    return h('div', { class: 'stack' }, h('pre', { style: 'white-space:pre-wrap;background:var(--surface-100);padding:14px;border-radius:12px;font-family:inherit' }, body),
      h('button', { class: 'sticker', type: 'button', onclick: () => download(`docking-report-${store.get('code') || 'anon'}.txt`, body) }, 'Download my report (.txt)'));
  };
  host.append(
    h('h3', {}, '1. Which compound will you test?'), row,
    h('h3', {}, '2. Which statements support your choice? (tick all that apply)'), check(d.evidence, ev),
    h('h3', {}, '3. What will you do next? (tick all that apply)'), check(d.nextSteps, nx),
    h('h3', {}, '4. Justify your decision'), text,
    h('div', { class: 'row', style: 'margin-top:12px' }, btn), out, api.nav(true));
}
