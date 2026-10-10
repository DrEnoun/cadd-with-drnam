// BLOSUM62 (from Biopython), order ARNDCQEGHILKMFPSTWYV
export const AA = 'ARNDCQEGHILKMFPSTWYV';
const B62 = [[4, -1, -2, -2, 0, -1, -1, 0, -2, -1, -1, -1, -1, -2, -1, 1, 0, -3, -2, 0], [-1, 5, 0, -2, -3, 1, 0, -2, 0, -3, -2, 2, -1, -3, -2, -1, -1, -3, -2, -3], [-2, 0, 6, 1, -3, 0, 0, 0, 1, -3, -3, 0, -2, -3, -2, 1, 0, -4, -2, -3], [-2, -2, 1, 6, -3, 0, 2, -1, -1, -3, -4, -1, -3, -3, -1, 0, -1, -4, -3, -3], [0, -3, -3, -3, 9, -3, -4, -3, -3, -1, -1, -3, -1, -2, -3, -1, -1, -2, -2, -1], [-1, 1, 0, 0, -3, 5, 2, -2, 0, -3, -2, 1, 0, -3, -1, 0, -1, -2, -1, -2], [-1, 0, 0, 2, -4, 2, 5, -2, 0, -3, -3, 1, -2, -3, -1, 0, -1, -3, -2, -2], [0, -2, 0, -1, -3, -2, -2, 6, -2, -4, -4, -2, -3, -3, -2, 0, -2, -2, -3, -3], [-2, 0, 1, -1, -3, 0, 0, -2, 8, -3, -3, -1, -2, -1, -2, -1, -2, -2, 2, -3], [-1, -3, -3, -3, -1, -3, -3, -4, -3, 4, 2, -3, 1, 0, -3, -2, -1, -3, -1, 3], [-1, -2, -3, -4, -1, -2, -3, -4, -3, 2, 4, -2, 2, 0, -3, -2, -1, -2, -1, 1], [-1, 2, 0, -1, -3, 1, 1, -2, -1, -3, -2, 5, -1, -3, -1, 0, -1, -3, -2, -2], [-1, -1, -2, -3, -1, 0, -2, -3, -2, 1, 2, -1, 5, 0, -2, -1, -1, -1, -1, 1], [-2, -3, -3, -3, -2, -3, -3, -3, -1, 0, 0, -3, 0, 6, -4, -2, -2, 1, 3, -1], [-1, -2, -2, -1, -3, -1, -1, -2, -2, -3, -3, -1, -2, -4, 7, -1, -1, -4, -3, -2], [1, -1, 1, 0, -1, 0, 0, 0, -1, -2, -2, 0, -1, -2, -1, 4, 1, -3, -2, -2], [0, -1, 0, -1, -1, -1, -1, -2, -2, -1, -1, -1, -1, -2, -1, 1, 5, -2, -2, 0], [-3, -3, -4, -4, -2, -2, -3, -2, -2, -3, -2, -3, -1, 1, -4, -3, -2, 11, 2, -3], [-2, -2, -2, -3, -2, -1, -2, -3, 2, -1, -1, -2, -1, 3, -3, -2, -2, 2, 7, -1], [0, -3, -3, -3, -1, -2, -2, -3, -3, 3, 1, -2, 1, -1, -2, -2, 0, -3, -1, 4]];
// Pure maths for the homology modelling module (no DOM, testable in Node).

