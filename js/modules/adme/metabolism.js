// Step 4 — Metabolism. Find the soft spots on a real 3D molecule, predict the main reaction, compare with the known route.
import { h, feedback } from '../../ui.js';
import { inspector } from './scenes.js';
import { spotTypes } from './stats.js';
import { quizlet } from '../docking/quizlet.js';

const PHASE_COLOR = { I: 0xff9f43, II: 0x2dd4bf }, PHASE_CSS = { I: '#ff9f43', II: '#2dd4bf' };
const ANSWERS = { Celecoxib: ['arCH3'], Ibuprofen: ['benzyl', 'acid'], Naproxen: ['OCH3', 'acid'], Caffeine: ['NCH3'], Aspirin: ['ester'], Paracetamol: ['phenol'], Propranolol: ['Nalkyl', 'other'], Fluoxetine: ['NCH3'], Diclofenac: ['other', 'acid'], Warfarin: ['other'] };

export function render(host, api) {
  const D = api.data.drugs, M = api.data.teaching.metab, classes = M.classes;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The liver changes most drugs before they are removed. If a molecule has an easy handle for the liver enzymes, it is destroyed quickly (short action, low oral bioavailability). If it is hard to change it may last too long or turn into a toxic metabolite. Spotting the "soft spots" on a structure tells you where the body will attack it, and chemists can then block that position.'),
    h('p', {}, h('strong', {}, 'Phase I'), ' reactions (orange) change the molecule, usually by oxidation with cytochrome P450 (CYP) enzymes. ', h('strong', {}, 'Phase II'), ' reactions (teal) attach a polar group such as glucuronic acid so the kidney can remove it. The finder below uses simple structural rules to mark likely sites on the real 3D molecule.'));
  const names = Object.keys(ANSWERS); let drug = D.find(d => d.name === 'Celecoxib'), chosen = null, doneSet = new Set(), quizOk = false; const score = {};
  const tryUnlock = () => { if (quizOk && doneSet.size >= 3) { api.done({ predictions: doneSet.size, right: Object.values(score).filter(Boolean).length }); api.unlockNext(); } };
  const sel = h('select', { 'aria-label': 'Drug', onchange: e => { drug = D.find(d => d.name === e.target.value); chosen = null; draw(); } }, names.map(n => h('option', { value: n }, n)));
  const insHost = h('div', {}), ins = inspector(insHost, { height: 300 }), panel = h('div', { class: 'stack' });
  const progress = h('p', { class: 'muted' });
  function draw() {
    const types = spotTypes(drug), phaseOf = t => classes[t].phase, hl = drug.spots.map(s => ({ atom: s.atom, color: PHASE_COLOR[phaseOf(s.type)] }));
    ins.show(drug, hl);
    const opts = [...types.map(t => [t, `${classes[t].title} (phase ${phaseOf(t)})`]), ['other', 'Something else the finder cannot see (for example hydroxylation of an aromatic ring)']];
    const fbSlot = h('div', {}), correct = ANSWERS[drug.name];
    const choiceBtns = h('div', { class: 'opts' }, opts.map(([k, t]) => h('label', { class: 'opt' }, h('input', { type: 'radio', name: 'sp', onchange: () => { chosen = k; } }), h('span', {}, t))));
    const btn = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
      if (!chosen) { fbSlot.replaceChildren(feedback('bad', 'Pick a reaction first.')); return; }
      const ok = correct.includes(chosen); score[drug.name] = ok; doneSet.add(drug.name); api.log(`predict_${drug.name}`, `${chosen}:${ok ? 'right' : 'wrong'}`);
      fbSlot.replaceChildren(feedback(ok ? 'ok' : 'bad', ok ? 'Good prediction' : 'Not the main route', h('div', {}, h('p', {}, h('strong', {}, 'Known main route: '), M.routes[drug.name]), ok ? null : h('p', {}, 'The finder only marks possible handles. Many drugs have several; the enzymes choose by shape, so real data are needed to be sure.'))));
      progress.textContent = `${doneSet.size} of ${Math.min(3, names.length)} predictions made (at least 3 needed).`;
      tryUnlock();
    } }, 'Check my prediction');
    panel.replaceChildren(
      h('h3', { style: 'margin:0' }, drug.name), h('p', { style: 'margin:0' }, `The finder found ${drug.spots.length} possible site${drug.spots.length === 1 ? '' : 's'} of ${types.length} kind${types.length === 1 ? '' : 's'}${types.length ? '. Glowing atoms in the 3D view:' : '.'}`),
      h('ul', { style: 'margin:0' }, types.map(t => h('li', {}, h('span', { style: `display:inline-block;width:12px;height:12px;border-radius:50%;background:${PHASE_CSS[phaseOf(t)]};margin-right:8px` }), h('strong', {}, classes[t].title), `: ${classes[t].text}`))),
      h('h3', { style: 'margin:8px 0 0' }, 'Which reaction would you expect to be the main route?'), choiceBtns, h('div', { class: 'row' }, btn), fbSlot);
  }
  host.append(h('div', { class: 'row' }, h('span', {}, 'Drug:'), sel), h('div', { class: 'grid2', style: 'margin-top:10px' }, insHost, panel), progress,
    h('div', { class: 'legend' }, h('span', {}, h('i', { style: `background:${PHASE_CSS.I};border-radius:50%` }), 'Phase I site (oxidation, hydrolysis)'), h('span', {}, h('i', { style: `background:${PHASE_CSS.II};border-radius:50%` }), 'Phase II site (conjugation)')));
  progress.textContent = 'Make at least 3 predictions, using different drugs.'; draw();
  host.append(h('div', { class: 'card sticker-static', style: 'margin-top:14px' }, h('h3', {}, 'Why metabolism matters in practice'), h('p', {}, 'First-pass: blood from the gut goes to the liver first, so some of an oral dose is destroyed before it reaches the rest of the body. Drug interactions: if one drug blocks a CYP enzyme, another drug cleared by it builds up. Toxic metabolites: for example a small part of paracetamol is oxidised to a reactive product (NAPQI); in an overdose the liver cannot keep up. Chemists reduce metabolism by blocking soft spots, for example by replacing a hydrogen with fluorine.')));
  host.append(h('h3', { style: 'margin-top:20px' }, 'Check your understanding'), quizlet(api, [
    { id: 'p1', q: 'Which statement describes phase II metabolism?', options: ['A polar group such as glucuronic acid is attached to make the product easier to excrete', 'The drug is oxidised by CYP enzymes', 'The drug is absorbed in the gut', 'The drug binds its target'], answer: 0, why: 'Phase II is conjugation: glucuronidation, sulfation and similar. It makes the product water-soluble.' },
    { id: 'p2', q: 'A molecule has an unprotected methyl group on an aromatic ring. What is a likely early metabolic step?', options: ['Oxidation of the methyl (benzylic hydroxylation)', 'Hydrolysis of an ester', 'Nothing happens to methyl groups', 'It is absorbed by the kidney'], answer: 0, why: 'Aromatic methyl groups are common CYP targets. Celecoxib is a real example.' },
    { id: 'p3', q: 'How can a chemist make a drug last longer in the body?', options: ['Block or remove the soft spot, for example by replacing a hydrogen with fluorine', 'Add more methyl groups', 'Make it more soluble in fat', 'Take away its hydrogen-bond donors'], answer: 0, why: 'If the enzyme cannot attack the weak position, the drug is metabolised more slowly.' },
  ], { onAll: () => { quizOk = true; tryUnlock(); } }), api.nav(true));
  return () => ins.dispose();
}
