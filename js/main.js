// CADD with Dr. NAM: hash router, home, record and about pages.
import { h, download, art } from './ui.js';
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
      art('docking', '', { eager: true, sizes: '100vw', cls: 'hero__bg' }),
      h('div', { class: 'hero__shade' }),
      h('div', { class: 'hero__content' },
        h('div', { class: 'hero__badge' }, h('img', { src: 'brand/logos/chemistry-with-dr-nam-logo.jpg', alt: 'Chemistry with Dr. NAM' })),
        h('div', {},
          h('p', { class: 'eyebrow' }, 'Chemistry with Dr. NAM'),
          h('h1', {}, 'CADD with Dr. NAM'),
          h('p', { class: 'lead' }, 'Learn the big picture of computer-aided drug design: why we do each step, how it works, and what the results mean. These are simulations, so they work with any software you use later.'),
          h('a', { class: 'btn-start', href: '#/docking', style: 'text-decoration:none' }, 'Start Module 1 →'))),
      h('span', { class: 'hero__cap' }, 'Illustration: a drug-like molecule in a protein pocket')),
    h('h2', { class: 'section-title' }, 'Four modules'),
    h('div', { class: 'mods' }, modules.map(m => h(m.status === 'ready' ? 'a' : 'div', { class: `mod sticker-static${m.status === 'ready' ? '' : ' is-soon'}`, href: m.status === 'ready' ? `#/${m.id}` : null },
      h('div', { class: 'mod__art' }, art(m.art, `Illustration for ${m.title}`), m.status === 'ready' ? null : h('span', { class: 'mod__ribbon' }, 'Coming soon')),
      h('div', { class: 'mod__body' },
        h('span', { class: 'mod__n' }, `Module ${m.n}`),
        h('h3', {}, m.title), h('p', {}, m.blurb),
        m.status === 'ready' ? h('span', { class: 'go' }, store.isDone(m.id, 'finish') ? 'Completed ✓ Open again →' : 'Start →') : null)))),
    h('section', { class: 'glass stack' },
      h('h2', {}, 'How each module works'),
      h('div', { class: 'howto' }, [['1', 'Pre-test', 'A short test shows what you already know.'], ['2', 'The mission', 'Work through the steps. Every step starts with “Why do we do this?”.'], ['3', 'Decide', 'The last step asks you to choose and justify, like a real project.'], ['4', 'Post-test', 'The same questions again, then a short survey.']].map(([n, t, d]) => h('div', { class: 'howto__item' }, h('b', {}, n), h('div', {}, h('strong', {}, t), h('p', {}, d)))))));
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
    h('div', { class: 'gallery' }, modules.map(m => h('figure', {}, art(m.art, `Illustration for ${m.title}`), h('figcaption', {}, `${m.n}. ${m.title}${m.status === 'ready' ? '' : ' (coming)'}`)))),
    h('p', {}, 'Privacy: the site has no server and collects nothing. Your progress and answers are stored in your own browser, and you choose whether to download and submit them.'),
    h('p', { class: 'muted' }, 'Created by Dr. NAM, Universiti Teknologi MARA. Parts of the software were developed with the help of an AI coding assistant (Claude, by Anthropic) under the author’s direction; the author is responsible for the content. The module illustrations are artistic, not to scale, and were supplied by the author.')));
}

addEventListener('hashchange', route);
applyTheme();
route();
