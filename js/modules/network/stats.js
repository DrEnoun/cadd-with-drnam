// Pure maths for the network pharmacology module (no DOM, testable in Node).

// ---------------------------------------------------------------- candidate targets
/** Compound targets that pass: tool A probability >= minProb, or listed by tool B (when useB). */
export function compoundTargets(T, { minProb = .1, useA = true, useB = true } = {}) {
  return Object.keys(T).filter(g => (useA && T[g].probA >= minProb && T[g].probA > 0) || (useB && T[g].inB));
}
/** Disease genes that pass: GeneCards-like score >= gc OR DisGeNET-like score >= dg. */
export function diseaseGenes(D, { gc = 20, dg = .1 } = {}) { return Object.keys(D).filter(g => D[g].gc >= gc || D[g].dg >= dg); }
export const intersect = (a, b) => { const s = new Set(b); return a.filter(x => s.has(x)); };

// ---------------------------------------------------------------- graph measures (undirected, unweighted)
export function buildGraph(nodes, edges, minConf = .7) {
  const idx = new Map(nodes.map((n, i) => [n, i])), adj = nodes.map(() => new Set()), kept = [];
  for (const [a, b, s] of edges) if (s >= minConf && idx.has(a) && idx.has(b) && a !== b) { adj[idx.get(a)].add(idx.get(b)); adj[idx.get(b)].add(idx.get(a)); kept.push([a, b, s]); }
  return { nodes, idx, adj: adj.map(s => [...s]), edges: kept };
}
export const degree = g => g.adj.map(a => a.length);
/** Brandes betweenness (normalised to 0..1 for undirected graphs). */
export function betweenness(g) {
  const n = g.nodes.length, bc = new Array(n).fill(0);
  for (let s = 0; s < n; s++) {
    const S = [], P = Array.from({ length: n }, () => []), sigma = new Array(n).fill(0), dist = new Array(n).fill(-1); sigma[s] = 1; dist[s] = 0;
    const Q = [s];
    for (let qi = 0; qi < Q.length; qi++) { const v = Q[qi]; S.push(v); for (const w of g.adj[v]) { if (dist[w] < 0) { dist[w] = dist[v] + 1; Q.push(w); } if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; P[w].push(v); } } }
    const delta = new Array(n).fill(0);
    while (S.length) { const w = S.pop(); for (const v of P[w]) delta[v] += sigma[v] / sigma[w] * (1 + delta[w]); if (w !== s) bc[w] += delta[w]; }
  }
  const norm = (n - 1) * (n - 2); return bc.map(x => norm > 0 ? x / norm : 0); // each pair counted twice already
}
/** Closeness, Wasserman-Faust version for graphs with several components. */
export function closeness(g) {
  const n = g.nodes.length;
  return g.nodes.map((_, s) => { const dist = new Array(n).fill(-1); dist[s] = 0; const Q = [s]; let sum = 0, reach = 0; for (let qi = 0; qi < Q.length; qi++) { const v = Q[qi]; for (const w of g.adj[v]) if (dist[w] < 0) { dist[w] = dist[v] + 1; sum += dist[w]; reach++; Q.push(w); } } return sum > 0 && n > 1 ? (reach / sum) * (reach / (n - 1)) : 0; });
}
export function components(g) {
  const n = g.nodes.length, comp = new Array(n).fill(-1); let c = 0;
  for (let s = 0; s < n; s++) { if (comp[s] >= 0) continue; const Q = [s]; comp[s] = c; for (let qi = 0; qi < Q.length; qi++) for (const w of g.adj[Q[qi]]) if (comp[w] < 0) { comp[w] = c; Q.push(w); } c++; }
  const sizes = new Array(c).fill(0); comp.forEach(k => sizes[k]++); return { comp, count: c, sizes, largest: Math.max(0, ...sizes) };
}
/** Hub table: each node with degree, betweenness, closeness and ranks. */
export function hubTable(g) {
  const d = degree(g), b = betweenness(g), c = closeness(g), rank = a => { const o = a.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]), r = new Array(a.length); o.forEach(([, i], k) => { r[i] = k + 1; }); return r; }, rd = rank(d), rb = rank(b), rc = rank(c);
  return g.nodes.map((gene, i) => ({ gene, degree: d[i], betweenness: b[i], closeness: c[i], rankDegree: rd[i], rankBetweenness: rb[i], rankCloseness: rc[i] })).sort((x, y) => x.rankDegree - y.rankDegree || y.betweenness - x.betweenness);
}
/** Hubs as in the protocol: top N by degree that are also above the median of betweenness and closeness. */
export function hubs(table, n = 10) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }, mb = med(table.map(t => t.betweenness)), mc = med(table.map(t => t.closeness));
  return table.filter(t => t.betweenness >= mb && t.closeness >= mc).slice(0, n).map(t => t.gene);
}
export function removeNode(nodes, edges, gene, minConf) { return buildGraph(nodes.filter(n => n !== gene), edges, minConf); }

