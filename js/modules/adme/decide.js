// Step 6 — Choose. An ADME report card for eight candidate compounds; pick up to three to continue, justify, and download a report.
import { h, feedback, download } from '../../ui.js';
import { store } from '../../store.js';
import { saveCase, caseOf } from '../../case.js';
import { reportCard, spotTypes, EGG_TEXT } from './stats.js';
import { inspector } from './scenes.js';

const MAXPICK = 3;
export function render(host, api) {
  const T = api.data.teaching, D = [...api.data.drugs, ...(api.data.extras || [])], find = n => D.find(d => d.name === n);
  // Candidates follow the project: the docking choice, celecoxib, the screening shortlist, then contrast compounds
  const dk = caseOf('docking'), sc = caseOf('screening'), mock = { B: 'Compound B (docking analogue, mock)', C: 'Compound C (docking fragment, mock)' };
  const names = [...new Set([dk && mock[dk.choice], 'Celecoxib', ...(sc?.picks || []).slice(0, 4), ...T.decide.candidates].filter(n => n && find(n)))].slice(0, 8), cands = names.map(find);
  const carried = [dk ? (mock[dk.choice] ? `your docking choice (${dk.name})` : `your docking choice (${dk.name}) is not here: it has no sulfonamide and is far too large for a simple oral-drug check`) : null, sc ? `your screening shortlist (${sc.picks.slice(0, 4).join(', ')})` : null].filter(Boolean);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'ADME predictions are most useful at the moment of choice: you have several compounds with good activity and you can only take a few forward. A good scientist reads the whole profile, spots the deal-breakers, explains the trade-offs and says what must be measured next.'),
    h('p', {}, `${carried.length ? 'The list follows your project: ' + carried.join(' and ') + ', plus contrast compounds. ' : ''}Eight compounds came out of a screen as possible oral anti-inflammatory drugs. Each has a computed ADME report card. Choose up to ${MAXPICK} to continue with, and explain why. Click a row to see the molecule in 3D.`));
  const cards = new Map(cands.map(d => [d.name, reportCard(d)])), picks = new Set(), insHost = h('div', {}), ins = inspector(insHost, { height: 250 });
  const tbody = h('tbody'), status = h('div', {}), out = h('div', { class: 'stack' });
  const mark = c => h('td', { style: `font-weight:700;color:${c.pass ? 'var(--spark-400)' : 'var(--coral-400)'}` }, `${c.pass ? '✓' : '✗'} ${c.text}`);
  cands.forEach(d => {
    const r = cards.get(d.name);
    const cb = h('input', { type: 'checkbox', 'aria-label': `Pick ${d.name}`, onchange: e => { if (e.target.checked) { if (picks.size >= MAXPICK) { e.target.checked = false; return; } picks.add(d.name); } else picks.delete(d.name); status.textContent = `Picked ${picks.size} of ${MAXPICK}`; } });
    tbody.append(h('tr', { style: 'cursor:pointer', onclick: ev => { if (ev.target !== cb) { ins.show(d); api.log('inspect', d.name); } } }, h('td', {}, cb), h('td', {}, h('strong', {}, d.name)), ...r.checks.map(mark), h('td', { class: 'num' }, `${r.passed}/5`)));
  });
  ins.show(cands[0]);
  host.append(h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Pick', 'Compound', 'Gut absorption', 'Solubility', 'Rule of five', 'Soft spots', 'PAINS', 'Passed'].map(t => h('th', {}, t)))), tbody)), h('div', { class: 'row', style: 'margin-top:8px' }, h('b', {}, status)), insHost);
  status.textContent = `Picked 0 of ${MAXPICK}`;
  host.append(h('p', { class: 'hint' }, 'Remember: a green tick is not a guarantee, and a red cross is a warning, not a verdict. Think about what each flag means (the earlier steps explain them).'));
  const next = new Set(), text = h('textarea', { rows: 4, placeholder: 'In two or three sentences: why these compounds? Which red flag worries you most, and what would you measure?', 'aria-label': 'Your justification' });
  host.append(h('h3', { style: 'margin-top:14px' }, 'What will you do next? (tick all that apply)'), h('div', { class: 'opts' }, T.decide.nextSteps.map(n => h('label', { class: 'opt' }, h('input', { type: 'checkbox', onchange: e => { e.target.checked ? next.add(n.id) : next.delete(n.id); } }), h('span', {}, n.text)))), h('h3', {}, 'Justify your choice'), text);
  const btn = h('button', { class: 'btn-start', type: 'button', onclick: () => {
    if (picks.size < 1) return out.replaceChildren(feedback('bad', 'Pick at least one compound first.'));
    if (text.value.trim().length < 30) return out.replaceChildren(feedback('bad', 'Write a short justification (at least a sentence or two).'));
    const arr = [...picks].map(n => cands.find(d => d.name === n)), passed = arr.map(d => cards.get(d.name).passed), best = Math.max(...[...cards.values()].map(c => c.passed));
    const hardFails = arr.filter(d => { const r = cards.get(d.name); return r.checks.find(c => c.id === 'abs' && !c.pass) || r.checks.find(c => c.id === 'pains' && !c.pass); });
    const nextRight = T.decide.nextSteps.filter(n => n.right && next.has(n.id)).length, nextWrong = T.decide.nextSteps.filter(n => !n.right && next.has(n.id)).length;
    api.log('picks', arr.map(d => d.name).join(' + ')); api.log('passed', passed.join(',')); api.log('hardFails', hardFails.map(d => d.name).join(',')); api.log('nextRight', nextRight); api.log('nextWrong', nextWrong);
    store.setNote('adme', 'justification', text.value.trim()); saveCase('adme', { picks: arr.map(d => d.name) });
    api.done({ picks: arr.length, avgPassed: +(passed.reduce((a, b) => a + b, 0) / passed.length).toFixed(2), hardFails: hardFails.length, nextRight, nextWrong, words: text.value.trim().split(/\s+/).length });
    const body = ['ADME SUMMARY (real drugs; properties computed with RDKit; simplified models)', `Participant code: ${store.get('code') || '-'}`, '',
      ...arr.flatMap(d => { const r = cards.get(d.name); return [`${d.name}: ${r.passed}/5 checks passed`, ...r.checks.map(c => `  - ${c.label}: ${c.text} ${c.pass ? '(ok)' : '(FLAG)'}`), `  - Soft spots: ${spotTypes(d).join(', ') || 'none found'}`, `  - Egg map: ${EGG_TEXT[r.egg]}`]; }), '',
      'Next steps I selected:', ...T.decide.nextSteps.filter(n => next.has(n.id)).map(n => `- ${n.text}`), '', 'My justification:', text.value.trim(), '', 'Limitations: computed from structure only; passive diffusion model; no transporters, protein binding or real clearance. Needs experimental confirmation.'].join('\n');
    out.replaceChildren(
      hardFails.length ? feedback('bad', 'A serious flag in your list', `${hardFails.map(d => d.name).join(', ')} ${hardFails.length > 1 ? 'have' : 'has'} a major ADME flag (no predicted gut absorption, or an assay-interference scaffold). For an oral drug this is a deal-breaker unless you can explain how to fix it.`) : feedback('ok', 'No deal-breaker in your picks', 'None of your picks is outside the egg or an interference scaffold.'),
      passed.every(p => p >= best) ? feedback('ok', 'Strong profiles', 'Your picks pass as many checks as the best compounds in the list.') : feedback('bad', 'Some picks have weaker profiles', 'Look again at the table: other compounds pass more checks.'),
      nextWrong ? feedback('bad', 'Check your next steps', 'Software predictions are a guide. Experiments confirm them, and strong target binding does not remove the need for ADME tests.') : '',
      h('h3', {}, 'Your report'), h('pre', { style: 'white-space:pre-wrap;background:var(--surface-100);padding:14px;border-radius:12px;font-family:inherit' }, body),
      h('button', { class: 'sticker', type: 'button', onclick: () => download(`adme-report-${store.get('code') || 'anon'}.txt`, body) }, 'Download my report (.txt)'));
    api.unlockNext();
  } }, 'Submit my choice');
  host.append(h('div', { class: 'row', style: 'margin-top:12px' }, btn), out, api.nav(true));
  return () => ins.dispose();
}
