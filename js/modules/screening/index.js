// Module 1 — Virtual Screening: pre-test, 7 steps, post-test + survey (see ../flow.js).
import { fetchJson } from '../../ui.js';
import mountModule from '../flow.js';

export const STEPS = [
  { id: 'why', title: 'Why screen?', load: () => import('./why.js') },
  { id: 'library', title: 'The library', load: () => import('./library.js') },
  { id: 'filter', title: 'Property filters', load: () => import('./filter.js') },
  { id: 'prepare', title: 'Prepare', load: () => import('./prepare.js') },
  { id: 'method', title: 'Two methods', load: () => import('./method.js') },
  { id: 'evaluate', title: 'Did it work?', load: () => import('./evaluate.js') },
  { id: 'decide', title: 'Pick hits', load: () => import('./decide.js') },
];

const def = {
  id: 'screening', number: 1, title: 'Virtual Screening', art: 'screening', quiz: 'data/screening/quiz.json', steps: STEPS,
  blurb: 'How to find a few promising compounds among thousands, and how to judge the screen.',
  intro: 'Virtual screening uses the computer to rank a large library of compounds so that only a small, well-chosen set is bought and tested in the lab. Many students can run a screen but cannot say why each stage exists or how to tell whether the screen actually worked. This module shows the whole funnel on a library of 45 real drugs, so you can see every compound.',
  outcomes: ['Explain why we screen virtually and why it is done as a funnel.', 'Apply property filters (Lipinski and Veber) and see what they can wrongly remove.', 'Describe how a library is prepared and why.', 'Compare ligand-based and structure-based screening and name the strength and weakness of each.', 'Judge a screen with a ROC curve, AUC and enrichment factor.', 'Choose a short, varied, inspected list of hits and justify it.'],
  note: 'It takes about 40 to 60 minutes. The drugs, their properties and their 3D shapes are real (computed with RDKit); the docking-style score is mock. Works on phone, tablet and computer.',
  async loadData() { const [lib, teaching] = await Promise.all([fetchJson('data/screening/library.json'), fetchJson('data/screening/teaching.json')]); lib.teaching = teaching; lib.structure = await fetchJson('data/docking/cox2.json'); return lib; },
};
export default (host, ctx) => mountModule(def, host, ctx);
