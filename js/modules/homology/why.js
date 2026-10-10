// Step 1 — Why model? Identity vs expected error curve, a 3D look at related and unrelated proteins, and matching situations to approaches.
import { h, feedback } from '../../ui.js';
import { labelBar } from '../../viewer3d.js';
import { expectedRmsd } from './stats.js';
import { traceViewer, fitOnto, COL, css } from './scenes.js';

function curve(host, onPick) {
  const W = 620, H = 260, cv = h('canvas', { width: W, height: H, style: 'width:100%;max-width:640px;border-radius:12px;background:#fff;touch-action:none', role: 'img', 'aria-label': 'Graph: expected error of a homology model gets smaller as sequence identity rises.' });
  const read = h('div', { class: 'num', style: 'font-weight:700' }), sl = h('input', { type: 'range', min: 10, max: 100, value: 58, 'aria-label': 'Sequence identity (percent)', style: 'width:100%;max-width:640px' });
  const draw = () => {
    const c = cv.getContext('2d'), L = 46, B = 34, T = 14, R = 26, id = +sl.value / 100;
    c.clearRect(0, 0, W, H); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.font = '12px sans-serif'; c.fillStyle = '#334'; c.strokeStyle = '#ccd';
    const X = v => L + (v - .1) / .9 * (W - L - R), Y = e => H - B - e / 5 * (H - B - T);
    for (let e = 0; e <= 5; e++) { c.beginPath(); c.moveTo(L, Y(e)); c.lineTo(W - R, Y(e)); c.stroke(); c.fillText(e + ' Å', 8, Y(e) + 4); }
    for (let p = 10; p <= 100; p += 10) c.fillText(p + '%', X(p / 100) - 10, H - 14);
    c.fillStyle = 'rgba(255,107,94,.16)'; c.fillRect(X(.1), T, X(.3) - X(.1), H - B - T); c.fillStyle = '#c0392b'; c.fillText('twilight zone: risky', X(.1) + 4, T + 14);
    c.strokeStyle = '#2a6df4'; c.lineWidth = 3; c.beginPath(); for (let p = 10; p <= 100; p++) { const x = X(p / 100), y = Y(expectedRmsd(p / 100)); p === 10 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
    c.fillStyle = '#e8590c'; c.beginPath(); c.arc(X(id), Y(expectedRmsd(id)), 7, 0, 7); c.fill();
    c.fillStyle = '#334'; c.fillText('Sequence identity with the template →', W / 2 - 90, H - 1); c.save(); c.translate(12, 90); c.rotate(-Math.PI / 2); c.restore();
    read.textContent = `At ${Math.round(id * 100)}% identity the expected error of the core is about ${expectedRmsd(id).toFixed(1)} Å.`; onPick?.(Math.round(id * 100));
  };
  sl.oninput = draw; host.append(cv, sl, read); draw();
}

export function render(host, api) {
  const D = api.data, T = D.teaching, S = D.S;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Docking, design and many other tasks need a 3D structure. Many proteins have none, because making a crystal or a cryo-EM map is slow and not always possible. Evolution gives us a shortcut: related proteins keep nearly the same fold. If a relative has a structure, we can build a model from it.'),
    h('p', { class: 'lead' }, `Your target in this module is the ${T.target.name}. ${T.target.about}`));

  host.append(h('h3', {}, 'The more similar the sequence, the better the model'));
  host.append(h('p', {}, 'The curve (Chothia and Lesk, 1986) shows the typical error of the conserved core. Slide to see what each identity means.'));
  curve(host, p => api.log('slider', p));
  host.append(h('p', { class: 'hint' }, 'Rule of thumb: above about 40% identity the model is usually good, 30 to 40% needs care, and below 30% (the twilight zone) the alignment itself becomes unreliable.'));

  host.append(h('h3', { style: 'margin-top:20px' }, 'Related proteins fold the same way'));
  host.append(h('p', {}, 'Below are real backbones. Blue is GluA2 (our target). Green is GluA3, a relative with about 59% identical residues. Purple is adenylate kinase, which is unrelated. Each was fitted on top of GluA2 as well as possible.'));
  const v = traceViewer(host, { height: 420, dist: 95 });
  if (v) {
    const T0 = S.target, rel = S.t1, un = S.t4;
    const relFit = fitOnto(T0.ca, rel.ca, rel.refAlign), unFit = fitOnto(T0.ca, un.ca, un.refAlign);
    const show = { target: true, rel: true, un: false }, draw = () => v.set([show.target && { ca: T0.ca, color: COL.target, radius: .6 }, show.rel && { ca: relFit, color: COL.same, radius: .5 }, show.un && { ca: unFit, color: COL.other, radius: .5 }].filter(Boolean));
    draw();
    const btn = (k, label, color) => h('button', { type: 'button', class: 'sticker', 'aria-pressed': String(show[k]), onclick: e => { show[k] = !show[k]; e.currentTarget.setAttribute('aria-pressed', String(show[k])); draw(); api.log('toggle', k); } }, label);
    host.append(h('div', { class: 'row', style: 'margin-top:8px' }, btn('target', 'GluA2 (target)'), btn('rel', 'GluA3 (59% identical)'), btn('un', 'Adenylate kinase (unrelated)')), labelBar(null, [{ label: 'Blue: GluA2', color: css(COL.target) }, { label: 'Green: GluA3', color: css(COL.same) }, { label: 'Purple: unrelated', color: css(COL.other) }]));
    host.append(h('p', { class: 'hint' }, `GluA3 lies almost on top of GluA2 (typical difference about ${S.t1.rmsdTruth.toFixed(1)} Å). The unrelated protein does not match at all (about ${S.t4.rmsdTruth.toFixed(0)} Å).`));
  }

  host.append(h('h3', { style: 'margin-top:20px' }, 'Which approach fits which situation?'));
  const picks = {}, list = h('div', { class: 'stack' });
  T.why.scenarios.forEach(s => list.append(h('div', { class: 'card sticker-static', 'data-s': s.id }, h('p', {}, s.text),
    h('select', { 'aria-label': s.text, onchange: e => { picks[s.id] = e.target.value; } }, h('option', { value: '' }, 'Choose an approach…'), T.why.approaches.map(a => h('option', { value: a.id }, a.text))), h('div', { class: 'fbslot' }))));
  const out = h('span', { class: 'muted' });
  const check = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
    let right = 0;
    T.why.scenarios.forEach(s => {
      const slot = list.querySelector(`[data-s="${s.id}"] .fbslot`); slot.innerHTML = '';
      if (!picks[s.id]) { slot.append(feedback('bad', 'Choose an answer first.')); return; }
      const ok = picks[s.id] === s.answer; if (ok) right++; api.log(`match_${s.id}`, picks[s.id]);
      slot.append(feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', s.why));
    });
    api.done({ matched: right, of: T.why.scenarios.length }); api.unlockNext(); out.textContent = `${right} of ${T.why.scenarios.length} matched.`;
  } }, 'Check my answers');
  host.append(list, h('div', { class: 'row' }, check, out), api.nav(true));
  return () => v?.dispose();
}
