// Shared flow for a guided module: intro, consent, pre-test, steps, post-test + survey.
// A module supplies { id, title, name, art, blurb, outcomes, note, steps, quiz, loadData } (see docking/index.js).
// Each step file exports render(host, api). api: { data, step, total, done(info), log(item, value), nav(), unlockNext() }.
import { h, fetchJson, art } from '../ui.js';
import { store } from '../store.js';
import { consentScreen, runTest, runSurvey, exportCsv } from '../eval.js';
import { storyStrip, nextModule, downloadProject } from '../case.js';
import { notice, aiBadge } from '../disclaimer.js';
import { byId } from './registry.js';

/** The same 'back to the main page' button everywhere in a module. */
const backBtn = (cls = '') => h('a', { class: `sticker back-main ${cls}`.trim(), href: '#/', 'aria-label': 'Back to the main page' }, '⌂ Back to main page');

export default function mountModule(def, host, ctx) {
  const M = def.id, STEPS = def.steps;
  let alive = true, stepStart = 0, current = null, stepCleanup = null;
  const [sub] = ctx.route;
  const go = path => { location.hash = `#/${M}${path ? '/' + path : ''}`; };

  const endStep = () => { if (current && stepStart) store.log(M, current, 'seconds', Math.round((Date.now() - stepStart) / 1000)); current = null; };

  function stepper(active) {
    const items = [{ id: 'pre', title: 'Pre-test' }, ...STEPS, { id: 'finish', title: 'Post-test' }];
    return h('div', { class: 'modbar' }, backBtn(), h('ol', { class: 'stepper', 'aria-label': 'Progress' }, items.map((s, i) => {
      const done = s.id === 'pre' ? !!store.test(M, 'pre') : s.id === 'finish' ? store.isDone(M, 'finish') : store.isDone(M, s.id);
      return h('li', {}, h('a', { href: `#/${M}/${s.id}`, class: `${s.id === active ? 'is-current' : ''} ${done ? 'is-done' : ''}`, 'aria-current': s.id === active ? 'step' : null },
        h('b', {}, h('span', {}, i + 1)), s.title));
    })));
  }

  async function show() {
    document.title = `${def.title} · CADD with Dr. NAM`;
    if (!sub) return intro();
    if (!store.get('consent')) return host.append(await consentScreen(() => { host.innerHTML = ''; show(); }));
    if (sub === 'pre') return pre();
    if (!store.test(M, 'pre')) return go('pre'); // pre-test first
    if (sub === 'finish') return finish();
    const i = STEPS.findIndex(s => s.id === sub);
    if (i < 0) return go('');
    const step = STEPS[i];
    const data = await def.loadData();
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
        return h('div', { class: 'nav' }, h('a', { class: 'sticker', style: 'text-decoration:none;display:inline-flex;align-items:center', href: `#/${M}/${i === 0 ? '' : STEPS[i - 1].id}` }, '← Back'), backBtn('back-main--mid'), nextBtn);
      },
      unlockNext() { const b = body.querySelector('.nav .btn-start'); if (b) b.disabled = false; },
    };
    body.append(h('p', { class: 'eyebrow' }, `Step ${i + 1} of ${STEPS.length}`), h('h2', {}, step.title));
    stepCleanup = mod.render(body, api) || null;
  }

  function intro() {
    const n = def.number, story = h('div');
    storyStrip(M).then(el => story.replaceWith(el)).catch(() => {});
    host.append(h('div', { class: 'modbar' }, backBtn()), h('section', { class: 'banner' }, art(def.art, '', { eager: true, sizes: '100vw', cls: 'banner__bg' }), h('div', { class: 'banner__shade' }), byId(M)?.aiImage === false ? '' : aiBadge(), h('div', { class: 'banner__text' }, h('p', { class: 'eyebrow' }, n == null ? 'Stand-alone module' : `Module ${n} of 5`), h('h1', {}, def.title), h('p', { class: 'lead' }, def.blurb))),
      notice('compact'),
      story,
      h('section', { class: 'glass stack', style: 'margin-top:20px' },
      h('p', { class: 'lead' }, def.intro),
      h('h3', {}, 'By the end you can:'),
      h('ul', {}, def.outcomes.map(t => h('li', {}, t))),
      h('p', { class: 'muted' }, def.note),
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
    const quiz = await fetchJson(def.quiz);
    box.append(runTest(M, 'pre', quiz.questions, () => go(STEPS[0].id)));
  }

  async function finish() {
    host.append(stepper('finish'));
    const box = h('section', { class: 'glass stack' }, h('p', { class: 'eyebrow' }, 'Last part'), h('h2', {}, 'Post-test and survey'));
    host.append(box);
    const quiz = await fetchJson(def.quiz);
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
          h('a', { class: 'sticker', style: 'text-decoration:none', href: '#/' }, '⌂ Back to main page')));
      const nx = nextModule(M);
      if (nx) box.append(h('div', { class: 'card sticker-static', style: 'margin-top:12px' }, h('strong', {}, `Next in the project: Module ${nx.n}, ${nx.title}`), h('p', { style: 'margin:6px 0' }, 'Your decisions from this module are saved and will be used there.'), h('a', { class: 'btn-start btn-start--small', style: 'text-decoration:none', href: `#/${nx.id}` }, `Continue to Module ${nx.n} →`)));
      else if (def.number != null) box.append(h('div', { class: 'card sticker-static', style: 'margin-top:12px' }, h('strong', {}, 'You reached the end of the project'), h('p', { style: 'margin:6px 0' }, 'Download your project file: every decision you made, from screening to the pose test.'), h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: downloadProject }, 'Download my project file (.txt)')));
    };
    if (post && store.isDone(M, 'finish')) return summary();
    if (post) return doSurvey();
    box.append(h('p', {}, 'The same ten questions again. After you submit, you will see the right answers with short explanations.'));
    box.append(runTest(M, 'post', quiz.questions, doSurvey, { review: true }));
  }

  show();
  return () => { alive = false; endStep(); stepCleanup?.(); host.innerHTML = ''; };
}
