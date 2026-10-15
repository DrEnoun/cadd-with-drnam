// Disclaimer and disclosures shown on the site: a short notice, an AI-image badge and the full page.
import { h, fetchJson } from './ui.js';

export const SHORT = 'Educational use only. The modules teach concepts with real, mock and simulated data, as stated in each module. Nothing here is medical advice or a basis for real drug-design, clinical or regulatory decisions.';
export const AI_NOTE = 'The illustrations on this site are AI-generated and are used for educational purposes. They are artistic, not to scale and not scientific data.';

export const PRACTICE_NOTE = 'Practice exercise for this course only. Use the worked examples or practice numbers from your tutorial exercises. Do not enter real, confidential, unpublished or personal data: the workbook is not a research record or a laboratory notebook, and it stays in this module and in your browser.';
/** The practice-only warning for the project workbook. variant 'full' on the home card and the workbook start page. */
export function practiceNotice(variant = 'compact') {
  if (variant === 'full') return h('div', { class: 'notice notice--practice', role: 'note' }, h('strong', {}, 'For use within this module only. Not real data. '), 'This is a practice exercise. Use the worked examples or practice numbers from your tutorial exercises. Do not enter real, confidential, unpublished or personal research data. It is not a research record or a laboratory notebook, and it stays in this module and in your browser.');
  return h('div', { class: 'notice notice--practice notice--compact', role: 'note' }, h('strong', {}, 'Practice exercise, not real data. '), 'For use within this module only. Do not enter real, confidential or personal research data.');
}

/** Small label placed on top of an illustration. */
export const aiBadge = () => h('span', { class: 'ai-badge', 'data-no-abbr': '', title: AI_NOTE }, 'AI-generated illustration');

/** The visible notice. variant 'full' for the home page, 'compact' inside modules. */
export function notice(variant = 'compact') {
  const more = h('a', { href: '#/disclaimer' }, 'Read the full disclaimer');
  if (variant === 'full') return h('section', { class: 'notice notice--full', role: 'note', 'aria-label': 'Disclaimer' },
    h('h2', {}, 'Please read: educational use only'),
    h('ul', {}, h('li', {}, SHORT), h('li', {}, h('strong', {}, 'Illustrations are AI-generated '), 'for educational purposes. ', AI_NOTE.replace('The illustrations on this site are AI-generated and are used for educational purposes. ', '')),
      h('li', {}, 'The 3D molecular views are drawn by the site from real or simulated coordinates. The handbook (Appendix F) lists what is real, simulated or mock in each module.')), h('p', {}, more, '.'));
  return h('div', { class: 'notice notice--compact', role: 'note' }, h('strong', {}, 'Educational use only. '), 'Real, mock and simulated data are labelled in each module; nothing here is medical advice or for real drug-design decisions. Illustrations and the logo are AI-generated for educational purposes. ', more, '.');
}

/** The full page (#/disclaimer). */
export async function disclaimerPage(host) {
  document.title = 'Disclaimer and disclosures · CADD with Dr. NAM';
  let cfg = {}; try { cfg = await fetchJson('data/config.json'); } catch { /* optional */ }
  const sec = (t, ...kids) => h('section', { class: 'stack' }, h('h2', {}, t), ...kids);
  host.append(h('section', { class: 'glass stack' }, h('p', { class: 'eyebrow' }, 'Please read'), h('h1', {}, 'Disclaimer and disclosures'),
    sec('1. Purpose', h('p', {}, 'CADD with Dr. NAM is a set of interactive concept simulations for teaching computer-aided drug design. It is for education and for supervised student projects. It teaches ideas that apply whatever software is used later.')),
    sec('2. Not for real decisions, not medical advice', h('p', {}, 'Nothing on this site is medical, pharmaceutical or regulatory advice. Drugs such as celecoxib appear only as teaching examples. Do not use any result, score, curve, threshold or prediction here to choose a treatment, a dose or a compound for development. Real projects need validated software, experiments and expert supervision.')),
    sec('3. What is real and what is not', h('p', {}, 'Some data are real (for example the COX-2 structure 3LN1, the 45 drugs and their calculated properties, the homology-modelling structures). Some are mock or simulated (for example the docking poses and scores of Compounds A, B and C, the network data set and the molecular dynamics trajectories). Each module says which. The handbook, Appendix F, summarises it. Simplified models and rules of thumb are used and should be checked before they are relied on.'), h('p', {}, h('a', { href: '#/handbook/provenance' }, 'See Appendix F: what is real, simulated or mock'))),
    sec('4. Images are AI-generated', h('p', {}, h('strong', {}, 'The illustrations on this site are AI-generated and are used for educational purposes. '), 'This includes the home-page banner, the module pictures, the ADME overview picture and the "Chemistry with Dr. NAM" logo. They were created with AI image tools and supplied by the author. They are artistic, not to scale and not scientific data, and they may contain inaccuracies in molecular detail, labels or anatomy. Do not reuse them as scientific figures.'),
      h('p', {}, 'The 3D molecular views and charts inside the modules are not AI images: the site draws them itself from real or simulated coordinates and numbers.')),
    sec('5. How the software was made', h('p', {}, 'Parts of the software were developed with the help of an AI coding assistant (Claude, by Anthropic) under the author\'s direction. The author is responsible for the content. Teaching text, rules of thumb and the reading list should be checked by the user, as for any educational resource.')),
    sec('6. Third-party material', h('p', {}, 'Structures come from the Protein Data Bank. Chemistry calculations use RDKit, and the 3D views use three.js. The network pharmacology workflow follows the NAM-NPeasy protocol by Dr Nur \'Ainun Mokhtar. The university and sponsor logos belong to their owners. Names of software and databases are trademarks of their owners and are mentioned for identification only.')),
    sec('7. The project workbook is practice only', h('p', {}, PRACTICE_NOTE), h('p', {}, 'If you work on a real research project, keep its data and records in your institution\'s approved systems, and follow your supervisor\'s and your ethics committee\'s rules.')),
    sec('8. Privacy', h('p', {}, 'The site has no server. Your progress, answers and workbook are stored only in your own browser, and you decide whether to download and submit them. Data are used for research only if you give consent on the consent screen.')),
    sec('9. No warranty', h('p', {}, 'The site is provided as it is, without warranty of any kind. The author is not liable for any loss arising from its use. If you find an error, please tell the author', cfg.contact ? ` (${cfg.contact})` : '', '.')),
    h('p', { class: 'muted' }, `${cfg.lecturer || 'Dr. NAM, Universiti Teknologi MARA'}${cfg.version ? ' · version ' + cfg.version : ''}`)));
}
