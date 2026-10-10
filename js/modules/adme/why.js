// Step 1 — The journey of a tablet through the body in 3D, then matching failures to A, D, M or E.
import { h, feedback, art } from '../../ui.js';
import { createViewer, labelBar } from '../../viewer3d.js';
import { journeyScene, STAGE_CSS } from './scenes.js';

export function render(host, api) {
  const T = api.data.teaching;
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'Many drug candidates that look excellent in the test tube fail in the body. Most of those failures are ADME problems. If you can predict them early, on the computer, you avoid spending years on a compound that was never going to work as a medicine.'),
    h('p', { class: 'lead' }, 'Follow a tablet through the body. It is swallowed, dissolves and is absorbed (A), travels in the blood (D), is chemically changed by the liver (M) and is finally removed by the kidneys (E).'));
  const v = createViewer(host, { height: 600, dist: 50, yaw: 0, pitch: 0 });
  const panel = h('div', { class: 'card sticker-static stack' });
  const bar = h('div', { class: 'row' });
  let scene = null, cur = 'A';
  const draw = k => {
    cur = k; const S = T.stages.find(x => x.id === k);
    panel.replaceChildren(h('h3', { style: 'margin:0' }, h('span', { class: 'tag', style: `background:${STAGE_CSS[k]}` }, k), ' ', S.name, ': ', S.organ), h('p', { style: 'margin:0' }, S.text), h('p', { style: 'margin:0' }, h('strong', {}, 'How a drug can fail here: '), S.fail));
    bar.querySelectorAll('button[data-k]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    chips.forEach(c => c.classList.toggle('is-on', c.dataset.k === k));
  };
  const chips = [];
  if (v) {
    scene = journeyScene(v, { onStage: k => draw(k) });
    // the four panel titles of the overview picture, floating over the 3D view and clickable
    const POS = { A: 'left:10px;top:10px', D: 'right:10px;top:10px', M: 'left:10px;bottom:10px', E: 'right:10px;bottom:10px' };
    for (const S of T.stages) { const c = h('button', { type: 'button', class: 'stagechip', 'data-k': S.id, style: `${POS[S.id]};--c:${STAGE_CSS[S.id]}`, onclick: () => { scene.setStage(S.id); draw(S.id); api.log('stage', S.id); } }, h('b', {}, S.id), S.name.toUpperCase()); chips.push(c); v.wrap.append(c); }
  }
  T.stages.forEach(S => bar.append(h('button', { class: 'sticker', type: 'button', 'aria-pressed': 'false', 'data-k': S.id, onclick: () => { scene?.setStage(S.id); draw(S.id); api.log('stage', S.id); } }, `${S.id}: ${S.name}`)));
  const playBtn = h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => { if (scene?.playing) { scene.pause(); playBtn.textContent = '▶ Play'; } else { scene?.play(); playBtn.textContent = '❚❚ Pause'; } } }, '❚❚ Pause');
  const allBtn = h('button', { class: 'sticker', type: 'button', onclick: () => { scene?.overview(); scene?.play(); playBtn.textContent = '❚❚ Pause'; } }, 'Whole body');
  const followBtn = h('button', { class: 'sticker', type: 'button', onclick: () => { scene?.follow(true); scene?.play(); playBtn.textContent = '❚❚ Pause'; api.log('follow', 1); } }, 'Follow the tablet');
  bar.append(playBtn, allBtn, followBtn);
  host.append(h('div', { class: 'row', style: 'margin-top:8px' }, h('span', { class: 'muted' }, 'Jump to:')), bar);
  if (scene) host.append(labelBar(scene.labels, [{ label: 'Blue dots: the drug', color: '#4da3ff' }, { label: 'Orange dots: metabolites', color: '#ff9f43' }, { label: 'Green blobs: CYP enzymes', color: '#2fa860' }, { label: 'Red/blue/violet tubes: arteries, veins, portal vein', color: '#d2364b' }]));
  host.append(h('p', { class: 'hint' }, 'The tablet is swallowed, dissolves in the stomach and gut, and the drug passes into the blood. Blood from the gut goes to the liver first, then to the heart, brain and muscle, and finally the kidneys remove what is left. Drag to turn the body, pinch or scroll to zoom.'), panel);
  draw('A');
  host.append(h('details', { class: 'fine' }, h('summary', {}, 'Show the overview picture this 3D scene is based on'), h('figure', { style: 'margin:10px 0;max-width:640px' }, h('img', { class: 'art', src: 'assets/img/adme-overview.webp', alt: 'Four-panel overview of absorption, distribution, metabolism and excretion. Absorption: a tablet is swallowed and reaches the stomach and gut. Distribution: blood carries the drug to tissues and organs such as the brain and muscle. Metabolism: liver enzymes chemically change the drug into metabolites. Excretion: the kidneys remove waste into the urine.', loading: 'lazy', style: 'border-radius:16px;border:3px solid var(--glass-edge);height:auto' }), h('figcaption', { class: 'muted' }, 'Overview illustration (not to scale).'))));

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