// ---------------------------------------------------------------- alignment (Gotoh: global, affine gaps, BLOSUM62)
export const score = (a, b) => B62[AA.indexOf(a)]?.[AA.indexOf(b)] ?? -4;
/** Global alignment of sequences q (target) and t (template). A gap of length L costs open + (L-1) * extend (open and extend are positive numbers). Returns { pairs: [[i, j]], qa, ta } */
export function align(q, t, open = 10, extend = .5) {
  const n = q.length, m = t.length, NEG = -1e9, idx = (i, j) => i * (m + 1) + j;
  const M = new Float32Array((n + 1) * (m + 1)).fill(NEG), X = new Float32Array((n + 1) * (m + 1)).fill(NEG), Y = new Float32Array((n + 1) * (m + 1)).fill(NEG); // M match, X gap in t (q residue unmatched), Y gap in q
  const tb = new Uint8Array((n + 1) * (m + 1) * 3);
  M[0] = 0;
  for (let i = 1; i <= n; i++) { X[idx(i, 0)] = -open - (i - 1) * extend; }
  for (let j = 1; j <= m; j++) { Y[idx(0, j)] = -open - (j - 1) * extend; }
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const k = idx(i, j), s = score(q[i - 1], t[j - 1]), d = idx(i - 1, j - 1);
    // match state
    let best = M[d], from = 0; if (X[d] > best) { best = X[d]; from = 1; } if (Y[d] > best) { best = Y[d]; from = 2; } M[k] = best + s; tb[k * 3] = from;
    // gap in template (consume q[i-1])
    const u = idx(i - 1, j); let b1 = M[u] - open, f1 = 0; if (X[u] - extend > b1) { b1 = X[u] - extend; f1 = 1; } if (Y[u] - open > b1) { b1 = Y[u] - open; f1 = 2; } X[k] = b1; tb[k * 3 + 1] = f1;
    // gap in query (consume t[j-1])
    const l = idx(i, j - 1); let b2 = M[l] - open, f2 = 0; if (Y[l] - extend > b2) { b2 = Y[l] - extend; f2 = 2; } if (X[l] - open > b2) { b2 = X[l] - open; f2 = 1; } Y[k] = b2; tb[k * 3 + 2] = f2;
  }
  let i = n, j = m, st = 0, bs = M[idx(n, m)]; if (X[idx(n, m)] > bs) { bs = X[idx(n, m)]; st = 1; } if (Y[idx(n, m)] > bs) { bs = Y[idx(n, m)]; st = 2; }
  const pairs = []; let qa = '', ta = '';
  while (i > 0 || j > 0) {
    if (i === 0) { qa = '-' + qa; ta = t[j - 1] + ta; j--; continue; }
    if (j === 0) { qa = q[i - 1] + qa; ta = '-' + ta; i--; continue; }
    const k = idx(i, j), from = tb[k * 3 + st];
    if (st === 0) { pairs.push([i - 1, j - 1]); qa = q[i - 1] + qa; ta = t[j - 1] + ta; i--; j--; }
    else if (st === 1) { qa = q[i - 1] + qa; ta = '-' + ta; i--; }
    else { qa = '-' + qa; ta = t[j - 1] + ta; j--; }
    st = from;
  }
  return { pairs: pairs.reverse(), qa, ta };
}
const SIMILAR = ['ILVM', 'FYW', 'KRH', 'DE', 'NQ', 'ST', 'AG', 'C'];
export const similar = (a, b) => a === b || SIMILAR.some(g => g.includes(a) && g.includes(b));
/** Per-column class of an alignment: '|' identical, ':' similar, '.' different, ' ' gap. */
export const columns = (qa, ta) => [...qa].map((a, k) => a === '-' || ta[k] === '-' ? ' ' : a === ta[k] ? '|' : similar(a, ta[k]) ? ':' : '.').join('');
export function alignStats(q, t, pairs) {
  let id = 0, sim = 0; for (const [i, j] of pairs) { if (q[i] === t[j]) id++; if (similar(q[i], t[j])) sim++; }
  return { identity: id / q.length, identityAligned: pairs.length ? id / pairs.length : 0, similarity: sim / q.length, coverage: pairs.length / q.length, aligned: pairs.length, gaps: (q.length - pairs.length) + (t.length - pairs.length) };
}
/** How much of the reference (structure-based) alignment is reproduced exactly: fraction of reference pairs found. */
export function alignAccuracy(pairs, ref) { const s = new Set(pairs.map(p => p.join(','))); return ref.length ? ref.filter(p => s.has(p.join(','))).length / ref.length : 0; }