// ---------------------------------------------------------------- enrichment (hypergeometric, Benjamini-Hochberg)
const LF = [0]; for (let i = 1; i <= 40000; i++) LF[i] = LF[i - 1] + Math.log(i);
const lC = (n, k) => k < 0 || k > n ? -Infinity : LF[n] - LF[k] - LF[n - k];
/** P(X >= k) when drawing n from N items of which K are special. */
export function hyperP(N, K, n, k) { let p = 0; for (let i = k; i <= Math.min(K, n); i++) p += Math.exp(lC(K, i) + lC(N - K, n - i) - lC(N, n)); return Math.min(1, p); }
export function bh(ps) { const m = ps.length, o = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), q = new Array(m); let prev = 1; for (let r = m - 1; r >= 0; r--) { prev = Math.min(prev, o[r][0] * m / (r + 1)); q[o[r][1]] = prev; } return q; }
/** Enrichment of a gene list in pathways. background: 'genome' uses the pathway size and N = genome; 'network' uses only the genes you gave as universe. */
export function enrich(list, pathways, { background = 'genome', genome = 20000, universe = [] } = {}) {
  const L = new Set(list), U = new Set(universe), N = background === 'genome' ? genome : U.size;
  const rows = pathways.map(p => { const inList = p.members.filter(g => L.has(g)), K = background === 'genome' ? p.size : p.members.filter(g => U.has(g)).length, n = list.filter(g => background === 'genome' || U.has(g)).length;
    return { name: p.name, genes: inList, k: inList.length, K, n, N, ratio: n ? inList.length / n : 0, p: inList.length ? hyperP(N, K, n, inList.length) : 1 }; });
  const q = bh(rows.map(r => r.p)); rows.forEach((r, i) => { r.q = q[i]; });
  return rows.sort((a, b) => a.p - b.p);
}

// ---------------------------------------------------------------- layout (deterministic 3D force-directed)
export function layout3d(nodes, edges, { iter = 260, seed = 7, size = 30 } = {}) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, n = nodes.length, idx = new Map(nodes.map((g, i) => [g, i]));
  const P = nodes.map(() => [(rnd() - .5) * size, (rnd() - .5) * size, (rnd() - .5) * size]), E = edges.filter(e => idx.has(e[0]) && idx.has(e[1])).map(e => [idx.get(e[0]), idx.get(e[1]), e[2] ?? 1]);
  const k = size / Math.cbrt(Math.max(n, 1)) * 1.4;
  for (let it = 0; it < iter; it++) {
    const F = P.map(() => [0, 0, 0]), t = 1 - it / iter;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = [P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]], r2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 + .01, f = k * k / r2; for (let a = 0; a < 3; a++) { F[i][a] += d[a] * f; F[j][a] -= d[a] * f; } }
    for (const [i, j, w] of E) { const d = [P[j][0] - P[i][0], P[j][1] - P[i][1], P[j][2] - P[i][2]], r = Math.hypot(...d) + .01, f = r / k * (.4 + w); for (let a = 0; a < 3; a++) { F[i][a] += d[a] / r * f * r * .08; F[j][a] -= d[a] / r * f * r * .08; } }
    for (let i = 0; i < n; i++) { const g = [-P[i][0] * .02, -P[i][1] * .02, -P[i][2] * .02]; const m = Math.hypot(...F[i]) + 1e-9, step = Math.min(m, 2.5 * t + .1); for (let a = 0; a < 3; a++) P[i][a] += F[i][a] / m * step + g[a]; }
  }
  const c = [0, 1, 2].map(a => P.reduce((x, p) => x + p[a], 0) / Math.max(n, 1)); return P.map(p => p.map((v, a) => v - c[a]));
}
