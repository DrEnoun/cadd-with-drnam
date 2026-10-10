// Choices a student makes carry over from step to step (kept in memory for this visit).
import { align } from './stats.js';
export const st = { tpl: null, open: 10, extend: .5, aln: null, key: '' };
export function alignment(data, id = st.tpl, open = st.open, extend = st.extend) {
  const T = data.S.target, X = data.S[id], key = `${id}|${open}|${extend}`;
  if (st.key !== key || !st.aln) { st.aln = align(T.seq, X.seq, open, extend); st.key = key; }
  return st.aln;
}
export const TPL_IDS = ['t1', 't2', 't3', 't4', 't5'];
export const nameOf = (data, id) => { const x = data.S[id]; return `${x.id.replace('.', '')} chain ${x.chain}`; };
