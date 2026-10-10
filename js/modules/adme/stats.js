// Pure maths for the ADME module (no DOM, testable in Node).

// ---- BOILED-Egg style map (simplified). White = likely passive gut absorption, yolk = also likely to cross the blood-brain barrier.
// The ellipses are a teaching approximation of Daina and Zoete (2016), drawn in (TPSA, cLogP) space.
export const EGG = { white: { cx: 71, cy: 2.25, a: 75, b: 4.9 }, yolk: { cx: 39.5, cy: 3.0, a: 42, b: 2.7 } };
const inEllipse = (tpsa, logp, e) => ((tpsa - e.cx) / e.a) ** 2 + ((logp - e.cy) / e.b) ** 2 <= 1;
export const eggClass = c => inEllipse(c.tpsa, c.wlogp, EGG.yolk) ? 'yolk' : inEllipse(c.tpsa, c.wlogp, EGG.white) ? 'white' : 'out';
export const EGG_TEXT = { yolk: 'Gut absorption likely, and it can cross the blood-brain barrier (by passive diffusion)', white: 'Gut absorption likely; unlikely to cross the blood-brain barrier', out: 'Outside the egg: absorption unlikely by passive diffusion (too polar, or too greasy)' };

// ---- solubility (ESOL, Delaney 2004): classes by logS (log10 mol/L)
export const solClass = logS => logS > -2 ? 'very soluble' : logS > -4 ? 'soluble' : logS > -6 ? 'moderately soluble' : logS > -10 ? 'poorly soluble' : 'insoluble';
export const SOL_ORDER = ['insoluble', 'poorly soluble', 'moderately soluble', 'soluble', 'very soluble'];
/** Does the dose dissolve in a glass of water (250 mL)? solmgml * 250 compared with the dose in mg. */
export const dissolves = (c, doseMg, volMl = 250) => c.solmgml * volMl >= doseMg;

// ---- ionisation (Henderson-Hasselbalch)
export const fractionNeutral = (kind, pKa, pH) => kind === 'acid' ? 1 / (1 + 10 ** (pH - pKa)) : kind === 'base' ? 1 / (1 + 10 ** (pKa - pH)) : 1;
/** Total drug in compartment B relative to compartment A when only the neutral form crosses the membrane ("ion trapping"). */
export const trapRatio = (kind, pKa, pHa, pHb) => kind === 'acid' ? (1 + 10 ** (pHb - pKa)) / (1 + 10 ** (pHa - pKa)) : kind === 'base' ? (1 + 10 ** (pKa - pHb)) / (1 + 10 ** (pKa - pHa)) : 1;
export const PH = { stomach: 1.5, duodenum: 5.5, intestine: 6.8, blood: 7.4 };

// ---- one-compartment oral pharmacokinetics
export const rateFromHalfLife = tHalf => Math.LN2 / tHalf;
export const clearance = (V, tHalf) => rateFromHalfLife(tHalf) * V;
/** Concentration (mg/L) at time t (h) after one oral dose. F = fraction absorbed, D = dose (mg), V = volume of distribution (L), ka, ke = rate constants (1/h). */
export function conc1(t, { F, D, V, ka, ke }) {
  if (t <= 0) return 0;
  if (Math.abs(ka - ke) < 1e-6) return F * D / V * ke * t * Math.exp(-ke * t);
  return F * D * ka / (V * (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
}
/** Concentration with repeated doses every tau hours (superposition), nDoses doses. */
export const concMulti = (t, p, tau, nDoses) => { let c = 0; for (let k = 0; k < nDoses; k++) c += conc1(t - k * tau, p); return c; };
export function tmaxCmax(p) {
  const { ka, ke } = p; const tmax = Math.abs(ka - ke) < 1e-6 ? 1 / ke : Math.log(ka / ke) / (ka - ke);
  return { tmax, cmax: conc1(tmax, p) };
}
export const auc = p => p.F * p.D / (p.ke * p.V);                                  // mg·h/L, = F·D/CL
export const accumulation = (ke, tau) => 1 / (1 - Math.exp(-ke * tau));
export const avgSteady = (p, tau) => p.F * p.D / (p.ke * p.V * tau);
export const timeToSteady = tHalf => 4.3 * tHalf;                                    // about 95% of steady state after ~4.3 half-lives

// ---- metabolic soft spots
export const spotDefs = lib => lib.spots;
export const spotTypes = d => [...new Set(d.spots.map(s => s.type))];
export const spotAtoms = d => [...new Set(d.spots.map(s => s.atom))];

// ---- report card used in the last step
export function reportCard(d, doseMg = 200) {
  const egg = eggClass(d), cls = solClass(d.esol);
  const checks = [
    { id: 'abs', label: 'Gut absorption (egg)', pass: egg !== 'out', text: egg === 'out' ? 'Outside the egg' : egg === 'yolk' ? 'In the yolk' : 'In the white' },
    { id: 'sol', label: 'Solubility', pass: SOL_ORDER.indexOf(cls) >= 2, text: `${cls} (logS ${d.esol})` },
    { id: 'ro5', label: 'Rule of five', pass: d.ro5 === 0, text: d.ro5 === 0 ? 'No violations' : `${d.ro5} violation${d.ro5 > 1 ? 's' : ''}` },
    { id: 'met', label: 'Metabolic soft spots', pass: spotTypes(d).length <= 3, text: `${spotTypes(d).length} type${spotTypes(d).length === 1 ? '' : 's'} found` },
    { id: 'pains', label: 'Assay-interference scaffold', pass: !d.pains, text: d.pains ? 'PAINS alert' : 'None' },
  ];
  return { egg, cls, checks, passed: checks.filter(c => c.pass).length };
}
