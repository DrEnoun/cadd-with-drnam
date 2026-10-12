// Evaluation layer for educational-research use: consent, pre/post concept test, usability survey, CSV export.
// Everything is stored in the student's own browser; the student downloads a file and submits it as instructed.
import { h, fetchJson, shuffle, download, feedback } from './ui.js';
import { store } from './store.js';

export const SUS_ITEMS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
];
export const PERCEPTION = {
  docking: [
    'This module helped me understand why we do molecular docking.',
    'This module helped me understand what to analyse after docking.',
    'I feel more confident to learn docking software after this module.',
  ],
  adme: [
    'This module helped me understand why ADME matters for a drug candidate.',
    'This module helped me understand how to read ADME predictions and what they cannot tell us.',
    'I feel more confident to learn ADME prediction software after this module.',
  ],
  md: [
    'This module helped me understand why we run molecular dynamics after docking.',
    'This module helped me understand how to read MD graphs and what they cannot prove.',
    'I feel more confident to learn MD software after this module.',
  ],
  network: [
    'This module helped me understand why we map drug targets as a network.',
    'This module helped me understand how to read hubs and pathway results and what they cannot prove.',
    'I feel more confident to learn network pharmacology tools after this module.',
  ],
  homology: [
    'This module helped me understand why we build protein models.',
    'This module helped me understand how to choose a template and judge how far to trust a model.',
    'I feel more confident to learn homology modelling software after this module.',
  ],
  screening: [
    'This module helped me understand why we screen compound libraries on the computer.',
    'This module helped me understand how to judge whether a screen worked and choose hits.',
    'I feel more confident to learn virtual screening software after this module.',
  ],
};

/** Standard SUS scoring (0–100): odd items score-1, even items 5-score, sum × 2.5. */
export function susScore(ans) {
  if (!ans || ans.length !== 10 || ans.some(a => !(a >= 1 && a <= 5))) return null;
  return ans.reduce((s, a, i) => s + (i % 2 === 0 ? a - 1 : 5 - a), 0) * 2.5;
}

// ------------------------------------------------------------ consent
export async function consentScreen(onDone) {
  const cfg = await fetchJson('data/config.json').catch(() => ({}));
  const box = h('section', { class: 'glass consent stack' },
    h('h2', {}, 'Before you start'),
    h('p', {}, 'This site is a teaching simulation. It uses mock data and does not run real docking.'),
    h('p', {}, 'To help improve the module, we would like to record what you do in it: your answers, scores and the time you spend on each step. ',
      h('strong', {}, 'No name, email or student ID is collected.'), ' You get a random code instead.'),
    h('p', {}, 'Your data stays in this browser. Nothing is uploaded. At the end you can download a file and, if you agree, submit it to your lecturer.'),
    cfg.ethicsRef ? h('p', { class: 'muted' }, `Ethics reference: ${cfg.ethicsRef}.`) : null,
    cfg.contact ? h('p', { class: 'muted' }, `Questions: ${cfg.contact}.`) : null,
    h('p', {}, 'Taking part in the research is voluntary and you can still use the whole module if you say no.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => done('research') }, 'I agree: my anonymous data may be used for research'),
      h('button', { class: 'sticker', type: 'button', onclick: () => done('learning') }, 'Use it for my learning only')));
  function done(choice) {
    store.set('consent', { choice, at: new Date().toISOString(), version: cfg.version || '' });
    if (!store.get('code')) store.newCode();
    onDone();
  }
  return box;
}

// ------------------------------------------------------------ multiple-choice test (pre / post)
export function runTest(module, which, questions, onDone, { review = false } = {}) {
  const qs = questions.map(q => ({ ...q, order: shuffle(q.options.map((_, i) => i)) }));
  const picks = {};
  const form = h('form', { class: 'stack', novalidate: true });
  qs.forEach((q, i) => {
    form.append(h('fieldset', { class: 'q', style: 'border:0;padding:0;margin:18px 0' },
      h('p', { class: 'qt' }, `${i + 1}. ${q.q}`),
      h('div', { class: 'opts' }, q.order.map(oi => h('label', { class: 'opt' },
        h('input', { type: 'radio', name: q.id, value: oi, onchange: () => { picks[q.id] = oi; update(); } }),
        h('span', {}, q.options[oi]))))));
  });
  const count = h('span', { class: 'muted' });
  const submit = h('button', { class: 'btn-start', type: 'submit', disabled: true }, 'Submit answers');
  const update = () => { count.textContent = `${Object.keys(picks).length} of ${qs.length} answered`; submit.disabled = Object.keys(picks).length < qs.length; };
  update();
  form.append(h('div', { class: 'row' }, submit, count));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const answers = {}; let score = 0;
    for (const q of qs) { answers[q.id] = picks[q.id]; if (picks[q.id] === q.answer) score++; }
    const result = { score, total: qs.length, answers, at: new Date().toISOString() };
    store.setTest(module, which, result);
    store.log(module, which, 'score', `${score}/${qs.length}`);
    if (review) showReview(); else onDone(result);
    function showReview() {
      form.querySelectorAll('fieldset').forEach((fs, i) => {
        const q = qs[i];
        fs.querySelectorAll('label.opt').forEach((lab, k) => {
          const oi = q.order[k]; lab.querySelector('input').disabled = true;
          if (oi === q.answer) lab.classList.add('is-right'); else if (oi === picks[q.id]) lab.classList.add('is-wrong');
        });
        fs.append(feedback(picks[q.id] === q.answer ? 'ok' : 'bad', picks[q.id] === q.answer ? 'Correct' : 'Not quite', q.why));
      });
      submit.remove(); count.remove();
      form.append(h('div', { class: 'row' }, h('strong', {}, `Score: ${score} / ${qs.length}`), h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => onDone(result) }, 'Continue')));
    }
  });
  return form;
}

