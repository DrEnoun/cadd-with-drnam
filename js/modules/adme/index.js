// Module 3 — ADME Prediction: pre-test, 6 steps, post-test + survey (see ../flow.js).
import { fetchJson } from '../../ui.js';
import mountModule from '../flow.js';

export const STEPS = [
  { id: 'why', title: 'The journey', load: () => import('./why.js') },
  { id: 'absorb', title: 'Absorption', load: () => import('./absorb.js') },
  { id: 'ph', title: 'pH and ions', load: () => import('./ph.js') },
  { id: 'metabolism', title: 'Metabolism', load: () => import('./metabolism.js') },
  { id: 'pk', title: 'Half-life', load: () => import('./pk.js') },
  { id: 'decide', title: 'Choose', load: () => import('./decide.js') },
];

const def = {
  id: 'adme', number: 3, title: 'ADME Prediction', art: 'adme', quiz: 'data/adme/quiz.json', steps: STEPS,
  blurb: 'A strong binder is not a drug if the body cannot absorb it, carry it, survive it or clear it.',
  intro: 'A compound that binds its target very tightly is still useless as a medicine if it never reaches the blood, is destroyed in minutes by the liver, or cannot be dosed safely. ADME stands for Absorption, Distribution, Metabolism and Excretion. Computers can predict a lot about each of them from the structure alone, early and cheaply. This module follows a tablet through the body and shows what to predict and what the predictions mean.',
  outcomes: ['Explain what A, D, M and E stand for and name a way each can make a promising compound fail.', 'Use a BOILED-Egg style map (polar surface area against cLogP) to judge absorption and brain penetration, and a solubility estimate.', 'Use the Henderson-Hasselbalch idea to explain why pH changes absorption.', 'Find metabolic soft spots on a molecule and say which reactions to expect.', 'Read a concentration-time curve: Cmax, Tmax, half-life, AUC, and what happens with repeated doses.', 'Combine an ADME report card with judgement to choose which compounds to continue with.'],
  note: 'It takes about 40 to 60 minutes. The drugs are real, and their properties and 3D shapes are computed with RDKit. The egg map is a simplified teaching version and the pharmacokinetic values are rounded typical numbers. Works on phone, tablet and computer.',
  async loadData() { const [lib, teaching] = await Promise.all([fetchJson('data/adme/drugs.json'), fetchJson('data/adme/teaching.json')]); lib.teaching = teaching; return lib; },
};
export default (host, ctx) => mountModule(def, host, ctx);
