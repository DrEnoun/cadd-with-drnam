// Pure logic of the project workbook (no DOM, testable in Node): computed columns, the automatic checks, completeness and the report.
// data shape: { [stageId]: { [fieldId]: value } }; checkboxes are arrays of ids; tables are arrays of row objects.

export const num = v => { if (v === '' || v == null) return null; const x = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : null; };
export const empty = v => v == null || v === '' || (Array.isArray(v) && (!v.length || v.every(r => r && typeof r === 'object' && !Array.isArray(r) ? Object.values(r).every(x => x === '' || x == null) : false)));
export const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const get = (d, s, f) => d?.[s]?.[f];
const rowsOf = (d, s, f) => (get(d, s, f) || []).filter(r => r && Object.values(r).some(x => x !== '' && x != null));

// ---------------------------------------------------------------- computed table columns
export const COMPUTED = {
  /** Ligand efficiency, kcal/mol per heavy atom: -score / heavy atoms */
  ligandEfficiency: r => { const s = num(r.score), n = num(r.ha); return s != null && n ? +(-s / n).toFixed(2) : null; },
  /** Number of Lipinski rule-of-five breaks (MW > 500, cLogP > 5, donors > 5, acceptors > 10); null if nothing is filled in */
  ro5: r => { const v = [num(r.mw), num(r.logp), num(r.hbd), num(r.hba)]; if (v.every(x => x == null)) return null; return (v[0] > 500) + (v[1] > 5) + (v[2] > 5) + (v[3] > 10); },
  /** Veber: TPSA <= 140 and rotatable bonds <= 10 */
  veber: r => { const t = num(r.tpsa), b = num(r.rotb); if (t == null && b == null) return null; return (t == null || t <= 140) && (b == null || b <= 10) ? 'ok' : 'fails'; },
};
export const computedValue = (col, row) => COMPUTED[col.computed]?.(row);

