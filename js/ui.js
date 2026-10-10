// Tiny DOM helpers shared by every page.
export function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}
export const svg = (tag, attrs, ...kids) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
  for (const c of kids.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
};
export function toast(text, ms = 2800) {
  const box = document.getElementById('toasts');
  const t = h('div', { class: 'toast' }, text);
  box.append(t); setTimeout(() => t.remove(), ms);
}
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const fetchJson = (() => { const c = {}; return p => (c[p] ??= fetch(p).then(r => { if (!r.ok) throw new Error(p); return r.json(); })); })();
export function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Feedback box: kind 'ok' | 'bad' */
export const feedback = (kind, title, body) => h('div', { class: `fb ${kind}`, role: 'status' }, h('strong', {}, title), body ? h('div', {}, body) : null);

/** A responsive picture from assets/img (name.webp 1600 px wide, name-800.webp 800 px). Decorative when alt is empty. */
export function art(name, alt = '', { eager = false, sizes = '(max-width: 700px) 100vw, 50vw', cls = '', small = 800, full = 1600, ratio = 900 / 1600 } = {}) {
  return h('img', { class: `art ${cls}`.trim(), src: `assets/img/${name}.webp`, srcset: `assets/img/${name}-${small}.webp ${small}w, assets/img/${name}.webp ${full}w`, sizes, alt, width: full, height: Math.round(full * ratio),
    loading: eager ? 'eager' : 'lazy', decoding: 'async', fetchpriority: eager ? 'high' : null, 'aria-hidden': alt ? null : 'true' });
}
