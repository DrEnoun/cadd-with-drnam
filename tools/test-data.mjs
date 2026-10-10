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
