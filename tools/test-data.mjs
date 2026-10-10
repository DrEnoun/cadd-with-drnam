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

console.log('Docking data and maths OK');
