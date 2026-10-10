// Module 1 — Molecular Docking. A guided mission: pre-test, 8 steps, post-test + survey.
// Each step file exports render(host, api). api: { data, done(info), log(item, value), next, prev }.
import { h, fetchJson, art } from '../../ui.js';
import { store } from '../../store.js';
import { consentScreen, runTest, runSurvey, exportCsv } from '../../eval.js';

const M = 'docking';
export const STEPS = [
  { id: 'why', title: 'Why dock?', load: () => import('./why.js') },
  { id: 'search', title: 'Search and score', load: () => import('./search.js') },
  { id: 'prepare', title: 'Prepare', load: () => import('./prepare.js') },
  { id: 'box', title: 'Search box', load: () => import('./box.js') },
  { id: 'scoring', title: 'Scoring', load: () => import('./scoring.js') },
  { id: 'validate', title: 'Validate', load: () => import('./validate.js') },
  { id: 'analyse', title: 'Analyse', load: () => import('./analyse.js') },
  { id: 'decide', title: 'Decide', load: () => import('./decide.js') },
];

export default function mount(host, ctx) {
  let alive = true, stepStart = 0, current = null, stepCleanup = null;
  const [sub] = ctx.route;
  const go = path => { location.hash = `#/${M}${path ? '/' + path : ''}`; };

  const endStep = () => { if (current && stepStart) store.log(M, current, 'seconds', Math.round((Date.now() - stepStart) / 1000)); current = null; };

  function stepper(active) {
    const items = [{ id: 'pre', title: 'Pre-test' }, ...STEPS, { id: 'finish', title: 'Post-test' }];
    return h('ol', { class: 'stepper', 'aria-label': 'Progress' }, items.map((s, i) => {
      const done = s.id === 'pre' ? !!store.test(M, 'pre') : s.id === 'finish' ? store.isDone(M, 'finish') : store.isDone(M, s.id);
      return h('li', {}, h('a', { href: `#/${M}/${s.id}`, class: `${s.id === active ? 'is-current' : ''} ${done ? 'is-done' : ''}`, 'aria-current': s.id === active ? 'step' : null },
        h('b', {}, h('span', {}, i + 1)), s.title));
    }));
  }

  async function show() {
    document.title = 'Molecular Docking · CADD with Dr. NAM';
    if (!sub) return intro();
    if (!store.get('consent')) return host.append(await consentScreen(() => { host.innerHTML = ''; show(); }));
    if (sub === 'pre') return pre();
    if (!store.test(M, 'pre')) return go('pre'); // pre-test first
    if (sub === 'finish') return finish();
    const i = STEPS.findIndex(s => s.id === sub);
    if (i < 0) return go('');
    const step = STEPS[i];
    const data = await fetchJson('data/docking/mock.json'); data.structure = await fetchJson('data/docking/cox2.json');
    const mod = await step.load();
    if (!alive) return;
    host.append(stepper(step.id));
    const body = h('section', { class: 'glass stack' });
    host.append(body);
    current = step.id; stepStart = Date.now();
    store.log(M, step.id, 'enter', 1);
    const next = STEPS[i + 1] ? STEPS[i + 1].id : 'finish';
    const api = {
      data, step: i + 1, total: STEPS.length,
      log: (item, value) => store.log(M, step.id, item, value),
      done: info => store.stepDone(M, step.id, info),
      nav(extraDisabled = false) {
        const nextBtn = h('button', { class: 'btn-start', type: 'button', disabled: (extraDisabled && !store.isDone(M, step.id)) || null, onclick: () => go(next) }, next === 'finish' ? 'Finish: post-test →' : 'Next step →');
        return h('div', { class: 'nav' }, h('a', { class: 'sticker', style: 'text-decoration:none;display:inline-flex;align-items:center', href: `#/${M}/${i === 0 ? '' : STEPS[i - 1].id}` }, '← Back'), nextBtn);
      },
      unlockNext() { const b = body.querySelector('.nav .btn-start'); if (b) b.disabled = false; },
    };
    body.append(h('p', { class: 'eyebrow' }, `Step ${i + 1} of ${STEPS.length}`), h('h2', {}, step.title));
    stepCleanup = mod.render(body, api) || null;
  }

  function intro() {
    host.append(h('section', { class: 'banner' }, art('docking', '', { eager: true, sizes: '100vw', cls: 'banner__bg' }), h('div', { class: 'banner__shade' }), h('div', { class: 'banner__text' }, h('p', { class: 'eyebrow' }, 'Module 1'), h('h1', {}, 'Molecular Docking'), h('p', { class: 'lead' }, 'How a drug-like molecule fits a protein, and what to check afterwards.'))),
      h('section', { class: 'glass stack', style: 'margin-top:20px' },
      h('p', { class: 'lead' }, 'Docking is a computer experiment that predicts how a small molecule (a ligand) fits into a protein pocket and how strongly it may bind. Many students can run the software but are not sure why they do each step or what to look at afterwards. This module fixes that.'),
      h('h3', {}, 'By the end you can:'),
      h('ul', {},
        ['Explain why we dock and what question docking answers.',
         'Describe how a docking run works: search for poses, then score and rank them.',
         'Prepare a structure, set the search box and explain what goes wrong if you do not.',
         'Validate a protocol by redocking and judge the RMSD.',
         'Analyse results: score, interactions, key residues and ligand efficiency, not the score alone.',
         'Decide which compound to take forward and justify the choice.'].map(t => h('li', {}, t))),
      h('p', { class: 'muted' }, 'It takes about 40 to 60 minutes. The protein is the real COX-2 structure; the docking poses and scores are mock. Works on phone, tablet and computer, with mouse or touch.'),
      h('div', { class: 'row' }, h('a', { class: 'btn-start', href: `#/${M}/${store.test(M, 'pre') ? STEPS[0].id : 'pre'}`, style: 'text-decoration:none' }, store.test(M, 'pre') ? 'Continue' : 'Start with the pre-test →'))));
  }

  async function pre() {
    const done = store.test(M, 'pre');
    const box = h('section', { class: 'glass stack' }, h('p', { class: 'eyebrow' }, 'Before you begin'), h('h2', {}, 'Pre-test'));
    host.append(stepper('pre'), box);
    if (done) {
      box.append(h('p', {}, `You already did the pre-test (${done.score}/${done.total}).`), h('a', { class: 'btn-start', href: `#/${M}/${STEPS[0].id}`, style: 'text-decoration:none' }, 'Continue →'));
      return;
    }
    box.append(h('p', {}, 'Ten quick questions to see what you already know. It is fine not to know the answers: you will not see them now, and you will not be graded on this.'));
    const quiz = await fetchJson('data/docking/quiz.json');
    box.append(runTest(M, 'pre', quiz.questions, () => go(STEPS[0].id)));
  }

  async function finish() {
    host.append(stepper('finish'));
    const box = h('section', { class: 'glass stack' }, h('p', { class: 'eyebrow' }, 'Last part'), h('h2', {}, 'Post-test and survey'));
    host.append(box);
    const quiz = await fetchJson('data/docking/quiz.json');
    const post = store.test(M, 'post');
    const doSurvey = () => {
      box.innerHTML = ''; box.append(h('p', { class: 'eyebrow' }, 'Last part'), h('h2', {}, 'Short survey'), h('p', {}, 'Tell us what you think. It takes about 3 minutes.'));
      box.append(runSurvey(M, () => { store.stepDone(M, 'finish'); summary(); }));
    };
    const summary = () => {
      const pre = store.test(M, 'pre'), po = store.test(M, 'post');
      box.innerHTML = '';
      box.append(h('p', { class: 'eyebrow' }, 'Module complete'), h('h2', {}, 'Well done!'),
        h('div', { class: 'kv' }, h('span', {}, 'Pre-test'), h('b', {}, `${pre.score}/${pre.total}`), h('span', {}, 'Post-test'), h('b', {}, `${po.score}/${po.total}`)),
        h('p', {}, 'Your record is saved in this browser. If you agreed to take part in the research, download it and submit it as your lecturer instructs.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: exportCsv }, 'Download my record (CSV)'),
          h('a', { class: 'sticker', style: 'text-decoration:none', href: '#/results' }, 'See my record'),
          h('a', { class: 'sticker', style: 'text-decoration:none', href: '#/' }, 'Back to modules')));
    };
    if (post && store.isDone(M, 'finish')) return summary();
    if (post) return doSurvey();
    box.append(h('p', {}, 'The same ten questions again. After you submit, you will see the right answers with short explanations.'));
    box.append(runTest(M, 'post', quiz.questions, doSurvey, { review: true }));
  }

  show();
  return () => { alive = false; endStep(); stepCleanup?.(); host.innerHTML = ''; };
}
