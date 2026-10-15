// CADD with Dr. NAM: hash router, home, record and about pages.
import { h, download, art } from './ui.js';
import { store } from './store.js';
import { modules, byId } from './modules/registry.js';
import { exportCsv } from './eval.js';
import { describe, chainIds, downloadProject } from './case.js';
import { startAnnotate } from './handbook/annotate.js';
import { notice, aiBadge, disclaimerPage, practiceNotice } from './disclaimer.js';

const app = document.getElementById('app');
let cleanup = null, stopAnnotate = null;

function applyTheme() {
  const day = store.get('theme') === 'day';
  document.documentElement.dataset.theme = day ? 'day' : 'night';
  document.getElementById('btn-theme').textContent = day ? '☾ Night' : '☀ Day';
}
document.getElementById('btn-theme').addEventListener('click', () => { store.set('theme', store.get('theme') === 'day' ? 'night' : 'day'); applyTheme(); });

async function route() {
  cleanup?.(); cleanup = null; stopAnnotate?.(); stopAnnotate = null; app.innerHTML = '';
  const [, page = '', ...rest] = location.hash.replace(/^#/, '').split('/');
  document.querySelectorAll('.toolbar a').forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === `#/${['results', 'about', 'project', 'handbook'].includes(page) ? page : ''}`)));
  const m = byId(page);
  if (m?.status === 'ready') {
    const mod = await m.load();
    cleanup = mod.default(app, { route: rest, module: m }) || null;
  } else if (page === 'disclaimer') disclaimerPage(app);
  else if (page === 'handbook') cleanup = (await import('./handbook/index.js')).default(app, { route: rest }) || null;
  else if (page === 'project') cleanup = (await import('./project/index.js')).default(app, { route: rest }) || null;
  else if (page === 'results') record();
  else if (page === 'about') about();
  else cleanup = home() || null;
  if (page !== 'handbook') startAnnotate(app).then(f => { stopAnnotate = f; });
  window.scrollTo(0, 0);
}

/** Subtle life for the banner: slow drift (CSS), a soft light sweep, drifting sparkles and a small pointer parallax. Off for reduced motion. */
function heroMotion(hero) {
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const pic = hero.querySelector('.hero__pic'), sparks = hero.querySelector('.hero__sparks');
  for (let i = 0; i < 16; i++) {
    const d = document.createElement('i'), big = i % 5 === 0;
    d.style.cssText = `--x:${(Math.random() * 100).toFixed(1)}%;--y:${(Math.random() * 100).toFixed(1)}%;--s:${big ? 7 + Math.random() * 5 : 3 + Math.random() * 3}px;--d:${(7 + Math.random() * 9).toFixed(1)}s;--t:${(-Math.random() * 12).toFixed(1)}s;--dx:${(Math.random() * 40 - 20).toFixed(0)}px`;
    sparks.appendChild(d);
  }
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, on = true;
  const loop = () => { cx += (tx - cx) * .06; cy += (ty - cy) * .06; pic.style.setProperty('--px', cx.toFixed(3)); pic.style.setProperty('--py', cy.toFixed(3)); raf = on ? requestAnimationFrame(loop) : 0; };
  const move = e => { const r = hero.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * 2; ty = ((e.clientY - r.top) / r.height - .5) * 2; };
  const leave = () => { tx = 0; ty = 0; };
  hero.addEventListener('pointermove', move); hero.addEventListener('pointerleave', leave);
  const io = new IntersectionObserver(([en]) => { on = en.isIntersecting; hero.classList.toggle('is-paused', !on); if (on && !raf) raf = requestAnimationFrame(loop); }, { threshold: 0.05 });
  io.observe(hero); raf = requestAnimationFrame(loop);
  return () => { on = false; cancelAnimationFrame(raf); io.disconnect(); hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave); };
}

