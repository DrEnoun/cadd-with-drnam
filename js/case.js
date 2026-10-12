// The "case file": what the student decided in each module, carried to the next one. Stored in this browser only.
import { h, fetchJson, download } from './ui.js';
import { store } from './store.js';
import { modules } from './modules/registry.js';

export const getCase = () => store.get('case') || {};
export function saveCase(mod, obj) { store.set('case', { ...getCase(), [mod]: { ...obj, at: new Date().toISOString() } }); }
export const caseOf = mod => getCase()[mod] || null;

/** One plain-English line about what a module handed on, or null when the student has not done it yet. */
export function describe(mod, c = caseOf(mod)) {
  if (!c) return null;
  if (mod === 'screening') return `Shortlist from screening: ${c.picks.join(', ')}.`;
  if (mod === 'docking') return `Docking candidate: ${c.name}${c.ok ? ' (pose and interactions checked)' : ' (the evidence for it was weak)'}.`;
  if (mod === 'adme') return `Compounds that looked best for the body: ${c.picks.join(', ')}.`;
  if (mod === 'network') return `Proteins to test in the lab: ${c.picks.join(', ')}.`;
  if (mod === 'md') return `Pose test: ${c.runName} — ${c.verdictText}.`;
  return null;
}
export const chainIds = () => modules.filter(m => !m.standalone).map(m => m.id);
export const nextModule = id => { const ids = chainIds(), i = ids.indexOf(id); return i >= 0 && ids[i + 1] ? modules.find(m => m.id === ids[i + 1]) : null; };

/** A strip showing where this module sits in the project, and what the student brings in. */
export async function storyStrip(id) {
  const S = await fetchJson('data/case.json'), c = getCase(), box = h('section', { class: 'glass stack story' });
  const here = S.chain.findIndex(x => x.id === id), alone = S.standalone.find(x => x.id === id);
  if (alone) { box.append(h('p', { class: 'eyebrow' }, 'Stand-alone module'), h('p', {}, alone.note)); return box; }
  box.append(h('p', { class: 'eyebrow' }, S.title), h('ol', { class: 'storyline', 'aria-label': 'The project in five modules' }, S.chain.map((x, i) => h('li', { class: `${i === here ? 'is-here' : ''} ${c[x.id] ? 'is-done' : ''}` }, h('b', {}, i + 1), h('span', {}, x.short)))));
  box.append(h('p', {}, h('strong', {}, `This module asks: `), S.chain[here].question, ' ', h('strong', {}, 'It gives the next module: '), S.chain[here].gives, '.'));
  const before = S.chain.slice(0, here).map(x => describe(x.id)).filter(Boolean);
  if (here > 0) box.append(h('div', { class: 'card sticker-static' }, h('strong', {}, 'What you bring from the earlier modules'), before.length ? h('ul', { style: 'margin:6px 0 0' }, before.map(t => h('li', {}, t))) : h('p', { class: 'muted', style: 'margin:6px 0 0' }, 'Nothing saved yet. You can start here: sensible defaults will be used. For the full story, begin with Module 1.')));
  return box;
}
/** The project so far as plain text, for a downloadable summary. */
export async function projectText() {
  const S = await fetchJson('data/case.json'), c = getCase();
  return [`${S.title.toUpperCase()}: MY PROJECT FILE`, `Participant code: ${store.get('code') || '-'}`, '', S.premise, '', ...S.chain.map((x, i) => `${i + 1}. ${x.short}: ${describe(x.id) || 'not done yet'}`), '', 'The data in these modules are partly real and partly mock (see each module). This file records your decisions only.'].join('\n');
}
export const downloadProject = async () => download(`project-cox2-${store.get('code') || 'anon'}.txt`, await projectText());
