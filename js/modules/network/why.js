// Step 1 — Why a network? One drug, many targets, many disease genes: the overlap is where the interesting biology is.
import { h, feedback } from '../../ui.js';
import { labelBar } from '../../viewer3d.js';
import { sets } from './state.js';
import { caseOf } from '../../case.js';
import { networkViewer, COL, css } from './scenes.js';

export function render(host, api) {
  const D = api.data, T = D.teaching, { ct, dz, ov } = sets(D), ovS = new Set(ov), ctS = new Set(ct), dzS = new Set(dz);
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Docking asks how one drug fits one protein. But a drug travels through a cell full of proteins, and a disease involves many proteins at once. Network pharmacology draws the whole picture: which proteins does the drug touch, which proteins drive the disease, and where do they meet?'),
    h('div', { class: 'card sticker-static' }, h('strong', {}, 'Where this fits in the project: '), caseOf('adme') ? `ADME favoured ${caseOf('adme').picks.join(', ')}. ` : '', 'So far we asked how one compound binds one protein, and whether it could be a medicine. Now we ask what else the drug touches in the cell. Target data in this exercise exist for celecoxib, the reference drug in every module, so the network is built for celecoxib. The method is the same for any compound.'),
    h('p', { class: 'lead' }, 'Our example is celecoxib, the COX-2 inhibitor from the other modules, and inflammation. Rotate the picture. The yellow node is the drug.'));
  const v = networkViewer(host, { height: 480, dist: 82 });
  if (v) {
    const nodes = ['Celecoxib', ...new Set([...ct, ...dz.filter(g => ovS.has(g) || dz.indexOf(g) < 16)])], edges = [];
    ct.forEach(g => edges.push(['Celecoxib', g, .9]));
    const keep = new Set(nodes); D.edges.forEach(([a, b, s]) => { if (s >= .8 && keep.has(a) && keep.has(b) && (ovS.has(a) || ovS.has(b))) edges.push([a, b, s]); });
    const state = { dz: true };
    const draw = () => v.set({ nodes: nodes.filter(n => n === 'Celecoxib' || state.dz || !(dzS.has(n) && !ctS.has(n))), edges, color: n => n === 'Celecoxib' ? COL.drug : ovS.has(n) ? COL.both : ctS.has(n) ? COL.target : COL.disease, size: n => n === 'Celecoxib' ? 2.6 : ovS.has(n) ? 1.5 : 1.1, labels: true });
    draw();
    host.append(labelBar(null, [{ label: 'Yellow: the drug', color: css(COL.drug) }, { label: 'Blue: predicted drug target only', color: css(COL.target) }, { label: 'Red: inflammation gene only', color: css(COL.disease) }, { label: 'Green: both (candidate target)', color: css(COL.both) }]),
      h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'sticker', type: 'button', 'aria-pressed': 'true', onclick: e => { state.dz = !state.dz; e.currentTarget.setAttribute('aria-pressed', String(state.dz)); draw(); api.log('toggleDisease', state.dz); } }, 'Show inflammation genes')));
  }
  host.append(h('p', {}, `Of the ${ct.length} proteins linked to celecoxib in this teaching data set and the ${dz.length} inflammation genes, ${ov.length} appear in both lists. These are the candidate targets. Everything in the next steps is about finding them, joining them into a network and asking what they do together.`),
    h('div', { class: 'card sticker-static' }, h('strong', {}, 'Where this comes from: '), 'The workflow follows the NAM-NPeasy protocol by Dr Nur \'Ainun Mokhtar (compounds → targets → disease genes → overlap → network → enrichment → validation). ', h('strong', {}, 'The data here are a hand-made teaching set: '), 'the scores, probabilities and interaction confidences are illustrative and are not exports from STRING, SwissTargetPrediction, GeneCards or KEGG.'),
    h('h3', { style: 'margin-top:18px' }, 'Which statement is true?'));
  const picks = {}, list = h('div', { class: 'stack' });
  T.why.questions.forEach(q => list.append(h('div', { class: 'card sticker-static', 'data-s': q.id }, h('p', {}, q.q),
    h('select', { 'aria-label': q.q, onchange: e => { picks[q.id] = e.target.value; } }, h('option', { value: '' }, 'Choose…'), q.options.map((o, i) => h('option', { value: i }, o))), h('div', { class: 'fbslot' }))));
  const out = h('span', { class: 'muted' });
  const check = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
    let right = 0;
    T.why.questions.forEach(q => { const slot = list.querySelector(`[data-s="${q.id}"] .fbslot`); slot.innerHTML = ''; if (picks[q.id] === undefined || picks[q.id] === '') { slot.append(feedback('bad', 'Choose an answer first.')); return; } const ok = +picks[q.id] === q.answer; if (ok) right++; api.log(`q_${q.id}`, picks[q.id]); slot.append(feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', q.why)); });
    api.done({ right, of: T.why.questions.length }); api.unlockNext(); out.textContent = `${right} of ${T.why.questions.length} correct.`;
  } }, 'Check my answers');
  host.append(list, h('div', { class: 'row' }, check, out), api.nav(true));
  return () => v?.dispose();
}
