// The project workbook: a guided lab notebook for a student's own CADD project, with automatic checks, a report and a supervisor view.
import { h, fetchJson, download } from '../ui.js';
import { store } from '../store.js';
import { notice, practiceNotice, PRACTICE_NOTE } from '../disclaimer.js';
import { overview, stageChecks, completeness, report, computedValue, usedStages, empty } from './rules.js';

const KEY = 'project';
const state = () => store.get(KEY) || { data: {}, updated: null };
const getData = () => state().data;
const save = data => store.set(KEY, { data, updated: new Date().toISOString() });
const setField = (stage, id, v) => { const d = getData(); (d[stage] ??= {})[id] = v; save(d); };
const SEV = { block: ['Serious', 'is-block'], warn: ['Check', 'is-warn'], info: ['Note', 'is-info'], ok: ['Good', 'is-ok'] };
const meta = () => ({ code: store.get('code'), date: new Date().toISOString().slice(0, 10) });

function checkList(checks) {
  const order = ['block', 'warn', 'info', 'ok'], list = [...checks].sort((a, b) => order.indexOf(a.sev) - order.indexOf(b.sev));
  if (!list.length) return h('p', { class: 'muted' }, 'Nothing to check yet. Fill in the fields and the review will appear here.');
  return h('ul', { class: 'wb-checks' }, list.map(c => h('li', { class: SEV[c.sev][1] }, h('b', {}, SEV[c.sev][0]), h('span', {}, c.text, c.learn ? [' ', h('a', { href: `#/${c.learn.m}/${c.learn.s}`, class: 'wb-learn' }, 'Why?')] : ''))));
}

