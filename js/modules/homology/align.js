// Step 3 — Align the target with the template; try gap penalties and see how alignment errors appear.
import { h, feedback } from '../../ui.js';
import { alignStats, alignAccuracy, columns } from './stats.js';
import { st, alignment, nameOf } from './state.js';
import { COL, css } from './scenes.js';

export function render(host, api) {
  const D = api.data, Tg = D.S.target;
  st.tpl ||= 't1';
  const X = () => D.S[st.tpl];
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'The alignment tells the software which residue of the target takes the place of which residue of the template. Every mistake here becomes a mistake in the 3D model, and no later step can repair it. The alignment is often the weakest link.'),
    h('p', {}, 'Match each target residue to a template residue. Two choices control the result: the penalty for opening a gap and the penalty for extending it. Try them.'));
  const o = h('input', { type: 'range', min: 1, max: 20, step: 1, value: st.open, 'aria-label': 'Gap opening penalty' }), e = h('input', { type: 'range', min: 0, max: 5, step: .5, value: st.extend, 'aria-label': 'Gap extension penalty' });
  const ov = h('b', {}, st.open), ev = h('b', {}, st.extend), stats = h('div', { class: 'row', style: 'gap:18px' }), view = h('div', { class: 'alnview', role: 'img', 'aria-label': 'Sequence alignment, colour coded' }), warn = h('div', { class: 'stack' }), who = h('p', { class: 'muted' });
  host.append(who, h('div', { class: 'grid2' }, h('label', {}, 'Gap opening penalty: ', ov, o), h('label', {}, 'Gap extension penalty: ', ev, e)), stats, h('div', { class: 'row legend', style: 'gap:12px' }, ...[['Identical', COL.same], ['Similar', COL.like], ['Different', COL.diff], ['Gap', COL.gap]].map(([t, c]) => h('span', {}, h('i', { style: `background:${css(c)};display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:4px` }), t))), h('div', { class: 'row muted' }, h('span', { style: `color:${css(COL.helix)}` }, '■ helix'), h('span', { style: `color:${css(COL.strand)}` }, '■ strand'), h('span', {}, '■ loop (strip above the sequence)')), view, warn);
  const draw = () => {
    st.open = +o.value; st.extend = +e.value; ov.textContent = st.open; ev.textContent = st.extend;
    const x = X(), a = alignment(D, st.tpl), s = alignStats(Tg.seq, x.seq, a.pairs), acc = alignAccuracy(a.pairs, x.refAlign), cols = columns(a.qa, a.ta);
    who.textContent = `Target GluA2 (top) against template ${nameOf(D, st.tpl)} (bottom).`;
    stats.replaceChildren(...[['Identity', `${Math.round(s.identity * 100)}%`], ['Coverage', `${Math.round(s.coverage * 100)}%`], ['Gap residues', s.gaps], ['Match with the structure-based alignment', `${Math.round(acc * 100)}%`]].map(([k, v]) => h('div', {}, h('div', { class: 'muted' }, k), h('b', { class: 'num', style: 'font-size:1.3em' }, v))));
    // rows of 60 columns: ss strip, target, bars, template
    let ti = 0; const tIdx = []; for (let c = 0; c < a.qa.length; c++) tIdx.push(a.qa[c] === '-' ? -1 : ti++);
    const W = 60, blocks = []; let inHelixGap = 0;
    const gapInSS = new Set();
    // gaps in either sequence next to a helix/strand of the target
    for (let c = 0; c < a.qa.length; c++) if (cols[c] === ' ') { const i = tIdx[c] >= 0 ? tIdx[c] : (tIdx.slice(0, c).filter(v => v >= 0).pop() ?? -1); if (i >= 0 && Tg.ss[i] > 0 && Tg.ss[Math.min(Tg.ss.length - 1, i + 1)] === Tg.ss[i] && Tg.ss[Math.max(0, i - 1)] === Tg.ss[i]) gapInSS.add(c); }
    for (let s0 = 0; s0 < a.qa.length; s0 += W) {
      const part = (str) => [...str.slice(s0, s0 + W)], cl = { '|': COL.same, ':': COL.like, '.': COL.diff, ' ': COL.gap };
      const strip = h('div', { class: 'ssstrip' }, ...part(a.qa).map((_, k) => { const i = tIdx[s0 + k]; const v = i >= 0 ? Tg.ss[i] : 0; return h('span', { style: `background:${v === 1 ? css(COL.helix) : v === 2 ? css(COL.strand) : 'transparent'}` }); }));
      const line = (str, cls) => h('div', { class: 'aln ' + cls }, ...part(str).map((ch, k) => h('span', { style: `background:${css(cl[cols[s0 + k]])}${gapInSS.has(s0 + k) ? ';outline:2px solid #000' : ''}`, title: `target ${tIdx[s0 + k] >= 0 ? Tg.resnum[tIdx[s0 + k]] : '–'}` }, ch)));
      blocks.push(h('div', { class: 'alnblock' }, h('div', { class: 'num muted' }, `${s0 + 1}`), strip, line(a.qa, 'q'), line(a.ta, 't')));
    }
    view.replaceChildren(...blocks);
    warn.replaceChildren(
      gapInSS.size ? feedback('bad', `Check these gaps: ${gapInSS.size} columns fall where the target has a helix or strand (outlined in black)`, 'Secondary-structure elements are rigid, so a gap inside one is a warning sign of a wrong alignment. Try a higher gap opening penalty and see whether the gap moves into a loop.') : feedback('ok', 'No gaps inside helices or strands', 'The gaps sit in loops, as they should.'),
      acc < .9 ? feedback('bad', `Only ${Math.round(acc * 100)}% of the residue pairs agree with the structure-based alignment`, 'The 3D structures of target and template show which residues truly correspond. The more your alignment differs from that, the more the model will be shifted.') : feedback('ok', 'Very close to the structure-based alignment', `${Math.round(acc * 100)}% of pairs agree.`));
    api.log('gap', `${st.open}/${st.extend}`); api.log('accuracy', +acc.toFixed(3)); api.log('gapsInSS', gapInSS.size);
    api.done({ open: st.open, extend: st.extend, accuracy: +acc.toFixed(3), gapsInSS: gapInSS.size, identity: +s.identity.toFixed(3) });
  };
  o.oninput = e.oninput = draw; draw();
  host.append(h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'sticker', type: 'button', onclick: () => { o.value = 10; e.value = .5; draw(); } }, 'Reset to the usual values (10 and 0.5)')),
    h('p', { class: 'hint' }, `${D.teaching.align.hint} Real programs also use several related sequences or a profile to improve alignments when identity is low. The "structure-based alignment" used for comparison here was made from the superposed 3D structures.`));
  api.unlockNext(); host.append(api.nav());
}
