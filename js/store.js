// All data stays in this browser (localStorage). Nothing is sent anywhere. Students export their own file.
const KEY = 'cadd:v1';
const blank = () => ({ theme: 'night', consent: null, code: null, events: [], steps: {}, tests: {}, notes: {} });
const load = () => { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return blank(); } };
let data = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage blocked: keep in memory */ } };

export const store = {
  get: k => data[k],
  set(k, v) { data[k] = v; save(); },
  /** Log one thing the student did. Only stored if they gave consent to research use; always kept locally for their own record. */
  log(module, step, item, value) { data.events.push({ t: new Date().toISOString(), module, step, item, value }); if (data.events.length > 5000) data.events.shift(); save(); },
  stepDone(module, step, info = {}) { (data.steps[module] ??= {})[step] = { done: true, ...info, at: new Date().toISOString() }; save(); },
  stepInfo: (module, step) => data.steps[module]?.[step],
  isDone: (module, step) => !!data.steps[module]?.[step]?.done,
  setTest(module, which, result) { (data.tests[module] ??= {})[which] = result; save(); },
  test: (module, which) => data.tests[module]?.[which],
  setNote(module, key, v) { (data.notes[module] ??= {})[key] = v; save(); },
  note: (module, key) => data.notes[module]?.[key],
  all: () => data,
  reset() { data = { ...blank(), theme: data.theme }; save(); },
  newCode() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 6; i++) c += a[Math.floor(Math.random() * a.length)]; data.code = c; save(); return c; },
};