function home() {
  document.title = 'CADD with Dr. NAM';
  app.append(
    h('section', { class: 'hero hero--stack' },
      h('div', { class: 'hero__pic' }, h('div', { class: 'hero__plx' }, art('hero', 'Colourful illustration of a protein with a drug in its pocket, a laptop running a simulation, a funnel filtering candidate molecules, and a capsule with arrows to the liver, kidney, gut and blood.', { eager: true, sizes: '100vw', cls: 'hero__img', small: 1000, full: 2000, ratio: 711 / 2000 })), h('div', { class: 'hero__sparks', 'aria-hidden': 'true' }), h('div', { class: 'hero__sheen', 'aria-hidden': 'true' })),
      aiBadge(),
      h('div', { class: 'hero__content' },
        h('div', { class: 'hero__badge' }, h('img', { src: 'brand/logos/chemistry-with-dr-nam-logo.jpg', alt: 'Chemistry with Dr. NAM' })),
        h('div', {},
          h('p', { class: 'eyebrow' }, 'Chemistry with Dr. NAM'),
          h('h1', {}, 'CADD with Dr. NAM'),
          h('p', { class: 'lead' }, 'Learn the big picture of computer-aided drug design: why we do each step, how it works, and what the results mean. These are simulations, so they work with any software you use later.'),
          h('a', { class: 'btn-start', href: '#/screening', style: 'text-decoration:none' }, 'Start Module 1 →')))),
    notice('full'),
    h('h2', { class: 'section-title' }, 'One project, five connected modules'),
    h('p', { class: 'lead' }, 'Follow one drug-discovery project from a big compound library to a tested candidate. Each module hands its result to the next. Do them in order for the full story.'),
    h('div', { class: 'mods' }, modules.filter(m => !m.standalone).map(m => h(m.status === 'ready' ? 'a' : 'div', { class: `mod sticker-static${m.status === 'ready' ? '' : ' is-soon'}`, href: m.status === 'ready' ? `#/${m.id}` : null },
      h('div', { class: 'mod__art' }, art(m.art, `Illustration for ${m.title}`), m.aiImage === false ? '' : aiBadge(), m.status === 'ready' ? null : h('span', { class: 'mod__ribbon' }, 'Coming soon')),
      h('div', { class: 'mod__body' },
        h('span', { class: 'mod__n' }, `Module ${m.n}`),
        h('h3', {}, m.title), h('p', {}, m.blurb),
        m.status === 'ready' ? h('span', { class: 'go' }, store.isDone(m.id, 'finish') ? 'Completed ✓ Open again →' : 'Start →') : null)))),
    h('h2', { class: 'section-title' }, 'Your own project (practice only)'),
    h('div', { class: 'card sticker-static stack' }, h('span', { class: 'mod__n' }, 'Hands-on practice'), h('h3', { style: 'margin:4px 0' }, 'Project workbook'), practiceNotice('full'), h('p', { style: 'margin:0' }, 'Practise a whole CADD project in the software you are learning. The workbook asks the questions a supervisor would ask, checks your numbers, flags common mistakes and builds a practice report.'), h('a', { class: 'go', href: '#/project' }, 'Open the workbook →')),
    h('a', { class: 'card sticker-static', href: '#/handbook', style: 'display:block;text-decoration:none;margin-top:16px' }, h('span', { class: 'mod__n' }, 'Reference'), h('h3', { style: 'margin:4px 0' }, 'Handbook: glossary and appendices'), h('p', { style: 'margin:0 0 8px' }, 'Every abbreviation explained, plus rules of thumb, units, formulae, file formats, tools and a reading list.'), h('span', { class: 'go' }, 'Open the handbook →')),
    h('h2', { class: 'section-title' }, 'Stand-alone module'),
    h('div', { class: 'mods mods--single' }, modules.filter(m => m.standalone).map(m => h('a', { class: 'mod sticker-static', href: `#/${m.id}` },
      h('div', { class: 'mod__art' }, art(m.art, `Illustration for ${m.title}`), m.aiImage === false ? '' : aiBadge()),
      h('div', { class: 'mod__body' }, h('span', { class: 'mod__n' }, 'Stand-alone'), h('h3', {}, m.title), h('p', {}, m.blurb), h('span', { class: 'go' }, store.isDone(m.id, 'finish') ? 'Completed ✓ Open again →' : 'Start →'))))),
    h('section', { class: 'glass stack' },
      h('h2', {}, 'How each module works'),
      h('div', { class: 'howto' }, [['1', 'Pre-test', 'A short test shows what you already know.'], ['2', 'The mission', 'Work through the steps. Every step starts with “Why do we do this?”.'], ['3', 'Decide', 'The last step asks you to choose and justify, like a real project.'], ['4', 'Post-test', 'The same questions again, then a short survey.']].map(([n, t, d]) => h('div', { class: 'howto__item' }, h('b', {}, n), h('div', {}, h('strong', {}, t), h('p', {}, d)))))));
  return heroMotion(app.querySelector('.hero--stack'));
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
    h('h2', {}, 'My project file'),
    h('ol', {}, chainIds().map(id => h('li', {}, h('strong', {}, byId(id).title + ': '), describe(id) || 'not done yet'))),
    h('div', { class: 'row' }, h('button', { class: 'sticker', type: 'button', onclick: downloadProject }, 'Download my project file (.txt)')),
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
    h('p', {}, h('strong', {}, 'The protein and drug in the project are real: COX-2 with celecoxib (PDB entry 3LN1, from the RCSB Protein Data Bank). '), 'The docking poses, scores and compounds A, B and C in the docking module are mock data made for teaching. They are not real experiments and must not be used for real drug-design decisions.'),
    h('div', { class: 'gallery' }, modules.map(m => h('figure', {}, art(m.art, `Illustration for ${m.title}`), h('figcaption', {}, `${m.n ?? '★'}. ${m.title}${' (AI-generated illustration)'}`)))),
    h('p', {}, 'Privacy: the site has no server and collects nothing. Your progress and answers are stored in your own browser, and you choose whether to download and submit them.'),
    h('p', { class: 'muted' }, 'Created by Dr. NAM, Universiti Teknologi MARA. Parts of the software were developed with the help of an AI coding assistant (Claude, by Anthropic) under the author’s direction; the author is responsible for the content. The illustrations are AI-generated, used for educational purposes, artistic, not to scale and not scientific data (see the disclaimer).'), h('p', {}, h('a', { href: '#/disclaimer' }, 'Disclaimer and disclosures'))));
}

addEventListener('hashchange', route);
applyTheme();
route();
