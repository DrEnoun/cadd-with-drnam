// Step 1 — The journey of a tablet through the body in 3D, then matching failures to A, D, M or E.
import { h, feedback } from '../../ui.js';
import { createViewer } from '../../viewer3d.js';
import { journeyScene, STAGE_CSS } from './scenes.js';

export function render(host, api) {
  const T = api.data.teaching;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Many drug candidates that look excellent in the test tube fail in the body. Most of those failures are ADME problems. If you can predict them early, on the computer, you avoid spending years on a compound that was never going to work as a medicine.'),
    h('p', { class: 'lead' }, 'Follow a tablet through the body. It is swallowed, dissolves and is absorbed (A), travels in the blood (D), is chemically changed by the liver (M) and is finally removed by the kidneys (E).'));
  const v = createViewer(host, { height: 440, dist: 40, yaw: 0, pitch: 0 });
  const panel = h('div', { class: 'card sticker-static stack' });
  const bar = h('div', { class: 'row' });
  let scene = null, cur = 'A';
  const draw = k => {
    cur = k; const S = T.stages.find(x => x.id === k);
    panel.replaceChildren(h('h3', { style: 'margin:0' }, h('span', { class: 'tag', style: `background:${STAGE_CSS[k]}` }, k), ' ', S.name, ': ', S.organ), h('p', { style: 'margin:0' }, S.text), h('p', { style: 'margin:0' }, h('strong', {}, 'How a drug can fail here: '), S.fail));
    bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
  };
  if (v) scene = journeyScene(v, { onStage: k => draw(k) });
  T.stages.forEach(S => bar.append(h('button', { class: 'sticker', type: 'button', 'aria-pressed': 'false', 'data-k': S.id, onclick: () => { scene?.setStage(S.id); draw(S.id); api.log('stage', S.id); } }, `${S.id}: ${S.name}`)));
  bar.append(h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: e => { if (scene?.playing) { scene.pause(); e.currentTarget.textContent = '▶ Play the journey'; } else { scene?.play(); e.currentTarget.textContent = '❚❚ Pause'; } } }, '❚❚ Pause'));
  host.append(h('div', { class: 'row', style: 'margin-top:8px' }, h('span', { class: 'muted' }, 'Jump to:')), bar, h('p', { class: 'hint' }, 'The tablet dissolves in the gut, the molecules travel in the red blood cells, the liver changes them and the kidneys remove them. Drag to turn the view.'), panel);
  draw('A');

  host.append(h('h3', { style: 'margin-top:22px' }, 'Which letter is the problem?'));
  const picks = {}, list = h('div', { class: 'stack' });
  T.match.failures.forEach(f => list.append(h('div', { class: 'card sticker-static', 'data-s': f.id }, h('p', {}, f.text),
    h('select', { 'aria-label': f.text, onchange: e => { picks[f.id] = e.target.value; } }, h('option', { value: '' }, 'Choose A, D, M or E…'), T.stages.map(S => h('option', { value: S.id }, `${S.id}: ${S.name}`))), h('div', { class: 'fbslot' }))));
  const out = h('span', { class: 'muted' });
  const check = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => {
    let right = 0;
    T.match.failures.forEach(f => {
      const slot = list.querySelector(`[data-s="${f.id}"] .fbslot`); slot.innerHTML = '';
      if (!picks[f.id]) { slot.append(feedback('bad', 'Choose an answer first.')); return; }
      const ok = picks[f.id] === f.answer; if (ok) right++; api.log(`match_${f.id}`, picks[f.id]);
      slot.append(feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not quite', ok ? f.why : `${f.why} (Answer: ${f.answer}.)`));
    });
    api.done({ matched: right, of: T.match.failures.length }); api.unlockNext(); out.textContent = `${right} of ${T.match.failures.length} matched.`;
  } }, 'Check my answers');
  host.append(list, h('div', { class: 'row' }, check, out), api.nav(true));
  return () => v?.dispose();
}
