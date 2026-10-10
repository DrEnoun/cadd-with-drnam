// Small "check your understanding" questions with instant feedback. Returns {el, allAnswered()}.
import { h, feedback } from '../../ui.js';
export function quizlet(api, items, { onAll } = {}) {
  const state = {}; const box = h('div', { class: 'stack' });
  items.forEach((it, qi) => {
    const fb = h('div', {}); const opts = h('div', { class: 'opts' });
    it.options.forEach((text, oi) => {
      const lab = h('label', { class: 'opt' }, h('input', { type: 'radio', name: `${api.step}-${it.id || qi}`, onchange: () => pick(oi, lab) }), h('span', {}, text));
      opts.append(lab);
    });
    function pick(oi, lab) {
      const right = oi === it.answer;
      state[qi] = right; api.log(`check_${it.id || qi}`, right ? 'right' : 'wrong');
      [...opts.children].forEach(l => l.classList.remove('is-right', 'is-wrong'));
      lab.classList.add(right ? 'is-right' : 'is-wrong');
      fb.innerHTML = ''; fb.append(feedback(right ? 'ok' : 'bad', right ? 'Correct' : 'Try again', right ? it.why : (it.hint || 'Think about it once more and pick another answer.')));
      if (Object.values(state).length === items.length && Object.values(state).every(Boolean)) onAll?.();
    }
    box.append(h('div', { class: 'q' }, h('p', { class: 'qt' }, it.q), opts, fb));
  });
  return box;
}
