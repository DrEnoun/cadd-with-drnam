// Module 2 — Molecular Docking. A guided mission: pre-test, 8 steps, post-test + survey (see ../flow.js).
import { fetchJson } from '../../ui.js';
import mountModule from '../flow.js';

export const STEPS = [
  { id: 'why', title: 'Why dock?', load: () => import('./why.js') },
  { id: 'search', title: 'Search and score', load: () => import('./search.js') },
  { id: 'prepare', title: 'Prepare', load: () => import('./prepare.js') },
  { id: 'box', title: 'Search box', load: () => import('./box.js') },
  { id: 'scoring', title: 'Scoring', load: () => import('./scoring.js') },
  { id: 'validate', title: 'Validate', load: () => import('./validate.js') },
  { id: 'analyse', title: 'Analyse', load: () => import('./analyse.js') },
  { id: 'decide', title: 'Decide', load: () => import('./decide.js') },
];

const def = {
  id: 'docking', number: 2, title: 'Molecular Docking', art: 'docking', quiz: 'data/docking/quiz.json', steps: STEPS,
  blurb: 'How a drug-like molecule fits a protein, and what to check afterwards.',
  intro: 'Docking is a computer experiment that predicts how a small molecule (a ligand) fits into a protein pocket and how strongly it may bind. Many students can run the software but are not sure why they do each step or what to look at afterwards. This module fixes that.',
  outcomes: ['Explain why we dock and what question docking answers.', 'Describe how a docking run works: search for poses, then score and rank them.', 'Prepare a structure, set the search box and explain what goes wrong if you do not.', 'Validate a protocol by redocking and judge the RMSD.', 'Analyse results: score, interactions, key residues and ligand efficiency, not the score alone.', 'Decide which compound to take forward and justify the choice.'],
  note: 'It takes about 40 to 60 minutes. The protein is the real COX-2 structure; the docking poses and scores are mock. Works on phone, tablet and computer, with mouse or touch.',
  async loadData() { const d = await fetchJson('data/docking/mock.json'); d.structure = await fetchJson('data/docking/cox2.json'); return d; },
};
export default (host, ctx) => mountModule(def, host, ctx);
