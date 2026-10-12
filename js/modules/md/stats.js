// Pure maths for the molecular dynamics module (no DOM, testable in Node).

// ---------------------------------------------------------------- a real (small) molecular dynamics engine: Lennard-Jones particles, reduced units
/** N = n^3 particles on a cubic lattice in a periodic box of reduced density rho. Velocity-Verlet integration, cut-off 2.5, optional thermostat. */
export class LJSim {
  constructor({ n = 5, rho = .7, T = 1.0, dt = .004, seed = 1 } = {}) {
    this.N = n ** 3; this.L = Math.cbrt(this.N / rho); this.dt = dt; this.T0 = T; this.rc2 = 2.5 ** 2; this.seed = seed; this.thermostat = null; this.time = 0;
    const a = this.L / n; this.x = new Float64Array(3 * this.N); this.v = new Float64Array(3 * this.N); this.f = new Float64Array(3 * this.N);
    let k = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let l = 0; l < n; l++) { this.x[3 * k] = (i + .5) * a; this.x[3 * k + 1] = (j + .5) * a; this.x[3 * k + 2] = (l + .5) * a; k++; }
    this.rnd = () => (this.seed = (this.seed * 16807) % 2147483647) / 2147483647; this.setTemperature(T); this.pe = 0; this.force();
  }
  gauss() { return Math.sqrt(-2 * Math.log(this.rnd() + 1e-12)) * Math.cos(2 * Math.PI * this.rnd()); }
  setTemperature(T) { const { v, N } = this; for (let i = 0; i < 3 * N; i++) v[i] = this.gauss() * Math.sqrt(T); this.removeDrift(); this.rescale(T); }
  removeDrift() { const { v, N } = this; for (let a = 0; a < 3; a++) { let s = 0; for (let i = 0; i < N; i++) s += v[3 * i + a]; s /= N; for (let i = 0; i < N; i++) v[3 * i + a] -= s; } }
  rescale(T) { const t = this.temperature(); if (t > 0) { const s = Math.sqrt(T / t); for (let i = 0; i < this.v.length; i++) this.v[i] *= s; } }
  kinetic() { let s = 0; for (let i = 0; i < this.v.length; i++) s += this.v[i] * this.v[i]; return s / 2; }
  temperature() { return 2 * this.kinetic() / (3 * (this.N - 1)); }
  force() {
    const { x, f, N, L, rc2 } = this; f.fill(0); let pe = 0, vir = 0;
    for (let i = 0; i < N - 1; i++) for (let j = i + 1; j < N; j++) {
      let dx = x[3 * i] - x[3 * j], dy = x[3 * i + 1] - x[3 * j + 1], dz = x[3 * i + 2] - x[3 * j + 2];
      dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); dz -= L * Math.round(dz / L);
      const r2 = dx * dx + dy * dy + dz * dz; if (r2 > rc2) continue;
      const s2 = 1 / Math.max(r2, .04), s6 = s2 ** 3, ff = 24 * s2 * s6 * (2 * s6 - 1); pe += 4 * s6 * (s6 - 1) + 0.0163169; vir += ff * r2; // + shift so the energy is continuous at the cut-off
      f[3 * i] += ff * dx; f[3 * i + 1] += ff * dy; f[3 * i + 2] += ff * dz; f[3 * j] -= ff * dx; f[3 * j + 1] -= ff * dy; f[3 * j + 2] -= ff * dz;
    }
    this.pe = pe; this.virial = vir;
  }
  /** One velocity-Verlet step; a Berendsen-style thermostat (tau in time units) gently rescales velocities if set. */
  step() {
    const { x, v, f, N, dt, L } = this;
    for (let i = 0; i < 3 * N; i++) { v[i] += .5 * dt * f[i]; x[i] += dt * v[i]; x[i] -= L * Math.floor(x[i] / L); }
    this.force(); for (let i = 0; i < 3 * N; i++) v[i] += .5 * dt * f[i];
    if (this.thermostat) { const t = this.temperature(), lam = Math.sqrt(1 + dt / this.thermostat.tau * (this.thermostat.T / Math.max(t, 1e-6) - 1)); for (let i = 0; i < 3 * N; i++) v[i] *= lam; }
    this.time += dt;
  }
  energy() { return this.kinetic() + this.pe; }
  /** radial distribution function g(r) from the current frame */
  rdf(bins = 60, rmax = this.L / 2) {
    const { x, N, L } = this, h = new Float64Array(bins), dr = rmax / bins;
    for (let i = 0; i < N - 1; i++) for (let j = i + 1; j < N; j++) { let dx = x[3 * i] - x[3 * j], dy = x[3 * i + 1] - x[3 * j + 1], dz = x[3 * i + 2] - x[3 * j + 2]; dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); dz -= L * Math.round(dz / L); const r = Math.hypot(dx, dy, dz); if (r < rmax) h[Math.floor(r / dr)] += 2; }
    const rho = N / L ** 3; return Array.from(h, (c, k) => { const r1 = k * dr, r2 = r1 + dr, vol = 4 / 3 * Math.PI * (r2 ** 3 - r1 ** 3); return [(r1 + r2) / 2, c / N / (rho * vol)]; });
  }
}

