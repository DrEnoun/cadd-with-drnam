// The four modules. Add a new one here and it appears on the home page.
export const modules = [
  { id: 'docking', art: 'docking', n: 1, title: 'Molecular Docking', blurb: 'Why we dock, how a docking run works, and what to check afterwards.', status: 'ready', load: () => import('./docking/index.js') },
  { id: 'screening', art: 'screening', n: 2, title: 'Virtual Screening', blurb: 'Filter a huge compound library down to a few promising hits.', status: 'soon' },
  { id: 'adme', art: 'adme', n: 3, title: 'ADME Prediction', blurb: 'A strong binder is not a drug if the body cannot absorb or clear it.', status: 'soon' },
  { id: 'homology', art: 'homology', n: 4, title: 'Homology Modelling', blurb: 'No structure? Build a model from a related protein and check its quality.', status: 'soon' },
];
export const byId = id => modules.find(m => m.id === id);
