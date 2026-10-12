// The handbook: glossary of terms and abbreviations, plus appendices (rules of thumb, units, formulae, file formats, tools, provenance, reading list).
import { h, fetchJson, download } from '../ui.js';
import { notice } from '../disclaimer.js';

const CATS = { basics: 'Basics', structure: 'Structures', docking: 'Docking', screening: 'Screening', adme: 'ADME', network: 'Network', homology: 'Homology', md: 'Dynamics', stats: 'Statistics', files: 'Files', tools: 'Software', site: 'About the site' };
const MODS = { screening: 'Virtual Screening', docking: 'Docking', adme: 'ADME', network: 'Network Pharmacology', md: 'Molecular Dynamics', homology: 'Homology Modelling', project: 'Project workbook' };
export const mdGlossary = es => es.map(e => `**${e.term}**${e.abbr.length ? ` (${e.abbr.join(', ')})` : ''}${e.full ? ` — ${e.full}` : ''}: ${e.def}${e.more ? ' ' + e.more : ''}`).join('\n\n');
export const csvGlossary = es => ['Term,Abbreviations,Full form,Definition,Category', ...es.map(e => [e.term, e.abbr.join(' / '), e.full, e.def + (e.more ? ' ' + e.more : ''), CATS[e.cat]].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))].join('\n');