// ---------------------------------------------------------------- trajectory analysis
export const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
export const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
/** Least-squares slope of y against x. */
export function slope(x, y) { const mx = mean(x), my = mean(y); let n = 0, d = 0; for (let i = 0; i < x.length; i++) { n += (x[i] - mx) * (y[i] - my); d += (x[i] - mx) ** 2; } return d ? n / d : 0; }
export const movingAverage = (a, w) => a.map((_, i) => mean(a.slice(Math.max(0, i - w), Math.min(a.length, i + w + 1))));
/** Frames from t0 on. */
export const fromTime = (time, y, t0) => { const k = time.findIndex(t => t >= t0); return { t: time.slice(k), y: y.slice(k) }; };
/** Mean and standard error that respects correlation between frames (block averaging with nb blocks). */
export function blockStats(y, nb = 5) { const m = Math.floor(y.length / nb), blocks = Array.from({ length: nb }, (_, b) => mean(y.slice(b * m, (b + 1) * m))); return { mean: mean(y), sem: sd(blocks) / Math.sqrt(nb), naiveSem: sd(y) / Math.sqrt(y.length) }; }
/** Has the series settled? Looks at the last `frac` of the run: small drift (Angstrom per 100 ns) and small spread. */
export function plateau(time, y, { frac = .5, maxDrift = .8 } = {}) {
  const k = Math.floor(y.length * (1 - frac)), t = time.slice(k), v = y.slice(k), drift = slope(t, v) * 100, spread = sd(v);
  return { settled: Math.abs(drift) < maxDrift, drift, spread, mean: mean(v) };
}
/** First time after which the moving average stays within `tol` of the final mean. */
export function equilibrationTime(time, y, { tol = .25, w = 20 } = {}) {
  const ma = movingAverage(y, w), fin = mean(y.slice(Math.floor(y.length / 2))); for (let i = ma.length - 1; i >= 0; i--) if (Math.abs(ma[i] - fin) > tol) return time[Math.min(i + 1, time.length - 1)]; return time[0];
}
/** Fraction of frames with at least n hydrogen bonds (occupancy). */
export const occupancy = (hb, n = 1) => hb.filter(c => c >= n).length / hb.length;
/** Time when the ligand first goes farther than `cut` Angstrom from the pocket and stays out, or null. */
export function escapeTime(time, dist, cut = 4) { for (let i = 0; i < dist.length; i++) if (dist[i] > cut && dist.slice(i).every(d => d > cut * .7)) return time[i]; return null; }
/** Summary a student would put in a methods table. */
export function summarise(run, time, t0 = 20) {
  const f = k => fromTime(time, run[k], t0).y; return { prot: blockStats(f('protRmsd')), lig: blockStats(f('ligRmsd')), rg: blockStats(f('rg')), hb: blockStats(f('hbonds')), dG: blockStats(f('dG')), settled: plateau(time, run.protRmsd), ligSettled: plateau(time, run.ligRmsd), escape: escapeTime(time, run.dist), occ: occupancy(fromTime(time, run.hbonds, t0).y) };
}
export const verdict = (s) => s.escape != null ? 'left' : !s.settled.settled ? 'drifting' : (s.lig.mean < 2.5 && s.ligSettled.settled) ? 'stable' : 'unclear';
