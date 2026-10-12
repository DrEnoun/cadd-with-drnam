// Underlines abbreviations in the module text (first use on each page) and shows a short definition on click or hover.
import { fetchJson } from '../ui.js';

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Builds the matcher from the glossary entries: a regex over every abbreviation (longest first) and a map abbreviation -> entry. */
export function buildMatcher(entries) {
  const map = new Map(); for (const e of entries) for (const a of e.abbr || []) if (!map.has(a)) map.set(a, e);
  const terms = [...map.keys()].sort((a, b) => b.length - a.length);
  return { map, re: terms.length ? new RegExp(`(?<![\\p{L}\\p{N}_-])(${terms.map(esc).join('|')})(?![\\p{L}\\p{N}_])`, 'gu') : null };
}
/** Matches in a string, first occurrence of each entry only (skipping entries in `seen`). Returns [{ start, end, text, entry }]. */
export function findFirst(text, matcher, seen) {
  if (!matcher.re) return []; const out = [], local = new Set(); matcher.re.lastIndex = 0; let m;
  while ((m = matcher.re.exec(text))) { const e = matcher.map.get(m[1]); if (!e || seen.has(e.id) || local.has(e.id)) continue; local.add(e.id); out.push({ start: m.index, end: m.index + m[1].length, text: m[1], entry: e }); }
  return out;
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'CANVAS', 'PRE', 'CODE', 'ABBR', 'A', 'BUTTON', 'H1', 'LABEL']);
let pop = null;
function showPop(el, entry) {
  if (!pop) { pop = document.createElement('div'); pop.className = 'gl-pop'; pop.setAttribute('role', 'dialog'); document.body.append(pop); }
  pop.replaceChildren(); const t = document.createElement('strong'); t.textContent = entry.term + (entry.full ? ` — ${entry.full}` : ''); const p = document.createElement('p'); p.textContent = entry.def;
  const a = document.createElement('a'); a.href = `#/handbook/glossary/${entry.id}`; a.textContent = 'Open in the glossary →'; a.addEventListener('click', hidePop); pop.append(t, p, a); pop.hidden = false;
  const r = el.getBoundingClientRect(), w = Math.min(340, innerWidth - 16); pop.style.width = w + 'px'; pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  const below = r.bottom + 8; pop.style.top = (below + pop.offsetHeight > innerHeight && r.top > pop.offsetHeight + 16 ? r.top - pop.offsetHeight - 8 : below) + 'px';
}
function hidePop() { if (pop) pop.hidden = true; }
if (typeof addEventListener === 'function') {
addEventListener('click', e => { const ab = e.target.closest?.('abbr.gl'); if (ab && ab._entry) { e.preventDefault(); showPop(ab, ab._entry); } else if (!e.target.closest?.('.gl-pop')) hidePop(); });
addEventListener('keydown', e => { if (e.key === 'Escape') hidePop(); if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('abbr.gl')) { e.preventDefault(); showPop(e.target, e.target._entry); } });
addEventListener('hashchange', hidePop);
}

/** Annotate one root once. seen: Set of entry ids already underlined on this page. */
export function annotate(root, matcher, seen) {
  const nodes = [], tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => {
    if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
    for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) if (SKIP.has(p.tagName) || p.classList?.contains('gl-skip') || p.hasAttribute?.('data-no-abbr')) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT; } });
  while (tw.nextNode()) nodes.push(tw.currentNode);
  for (const n of nodes) {
    const hits = findFirst(n.nodeValue, matcher, seen); if (!hits.length) continue;
    const frag = document.createDocumentFragment(); let at = 0;
    for (const h of hits) {
      seen.add(h.entry.id); frag.append(document.createTextNode(n.nodeValue.slice(at, h.start)));
      const ab = document.createElement('abbr'); ab.className = 'gl'; ab.tabIndex = 0; ab.textContent = h.text; ab._entry = h.entry; ab.title = `${h.entry.term}: ${h.entry.def.length > 160 ? h.entry.def.slice(0, 157) + '…' : h.entry.def}`; frag.append(ab); at = h.end;
    }
    frag.append(document.createTextNode(n.nodeValue.slice(at))); n.replaceWith(frag);
  }
}
/** Start annotating a page. Returns a stop function. */
export async function startAnnotate(root) {
  let stop = false, timer = 0, busy = false; const seen = new Set();
  let entries; try { entries = (await fetchJson('data/glossary.json')).entries; } catch { return () => {}; }
  const matcher = buildMatcher(entries);
  const run = () => { if (stop) return; busy = true; try { annotate(root, matcher, seen); } finally { setTimeout(() => { busy = false; }, 0); } };
  const mo = new MutationObserver(() => { if (busy || stop) return; clearTimeout(timer); timer = setTimeout(run, 350); });
  mo.observe(root, { childList: true, subtree: true });
  setTimeout(run, 400);
  return () => { stop = true; clearTimeout(timer); mo.disconnect(); hidePop(); };
}