// ---------------------------------------------------------------- the automatic checks
const C = (sev, text, learn) => ({ sev, text, learn });
const L = (m, s) => ({ m, s });
const CHECKS = {
  setup: d => {
    const o = [], g = f => get(d, 'setup', f);
    if (!empty(g('question')) && words(g('question')) < 8) o.push(C('warn', 'The question is very short. Say what you want to know, about which compound and target, and what decision it will inform.'));
    if (empty(g('hypothesis'))) o.push(C('warn', 'Write what you expect to find before you start, so you can tell whether the result surprised you.'));
    const sel = g('stages') || [];
    if (!sel.length) o.push(C('warn', 'Tick the stages your project will use.'));
    else if (sel.length < 6 && empty(g('skipWhy'))) o.push(C('warn', 'You are skipping a stage. Say why: for example "the structure already exists, so no homology model".'));
    if (!o.length && !empty(g('question'))) o.push(C('ok', 'A clear question and expectation are written down.'));
    return o;
  },
  target: d => {
    const o = [], g = f => get(d, 'target', f), src = g('source'), res = num(g('resolution')), pl = num(g('plddt')), id = num(g('identity')), ra = num(g('rama')), prep = g('prep') || [];
    if (src === 'exp') {
      if (res != null && res > 3.5) o.push(C('warn', `A resolution of ${res} Å is poor: side chains and ligands are uncertain. Look for a better structure, or say how this limits the work.`, L('homology', 'template')));
      else if (res != null && res > 2.5) o.push(C('info', `${res} Å is acceptable, but fine details of the pocket may be uncertain.`));
      else if (res != null) o.push(C('ok', `Resolution ${res} Å is good.`));
      if (empty(g('ligandIn'))) o.push(C('info', 'There is no ligand in this structure. You will not have a redocking test, and you must justify where the pocket is.'));
    }
    if (src === 'af') {
      if (pl == null) o.push(C('warn', 'Report the prediction confidence (pLDDT) of the binding-site residues.'));
      else if (pl < 70) o.push(C('block', `pLDDT ${pl} in the binding site is low. Docking into a low-confidence region gives results that cannot be trusted.`));
      else if (pl < 90) o.push(C('info', `pLDDT ${pl} is acceptable. Check that the side chains in the pocket are sensible.`));
      else o.push(C('ok', `pLDDT ${pl} is very high.`));
    }
    if (src === 'hm') {
      if (id == null) o.push(C('warn', 'Report the sequence identity with the template.', L('homology', 'template')));
      else if (id < 30) o.push(C('block', `${id}% identity is in the twilight zone. The alignment, and so the model, is unreliable.`, L('homology', 'why')));
      else if (id < 40) o.push(C('warn', `${id}% identity: the core is probably right, but the pocket needs care.`, L('homology', 'why')));
      else o.push(C('ok', `${id}% identity is a good basis for a model.`));
      if (ra == null) o.push(C('warn', 'Report model validation, for example Ramachandran statistics.', L('homology', 'validate')));
      else if (ra < 90) o.push(C('warn', `Only ${ra}% in the favoured region: the backbone has problems.`, L('homology', 'validate')));
    }
    if (src && prep.length < 4) o.push(C('warn', `Preparation: ${prep.length} of 6 items ticked. Missing hydrogens, protonation or missing atoms change docking and MD results.`));
    else if (src && !prep.includes('hydrogens')) o.push(C('warn', 'Hydrogens and protonation states were not ticked. They decide which hydrogen bonds are possible.'));
    return o;
  },
  screening: d => {
    const o = [], g = f => get(d, 'screening', f), rows = (g('funnel') || []).map(r => ({ ...r, n: num(r.n) })), filled = rows.filter(r => r.n != null);
    if (filled.length) {
      let bad = null; for (let i = 1; i < filled.length; i++) if (filled[i].n > filled[i - 1].n) bad = filled[i];
      if (bad) o.push(C('block', `"${bad.step || 'A step'}" has more compounds than the step before it. A filter cannot add compounds.`, L('screening', 'filter')));
      const last = filled[filled.length - 1].n;
      if (last > 100) o.push(C('warn', `${last} hits is far too many to test. Add a ranking step or tighten the selection.`, L('screening', 'decide')));
      else if (last > 0 && filled.length >= 3) o.push(C('ok', `The funnel goes from ${filled[0].n} to ${last} compounds.`));
    }
    if (empty(g('reference'))) o.push(C('warn', 'No known active was used as a reference. Without one you cannot tell whether a good score means anything.', L('screening', 'method')));
    const auc = num(g('auc')), ef = num(g('ef'));
    if (g('validated') === 'no') o.push(C('warn', 'The method was not tested on known actives and decoys. Test it first: rank known actives among decoys and check that the actives come out on top.', L('screening', 'evaluate')));
    if (g('validated') === 'yes') {
      if (auc == null && ef == null) o.push(C('warn', 'You said you tested the method. Report the AUC or enrichment factor.', L('screening', 'evaluate')));
      if (auc != null && auc < 0.6) o.push(C('warn', `AUC ${auc} is close to random (0.5). The method does not separate actives from decoys here.`, L('screening', 'evaluate')));
      else if (auc != null && auc >= 0.7) o.push(C('ok', `AUC ${auc} shows the method can rank actives above decoys.`));
      if (ef != null && ef < 2) o.push(C('warn', `Enrichment factor ${ef} is low: the top of the list is hardly better than random.`, L('screening', 'evaluate')));
    }
    if (!empty(g('funnel')) && (g('diversity') || []).length < 2) o.push(C('warn', 'Check hit diversity, assay-interference (PAINS) alerts and look at the top compounds by eye before choosing.', L('screening', 'decide')));
    return o;
  },
  docking: d => {
    const o = [], g = f => get(d, 'docking', f), rm = num(g('redockRmsd')), rows = rowsOf(d, 'docking', 'results').filter(r => r.name), ev = g('evidence') || [];
    if (rm == null) o.push(C('block', 'No redocking test. Dock the co-crystallised ligand back into its own structure first: it shows whether the protocol can reproduce a known pose.', L('docking', 'validate')));
    else if (rm > 2) o.push(C('warn', `Redocking RMSD ${rm} Å is above 2 Å. The protocol did not reproduce the known pose; fix the box, preparation or settings before trusting results.`, L('docking', 'validate')));
    else o.push(C('ok', `Redocking RMSD ${rm} Å: the protocol reproduces the known pose.`));
    if (!(g('boxChecks') || []).length && (!empty(g('boxCenter')) || !empty(g('boxSize')))) o.push(C('warn', 'Tick the box checks: does it cover the whole pocket, with a margin but not far more?', L('docking', 'box')));
    if (empty(g('referenceName')) && rows.length) o.push(C('warn', 'Dock the known drug as a control, so that your compounds have something to be compared with.', L('docking', 'scoring')));
    if (rows.length === 1) o.push(C('info', 'Only one compound is in the results table. A comparison is more informative.'));
    rows.forEach(r => { if (r.inside === 'no') o.push(C('warn', `${r.name} sits outside the pocket. Its score cannot be believed.`, L('docking', 'analyse'))); else if (r.inside === 'partly') o.push(C('warn', `${r.name} sits only partly inside the pocket.`, L('docking', 'analyse'))); });
    const sc = rows.filter(r => num(r.score) != null && num(r.ha)); if (sc.length >= 2) {
      const best = sc.reduce((a, b) => num(a.score) <= num(b.score) ? a : b), bestLE = sc.reduce((a, b) => COMPUTED.ligandEfficiency(a) >= COMPUTED.ligandEfficiency(b) ? a : b);
      if (best.name !== bestLE.name) o.push(C(ev.includes('le') ? 'info' : 'warn', `${best.name} has the best score but ${bestLE.name} has the best ligand efficiency. A larger molecule can score well simply because it is larger. ${ev.includes('le') ? 'You did consider efficiency: good.' : 'Look at efficiency and the pose.'}`, L('docking', 'analyse')));
    }
    if (ev.length && (ev.length < 2 || (ev.length === 1 && ev[0] === 'score'))) o.push(C('block', 'You chose on the score alone. Add at least interactions, key residues or a pose check: the score is the least reliable part of docking.', L('docking', 'analyse')));
    else if (ev.length >= 3) o.push(C('ok', `${ev.length} kinds of evidence were used to choose.`));
    else if (!ev.length && rows.length) o.push(C('warn', 'Tick the evidence you used to choose a compound.'));
    return o;
  },
  adme: d => {
    const o = [], g = f => get(d, 'adme', f), rows = rowsOf(d, 'adme', 'table').filter(r => r.name), oral = g('route') === 'oral';
    let clean = rows.length > 0;
    rows.forEach(r => {
      const v = COMPUTED.ro5(r), ve = COMPUTED.veber(r);
      if (v >= 2) { o.push(C('warn', `${r.name} breaks ${v} Lipinski rules, so oral absorption is doubtful.`, L('adme', 'absorb'))); clean = false; }
      else if (v === 1 && oral) o.push(C('info', `${r.name} breaks one rule of five. That is allowed, but note it.`));
      if (ve === 'fails') { o.push(C('warn', `${r.name} fails the Veber limits (TPSA above 140 Å² or more than 10 rotatable bonds).`, L('adme', 'absorb'))); clean = false; }
      if (oral && r.gi === 'low') { o.push(C('block', `${r.name} has low predicted gut absorption but the route is oral. That is a deal-breaker unless you change the route or the compound.`, L('adme', 'absorb'))); clean = false; }
      if (num(r.pains) > 0) { o.push(C('warn', `${r.name} has ${r.pains} assay-interference alert(s) (PAINS).`, L('screening', 'filter'))); clean = false; }
    });
    if (rows.length && clean) o.push(C('ok', 'No obvious ADME red flags in the table. A tick is not a guarantee: confirm by measurement.'));
    if (rows.length && !(g('considered') || []).length) o.push(C('warn', 'Think about ionisation, metabolism, brain entry and clearance, not only the table.', L('adme', 'ph')));
    return o;
  },
  network: d => {
    const o = [], g = f => get(d, 'network', f), nc = num(g('nCompound')), nd = num(g('nDisease')), no = num(g('nOverlap')), sc = num(g('stringConf'));
    if (g('selection') === 'topn') o.push(C('warn', 'A "top N" cut-off is arbitrary: relevant genes that are less studied rank lower. Use a published score threshold.', L('network', 'targets')));
    if (g('selection') === 'none') o.push(C('warn', 'Without any score threshold the lists contain a lot of weak associations.', L('network', 'targets')));
    const tools = String(g('targetTools') || '').split(/[,;&+/]|\band\b/i).map(x => x.trim()).filter(Boolean);
    if (!empty(g('targetTools')) && tools.length < 2) o.push(C('warn', 'Use at least two target prediction tools with different methods and take the union.', L('network', 'targets')));
    if (no != null && nc != null && nd != null) {
      if (no > Math.min(nc, nd)) o.push(C('block', 'The overlap cannot be larger than either list. Check the numbers.'));
      else { const pct = nd ? no / nd * 100 : 0; if (pct < 2) o.push(C('warn', `Only ${pct.toFixed(1)}% of the disease genes overlap. The compound may not be related to the disease, or the lists are too strict.`, L('network', 'targets'))); else if (pct > 30) o.push(C('warn', `${pct.toFixed(0)}% overlap is very high. The lists may be too permissive to say anything.`, L('network', 'targets'))); else o.push(C('ok', `${no} candidate targets (${pct.toFixed(0)}% of the disease genes).`)); }
    }
    if (sc != null && sc < 0.4) o.push(C('warn', `A STRING confidence of ${sc} gives a "hairball" with many weak links. 0.7 is the usual choice.`, L('network', 'build')));
    else if (sc != null && sc >= 0.7) o.push(C('ok', `STRING confidence ${sc} is the usual high-confidence choice.`));
    if (g('hubMethod') === 'degree') o.push(C('info', 'Degree alone favours well-studied proteins. Add betweenness and closeness.', L('network', 'hubs')));
    if (g('background') === 'unsure') o.push(C('warn', 'State the background used for enrichment. It changes the p-values a lot.', L('network', 'enrich')));
    rowsOf(d, 'network', 'pathways').forEach(r => { const q = num(r.q); if (r.name && q == null) o.push(C('warn', `Give the corrected p-value (FDR q) for "${r.name}".`, L('network', 'enrich'))); else if (r.name && q >= 0.05) o.push(C('warn', `"${r.name}" has q = ${q}, which is not significant after correction.`, L('network', 'enrich'))); });
    return o;
  },
  md: d => {
    const o = [], g = f => get(d, 'md', f), dt = num(g('dt')), len = num(g('length')), rep = num(g('replicas')), disc = num(g('discard')), prep = g('prep') || [], dG = num(g('dG')), err = num(g('dGerr')), lr = num(g('ligRmsd')), hb = num(g('hbOcc'));
    if (dt != null && (dt > 4 || (dt > 2 && g('constraints') !== 'yes'))) o.push(C('block', `A ${dt} fs time step is too large without constraints on hydrogen bonds. The simulation will be unstable.`, L('md', 'forces')));
    else if (dt != null && dt <= 2) o.push(C('ok', `A ${dt} fs time step is standard.`));
    if (!prep.length && (dt != null || len != null)) o.push(C('block', 'Minimisation and equilibration (NVT, NPT) are not ticked. Starting production from a raw model usually fails or gives biased results.', L('md', 'workflow')));
    else if (prep.length && prep.length < 3) o.push(C('warn', 'One of minimisation, NVT and NPT is missing.', L('md', 'workflow')));
    if (len != null && len < 10) o.push(C('block', `${len} ns is far too short to say anything about stability.`, L('md', 'analyse')));
    else if (len != null && len < 50) o.push(C('warn', `${len} ns is short. Fine for a first look; do not claim stability from it.`, L('md', 'analyse')));
    if (rep === 1) o.push(C('warn', 'Only one replica. One run is one sample; repeat with different starting velocities.', L('md', 'decide')));
    else if (rep >= 3) o.push(C('ok', `${rep} replicas allow you to see whether the result is reproducible.`));
    if ((disc == null || disc === 0) && len != null) o.push(C('warn', 'State how much of the start you discarded as equilibration. Averages that include the settling part are biased.', L('md', 'analyse')));
    else if (disc != null && len != null && disc > len / 2) o.push(C('warn', 'You discarded more than half the run.', L('md', 'analyse')));
    if (g('plateau') === 'no') o.push(C('block', 'The protein RMSD did not plateau. The system has not settled, so averages and energies from it are not reliable.', L('md', 'analyse')));
    else if (g('plateau') === 'unsure') o.push(C('warn', 'If you are unsure, plot the RMSD and its drift in the second half of the run.', L('md', 'analyse')));
    if (g('left') === 'yes' && dG != null) o.push(C('block', 'The ligand left the pocket, so a binding energy from this run says nothing about the starting pose.', L('md', 'decide')));
    else if (g('left') === 'yes') o.push(C('info', 'The ligand left the pocket: this pose is not stable in your simulation.'));
    if (dG != null && err == null) o.push(C('warn', 'Report the error of the binding energy (from independent blocks or replicas). A single number without an error is not usable.', L('md', 'decide')));
    if (dG != null) o.push(C('info', 'MM-GBSA/MM-PBSA gives a rough ranking, not an accurate binding energy; entropy is usually missing.'));
    if (lr != null && lr > 3) o.push(C('warn', `A mean ligand RMSD of ${lr} Å means the ligand moved a lot in the pocket.`, L('md', 'analyse')));
    if (hb != null && hb < 30) o.push(C('warn', `The key hydrogen bond is present in only ${hb}% of frames.`, L('md', 'analyse')));
    return o;
  },
  conclude: d => {
    const o = [], g = f => get(d, 'conclude', f), claim = g('claim'), ns = g('nextSteps') || [];
    if (claim === 'proof' || claim === 'mech') o.push(C('block', 'Computer-based predictions cannot prove a compound works or show its mechanism. The honest statement is that you have a hypothesis to test.'));
    else if (claim === 'hyp') o.push(C('ok', 'The conclusion is stated as a hypothesis, which is what the evidence supports.'));
    if (!empty(g('limits'))) { const n = String(g('limits')).split(/\n|;|\.\s|(?:^|\s)\d[.)]\s/).map(x => x.trim()).filter(x => words(x) >= 2).length; if (n < 3) o.push(C('warn', 'List at least three limitations (for example the structure, the scoring or model, the data and the number of runs).')); }
    if (ns.length && !ns.some(x => x === 'assay' || x === 'mut')) o.push(C('warn', 'None of your next steps tests the prediction in the laboratory.'));
    if (!ns.length) o.push(C('warn', 'Tick the next steps.'));
    if (!empty(g('reflection')) && words(g('reflection')) < 12) o.push(C('warn', 'Write a little more in your reflection: what you would do differently is the most useful part.'));
    return o;
  },
};
export const stageChecks = (id, data) => (CHECKS[id] ? CHECKS[id](data) : []);