// ------------------------------------------------------------ usability + perception survey
export function runSurvey(module, onDone) {
  const sus = Array(10).fill(0), per = Array((PERCEPTION[module] || []).length).fill(0);
  const scale = (get, set, text, i) => h('div', { class: 'q' },
    h('p', { class: 'qt' }, text),
    h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Strongly disagree'),
      [1, 2, 3, 4, 5].map(v => h('label', { class: 'opt', style: 'padding:6px 14px' }, h('input', { type: 'radio', name: `${text}`, onchange: () => { set(i, v); upd(); } }), v)),
      h('span', { class: 'muted' }, 'Strongly agree')));
  const submit = h('button', { class: 'btn-start', type: 'submit', disabled: true }, 'Save my answers');
  const upd = () => { submit.disabled = sus.some(v => !v) || per.some(v => !v); };
  const form = h('form', { class: 'stack' },
    h('h3', {}, 'About this module'), (PERCEPTION[module] || []).map((t, i) => scale(per, (k, v) => { per[k] = v; }, t, i)),
    h('h3', {}, 'About the website'), SUS_ITEMS.map((t, i) => scale(sus, (k, v) => { sus[k] = v; }, `${i + 1}. ${t}`, i)),
    h('label', { class: 'field' }, 'Anything we should improve? (optional)'), h('textarea', { rows: 3, name: 'comment' }),
    submit);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const result = { sus: [...sus], susScore: susScore(sus), perception: [...per], comment: form.elements.comment.value.trim(), at: new Date().toISOString() };
    store.setTest(module, 'survey', result); store.log(module, 'survey', 'sus', result.susScore);
    onDone(result);
  });
  return form;
}

// ------------------------------------------------------------ export
const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
export function buildCsv() {
  const d = store.all();
  const base = [d.code || '', d.consent?.choice || ''];
  const rows = [['code', 'consent', 'type', 'module', 'step', 'item', 'value', 'time']];
  const push = (type, module, step, item, value, time) => rows.push([...base, type, module, step, item, value, time || '']);
  for (const [m, t] of Object.entries(d.tests || {})) {
    for (const which of ['pre', 'post']) if (t[which]) {
      push('test', m, which, 'score', t[which].score, t[which].at); push('test', m, which, 'total', t[which].total, t[which].at);
      for (const [id, a] of Object.entries(t[which].answers || {})) push('test', m, which, id, a, t[which].at);
    }
    if (t.survey) {
      push('survey', m, 'survey', 'sus_score', t.survey.susScore, t.survey.at);
      t.survey.sus.forEach((v, i) => push('survey', m, 'survey', `sus_${i + 1}`, v, t.survey.at));
      t.survey.perception.forEach((v, i) => push('survey', m, 'survey', `perception_${i + 1}`, v, t.survey.at));
      if (t.survey.comment) push('survey', m, 'survey', 'comment', t.survey.comment, t.survey.at);
    }
  }
  for (const [m, steps] of Object.entries(d.steps || {})) for (const [s, info] of Object.entries(steps)) {
    push('step', m, s, 'done', 1, info.at);
    for (const [k, v] of Object.entries(info)) if (!['done', 'at'].includes(k)) push('step', m, s, k, typeof v === 'object' ? JSON.stringify(v) : v, info.at);
  }
  for (const e of d.events || []) push('event', e.module, e.step, e.item, typeof e.value === 'object' ? JSON.stringify(e.value) : e.value, e.t);
  return rows.map(r => r.map(q).join(',')).join('\n');
}
export const exportCsv = () => download(`cadd-record-${store.get('code') || 'anon'}.csv`, buildCsv(), 'text/csv');
