// Checks the teaching data and the small pieces of maths. Run: npm test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { susScore } from '../js/eval.js';
import { poseRmsd, covers, scorePose, makeEnv, place, makePose } from '../js/modules/docking/geom.js';
import { kdFromDG, fmtKd } from '../js/modules/docking/scoring.js';
import { analyseLigands, le } from '../js/modules/docking/compounds.js';
const J = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));

// quiz
const quiz = J('data/docking/quiz.json').questions;
assert.equal(quiz.length, 10);
quiz.forEach(q => { assert.ok(q.options.length >= 3 && q.answer >= 0 && q.answer < q.options.length, q.id); assert.ok(q.why, q.id + ' needs an explanation'); });
assert.equal(new Set(quiz.map(q => q.id)).size, quiz.length);

// SUS scoring: all 5 on odd + all 1 on even = 100; all 3 = 50
assert.equal(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
assert.equal(susScore(Array(10).fill(3)), 50);
assert.equal(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
assert.equal(susScore([1, 2]), null);

// mock docking data
const m = J('data/docking/mock.json');
m.prepare.forEach(p => assert.ok(['keep', 'remove', 'fix'].includes(p.answer), p.id));
m.why.scenarios.forEach(s => assert.ok(m.why.purposes.some(p => p.id === s.answer), s.id));
const structure = J('data/docking/cox2.json');
const data = { structure, ...m };
const base = structure.ligand.atoms.map(a => [a[1], a[2], a[3]]);
assert.equal(structure.ligand.atoms.length, 26, 'celecoxib has 26 heavy atoms');
assert.ok(structure.ca.length > 500 && structure.pocket.length > 15);
const r = st => st.poses.map(p => poseRmsd(base, p));
const [a, b, c] = m.validate.setups.map(r);
assert.ok(a[0] <= 2, 'Setup A top pose should succeed');
assert.ok(b.every(x => x > 2), 'Setup B has no good pose');
assert.ok(c[0] > 2 && c[2] <= 2, 'Setup C ranks a wrong pose first but has a good rank-3 pose');
assert.ok(poseRmsd(base, { rot: [0, 0, 1, 0], t: [0, 0, 0] }) < 1e-9);

// search box
assert.ok(covers([0, 0, 0], 24, m.box.pocketRadius));
assert.ok(!covers([0, 0, 0], 16, m.box.pocketRadius));
assert.ok(!covers([-14, 9, 6], 24, m.box.pocketRadius));

// toy score: the crystal pose is best, has all key hydrogen bonds and no clashes; a displaced pose is worse
const env = makeEnv(structure, m.ligandGroups.grease);
assert.deepEqual(env.hbondPairs.map(p => p.res), ['HIS90', 'GLN192', 'ARG513', 'LEU352']);
const atomsAt = pose => place(base, pose).map((p, i) => ({ el: structure.ligand.atoms[i][0], p }));
const best = scorePose(atomsAt(makePose()), env);
assert.ok(best.total < -7 && best.clash === 0, 'crystal pose scores about -8.7');
assert.ok(best.bonds.every(x => x.e < -0.6), 'all hydrogen bonds form in the crystal pose');
assert.ok(scorePose(atomsAt(makePose([0, 0, 1], 90, [0, 0, 6])), env).total > best.total + 3, 'a displaced pose should score worse');

// compounds: real contacts. B is like celecoxib, A has no key hydrogen bonds, C is small and efficient
const L = Object.fromEntries(analyseLigands(data).map(l => [l.id, l]));
const keyHit = l => l.hbonds.filter(r => m.target.keyResidues.includes(r)).length;
assert.equal(keyHit(L.ref), 3); assert.equal(keyHit(L.B), 3); assert.equal(keyHit(L.A), 0);
assert.ok(L.A.score < L.B.score && L.B.score < L.ref.score, 'A scores best, then B, then celecoxib (mock)');
assert.ok(le(L.A) < le(L.ref) && le(L.A) < le(L.B) && le(L.C) > le(L.B), 'A has the worst efficiency, C the best');

// Kd: -8 kcal/mol is about 1.4 µM, and 1.36 kcal/mol is a 10-fold change
assert.ok(Math.abs(kdFromDG(-8) - 1.4e-6) < 0.1e-6);
assert.ok(Math.abs(kdFromDG(-9.364) / kdFromDG(-8) - 0.1) < 0.005);
assert.equal(fmtKd(1.4e-6), '1.4 µM');


// ---- Module 2: virtual screening
import * as S from '../js/modules/screening/stats.js';
const lib = J('data/screening/library.json'), cs = lib.compounds, teach = J('data/screening/teaching.json'), sq = J('data/screening/quiz.json').questions;
assert.equal(cs.length, 45); assert.equal(cs.filter(c => c.active).length, 18);
assert.equal(lib.sim.length, 45); assert.equal(lib.sim[0][0], 1);
for (const c of cs) { assert.ok(c.atoms.length === c.heavy && c.bonds.length >= c.heavy - 1, c.name + ' 3D structure'); assert.ok(c.mw > 50 && c.tpsa >= 0); }
const byName = n => cs.find(c => c.name === n);
assert.ok(Math.abs(byName('Celecoxib').mw - 381.4) < 0.2, 'celecoxib MW'); assert.equal(byName('Celecoxib').ro5, 0); assert.ok(byName('Atorvastatin').ro5 >= 2); assert.equal(byName('Benzylidene rhodanine').pains, 1);
assert.ok(byName('Celecoxib').shape > 0.7, 'celecoxib overlays itself well'); assert.equal(byName('Celecoxib').tanimoto, 1);
// filters, ranking, ROC, enrichment
const fc = S.filterCounts(cs, S.DEFAULT_LIMITS); assert.equal(fc.activesLost.length, 0, 'usual filters keep every active'); assert.ok(fc.kept < fc.total);
assert.ok(S.filterCounts(cs, { mw: 350, logp: 3.5, hbd: 3, hba: 7, rotb: 7, tpsa: 100 }).activesLost.length >= 5, 'a strict filter loses real actives');
assert.equal(S.filterCounts(cs, { mw: null, logp: null }).kept, 45);
const perfect = c => c.active ? 1 : 0, worst = c => c.active ? 0 : 1;
assert.ok(Math.abs(S.roc(cs, perfect).auc - 1) < 1e-9); assert.ok(S.roc(cs, worst).auc < 1e-9); const a0 = S.roc(cs, c => ((c.id.charCodeAt(2) * 7) % 5)).auc; assert.ok(a0 > 0.25 && a0 < 0.75, 'an arbitrary score is near random');
assert.ok(S.roc(cs, c => -c.dock).auc > 0.7, 'the docking-style score beats random'); assert.ok(S.roc(cs, c => c.shape).auc > 0.55);
const ef = S.enrichment(cs, perfect, 0.2); assert.equal(ef.hits, ef.n); assert.ok(Math.abs(ef.ef - 45 / 18) < 1e-9, 'a perfect top 20% has EF = 1 / base rate');
assert.equal(S.enrichment(cs, c => -c.dock, 1).ef, 1);
const cons = S.consensusScore(cs, [c => c.shape, c => -c.dock]); assert.equal(S.rankBy(cs, cons).length, 45);
// teaching text
teach.prepare.forEach(p => assert.ok(['keep', 'remove', 'fix'].includes(p.answer), p.id)); teach.why.scenarios.forEach(x => assert.ok(teach.why.methods.some(m => m.id === x.answer), x.id));
assert.equal(sq.length, 10); sq.forEach(q => { assert.ok(q.options.length >= 3 && q.answer >= 0 && q.answer < q.options.length && q.why, q.id); });
console.log('Docking data and maths OK');
console.log('Virtual screening data and maths OK');

// ---- Module 3: ADME
import * as A from '../js/modules/adme/stats.js';
const adme = J('data/adme/drugs.json'), aT = J('data/adme/teaching.json'), aq = J('data/adme/quiz.json').questions, ad = adme.drugs, nm = n => ad.find(d => d.name === n);
assert.equal(ad.length, 45); assert.equal(aq.length, 10); aq.forEach(q => assert.ok(q.answer >= 0 && q.answer < q.options.length && q.why, q.id));
// ESOL: caffeine is very soluble (experimental logS about -0.9); celecoxib is poorly soluble; the estimate follows lipophilicity
assert.ok(Math.abs(nm('Caffeine').esol - (-0.88)) < 0.4, 'caffeine ESOL near experiment'); assert.ok(nm('Celecoxib').esol < -4 && nm('Glucose').esol > 0);
assert.equal(A.solClass(-1), 'very soluble'); assert.equal(A.solClass(-3), 'soluble'); assert.equal(A.solClass(-5), 'moderately soluble'); assert.equal(A.solClass(-7), 'poorly soluble');
assert.equal(A.dissolves(nm('Caffeine'), 200), true); assert.equal(A.dissolves(nm('Atorvastatin'), 200), false);
// egg: small greasy drugs in the yolk, polar ones in the white, tamoxifen (too greasy) and glucose (too polar) outside
assert.equal(A.eggClass(nm('Diazepam')), 'yolk'); assert.equal(A.eggClass(nm('Fluoxetine')), 'yolk'); assert.equal(A.eggClass(nm('Atenolol')), 'white'); assert.equal(A.eggClass(nm('Furosemide')), 'white'); assert.equal(A.eggClass(nm('Glucose')), 'out'); assert.equal(A.eggClass(nm('Tamoxifen')), 'out');
// Henderson-Hasselbalch
assert.ok(Math.abs(A.fractionNeutral('acid', 4.4, 4.4) - 0.5) < 1e-9 && Math.abs(A.fractionNeutral('base', 9.5, 9.5) - 0.5) < 1e-9);
assert.ok(A.fractionNeutral('acid', 4.4, 1.5) > 0.99 && A.fractionNeutral('acid', 4.4, 7.4) < 0.002 && A.fractionNeutral('base', 9.5, 6.8) < 0.01 && A.fractionNeutral('neutral', 0, 7) === 1);
assert.ok(Math.abs(A.trapRatio('acid', 4.4, 1.5, 7.4) - (1 + 10 ** 3) / (1 + 10 ** -2.9)) < 1e-6); assert.ok(A.trapRatio('base', 9.5, 6.8, 7.4) < 1);
// pharmacokinetics: AUC = F D / CL, Tmax formula, half-life falls the curve to half, accumulation, superposition
const pk = { F: 0.9, D: 400, V: 9, ka: 2, ke: A.rateFromHalfLife(2) }, { tmax, cmax } = A.tmaxCmax(pk);
assert.ok(Math.abs(A.clearance(9, 2) - 0.693147 * 9 / 2) < 1e-4); assert.ok(Math.abs(A.auc(pk) - pk.F * pk.D / A.clearance(9, 2)) < 1e-6);
assert.ok(Math.abs(A.conc1(tmax, pk) - cmax) < 1e-9 && A.conc1(tmax + 0.01, pk) < cmax && A.conc1(tmax - 0.01, pk) < cmax && A.conc1(0, pk) === 0);
assert.ok(cmax > 20 && cmax < 40, 'ibuprofen 400 mg peaks at about 25-35 mg/L');
let t = 30; assert.ok(Math.abs(A.conc1(t + 2, { ...pk, ka: 50 }) / A.conc1(t, { ...pk, ka: 50 }) - 0.5) < 0.02, 'level halves each half-life');
assert.ok(Math.abs(A.accumulation(A.rateFromHalfLife(4), 4) - 2) < 1e-9, 'dosing every half-life doubles the level at steady state');
let area = 0; for (let x = 0; x < 200; x += 0.01) area += A.conc1(x, pk) * 0.01; assert.ok(Math.abs(area - A.auc(pk)) / A.auc(pk) < 0.01, 'numeric AUC matches F D / CL');
const mean = tau => { let sum = 0, n = 0; for (let x = 60; x < 84; x += 0.1) { sum += A.concMulti(x, pk, tau, 12); n++; } return sum / n; };
assert.ok(mean(8) > 2 * mean(24), 'dosing more often gives a higher average level'); assert.ok(Math.abs(mean(8) - A.avgSteady(pk, 8)) / A.avgSteady(pk, 8) < 0.03, 'average level at steady state = F D / (CL tau)');
aT.pk.presets.forEach(p => { const q = { F: p.F, D: p.dose, V: p.V, ka: p.ka, ke: A.rateFromHalfLife(p.tHalf) }; assert.ok(A.tmaxCmax(q).cmax > 0 && A.tmaxCmax(q).tmax < 8, p.name); });
// soft spots: celecoxib has an aromatic methyl, aspirin an ester, caffeine N-methyls, paracetamol a phenol
assert.ok(A.spotTypes(nm('Celecoxib')).includes('arCH3') && A.spotTypes(nm('Aspirin')).includes('ester') && A.spotTypes(nm('Caffeine')).includes('NCH3') && A.spotTypes(nm('Paracetamol')).includes('phenol') && A.spotTypes(nm('Naproxen')).includes('OCH3'));
for (const d of ad) d.spots.forEach(s => assert.ok(s.atom >= 0 && s.atom < d.atoms.length && aT.metab.classes[s.type], d.name));
Object.keys(aT.metab.routes).forEach(n => assert.ok(nm(n), n));
aT.decide.candidates.forEach(n => assert.ok(nm(n), n)); aT.ion.drugs.forEach(d => assert.ok(nm(d.name), d.name));
assert.ok(A.reportCard(nm('Atorvastatin')).passed < A.reportCard(nm('Celecoxib')).passed);
console.log('ADME data and maths OK');

// ---------- Module 4: homology modelling
import * as H from '../js/modules/homology/stats.js';
const hs = J('data/homology/structures.json'), hT = J('data/homology/teaching.json'), hq = J('data/homology/quiz.json').questions, HS = hs.structures, tg = HS.target;
for (const k of Object.keys(HS)) { const x = HS[k]; assert.ok(x.seq.length === x.ca.length && x.ss.length === x.seq.length && x.burial.length === x.seq.length, k); }
assert.ok(H.score('A', 'A') === 4 && H.score('W', 'W') === 11 && H.score('A', 'R') === -1);
const sa = H.align('HEAGAWGHEE', 'PAWHEAE'); assert.ok(sa.qa.length === sa.ta.length && sa.qa.replace(/-/g, '') === 'HEAGAWGHEE' && sa.ta.replace(/-/g, '') === 'PAWHEAE', 'alignment keeps both sequences');
const sf = H.align('ACDEFGHIK', 'ACDEFGHIK'); assert.ok(sf.pairs.length === 9 && sf.qa === sf.ta);
const a1 = H.align(tg.seq, HS.t1.seq), st1 = H.alignStats(tg.seq, HS.t1.seq, a1.pairs);
assert.ok(st1.identity > .55 && st1.identity < .62 && st1.coverage > .95 && H.alignAccuracy(a1.pairs, HS.t1.refAlign) > .9, 'GluA2/GluA3 about 59% identical');
assert.ok(H.alignStats(tg.seq, HS.t4.seq, H.align(tg.seq, HS.t4.seq).pairs).identity < .25, 'unrelated protein has low identity');
// superposition: rotate and shift points, then recover them
const P = [[0, 0, 0], [3, 0, 0], [0, 4, 1], [1, 1, 5], [2, -3, 2]], rot = p => [-p[1] + 5, p[0] - 2, p[2] + 1], f = H.superpose(P, P.map(rot)); assert.ok(H.rmsd(P.map(f), P.map(rot)) < 1e-6, 'superpose recovers a rigid move');
const m1 = H.buildModel(tg, HS.t1, a1.pairs); assert.ok(m1.ca.length === tg.seq.length && m1.ca.every(c => c && c.every(Number.isFinite)));
const c1 = H.compareToTruth(m1, tg, a1.pairs.map(p => p[0])), c4 = H.compareToTruth(H.buildModel(tg, HS.t4, H.align(tg.seq, HS.t4.seq).pairs), tg, H.align(tg.seq, HS.t4.seq).pairs.map(p => p[0]));
assert.ok(c1.rmsd > .8 && c1.rmsd < 4 && c4.rmsd > 10, `related ${c1.rmsd} vs unrelated ${c4.rmsd}`);
const q1 = H.quality(tg, HS.t1, a1.pairs, hs.rama, tg); assert.ok(q1.rama.favoured > .9 && q1.env.score > .5);
assert.ok(Math.abs(H.expectedRmsd(1) - .4) < 1e-9 && H.expectedRmsd(.3) > H.expectedRmsd(.6));
assert.ok(hs.rama[Math.floor((-45 + 180) / 10)][Math.floor((-60 + 180) / 10)] === 2 && H.ramaClass(hs.rama, -60, -45) === 2, 'alpha helix angles are favoured');
hT.why.scenarios.forEach(s => assert.ok(hT.why.approaches.some(a => a.id === s.answer)));
hq.forEach(q => assert.ok(q.options.length >= 3 && q.options[q.answer] != null && q.why, q.id));
console.log('Homology data and maths OK');

// ---------- Module 5: network pharmacology
import * as NW from '../js/modules/network/stats.js';
const nd = J('data/network/network.json'), nT = J('data/network/teaching.json'), nq = J('data/network/quiz.json').questions;
for (const [a, b, s] of nd.edges) assert.ok(nd.genes[a] && nd.genes[b] && s > 0 && s <= 1, `${a}-${b}`);
Object.keys(nd.targets).forEach(g => assert.ok(nd.genes[g] && nd.disease[g], g)); nd.pathways.forEach(p => p.members.forEach(g => assert.ok(nd.genes[g], g)));
const nct = NW.compoundTargets(nd.targets), ndz = NW.diseaseGenes(nd.disease), nov = NW.intersect(nct, ndz);
assert.ok(nov.length >= 10 && nov.length <= 25 && nov.includes('PTGS2') && !nov.includes('CA9'), 'overlap size');
assert.ok(!NW.compoundTargets(nd.targets, { minProb: .1, useB: false }).includes('CA9') && NW.compoundTargets(nd.targets, { minProb: 0.05, useB: false }).includes('PDPK1'), 'tool A threshold');
// graph measures on a path of 5 nodes: the middle one is the bridge
const pg = NW.buildGraph(['a', 'b', 'c', 'd', 'e'], [['a', 'b', 1], ['b', 'c', 1], ['c', 'd', 1], ['d', 'e', 1]], .5), pb = NW.betweenness(pg), pc = NW.closeness(pg);
assert.ok(Math.abs(pb[2] - 4 / 6) < 1e-9 && pb[0] === 0 && NW.degree(pg).join() === '1,2,2,2,1' && pc[2] > pc[0], 'path graph');
const star = NW.buildGraph(['h', 'x', 'y', 'z'], [['h', 'x', 1], ['h', 'y', 1], ['h', 'z', 1]], .5); assert.ok(NW.betweenness(star)[0] === 1 && NW.components(NW.removeNode(['h', 'x', 'y', 'z'], [['h', 'x', 1], ['h', 'y', 1], ['h', 'z', 1]], 'h', .5)).count === 3, 'removing the hub splits the star');
const ng = NW.buildGraph(nov, nd.edges, .7); assert.ok(NW.components(ng).count === 1 && NW.hubTable(ng)[0].degree >= 8 && NW.buildGraph(nov, nd.edges, .95).edges.length < ng.edges.length);
// hypergeometric: P(X >= 1) with K = 1 of N = 10, n = 3 is 0.3; exact tail checks; BH
assert.ok(Math.abs(NW.hyperP(10, 1, 3, 1) - 0.3) < 1e-9 && Math.abs(NW.hyperP(10, 4, 3, 0) - 1) < 1e-9 && Math.abs(NW.hyperP(10, 4, 3, 3) - 4 / 120) < 1e-9, 'hypergeometric tail');
const qv = NW.bh([.01, .04, .03, .5]); assert.ok(Math.abs(qv[0] - .04) < 1e-9 && Math.abs(qv[1] - .0533333) < 1e-5 && Math.abs(qv[2] - .0533333) < 1e-5 && qv[3] === .5, 'BH');
const hbs = NW.hubs(NW.hubTable(ng), 8), eg = NW.enrich(hbs, nd.pathways, { background: 'genome' }), en = NW.enrich(hbs, nd.pathways, { background: 'network', universe: [...new Set([...nct, ...ndz])] });
assert.ok(eg[0].q < 1e-4 && en[0].q > eg[0].q, 'a whole-genome background gives much stronger p-values than a study background');
assert.ok(NW.layout3d(nov, ng.edges).every(p => p.every(Number.isFinite)) && NW.layout3d(nov, ng.edges)[0][0] === NW.layout3d(nov, ng.edges)[0][0]);
nT.why.questions.forEach(q => assert.ok(q.options[q.answer] != null)); assert.ok(nT.decide.claims.some(c => c.ok) && nT.hubs.options[nT.hubs.answer]); nq.forEach(q => assert.ok(q.options.length >= 3 && q.options[q.answer] != null && q.why, q.id));
console.log('Network pharmacology data and maths OK');

// ---------- Module 6: molecular dynamics
import * as MD from '../js/modules/md/stats.js';
const mdR = J('data/md/runs.json'), mdT = J('data/md/teaching.json'), mdq = J('data/md/quiz.json').questions;
assert.ok(mdR.time.length === 1000 && Object.keys(mdR.runs).length === 5 && Object.values(mdR.runs).every(r => ['protRmsd', 'ligRmsd', 'rg', 'dist', 'hbonds', 'dG'].every(k => r[k].length === 1000) && r.rmsf.length === mdR.resnum.length), 'trajectory lengths');
assert.ok(mdR.rg0 > 20 && mdR.rg0 < 27 && mdR.hbondPartners.length >= 3 && mdR.rmsfExp.every(x => x > 0), 'real structure inputs');
const mA = MD.summarise(mdR.runs.ref, mdR.time), mB = MD.summarise(mdR.runs.candA, mdR.time), mC = MD.summarise(mdR.runs.drift, mdR.time), mCB = MD.summarise(mdR.runs.candB, mdR.time), mCC = MD.summarise(mdR.runs.candC, mdR.time);
assert.ok(MD.verdict(mA) === 'stable' && MD.verdict(mB) === 'left' && MD.verdict(mC) === 'drifting', `verdicts ${MD.verdict(mA)} ${MD.verdict(mB)} ${MD.verdict(mC)}`);
assert.ok(mB.escape > 35 && mB.escape < 60 && mA.escape === null && mB.dG.mean > mA.dG.mean + 5, 'escape time and energy'); assert.ok(MD.verdict(mCB) === 'stable' && MD.verdict(mCC) === 'unclear', `candidate B ${MD.verdict(mCB)}, candidate C ${MD.verdict(mCC)}`);
assert.ok(Math.abs(MD.slope([0, 1, 2, 3], [1, 3, 5, 7]) - 2) < 1e-12 && MD.blockStats([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).sem === 0 && MD.occupancy([0, 1, 2, 0], 1) === .5);
const mar = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 60)); assert.ok(MD.blockStats(mar).sem > MD.blockStats(mar).naiveSem * 3, 'correlated frames: block error is larger than the naive one');
// real MD engine: energy conservation with a small step, blow-up with a mbig one, thermostat reaches its target, momentum removed
const mlj = new MD.LJSim({ n: 4, rho: .7, T: 1, dt: .004, seed: 3 }), me0 = mlj.energy(); for (let i = 0; i < 300; i++) mlj.step(); assert.ok(Math.abs(mlj.energy() - me0) / Math.abs(me0) < .002, 'velocity Verlet conserves energy');
const mbig = new MD.LJSim({ n: 4, rho: .7, T: 1, dt: .03, seed: 3 }), meb = mbig.energy(); for (let i = 0; i < 150; i++) mbig.step(); assert.ok(!(Math.abs(mbig.energy() - meb) / Math.abs(meb) < .05), 'a too large time step breaks energy conservation');
const mth = new MD.LJSim({ n: 4, rho: .7, T: .3, dt: .004, seed: 4 }); mth.thermostat = { tau: .3, T: 1.2 }; for (let i = 0; i < 1200; i++) mth.step(); assert.ok(Math.abs(mth.temperature() - 1.2) < .15, 'thermostat reaches the target temperature');
let mpx = 0; for (let i = 0; i < mlj.N; i++) mpx += mlj.v[3 * i]; assert.ok(Math.abs(mpx) < 1e-6, 'no net momentum');
const mg = mlj.rdf(30); assert.ok(mg.length === 30 && mg.every(p => Number.isFinite(p[1])) && Math.max(...mg.map(p => p[1])) > 1.2);
mdT.why.scenarios.forEach(s => assert.ok(mdT.why.approaches.some(a => a.id === s.answer))); assert.ok(mdT.workflow.steps.length === 9 && mdT.decide.claims.some(c => c.ok)); mdq.forEach(q => assert.ok(q.options.length >= 3 && q.options[q.answer] != null && q.why, q.id));
console.log('Molecular dynamics data and maths OK');

// ---------- the project story (case file)
import fs from 'node:fs';
const story = J('data/case.json'), regSrc = fs.readFileSync(new URL('../js/modules/registry.js', import.meta.url), 'utf8'), regIds = [...regSrc.matchAll(/id: '(\w+)'/g)].map(m => m[1]), order = regIds.filter(i => !/homology/.test(i));
assert.deepEqual(story.chain.map(c => c.id), order.slice(0, 5), 'the story chain follows the registry order');
story.standalone.forEach(s => assert.ok(regIds.includes(s.id))); assert.ok(regSrc.includes("id: 'homology'") && /standalone: true/.test(regSrc));
const mdI = fs.readFileSync(new URL('../js/modules/md/index.js', import.meta.url), 'utf8'); assert.ok(/cand' \+ choice/.test(mdI), 'MD takes its candidate from the docking choice');
assert.ok(J('data/adme/drugs.json').extras.map(e => e.name).join().includes('Compound B') && J('data/adme/drugs.json').extras.every(e => e.atoms.length && e.mock));
console.log('Project story OK');

// ---------- project workbook
import * as WB from '../js/project/rules.js';
const wbSpec = J('data/project/workbook.json'), wbEx = J('data/project/example.json'), ids = new Set();
for (const s of wbSpec.stages) { assert.ok(!ids.has(s.id) && s.why && s.mistakes.length, s.id); ids.add(s.id); const fids = new Set(); for (const f of s.fields) { assert.ok(!fids.has(f.id) && f.label && ['text', 'textarea', 'number', 'select', 'checks', 'table'].includes(f.type), `${s.id}.${f.id}`); fids.add(f.id); if (f.type === 'select' || f.type === 'checks') assert.ok(f.options.length >= 2); if (f.type === 'table') f.columns.forEach(c => assert.ok(!c.computed || WB.COMPUTED[c.computed], c.id)); } }
assert.ok(WB.COMPUTED.ligandEfficiency({ score: -10.4, ha: 26 }) === 0.4 && WB.COMPUTED.ro5({ mw: 600, logp: 6, hbd: 1, hba: 3 }) === 2 && WB.COMPUTED.veber({ tpsa: 150, rotb: 3 }) === 'fails' && WB.COMPUTED.veber({}) === null);
const wbGood = WB.overview(wbSpec, wbEx.good), wbBad = WB.overview(wbSpec, wbEx.flawed);
assert.ok(wbGood.ready && wbGood.blocks === 0 && wbGood.warns === 0, 'the good example has no problems'); assert.ok(!wbBad.ready && wbBad.blocks >= 8 && wbBad.warns >= 15, `the flawed example is caught: ${wbBad.blocks} serious, ${wbBad.warns} warnings`);
const sev = (stage, data) => WB.stageChecks(stage, data).map(c => c.sev + ':' + c.text.slice(0, 20));
assert.ok(WB.stageChecks('docking', { docking: {} }).some(c => c.sev === 'block' && /redocking/i.test(c.text)), 'no redocking is serious'); assert.ok(WB.stageChecks('docking', { docking: { redockRmsd: 3.1 } }).some(c => c.sev === 'warn' && /2 Å/.test(c.text)) && WB.stageChecks('docking', { docking: { redockRmsd: 1.2 } }).some(c => c.sev === 'ok'));
assert.ok(WB.stageChecks('screening', { screening: { funnel: [{ step: 'a', n: 100 }, { step: 'b', n: 200 }] } }).some(c => c.sev === 'block'), 'a filter cannot add compounds');
assert.ok(WB.stageChecks('network', { network: { nCompound: 100, nDisease: 200, nOverlap: 150 } }).some(c => c.sev === 'block') && WB.stageChecks('network', { network: { selection: 'topn' } }).some(c => /top N/.test(c.text)));
assert.ok(WB.stageChecks('md', { md: { dt: 4, constraints: 'no' } }).some(c => c.sev === 'block') && WB.stageChecks('md', { md: { replicas: 1 } }).some(c => /one replica/i.test(c.text)) && WB.stageChecks('md', { md: { left: 'yes', dG: -40 } }).some(c => c.sev === 'block'));
assert.ok(WB.stageChecks('target', { target: { source: 'hm', identity: 25 } }).some(c => c.sev === 'block') && WB.stageChecks('target', { target: { source: 'af', plddt: 55 } }).some(c => c.sev === 'block') && WB.stageChecks('conclude', { conclude: { claim: 'proof' } }).some(c => c.sev === 'block'));
assert.ok(WB.stageChecks('adme', { adme: { route: 'oral', table: [{ name: 'X', gi: 'low' }] } }).some(c => c.sev === 'block'));
const cp = WB.completeness(wbSpec.stages[0], { setup: { title: 'x' } }); assert.ok(cp.total === 6 && cp.done === 1 && cp.missing.length === 5);
assert.ok(WB.usedStages(wbSpec, { setup: { stages: ['screening'] } }).join() === 'setup,screening,conclude' && WB.usedStages(wbSpec, { setup: {} }).length === 8);
const rep = WB.report(wbSpec, wbEx.good, { code: 'T', date: '2026-01-01' }); assert.ok(rep.startsWith('# EXAMPLE') && /\| Compound B \|/.test(rep) && /ligand efficiency/i.test(rep) && /all required fields are filled/.test(rep));
assert.ok(WB.report(wbSpec, wbEx.flawed, {}).includes('[serious]'));
console.log('Project workbook OK');

// ---------- handbook: glossary and appendices
import { buildMatcher, findFirst } from '../js/handbook/annotate.js';
const gl = J('data/glossary.json').entries, hbk = J('data/handbook.json').appendices, CATS = ['basics', 'structure', 'docking', 'screening', 'adme', 'network', 'homology', 'md', 'stats', 'files', 'tools', 'site'], gids = new Set(), abbrs = new Map();
for (const e of gl) { assert.ok(e.id && !gids.has(e.id) && e.term && e.def.length > 20 && CATS.includes(e.cat) && Array.isArray(e.abbr) && Array.isArray(e.modules), e.id); gids.add(e.id); for (const a of e.abbr) { assert.ok(!abbrs.has(a), `abbreviation ${a} is in two entries`); abbrs.set(a, e.id); } }
const must = ['CADD', 'COX-2', 'NSAID', 'SAR', 'IC50', 'Kd', 'Ki', 'PDB', 'RCSB', 'UniProt', 'NMR', 'RMSD', 'LE', 'Ro5', 'PAINS', 'EF', 'ROC', 'AUC', 'ADME', 'GI', 'BBB', 'BOILED-Egg', 'cLogP', 'TPSA', 'HBD', 'HBA', 'MW', 'RotB', 'logS', 'ESOL', 'pKa', 'pH', 'CYP', 'NAPQI', 'PAMPA', 'Cmax', 'Tmax', 'PPI', 'STRING', 'GO', 'KEGG', 'FDR', 'PTGS2', 'pLDDT', 'AlphaFold', 'MODELLER', 'SWISS-MODEL', 'BLOSUM62', 'AMPA', 'GluA2', 'GluA3', 'NTD', 'MD', 'RMSF', 'Rg', 'MM-GBSA', 'MM-PBSA', 'TIP3P', 'NVT', 'NPT', 'SMILES', 'SDF', 'SUS', 'CSV', 'JSON', 'GROMACS', 'AutoDock', 'RDKit', 'SwissADME', 'pkCSM', 'SwissTargetPrediction', 'PharmMapper', 'GeneCards', 'DisGeNET', 'CHARMM36', 'LINCS', 'SHAKE', 'NAM-NPeasy', 'CA2', 'X-ray', 'DNA', 'ELISA', 'NaCl', 'His90', 'Arg513', 'CH3', 'Verify3D', 'ProSA', 'UiTM', 'EF10', 'ΔG', 'H-bond'];
must.forEach(a => assert.ok(abbrs.has(a), `glossary is missing ${a}`));
// every abbreviation that appears in the module and workbook text should be defined: scan their quoted strings and data files
import fsx from 'node:fs'; import pathx from 'node:path';
const walkJs = d => fsx.readdirSync(d, { withFileTypes: true }).flatMap(x => x.isDirectory() ? walkJs(pathx.join(d, x.name)) : x.name.endsWith('.js') ? [pathx.join(d, x.name)] : []);
const texts = []; for (const f of [...walkJs('js/modules'), 'js/main.js', 'js/case.js', 'js/project/index.js']) for (const m of fsx.readFileSync(f, 'utf8').matchAll(/'((?:[^'\\\n]|\\.){12,})'|`((?:[^`\\]|\\.){12,})`/g)) { const s = m[1] || m[2]; if (/\s/.test(s)) texts.push(s); }
const jsonText = o => typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(jsonText) : o && typeof o === 'object' ? Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([, v]) => jsonText(v)) : [];
for (const f of ['data/docking/mock.json', 'data/screening/teaching.json', 'data/adme/teaching.json', 'data/homology/teaching.json', 'data/network/teaching.json', 'data/md/teaching.json', 'data/case.json', 'data/project/workbook.json', 'data/docking/quiz.json', 'data/screening/quiz.json', 'data/adme/quiz.json', 'data/homology/quiz.json', 'data/network/quiz.json', 'data/md/quiz.json']) texts.push(...jsonText(J(f)).filter(s => /\s/.test(s)));
const IGNORE = new Set(['AI-generated', 'COL', 'MEM', 'STEPS', 'SUMMARY', 'innerHTML', 'MAXPICK', 'PH', 'II', 'COLORS', 'KEYCOL', 'toISOString', 'GROUP', 'SITES', 'PI', 'CL', 'EM', 'RT', 'AX', 'SPAN', 'PROPS', 'SIMLIM', 'CHOICES', 'NOT', 'POLAR', 'CF', 'COMPUTED', 'CHECKS', 'SEV', 'PERCEPTION', 'CSS', 'IntersectionObserver', 'VIRTUAL', 'SCREENING', 'THREE', 'FLAG', 'POS', 'EGG', 'pHb', 'pHa', 'ILVM', 'FYW', 'KRH', 'DE', 'NQ', 'ST', 'AG', 'HOMOLOGY', 'MODELLING', 'NETWORK', 'PHARMACOLOGY', 'MOLECULAR', 'DYNAMICS', 'VERDICT', 'WebGL', 'bestLE', 'CEL', 'HEM', 'NAG', 'BOG', 'REMARK', 'CH', 'DOCKING', 'GluA', 'MY', 'PROJECT', 'FILE', 'SVD', 'TNF', 'NaN', 'OR', 'GROMACS-style', 'AMPA-type', 'Verify3D', 'MM-GBSA/MM-PBSA', 'Leu352', 'Val349', 'Val523', 'Phe518', 'Gln192', 'Arg120', 'RCSB']);
const tok = /(?<![A-Za-z0-9_-])([A-Z][A-Za-z0-9]*[A-Z0-9][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*|[pc][A-Z][A-Za-z]+|[a-z]+[A-Z]{2,}\w*)(?![A-Za-z0-9_])/g, missing = new Set();
for (const s of texts) for (const m of s.matchAll(tok)) { const w = m[1]; if (w.length < 2 || /^[A-Z][a-z]+$/.test(w) || abbrs.has(w) || IGNORE.has(w) || /^[A-Z]{2,}$/.test(w) && w.length > 7) continue; missing.add(w); }
assert.deepEqual([...missing].sort(), [], `abbreviations in the modules that the glossary does not define: ${[...missing].join(', ')}`);
// matcher: whole words only, first occurrence only, longest first
const mt = buildMatcher(gl), hits = findFirst('The RMSD of the MM-GBSA run: RMSD again; ADMET is not ADME', mt, new Set());
assert.deepEqual(hits.map(x => x.text), ['RMSD', 'MM-GBSA', 'ADME'], 'first occurrence of each, whole words only'); assert.equal(findFirst('xRMSD RMSDs', mt, new Set()).length, 0); assert.equal(findFirst('RMSD', mt, new Set(['rmsd'])).length, 0, 'an entry already shown on the page is skipped');
for (const a of hbk) { assert.ok(a.id && a.letter && a.title && ['table', 'defs', 'list', 'refs'].includes(a.type), a.id); if (a.type === 'table') a.rows.forEach(r => assert.equal(r.length, a.columns.length, a.id)); }
console.log('Handbook OK');

// ---------- disclaimer
import { SHORT as DSHORT, AI_NOTE } from '../js/disclaimer.js';
assert.ok(/educational/i.test(DSHORT) && /medical advice/i.test(DSHORT) && /AI-generated/.test(AI_NOTE) && /educational purposes/.test(AI_NOTE));
const idx = fsx.readFileSync('index.html', 'utf8'); assert.ok(/AI-generated/.test(idx) && /#\/disclaimer/.test(idx) && /Educational use only/.test(idx), 'the footer carries the disclaimer on every page');
assert.ok(!/aiImage: false/.test(fsx.readFileSync('js/modules/registry.js', 'utf8')), 'every module picture is AI-generated and carries the badge'); assert.ok(/logo/i.test(fsx.readFileSync('js/disclaimer.js', 'utf8')), 'the logo is disclosed');
console.log('Disclaimer OK');

// ---------- practice-only note for the workbook
import { PRACTICE_NOTE } from '../js/disclaimer.js';
assert.ok(/this course only/.test(PRACTICE_NOTE) && /not enter real/i.test(PRACTICE_NOTE) && /not a research record/.test(PRACTICE_NOTE));
assert.ok(/PRACTICE EXERCISE/.test(WB.report(wbSpec, wbEx.good, {})), 'the report says it is a practice exercise');
console.log('Practice note OK');