// ---------------------------------------------------------------- completeness and overview
/** Required fields that are still empty in a stage. */
export function completeness(stage, data) {
  const req = stage.fields.filter(f => f.required), miss = req.filter(f => empty(get(data, stage.id, f.id)));
  return { total: req.length, done: req.length - miss.length, pct: req.length ? Math.round((req.length - miss.length) / req.length * 100) : 100, missing: miss.map(f => f.label) };
}
/** Which stages the student plans to use (setup ticks); stages not planned are not required. Setup, conclusion are always used. */
export function usedStages(spec, data) {
  const sel = get(data, 'setup', 'stages'); const always = new Set(['setup', 'conclude']);
  return spec.stages.filter(s => always.has(s.id) || !sel?.length || sel.includes(s.id) || (s.id === 'target' && sel.some(x => ['docking', 'md'].includes(x)))).map(s => s.id);
}
export function overview(spec, data) {
  const used = new Set(usedStages(spec, data));
  const rows = spec.stages.map(s => { const comp = completeness(s, data), ch = stageChecks(s.id, data), count = k => ch.filter(c => c.sev === k).length; return { id: s.id, title: s.title, used: used.has(s.id), ...comp, block: count('block'), warn: count('warn'), ok: count('ok'), info: count('info'), checks: ch }; });
  const active = rows.filter(r => r.used), blocks = active.reduce((a, r) => a + r.block, 0), warns = active.reduce((a, r) => a + r.warn, 0), open = active.reduce((a, r) => a + (r.total - r.done), 0);
  return { rows, blocks, warns, open, ready: blocks === 0 && open === 0 };
}