export default function mount(host, ctx) {
  let spec = null, ex = null, alive = true;
  const [sub] = ctx.route;
  const go = p => { location.hash = `#/project${p ? '/' + p : ''}`; };

  async function show() {
    [spec, ex] = await Promise.all([fetchJson('data/project/workbook.json'), fetchJson('data/project/example.json')]);
    if (!alive) return;
    document.title = 'Project workbook · CADD with Dr. NAM';
    if (!store.get('consent') && false) return; // the workbook is private to this browser, so no consent screen is needed
    if (sub === 'review') return reviewPage();
    const st = spec.stages.find(s => s.id === sub);
    if (st) return stagePage(st);
    return overviewPage();
  }

  // ---------------------------------------------------------------- overview
  function overviewPage() {
    const d = getData(), ov = overview(spec, d), any = Object.keys(d).length > 0;
    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: e => importFile(e.target.files[0], false) });
    host.append(h('section', { class: 'glass stack' },
      h('p', { class: 'eyebrow' }, 'Your own project: practice only'), h('h1', {}, 'Project workbook'),
      h('p', { class: 'lead' }, 'Practise running a CADD project from question to conclusion. The workbook asks the questions a supervisor would ask, checks your numbers, points out common mistakes and builds a practice report. It never runs the calculations for you: do the exercise in the software you are learning, then record and interpret the practice results here.'),
      practiceNotice('full'),
      notice('compact'),
      h('div', { class: 'card sticker-static' }, h('strong', {}, 'Private to this browser. '), 'Nothing is sent anywhere. Download your practice file to keep it or to send it to your lecturer.'),
      h('div', { class: 'row' },
        h('button', { class: 'sticker', type: 'button', onclick: () => loadExample('good') }, 'Load a worked example'),
        h('button', { class: 'sticker', type: 'button', onclick: () => loadExample('flawed') }, 'Load an example with mistakes'),
        h('button', { class: 'sticker', type: 'button', onclick: () => fileIn.click() }, 'Open a project file'), fileIn,
        h('a', { class: 'sticker', style: 'text-decoration:none', href: '#/project/review' }, 'Supervisor view')),
      any ? h('div', { class: `fb ${ov.blocks ? 'bad' : ov.ready ? 'ok' : 'bad'}`, role: 'status' }, h('strong', {}, ov.ready ? 'Ready to submit' : `${ov.open} required field${ov.open === 1 ? '' : 's'} open · ${ov.blocks} serious issue${ov.blocks === 1 ? '' : 's'} · ${ov.warns} warning${ov.warns === 1 ? '' : 's'}`), h('div', {}, ov.ready ? 'All required fields are filled and no serious issues remain. Read the warnings once more.' : 'Open a stage to see what to fix.')) : h('p', { class: 'muted' }, 'Start with “Project set-up”. The examples show what a finished project looks like (the numbers are made up).'),
      h('div', { class: 'wb-stages' }, spec.stages.map((s, i) => { const r = ov.rows.find(x => x.id === s.id);
        return h('a', { class: `card sticker-static wb-stage ${r.used ? '' : 'is-off'}`, href: `#/project/${s.id}` }, h('span', { class: 'mod__n' }, `Stage ${i + 1}`), h('h3', {}, s.title), h('p', { class: 'muted' }, s.why.split('. ')[0] + '.'),
          r.used ? h('div', {}, h('div', { class: 'wb-bar', 'aria-label': `${r.pct}% of required fields filled` }, h('i', { style: `width:${r.pct}%` })), h('div', { class: 'row', style: 'gap:8px;margin-top:6px' }, h('span', { class: 'tag' }, `${r.done}/${r.total} required`), r.block ? h('span', { class: 'tag wb-t-block' }, `${r.block} serious`) : '', r.warn ? h('span', { class: 'tag wb-t-warn' }, `${r.warn} to check`) : '')) : h('span', { class: 'tag' }, 'Not used in this project')); })),
      h('div', { class: 'row' },
        h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => download(`project-report-${store.get('code') || 'anon'}.md`, report(spec, getData(), meta()), 'text/markdown') }, 'Download my report (.md)'),
        h('button', { class: 'sticker', type: 'button', onclick: exportJson }, 'Download my project file (.json)'),
        h('button', { class: 'sticker', type: 'button', onclick: () => { if (confirm('Delete everything in this workbook (only in this browser)?')) { save({}); route(); } } }, 'Start again'))));
  }
  const route = () => { host.innerHTML = ''; show(); };
  function loadExample(k) { if (Object.keys(getData()).length && !confirm('This replaces what is in your workbook now. Continue?')) return; save(JSON.parse(JSON.stringify(ex[k]))); store.log('project', 'overview', 'example', k); route(); }
  const exportJson = () => download(`project-${store.get('code') || 'anon'}.json`, JSON.stringify({ app: 'cadd-workbook', version: 1, practiceOnly: true, note: PRACTICE_NOTE, code: store.get('code') || null, exportedAt: new Date().toISOString(), data: getData() }, null, 1), 'application/json');
  async function importFile(file, reviewOnly) {
    if (!file) return null;
    try { const j = JSON.parse(await file.text()); if (j.app !== 'cadd-workbook' || typeof j.data !== 'object') throw new Error('not a workbook file');
      if (reviewOnly) return j;
      if (Object.keys(getData()).length && !confirm('Opening this file replaces what is in your workbook now. Continue?')) return null;
      save(j.data); route(); return j; } catch { alert('This file is not a project workbook file (.json) exported from this site.'); return null; }
  }

  // ---------------------------------------------------------------- one stage
  function stagePage(st) {
    store.log('project', st.id, 'enter', 1);
    const i = spec.stages.indexOf(st), d = getData(), ov = overview(spec, d);
    host.append(h('div', { class: 'modbar' }, h('a', { class: 'sticker back-main', href: '#/project' }, '← Project overview'), h('ol', { class: 'stepper', 'aria-label': 'Workbook stages' }, spec.stages.map((s, k) => { const r = ov.rows.find(x => x.id === s.id);
      return h('li', {}, h('a', { href: `#/project/${s.id}`, class: `${s.id === st.id ? 'is-current' : ''} ${r.pct === 100 && !r.block && r.used ? 'is-done' : ''} ${r.used ? '' : 'is-off'}`, 'aria-current': s.id === st.id ? 'step' : null }, h('b', {}, h('span', {}, k + 1)), s.title)); }))));
    const body = h('section', { class: 'glass stack' }), review = h('div', {}), prog = h('div', { class: 'muted' });
    host.append(body);
    body.append(h('p', { class: 'eyebrow' }, `Stage ${i + 1} of ${spec.stages.length}`), h('h2', {}, st.title),
      h('div', { class: 'why' }, h('strong', {}, 'Why this stage? '), st.why, st.module ? h('span', {}, ' ', h('a', { href: `#/${st.module.id}`, class: 'wb-learn' }, `Learn the concept: ${st.module.label}`)) : ''),
      practiceNotice('compact'),
      h('details', { class: 'fine' }, h('summary', {}, 'Common mistakes'), h('ul', {}, st.mistakes.map(m => h('li', {}, m)))));
    const grid = h('div', { class: 'wb-grid' }), form = h('div', { class: 'stack' }), side = h('aside', { class: 'wb-side' }, h('h3', { style: 'margin-top:0' }, 'Automatic review'), review, prog);
    grid.append(form, side); body.append(grid);
    const refresh = () => { const dd = getData(), c = completeness(st, dd); review.replaceChildren(checkList(stageChecks(st.id, dd))); prog.textContent = c.total ? `${c.done} of ${c.total} required fields filled${c.missing.length ? '. Still to fill in: ' + c.missing.join('; ') : '.'}` : 'No required fields in this stage.'; };
    st.fields.forEach(f => form.append(field(st, f, refresh)));
    const prev = spec.stages[i - 1], next = spec.stages[i + 1];
    body.append(h('div', { class: 'nav' }, prev ? h('a', { class: 'sticker', style: 'text-decoration:none', href: `#/project/${prev.id}` }, '← ' + prev.title) : h('a', { class: 'sticker', style: 'text-decoration:none', href: '#/project' }, '← Overview'), next ? h('a', { class: 'btn-start', style: 'text-decoration:none', href: `#/project/${next.id}` }, next.title + ' →') : h('a', { class: 'btn-start', style: 'text-decoration:none', href: '#/project' }, 'Finish: overview →')));
    refresh();
  }

  function field(st, f, refresh) {
    const val = getData()?.[st.id]?.[f.id], wrap = h('div', { class: 'wb-field' }), id = `f-${st.id}-${f.id}`;
    const label = h('label', { for: f.type === 'checks' || f.type === 'table' ? null : id }, f.label, f.required ? h('span', { class: 'wb-req', title: 'Required' }, ' *') : '', '');
    wrap.append(label); if (f.hint) wrap.append(h('div', { class: 'muted wb-hint' }, f.hint));
    const upd = v => { setField(st.id, f.id, v); refresh(); };
    if (f.type === 'text') wrap.append(h('input', { id, type: 'text', value: val ?? '', oninput: e => upd(e.target.value) }));
    else if (f.type === 'textarea') wrap.append(h('textarea', { id, rows: 4, oninput: e => upd(e.target.value) }, val ?? ''));
    else if (f.type === 'number') wrap.append(h('input', { id, type: 'number', inputmode: 'decimal', step: f.step ?? 'any', min: f.min ?? null, max: f.max ?? null, value: val ?? '', oninput: e => upd(e.target.value === '' ? '' : +e.target.value) }));
    else if (f.type === 'select') wrap.append(h('select', { id, onchange: e => upd(e.target.value) }, h('option', { value: '' }, 'Choose…'), f.options.map(o => h('option', { value: o.id, selected: val === o.id ? '' : null }, o.label))));
    else if (f.type === 'checks') { const cur = new Set(val || []); wrap.append(h('div', { class: 'opts' }, f.options.map(o => h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: cur.has(o.id) || null, onchange: e => { e.target.checked ? cur.add(o.id) : cur.delete(o.id); upd([...cur]); } }), h('span', {}, o.label))))); }
    else if (f.type === 'table') wrap.append(tableField(st, f, refresh));
    return wrap;
  }

  function tableField(st, f, refresh) {
    let rows = getData()?.[st.id]?.[f.id]; if (!rows || !rows.length) rows = (f.defaultRows || [{}]).map(r => ({ ...r }));
    const box = h('div', { class: 'tblwrap' }), tbody = h('tbody');
    const commit = () => { setField(st.id, f.id, rows); refresh(); };
    const cellFor = (row, ri, c) => {
      if (c.computed) return h('td', { class: 'num', 'data-c': c.id }, String(computedValue(c, row) ?? '–'));
      const upd = v => { row[c.id] = v; commit(); f.columns.filter(x => x.computed).forEach(x => { const el = tbody.children[ri]?.querySelector(`[data-c="${x.id}"]`); if (el) el.textContent = String(computedValue(x, row) ?? '–'); }); };
      const inp = c.type === 'select'
        ? h('select', { 'aria-label': c.label, onchange: e => upd(e.target.value) }, h('option', { value: '' }, '–'), c.options.map(o => h('option', { value: o, selected: row[c.id] === o ? '' : null }, o)))
        : h('input', { 'aria-label': c.label, type: c.type === 'number' ? 'number' : 'text', inputmode: c.type === 'number' ? 'decimal' : null, step: 'any', value: row[c.id] ?? '', oninput: e => upd(c.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value) });
      return h('td', {}, inp);
    };
    const draw = () => {
      tbody.replaceChildren(...rows.map((row, ri) => h('tr', {}, ...f.columns.map(c => cellFor(row, ri, c)), h('td', {}, h('button', { class: 'sticker', type: 'button', 'aria-label': 'Remove this row', onclick: () => { rows.splice(ri, 1); commit(); draw(); } }, '✕')))));
    };
    box.append(h('table', { class: 'tbl wb-tbl' }, h('thead', {}, h('tr', {}, f.columns.map(c => h('th', {}, c.label)).concat([h('th', {}, '')]))), tbody));
    draw();
    return h('div', {}, box, h('button', { class: 'sticker', type: 'button', style: 'margin-top:8px', onclick: () => { rows.push({}); commit(); draw(); } }, '+ Add a row'));
  }

  // ---------------------------------------------------------------- supervisor view
  function reviewPage() {
    host.append(h('div', { class: 'modbar' }, h('a', { class: 'sticker back-main', href: '#/project' }, '← Project overview')));
    const box = h('section', { class: 'glass stack' }, h('p', { class: 'eyebrow' }, 'For supervisors'), h('h1', {}, 'Supervisor view'),
      h('p', {}, 'Open a student\'s project file (.json). You see the same automatic checks the student sees, so you can spend your time on the science. Your comments are not saved on this site: download them as a feedback file.'));
    box.append(practiceNotice('compact'));
    const out = h('div', { class: 'stack' }); host.append(box, out);
    const fileIn = h('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Student project file', onchange: async e => { const j = await importFile(e.target.files[0], true); if (j) render(j); } });
    box.append(fileIn, h('p', { class: 'muted' }, 'Nothing is uploaded: the file is read in your browser.'));
    function render(j) {
      const d = j.data, ov = overview(spec, d), comments = {};
      out.replaceChildren(h('div', { class: `fb ${ov.ready ? 'ok' : 'bad'}`, role: 'status' }, h('strong', {}, `${get(d, 'setup', 'title') || 'Untitled project'} · code ${j.code || '–'}`), h('div', {}, ov.ready ? 'All required fields filled, no serious issues.' : `${ov.open} required field(s) open · ${ov.blocks} serious issue(s) · ${ov.warns} warning(s)`)),
        ...spec.stages.map(s => { const r = ov.rows.find(x => x.id === s.id); const ta = h('textarea', { rows: 3, placeholder: `Your comment on “${s.title}”`, 'aria-label': `Comment on ${s.title}`, oninput: e => { comments[s.id] = e.target.value; } });
          return h('div', { class: 'card sticker-static stack' }, h('h3', { style: 'margin:0' }, s.title, ' ', h('span', { class: 'tag' }, r.used ? `${r.done}/${r.total} required` : 'not used')), r.used ? checkList(r.checks.filter(c => c.sev !== 'ok')) : '', r.used && r.missing.length ? h('p', { class: 'muted' }, 'Still to fill in: ' + r.missing.join('; ')) : '', ta); }),
        h('details', { class: 'fine' }, h('summary', {}, 'Report preview'), h('pre', { style: 'white-space:pre-wrap;background:var(--surface-100);padding:14px;border-radius:12px;font-family:inherit' }, report(spec, d, { code: j.code, date: '' }))),
        h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => download(`feedback-${j.code || 'student'}.md`, [`# Supervisor feedback: ${get(d, 'setup', 'title') || ''}`, `Student code: ${j.code || '-'}`, '', ...spec.stages.flatMap(s => comments[s.id] ? [`## ${s.title}`, comments[s.id], ''] : []), '---', 'Automatic review summary:', `${ov.open} required field(s) open, ${ov.blocks} serious issue(s), ${ov.warns} warning(s).`].join('\n'), 'text/markdown') }, 'Download my feedback (.md)'));
    }
  }
  const get = (d, s, f) => d?.[s]?.[f];

  show();
  return () => { alive = false; host.innerHTML = ''; };
}