export default function mount(host, ctx) {
  let G = null, B = null, alive = true;
  const [sub, id] = ctx.route;
  const nav = cur => h('nav', { class: 'hb-nav', 'aria-label': 'Handbook sections' },
    h('a', { href: '#/handbook/glossary', class: cur === 'glossary' ? 'is-current' : '' }, 'Glossary'),
    B.appendices.map(a => h('a', { href: `#/handbook/${a.id}`, class: cur === a.id ? 'is-current' : '' }, `${a.letter}. ${a.title}`)),
    h('a', { href: '#/handbook/all', class: cur === 'all' ? 'is-current' : '' }, 'Print the whole handbook'));
  const wrapUp = (cur, ...kids) => host.append(h('section', { class: 'glass stack gl-skip handbook' }, h('p', { class: 'eyebrow' }, 'Handbook'), ...kids, notice('compact')), nav(cur));

  // ---------------------------------------------------------------- glossary
  function glossaryBlock(printMode = false) {
    const list = h('div', { class: 'hb-list' }), count = h('p', { class: 'muted' }), state = { q: '', cat: '', mod: '' };
    const draw = () => {
      const q = state.q.trim().toLowerCase(), es = G.entries.filter(e => (!state.cat || e.cat === state.cat) && (!state.mod || e.modules.includes(state.mod) || e.modules.includes('all')) && (!q || [e.term, e.full, e.def, e.more, ...e.abbr].join(' ').toLowerCase().includes(q)));
      count.textContent = `${es.length} of ${G.entries.length} entries`;
      let last = ''; list.replaceChildren(...es.flatMap(e => { const L = e.term[0].toUpperCase(), head = L !== last && !state.q ? [h('h3', { class: 'hb-letter', id: `letter-${L}` }, L)] : []; last = L;
        return [...head, h('article', { class: 'hb-entry', id: e.id }, h('h4', {}, e.term, e.abbr.length && e.abbr.join('') !== e.term ? h('span', { class: 'hb-abbr' }, e.abbr.join(' · ')) : '', h('span', { class: 'tag' }, CATS[e.cat])), e.full ? h('p', { class: 'hb-full' }, e.full) : '', h('p', {}, e.def), e.more ? h('p', { class: 'hb-more' }, e.more) : '',
          e.modules.length ? h('p', { class: 'muted hb-mods' }, 'Used in: ', e.modules.map(m => m === 'all' ? 'all modules' : MODS[m]).filter(Boolean).join(', ')) : '')]; }));
    };
    if (printMode) { state.q = ''; draw(); return h('div', {}, list); }
    const qi = h('input', { type: 'search', 'aria-label': 'Search the glossary', placeholder: 'Search a term or abbreviation, for example RMSD', oninput: e => { state.q = e.target.value; draw(); } });
    const cs = h('select', { 'aria-label': 'Category', onchange: e => { state.cat = e.target.value; draw(); } }, h('option', { value: '' }, 'All categories'), Object.entries(CATS).map(([k, v]) => h('option', { value: k }, v)));
    const ms = h('select', { 'aria-label': 'Module', onchange: e => { state.mod = e.target.value; draw(); } }, h('option', { value: '' }, 'All modules'), Object.entries(MODS).map(([k, v]) => h('option', { value: k }, v)));
    const az = h('div', { class: 'row hb-az', 'aria-label': 'Jump to letter' }, [...new Set(G.entries.map(e => e.term[0].toUpperCase()))].sort().map(L => h('a', { href: `#letter-${L}`, onclick: ev => { ev.preventDefault(); document.getElementById(`letter-${L}`)?.scrollIntoView({ block: 'start' }); } }, L)));
    draw();
    return h('div', { class: 'stack' }, h('div', { class: 'hb-tools' }, qi, cs, ms), az, count, list,
      h('div', { class: 'row' }, h('button', { class: 'sticker', type: 'button', onclick: () => download('cadd-glossary.md', '# Glossary\n\n' + mdGlossary(G.entries), 'text/markdown') }, 'Download (.md)'), h('button', { class: 'sticker', type: 'button', onclick: () => download('cadd-glossary.csv', csvGlossary(G.entries), 'text/csv') }, 'Download (.csv)')));
  }

  // ---------------------------------------------------------------- appendices
  function appendixBlock(a) {
    const out = [h('h2', {}, `Appendix ${a.letter}. ${a.title}`)]; if (a.intro) out.push(h('p', {}, a.intro));
    if (a.type === 'table') out.push(h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, a.columns.map(c => h('th', {}, c)))), h('tbody', {}, a.rows.map(r => h('tr', {}, r.map(c => h('td', {}, c))))))));
    else if (a.type === 'defs') out.push(h('div', { class: 'stack' }, a.rows.map(([n, f, m, w]) => h('article', { class: 'card sticker-static' }, h('h4', { style: 'margin:0' }, n, h('span', { class: 'tag' }, w)), h('p', { class: 'hb-formula' }, f), m ? h('p', { style: 'margin:0' }, m) : ''))));
    else if (a.type === 'list') out.push(h('ol', {}, a.items.map(t => h('li', {}, t))));
    else if (a.type === 'refs') out.push(...a.items.map(([g, rs]) => h('div', {}, h('h3', {}, g), h('ul', {}, rs.map(r => h('li', {}, r))))));
    return h('div', { class: 'stack hb-appendix', id: a.id }, ...out);
  }

  async function show() {
    [G, B] = await Promise.all([fetchJson('data/glossary.json'), fetchJson('data/handbook.json')]); if (!alive) return;
    document.title = 'Handbook · CADD with Dr. NAM';
    if (sub === 'all') {
      return wrapUp('all', h('h1', {}, 'CADD with Dr. NAM: Handbook'), h('p', { class: 'lead' }, 'Glossary of terms and abbreviations, and appendices for the modules and the project workbook.'),
        h('div', { class: 'row hb-noprint' }, h('button', { class: 'btn-start btn-start--small', type: 'button', onclick: () => print() }, 'Print or save as PDF')),
        h('h2', {}, 'Glossary'), glossaryBlock(true), ...B.appendices.map(appendixBlock));
    }
    if (sub && sub !== 'glossary') { const a = B.appendices.find(x => x.id === sub); if (a) return wrapUp(a.id, appendixBlock(a)); }
    wrapUp('glossary', h('h1', {}, 'Glossary'), h('p', { class: 'lead' }, 'Terms and abbreviations used in the modules and the workbook. In the modules, the first use of an abbreviation on each page is underlined: click it for a short definition.'), glossaryBlock());
    if (id) setTimeout(() => { const el = document.getElementById(id); el?.scrollIntoView({ block: 'center' }); el?.classList.add('is-flash'); }, 120);
  }
  show();
  return () => { alive = false; host.innerHTML = ''; };
}
