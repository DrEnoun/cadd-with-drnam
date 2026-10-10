// CADD with Dr. NAM: hash router, home, record and about pages.
import { h, download } from './ui.js';
import { store } from './store.js';
import { modules, byId } from './modules/registry.js';
import { exportCsv } from './eval.js';

const app = document.getElementById('app');
let cleanup = null;

function applyTheme() {
  const day = store.get('theme') === 'day';
  document.documentElement.dataset.theme = day ? 'day' : 'night';
  document.getElementById('btn-theme').textContent = day ? '☾ Night' : '☀ Day';
}
document.getElementById('btn-theme').addEventListener('click', () => { store.set('theme', store.get('theme') === 'day' ? 'night' : 'day'); applyTheme(); });

async function route() {
  cleanup?.(); cleanup = null; app.innerHTML = '';
  const [, page = '', ...rest] = location.hash.replace(/^#/, '').split('/');
  document.querySelectorAll('.toolbar a').forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === `#/${['results', 'about'].includes(page) ? page : ''}`)));
  const m = byId(page);
  if (m?.status === 'ready') {
    const mod = await m.load();
    cleanup = mod.default(app, { route: rest, module: m }) || null;
  } else if (page === 'results') record();
  else if (page === 'about') about();
  else home();
  window.scrollTo(0, 0);
}

function home() {
  document.title = 'CADD with Dr. NAM';
  app.append(
    h('section', { class: 'hero' },
      h('div', { class: 'hero__badge' }, h('img', { src: 'brand/logos/chemistry-with-dr-nam-logo.jpg', alt: 'Chemistry with Dr. NAM' })),
      h('div', {},
        h('p', { class: 'eyebrow' }, 'Chemistry with Dr. NAM'),
        h('h1', {}, 'CADD with Dr. NAM'),
        h('p', { class: 'lead' }, 'Learn the big picture of computer-aided drug design: why we do each step, how it works, and what the results mean. These are simulations with mock data, so they work with any software you use later.'))),
    h('div', { class: 'mods' }, modules.map(m => h(m.status === 'ready' ? 'a' : 'div', { class: `mod sticker-static${m.status === 'ready' ? '' : ' is-soon'}`, href: m.status === 'ready' ? `#/${m.id}` : null },
      h('span', { class: 'mod__n' }, `Module ${m.n}`),
      h('h3', {}, m.title), h('p', {}, m.blurb),
      m.status === 'ready' ? h('span', { class: 'go' }, store.isDone(m.id, 'finish') ? 'Completed ✓ Open again →' : 'Start →') : h('span', { class: 'tag tag--soon' }, 'Coming soon')))),
    h('section', { class: 'glass stack' },
      h('h2', {}, 'How each module works'),
      h('p', {}, '1. A short pre-test shows what you already know. 2. You work through the steps as a mission, and every step starts with “Why do we do this?”. 3. The final step asks you to decide and justify, like a real project. 4. A post-test and short survey finish the module.')));
}

function record() {
  document.title = 'My record · CADD with Dr. NAM';
  const d = store.all();
  const rows = modules.filter(m => m.status === 'ready').map(m => {
    const pre = store.test(m.id, 'pre'), post = store.test(m.id, 'post'), sv = store.test(m.id, 'survey');
    const steps = Object.keys(d.steps[m.id] || {}).filter(s => s !== 'finish').length;
    return h('tr', {}, h('td', {}, m.title), h('td', { class: 'num' }, steps), h('td', { class: 'num' }, pre ? `${pre.score}/${pre.total}` : '–'), h('td', { class: 'num' }, post ? `${post.score}/${post.total}` : '–'), h('td', { class: 'num' }, sv?.susScore != null ? sv.susScore : '–'));
  });
  app.append(h('section', { class: 'glass stack' },
    h('h1', {}, 'My record'),
    h('p', {}, 'This is stored only in this browser. Download it to keep it, or to submit it to your lecturer if you agreed to take part.'),
    h('p', {}, h('strong', {}, 'Your code: '), d.code || 'not created yet (it appears when you start a module)'),
    h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Module', 'Steps done', 'Pre-test', 'Post-test', 'Usability (0–100)'].map(t => h('th', {}, t)))), h('tbody', {}, rows))),
    h('div', { class: 'row' },
      h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: exportCsv }, 'Download my record (CSV)'),
      h('button', { class: 'sticker', type: 'button', onclick: () => download(`cadd-record-${d.code || 'anon'}.json`, JSON.stringify(d, null, 1), 'application/json') }, 'Download (JSON)'),
      h('button', { class: 'sticker', type: 'button', onclick: () => { if (confirm('Delete everything stored in this browser for this site?')) { store.reset(); route(); } } }, 'Delete my data'))));
}

function about() {
  document.title = 'About · CADD with Dr. NAM';
  app.append(h('section', { class: 'glass stack' },
    h('h1', {}, 'About'),
    h('p', {}, 'CADD with Dr. NAM is a set of interactive concept simulations for computer-aided drug design. It teaches the fundamental ideas and workflow behind each technique, whatever software students use later.'),
    h('p', {}, h('strong', {}, 'The protein and drug in Module 1 are real: COX-2 with celecoxib (PDB entry 3LN1, from the RCSB Protein Data Bank). '), 'The docking poses, scores and compounds A, B and C are mock data made for teaching. They are not real experiments and must not be used for real drug-design decisions.'),
    h('p', {}, 'Modules: 1 Molecular Docking (ready), 2 Virtual Screening, 3 ADME Prediction, 4 Homology Modelling (coming).'),
    h('p', {}, 'Privacy: the site has no server and collects nothing. Your progress and answers are stored in your own browser, and you choose whether to download and submit them.'),
    h('p', { class: 'muted' }, 'Created by Dr. NAM, Universiti Teknologi MARA. Parts of the software were developed with the help of an AI coding assistant (Claude, by Anthropic) under the author’s direction; the author is responsible for the content.')));
}

addEventListener('hashchange', route);
applyTheme();
route();