// ---------------------------------------------------------------- report
const show = (f, v) => Array.isArray(v) && f.type === 'checks' ? v.map(id => f.options.find(o => o.id === id)?.label || id).join('; ') : f.type === 'select' ? (f.options.find(o => o.id === v)?.label ?? v) : v;
export function report(spec, data, meta = {}) {
  const ov = overview(spec, data), out = [];
  out.push(`# ${get(data, 'setup', 'title') || 'My CADD project'}`, '', `Participant code: ${meta.code || '-'} · Generated: ${meta.date || ''}`, '', '> Prepared with the CADD with Dr. NAM project workbook (PRACTICE EXERCISE for this course only: not real data, not a research record, and not for real drug-design, clinical or regulatory decisions). The "automatic review" notes are rule-based prompts, not a substitute for supervision.', '');
  spec.stages.forEach(s => {
    const r = ov.rows.find(x => x.id === s.id); if (!r.used) { out.push(`## ${s.title}`, '', '_Not used in this project._', ''); return; }
    out.push(`## ${s.title}`, '');
    s.fields.forEach(f => {
      const v = get(data, s.id, f.id);
      if (f.type === 'table') { const rows = rowsOf(data, s.id, f.id); if (!rows.length) return; out.push(`**${f.label}**`, '', `| ${f.columns.map(c => c.label).join(' | ')} |`, `| ${f.columns.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${f.columns.map(c => c.computed ? (computedValue(c, row) ?? '') : (row[c.id] ?? '')).join(' | ')} |`), ''); return; }
      if (empty(v)) return; out.push(`- **${f.label}:** ${String(show(f, v)).replace(/\n+/g, ' ')}${f.unit && f.type === 'number' ? ' ' + f.unit : ''}`);
    });
    out.push('');
    const issues = r.checks.filter(c => c.sev === 'block' || c.sev === 'warn');
    if (issues.length) out.push('**Automatic review: points to look at**', '', ...issues.map(c => `- ${c.sev === 'block' ? '[serious] ' : ''}${c.text}`), '');
    if (r.missing.length) out.push('**Still to fill in:** ' + r.missing.join('; '), '');
  });
  out.push('---', `Status: ${ov.ready ? 'all required fields are filled and no serious issues remain' : `${ov.blocks} serious issue(s), ${ov.warns} warning(s) and ${ov.open} required field(s) still open`}.`);
  return out.join('\n');
}
