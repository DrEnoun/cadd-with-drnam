// Stand-alone module — Homology Modelling: pre-test, 6 steps, post-test + survey (see ../flow.js).
import { fetchJson } from '../../ui.js';
import mountModule from '../flow.js';

export const STEPS = [
  { id: 'why', title: 'Why model?', load: () => import('./why.js') },
  { id: 'template', title: 'Template', load: () => import('./template.js') },
  { id: 'align', title: 'Alignment', load: () => import('./align.js') },
  { id: 'build', title: 'Build', load: () => import('./build.js') },
  { id: 'validate', title: 'Validate', load: () => import('./validate.js') },
  { id: 'decide', title: 'Decide', load: () => import('./decide.js') },
];

const def = {
  id: 'homology', number: null, title: 'Homology Modelling', art: 'homology', quiz: 'data/homology/quiz.json', steps: STEPS,
  blurb: 'No experimental structure? Build a model from a related protein, then check how far to trust it.',
  intro: 'Docking needs a 3D structure, but many proteins have none. Proteins that are related by evolution keep a very similar fold, so the known structure of a relative can be used as a template to build a model of the protein you care about. The quality of the model depends on the template you pick and on the sequence alignment. This module lets you do the whole job on real structures: choose a template, align, build, validate, and then find out how close your model really is.',
  outcomes: ['Explain when homology modelling is the right approach and how it differs from experimental structures and deep-learning predictions.', 'Choose a template using sequence identity, coverage, resolution and state, and not by name.', 'Make a sequence alignment, and explain why gaps belong in loops and why alignment errors become model errors.', 'Describe how a model is built from a template, and which parts are copied and which are guessed.', 'Use a Ramachandran plot, an environment check and the expected error to judge a model, and say what these checks cannot detect.', 'State what a model can and cannot be used for, for example fold analysis versus docking.'],
  note: 'It takes about 40 to 60 minutes. The protein structures are real (from the Protein Data Bank). The model is a simplified C-alpha model made by copying the template backbone, so it shows the ideas but is not a replacement for software such as MODELLER or SWISS-MODEL. For teaching, the structure of the target is hidden until the end, although it is actually public. Works on phone, tablet and computer.',
  async loadData() { const [raw, teaching] = await Promise.all([fetchJson('data/homology/structures.json'), fetchJson('data/homology/teaching.json')]); return { S: raw.structures, rama: raw.rama, teaching }; },
};
export default (host, ctx) => mountModule(def, host, ctx);
