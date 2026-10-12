// Step 7 — Pick hits: choose a short, varied, inspected list from the consensus ranking, justify it, and make a report.
import { h, feedback, download } from '../../ui.js';
import { store } from '../../store.js';
import { saveCase } from '../../case.js';
import { consensusScore, rankBy } from './stats.js';
import { inspector } from './scenes.js';

const MAXPICK = 8, SIMLIM = 0.35;

export function render(host, api) {
  const lib = api.data.compounds, sim = api.data.sim, nAct = lib.filter(c => c.active).length, T = api.data.teaching;
  const cons = consensusScore(lib, [c => c.shape, c => -c.dock]), ranked = rankBy(lib, cons), top = ranked.slice(0, 20), idx = c => lib.indexOf(c);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Screening ends with a decision, not a ranking. The lab can only test a few compounds, so the list should be short, varied and inspected: not eight look-alikes, and not compounds that are known assay-interference scaffolds. A good computational scientist can justify every pick.'),
    h('p', {}, `Here are the top 20 from the consensus ranking. Pick up to ${MAXPICK} to send to the lab. Check the flags: PAINS, rule-of-five violations, clashes in the pocket, and how similar your picks are to each other (similar compounds waste tests).`));
  const picks = new Set(), insHost = h('div', {}), ins = inspector(insHost, { height: 240 });
  const tbody = h('tbody'), status = h('div', { class: 'stack' }), out = h('div', { class: 'stack' });
  const flags = c => [c.pains ? '⚠ PAINS' : '', c.ro5 > 0 ? `Ro5 ×${c.ro5}` : '', c.clash >= 5 ? `clashes ${c.clash}` : ''].filter(Boolean).join(', ') || '—';
  function drawStatus() {
    const arr = [...picks].map(id => lib.find(c => c.id === id));
    let maxSim = 0; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) maxSim = Math.max(maxSim, sim[idx(arr[i])][idx(arr[j])]);
    status.replaceChildren(h('div', { class: 'row' }, h('div', { class: 'kv' }, h('span', {}, 'Picked'), h('b', {}, `${arr.length} / ${MAXPICK}`)), h('div', { class: 'kv' }, h('span', {}, 'Most similar pair'), h('b', {}, arr.length > 1 ? maxSim.toFixed(2) : '–')), h('div', { class: 'kv' }, h('span', {}, 'PAINS in picks'), h('b', {}, String(arr.filter(c => c.pains).length)))),
      maxSim > SIMLIM ? feedback('bad', 'Two picks are very similar', `Similarity above ${SIMLIM} suggests they test the same idea twice. Swap one for a different scaffold.`) : null);
  }
  top.forEach((c, i) => {
    const cb = h('input', { type: 'checkbox', 'aria-label': `Pick ${c.name}`, onchange: e => { if (e.target.checked) { if (picks.size >= MAXPICK) { e.target.checked = false; return; } picks.add(c.id); } else picks.delete(c.id); drawStatus(); } });
    tbody.append(h('tr', { style: 'cursor:pointer', onclick: ev => { if (ev.target !== cb) ins.show(c); } }, h('td', {}, cb), h('td', {}, i + 1), h('td', {}, c.name), h('td', { class: 'num' }, c.shape.toFixed(2)), h('td', { class: 'num' }, c.dock.toFixed(1)), h('td', {}, flags(c))));
  });
  ins.show(top[0]);
  host.append(h('div', { class: 'grid2' }, h('div', { class: 'tblwrap', style: 'max-height:420px;overflow:auto' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Pick', '#', 'Compound', 'Shape', 'Dock (mock)', 'Flags'].map(t => h('th', {}, t)))), tbody)), h('div', {}, insHost, h('p', { class: 'hint' }, 'Click a row to look at the compound in 3D.'))), status);
  drawStatus();
  const next = new Set(); const text = h('textarea', { rows: 4, placeholder: 'In two or three sentences: why these compounds? What are you unsure about?', 'aria-label': 'Your justification' });
  host.append(h('h3', { style: 'margin-top:18px' }, 'What will you do next? (tick all that apply)'), h('div', { class: 'opts' }, T.decide.nextSteps.map(n => h('label', { class: 'opt' }, h('input', { type: 'checkbox', onchange: e => { e.target.checked ? next.add(n.id) : next.delete(n.id); } }), h('span', {}, n.text)))), h('h3', {}, 'Justify your list'), text);
  const btn = h('button', { class: 'btn-start', type: 'button', onclick: () => {
    if (picks.size < 3) return out.replaceChildren(feedback('bad', 'Pick at least 3 compounds first.'));
    if (text.value.trim().length < 30) return out.replaceChildren(feedback('bad', 'Write a short justification (at least a sentence or two).'));
    const arr = [...picks].map(id => lib.find(c => c.id === id)), hits = arr.filter(c => c.active).length, base = nAct / lib.length, rate = hits / arr.length;
    let maxSim = 0; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) maxSim = Math.max(maxSim, sim[idx(arr[i])][idx(arr[j])]);
    const painsN = arr.filter(c => c.pains).length, nextRight = T.decide.nextSteps.filter(n => n.right && next.has(n.id)).length, nextWrong = T.decide.nextSteps.filter(n => !n.right && next.has(n.id)).length;
    ['picks', 'hits', 'pains', 'nextRight', 'nextWrong'].forEach((k, i) => api.log(k, [arr.map(c => c.name).join(' + '), hits, painsN, nextRight, nextWrong][i]));
    store.setNote('screening', 'justification', text.value.trim()); saveCase('screening', { picks: arr.map(c => c.name), hits, painsInPicks: painsN });
    api.done({ picks: arr.length, hits, painsInPicks: painsN, maxSimilarity: +maxSim.toFixed(2), nextRight, nextWrong, words: text.value.trim().split(/\s+/).length });
    const body = ['VIRTUAL SCREENING SUMMARY (library of real drugs; docking-style score is mock)', `Participant code: ${store.get('code') || '-'}`, '', `Target: ${T.target.name} (PDB ${T.target.pdb}); reference ligand: ${T.target.drug}`, '',
      `Compounds sent for testing (${arr.length}): ${arr.map(c => c.name).join(', ')}`, `Known actives among them: ${hits} of ${arr.length} (library hit rate ${(base * 100).toFixed(0)}%, enrichment ${(rate / base).toFixed(1)})`, `Most similar pair (Tanimoto): ${maxSim.toFixed(2)}; PAINS compounds: ${painsN}`, '',
      'Next steps I selected:', ...T.decide.nextSteps.filter(n => next.has(n.id)).map(n => `- ${n.text}`), '', 'My justification:', text.value.trim(), '', 'Limitations: a small library; mock docking-style score; predictions must be confirmed in the lab.'].join('\n');
    out.replaceChildren(feedback(rate > base ? 'ok' : 'bad', `${hits} of your ${arr.length} picks are known actives`, h('p', {}, `The library hit rate is ${(base * 100).toFixed(0)}%, so your enrichment is ${(rate / base).toFixed(1)}. In a real project you would not know this yet: the lab test tells you.`)),
      painsN ? feedback('bad', 'PAINS in your list', 'You included an assay-interference scaffold. These often look active but are not worth testing.') : null,
      maxSim > SIMLIM ? feedback('bad', 'Low diversity', `Two of your picks have similarity ${maxSim.toFixed(2)}. A varied set tests more ideas.`) : feedback('ok', 'Good diversity', `No two picks are more similar than ${SIMLIM}.`),
      nextWrong ? feedback('bad', 'Check your next steps', 'A screen only predicts. Confirm in the lab before you call anything a confirmed inhibitor.') : null,
      h('h3', {}, 'Your report'), h('pre', { style: 'white-space:pre-wrap;background:var(--surface-100);padding:14px;border-radius:12px;font-family:inherit' }, body),
      h('button', { class: 'sticker', type: 'button', onclick: () => download(`screening-report-${store.get('code') || 'anon'}.txt`, body) }, 'Download my report (.txt)'));
    api.unlockNext();
  } }, 'Submit my picks');
  host.append(h('div', { class: 'row', style: 'margin-top:12px' }, btn), out, api.nav(true));
  return () => ins.dispose();
}
