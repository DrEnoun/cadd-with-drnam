// The modules. Modules 1-5 are one connected project (see data/case.json); the standalone ones can be done any time.
export const modules = [
  { id: 'screening', art: 'screening', n: 1, title: 'Virtual Screening', blurb: 'Filter a huge compound library down to a few promising hits.', status: 'ready', load: () => import('./screening/index.js') },
  { id: 'docking', art: 'docking', n: 2, title: 'Molecular Docking', blurb: 'Why we dock, how a docking run works, and what to check afterwards.', status: 'ready', load: () => import('./docking/index.js') },
  { id: 'adme', art: 'adme', n: 3, title: 'ADME Prediction', blurb: 'A strong binder is not a drug if the body cannot absorb it, carry it, survive it or clear it.', status: 'ready', load: () => import('./adme/index.js') },
  { id: 'network', art: 'network', n: 4, title: 'Network Pharmacology', blurb: 'One drug rarely hits one protein. Map all its targets and see how they act together.', status: 'ready', load: () => import('./network/index.js') },
  { id: 'md', art: 'md', n: 5, title: 'Molecular Dynamics', blurb: 'Does the docked pose survive when everything moves? Learn how MD works and how to read it.', status: 'ready', load: () => import('./md/index.js') },
  { id: 'homology', art: 'homology', n: null, standalone: true, title: 'Homology Modelling', blurb: 'No structure? Build a model from a related protein and check its quality. Stand-alone: it teaches the method on another protein.', status: 'ready', load: () => import('./homology/index.js') },
];
export const byId = id => modules.find(m => m.id === id);