// ---------------------------------------------------------------- superposition (Kabsch via a small Jacobi SVD-free method using quaternions)
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], norm = a => Math.hypot(a[0], a[1], a[2]);
const centroid = P => mul(P.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / P.length);
/** Best rotation + translation taking points P onto Q (Horn's quaternion method). Returns a function that moves a point. */
export function superpose(P, Q) {
  const cp = centroid(P), cq = centroid(Q), S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let k = 0; k < P.length; k++) { const p = sub(P[k], cp), q = sub(Q[k], cq); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i][j] += p[i] * q[j]; }
  const [[Sxx, Sxy, Sxz], [Syx, Syy, Syz], [Szx, Szy, Szz]] = S;
  let N = [[Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx], [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz], [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy], [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz]];
  // largest eigenvector by Jacobi rotations
  let V = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]; N = N.map(r => [...r]);
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) off += N[i][j] ** 2; if (off < 1e-18) break;
    for (let p = 0; p < 3; p++) for (let q2 = p + 1; q2 < 4; q2++) {
      if (Math.abs(N[p][q2]) < 1e-14) continue; const th = (N[q2][q2] - N[p][p]) / (2 * N[p][q2]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < 4; k++) { const a = N[k][p], b = N[k][q2]; N[k][p] = c * a - s * b; N[k][q2] = s * a + c * b; }
      for (let k = 0; k < 4; k++) { const a = N[p][k], b = N[q2][k]; N[p][k] = c * a - s * b; N[q2][k] = s * a + c * b; }
      for (let k = 0; k < 4; k++) { const a = V[k][p], b = V[k][q2]; V[k][p] = c * a - s * b; V[k][q2] = s * a + c * b; }
    }
  }
  let bi = 0; for (let i = 1; i < 4; i++) if (N[i][i] > N[bi][bi]) bi = i;
  const [w, x, y, z] = [V[0][bi], V[1][bi], V[2][bi], V[3][bi]];
  const R = [[w*w + x*x - y*y - z*z, 2*(x*y - w*z), 2*(x*z + w*y)], [2*(x*y + w*z), w*w - x*x + y*y - z*z, 2*(y*z - w*x)], [2*(x*z - w*y), 2*(y*z + w*x), w*w - x*x - y*y + z*z]];
  return p => { const d = sub(p, cp); return add([R[0][0]*d[0] + R[0][1]*d[1] + R[0][2]*d[2], R[1][0]*d[0] + R[1][1]*d[1] + R[1][2]*d[2], R[2][0]*d[0] + R[2][1]*d[1] + R[2][2]*d[2]], cq); };
}
export const rmsd = (A, B) => Math.sqrt(A.reduce((s, p, i) => s + (norm(sub(p, B[i])) ** 2), 0) / A.length);

// ---------------------------------------------------------------- building a model from a template and an alignment (C-alpha trace)
/** target, template: structure entries (seq, ca). pairs: [[targetIndex, templateIndex]]. Returns { ca: [[x,y,z]] in the template frame, kind: 'copied' | 'built' per residue, loops: [[start,end]] } */
export function buildModel(target, template, pairs) {
  const n = target.seq.length, ca = new Array(n).fill(null), kind = new Array(n).fill('built');
  for (const [i, j] of pairs) { ca[i] = template.ca[j].slice(); kind[i] = 'copied'; }
  const placed = ca.map((c, i) => c ? i : -1).filter(i => i >= 0);
  if (!placed.length) return { ca: ca.map(() => [0, 0, 0]), kind, loops: [[0, n - 1]] };
  const centre = centroid(placed.map(i => ca[i])), loops = [];
  const fillGap = (a, b) => { // residues a+1 .. b-1 lie between placed a and b
    const k = b - a - 1; if (k <= 0) return; loops.push([a + 1, b - 1]);
    const pa = ca[a], pb = ca[b], chord = sub(pb, pa), c = norm(chord), L = (k + 1) * 3.8, h = L > c ? Math.sqrt(3 * Math.max(c, 1) * (L - c) / 8) : 0;
    let dir = sub(mul(add(pa, pb), .5), centre); dir = sub(dir, mul(chord, (dir[0]*chord[0] + dir[1]*chord[1] + dir[2]*chord[2]) / (c * c || 1))); const dn = norm(dir) || 1; dir = mul(dir, 1 / dn);
    for (let s = 1; s <= k; s++) { const f = s / (k + 1), bulge = 4 * f * (1 - f) * h; ca[a + s] = add(add(pa, mul(chord, f)), mul(dir, bulge)); }
  };
  for (let p = 0; p < placed.length - 1; p++) fillGap(placed[p], placed[p + 1]);
  const ext = (from, step) => { // terminal extensions run straight away from the end
    const last = from, prev = last - step; let dir = ca[prev] ? sub(ca[last], ca[prev]) : sub(ca[last], centre); dir = mul(dir, 1 / (norm(dir) || 1));
    if (step === 1) { if (placed[0] > 0) loops.push([0, placed[0] - 1]); } else if (last < n - 1) loops.push([last + 1, n - 1]);
  };
  const first = placed[0], lastP = placed[placed.length - 1];
  for (let i = first - 1; i >= 0; i--) { const d = sub(ca[i + 1], ca[i + 2] ?? centre); const u = mul(d, 1 / (norm(d) || 1)); ca[i] = add(ca[i + 1], mul(u, 3.8)); }
  if (first > 0) loops.push([0, first - 1]);
  for (let i = lastP + 1; i < n; i++) { const d = sub(ca[i - 1], ca[i - 2] ?? centre); const u = mul(d, 1 / (norm(d) || 1)); ca[i] = add(ca[i - 1], mul(u, 3.8)); }
  if (lastP < n - 1) loops.push([lastP + 1, n - 1]);
  return { ca, kind, loops: loops.sort((x, y) => x[0] - y[0]) };
}
/** Superpose a model onto the truth (target) structure using the residues that were copied from the template; returns { moved, dev (per residue, null where unplaced), rmsd, rmsdAll } */
export function compareToTruth(model, truth, pairsIdx) {
  const P = pairsIdx.map(i => model.ca[i]), Q = pairsIdx.map(i => truth.ca[i]), f = superpose(P, Q);
  const moved = model.ca.map(f), dev = moved.map((p, i) => norm(sub(p, truth.ca[i])));
  return { moved, dev, rmsd: rmsd(pairsIdx.map(i => moved[i]), Q), rmsdAll: Math.sqrt(dev.reduce((s, d) => s + d * d, 0) / dev.length) };
}

