// Module 5 — Molecular Dynamics: pre-test, 6 steps, post-test + survey (see ../flow.js).
import { fetchJson } from '../../ui.js';
import mountModule from '../flow.js';
import { caseOf } from '../../case.js';

export const STEPS = [
  { id: 'why', title: 'Why simulate?', load: () => import('./why.js') },
  { id: 'forces', title: 'Forces', load: () => import('./forces.js') },
  { id: 'temperature', title: 'Temperature', load: () => import('./temperature.js') },
  { id: 'workflow', title: 'Set-up', load: () => import('./workflow.js') },
  { id: 'analyse', title: 'Results', load: () => import('./analyse.js') },
  { id: 'decide', title: 'Decide', load: () => import('./decide.js') },
];

const def = {
  id: 'md', number: 5, title: 'Molecular Dynamics', art: 'md', quiz: 'data/md/quiz.json', steps: STEPS,
  blurb: 'Does the docked pose survive when everything moves? Learn how MD works and how to read it.',
  intro: 'Docking gives one frozen picture. Molecular dynamics (MD) lets the atoms move for nanoseconds or microseconds and shows whether the drug stays in the pocket, which parts of the protein move and how tightly the complex holds together. In this module you run a real small MD simulation in your browser, learn the set-up steps of a real study, and then read the standard graphs for celecoxib in COX-2.',
  outcomes: ['Explain why a docked pose needs to be tested by MD, and what MD can and cannot tell you.', 'Describe how MD works (forces, small time steps) and recognise an unstable simulation.', 'Explain temperature control and why the first part of a run is discarded.', 'Put the steps of an MD set-up in order and say why each is needed.', 'Read RMSD, RMSF, radius of gyration and hydrogen-bond graphs, and say whether a complex looks stable.', 'State what an MM-GBSA estimate and a single run do and do not show.'],
  note: 'It takes about 45 to 60 minutes. The particle simulation in steps 2 and 3 is a real, small MD simulation. The curves in steps 1, 5 and 6 (celecoxib, and the compound you chose in docking) are simulated for teaching from a stochastic model, not taken from a real MD run; the starting structure (3LN1), the radius of gyration, the RMSF reference profile (crystal B-factors) and the hydrogen-bond partners are real. Works on phone, tablet and computer.',
  async loadData() { const [runs, teaching, structure] = await Promise.all([fetchJson('data/md/runs.json'), fetchJson('data/md/teaching.json'), fetchJson('data/docking/cox2.json')]); const c = caseOf('docking'), choice = ['A', 'B', 'C'].includes(c?.choice) ? c.choice : 'B', R = runs.runs;
    return { ...runs, runs: { ref: R.ref, cand: { ...R['cand' + choice], name: c ? `Your docking candidate: Compound ${choice}` : 'Compound B (default: you have not done Docking yet)' }, drift: R.drift }, choice, fromCase: !!c, teaching, structure }; },
};
export default (host, ctx) => mountModule(def, host, ctx);
