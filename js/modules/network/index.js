// Module 4 — Network Pharmacology: pre-test, 6 steps, post-test + survey (see ../flow.js).
import { fetchJson } from '../../ui.js';
import mountModule from '../flow.js';

export const STEPS = [
  { id: 'why', title: 'Why a network?', load: () => import('./why.js') },
  { id: 'targets', title: 'Targets', load: () => import('./targets.js') },
  { id: 'build', title: 'Network', load: () => import('./build.js') },
  { id: 'hubs', title: 'Hubs', load: () => import('./hubs.js') },
  { id: 'enrich', title: 'Pathways', load: () => import('./enrich.js') },
  { id: 'decide', title: 'Decide', load: () => import('./decide.js') },
];

const def = {
  id: 'network', number: 4, title: 'Network Pharmacology', art: 'network', quiz: 'data/network/quiz.json', steps: STEPS,
  blurb: 'One drug rarely hits one protein. Map all its targets and see how they act together.',
  intro: 'A drug usually binds more than one protein, and a disease involves many proteins at once. Network pharmacology puts them on one map: the targets of the drug, the genes of the disease, the interactions between the proteins, and the pathways they belong to. This module follows the standard workflow with celecoxib and inflammation, and shows where the thresholds, the hubs and the statistics can mislead.',
  outcomes: ['Explain what network pharmacology adds to docking, and what polypharmacology means.', 'Collect drug targets and disease genes with sensible thresholds, and find their overlap.', 'Build an interaction network and say what the confidence cut-off changes.', 'Find hubs with degree, betweenness and closeness, and explain why a hub is not automatically a good drug target.', 'Run and read a pathway enrichment: the hypergeometric test, multiple-testing correction and the choice of background.', 'Choose what to validate in the laboratory and state honestly what the network does and does not show.'],
  note: 'It takes about 40 to 60 minutes. The workflow follows the NAM-NPeasy protocol. The data are a hand-made teaching set (celecoxib and inflammation) with illustrative scores and pathway sizes, not exports from STRING, SwissTargetPrediction, GeneCards or KEGG. The network maths (degree, betweenness, closeness, hypergeometric test, Benjamini-Hochberg) is real. Works on phone, tablet and computer.',
  async loadData() { const [net, teaching] = await Promise.all([fetchJson('data/network/network.json'), fetchJson('data/network/teaching.json')]); return { ...net, teaching }; },
};
export default (host, ctx) => mountModule(def, host, ctx);