// ---------------------------------------------------------------- validation
export const ramaClass = (rama, phi, psi) => rama[Math.floor(((psi + 180) % 360) / 10) % 36][Math.floor(((phi + 180) % 360) / 10) % 36];
/** Ramachandran statistics over residues (Gly and Pro are skipped). residues: [{ aa, phi, psi }] */
export function ramaStats(rama, residues) {
  let n = 0, fav = 0, alw = 0, out = 0; const outliers = [];
  residues.forEach((r, k) => { if (r.phi == null || r.psi == null || r.aa === 'G' || r.aa === 'P') return; n++; const c = ramaClass(rama, r.phi, r.psi); if (c === 2) fav++; else if (c === 1) alw++; else { out++; outliers.push(k); } });
  return { n, favoured: n ? fav / n : 0, allowed: n ? alw / n : 0, outlier: n ? out / n : 0, outliers };
}
/** Residue dihedrals a model inherits: copied residues take the template's angles. */
export function modelDihedrals(target, template, pairs) { const map = new Map(pairs); return target.seq.split('').map((aa, i) => { const j = map.get(i); return { aa, phi: j == null ? null : template.phi[j], psi: j == null ? null : template.psi[j] }; }); }
const HYDRO = new Set('AVILMFWC'), POLAR = new Set('DEKRNQHSTY');
/** Environment check ("3D-1D profile" idea): hydrophobic residues should be buried and polar/charged residues exposed. burial = C-alpha neighbours within 10 A of the template position. */
export function environment(target, template, pairs) {
  const b = template.burial, sorted = [...b].sort((x, y) => x - y), lo = sorted[Math.floor(sorted.length / 3)], hi = sorted[Math.floor(sorted.length * 2 / 3)];
  let buried = 0, buriedHydro = 0, exposed = 0, exposedPolar = 0, bad = []; 
  for (const [i, j] of pairs) { const a = target.seq[i], v = b[j]; if (v >= hi) { buried++; if (HYDRO.has(a)) buriedHydro++; else if (POLAR.has(a) && 'DEKR'.includes(a)) bad.push(i); } else if (v <= lo) { exposed++; if (POLAR.has(a)) exposedPolar++; else if ('LIVMFW'.includes(a)) bad.push(i); } }
  return { buriedHydrophobic: buried ? buriedHydro / buried : 0, exposedPolar: exposed ? exposedPolar / exposed : 0, score: buried + exposed ? (buriedHydro + exposedPolar) / (buried + exposed) : 0, bad };
}
/** Expected C-alpha RMSD (A) of a model from the fraction of identical residues (Chothia and Lesk 1986): 0.40 * exp(1.87 * H), H = fraction of differences. */
export const expectedRmsd = identity => 0.40 * Math.exp(1.87 * (1 - identity));
export function quality(target, template, pairs, rama, truth) {
  const st = alignStats(target.seq, template.seq, pairs), model = buildModel(target, template, pairs), dih = ramaStats(rama, modelDihedrals(target, template, pairs).filter(r => r.phi != null)), env = environment(target, template, pairs), cmp = compareToTruth(model, truth, pairs.map(p => p[0]));
  return { st, model, rama: dih, env, cmp, expected: expectedRmsd(st.identityAligned) };
}
