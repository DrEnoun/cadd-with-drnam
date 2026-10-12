// Step 1 — Why dock? A rotating 3D picture, matching scenarios to purposes, then the workflow.
import { h, feedback } from '../../ui.js';
import { viewer, ligandGroup, pocketGroup, ligandAtoms, nameParts, labelBar } from './view.js';
import { caseOf } from '../../case.js';

export function render(host, api) {
  const { why } = api.data;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Before any button is pressed, a good scientist can say what question docking is answering. If you cannot name the question, you cannot judge the result.'),
    h('div', { class: 'card sticker-static' }, h('strong', {}, 'Where this fits in the project: '), caseOf('screening') ? `screening gave you the shortlist ${caseOf('screening').picks.join(', ')}. Many of these resemble celecoxib. ` : 'screening finds compounds that might fit. ', 'Docking now looks closely at how a candidate sits in the COX-2 pocket. To learn what to check, we use celecoxib in its real crystal pose and three mock, celecoxib-like compounds, A, B and C. Each stands for a situation every team meets: a big compound with an inflated score, a good analogue, and a small fragment. You will choose one to carry forward.'),
    h('p', { class: 'lead' }, 'Docking predicts two things: ', h('strong', {}, 'the pose'), ' (where and how the ligand sits in the pocket) and ', h('strong', {}, 'a score'), ' (an estimate of how strongly it binds). It does not measure binding, and it does not prove a compound is a drug.'));
  const v = viewer(host, { height: 400, autoRotate: true, dist: 54 });
  if (v) {
    v.root.add(pocketGroup(api.data.structure, { show: ['HIS90', 'GLN192', 'ARG513'], labels: ['HIS90', 'GLN192', 'ARG513'], focus: ['HIS90', 'GLN192', 'ARG513'] }), ligandGroup(ligandAtoms(api.data), api.data.structure.ligand.bonds, { halo: 3.5 }));
    const parts = nameParts(v, api.data.structure, ['ligand', 'residue', 'protein', 'haem']);
    host.append(labelBar(parts.group, parts.items));
    host.append(h('p', { class: 'hint' }, 'The real COX-2 enzyme (PDB 3LN1), cut open, with the drug celecoxib (the ligand, lime and green) sitting in its pocket. The sticks are the pocket residues that touch the drug. Drag to turn it, pinch or scroll to zoom. COX-2 makes the chemical signals behind pain and inflammation, so blocking it can relieve both.'));
  }
  host.append(h('h3', { style: 'margin-top:20px' }, 'Match each situation to what docking is used for'));
  const picks = {};
  const list = h('div', { class: 'stack' });
  why.scenarios.forEach(s => {
    const sel = h('select', { 'aria-label': s.text, onchange: e => { picks[s.id] = e.target.value; } },
      h('option', { value: '' }, 'Choose a purpose…'), why.purposes.map(p => h('option', { value: p.id }, p.text)));
    list.append(h('div', { class: 'card sticker-static', 'data-s': s.id }, h('p', {}, s.text), sel, h('div', { class: 'fbslot' })));
  });
  host.append(list);
  const out = h('span', { class: 'muted' });
  const check = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
    let right = 0;
    why.scenarios.forEach(s => {
      const slot = list.querySelector(`[data-s="${s.id}"] .fbslot`); slot.innerHTML = '';
      if (!picks[s.id]) { slot.append(feedback('bad', 'Choose an answer first.')); return; }
      const ok = picks[s.id] === s.answer; if (ok) right++;
      api.log(`match_${s.id}`, picks[s.id]);
      slot.append(feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', ok ? s.why : `${s.why} (The best match is: ${why.purposes.find(p => p.id === s.answer).text}.)`));
    });
    api.done({ matched: right, of: why.scenarios.length }); api.unlockNext();
    out.textContent = `${right} of ${why.scenarios.length} matched.`;
  } }, 'Check my matches');
  host.append(h('div', { class: 'row' }, check, out));
  host.append(h('h3', { style: 'margin-top:24px' }, 'The big picture: every docking project follows this path'),
    h('p', {}, 'Each box is one step in this module. Under each name is the question that step answers.'),
    h('div', { class: 'mods', style: 'grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:12px 0' }, why.workflow.map((w, i) => h('div', { class: 'card sticker-static' },
      h('span', { class: 'mod__n' }, i + 1), h('h3', { style: 'font-size:17px;margin:2px 0' }, w.t), h('p', { style: 'font-size:14px;margin:0' }, w.q)))),
    api.nav(true));
  return () => v?.dispose();
}
