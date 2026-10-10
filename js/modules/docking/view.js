// Shared helpers for the docking steps' 3D scenes.
import { h } from '../../ui.js';
import { createViewer, ligandGroup, pocketGroup, callout, labelBar } from '../../viewer3d.js';
export { ligandAtoms, ligandPoints, compound, analyseLigands, le } from './compounds.js';

export const NO3D = () => h('div', { class: 'view3d-note' }, 'The 3D picture needs WebGL, which this browser does not provide. You can still do the activity with the controls and read the results below.');
/** Create a viewer or a note when WebGL is missing. Returns the viewer, or null. */
export function viewer(host, opts) { const v = createViewer(host, opts); if (!v) host.append(NO3D()); return v; }
export const NOTE_NUMBERING = 'Residue numbers follow the usual COX-2 literature (the PDB file numbers are 14 to 15 lower).';
export { ligandGroup, pocketGroup };

export const KEYCOL = { ligand: '#d4ff3a', residue: '#5eead4', hbond: '#ffe14a', protein: '#9fd8e6', haem: '#ff9f43', box: '#fc7a7a', docked: '#fc7a7a', key: '#ff8a8a' };
const mean = pts => pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
/** Name the parts of the picture. what: any of 'ligand', 'residue', 'protein', 'haem', 'hbond'. Returns { group, items } to hand to labelBar(). */
export function nameParts(v, st, what, { ligandText = 'The ligand (celecoxib)', residueLabel = 'HIS90', ligandAt = [0, 0, 0] } = {}) {
  if (!v) return null;
  const group = new (v.THREE.Group)(), items = []; let ligand = null;
  const res = st.pocket.find(r => r.label === residueLabel) ?? st.pocket[0];
  if (what.includes('ligand')) { ligand = callout(ligandText, ligandAt, [10, -7, 5], KEYCOL.ligand); group.add(ligand); items.push({ label: 'Ligand: the drug being docked', color: KEYCOL.ligand }); }
  if (what.includes('residue')) { const at = mean(res.atoms.map(a => [a[1], a[2], a[3]])); group.add(callout('Residue (amino acid)', at, [-9, 3, 5], KEYCOL.residue)); items.push({ label: 'Residues: protein amino acids touching the ligand', color: KEYCOL.residue }); }
  if (what.includes('protein')) { const far = st.ca.filter(c => c[2] < 2).sort((a, b) => Math.hypot(a[0] - 17, a[1] + 6, a[2]) - Math.hypot(b[0] - 17, b[1] + 6, b[2]))[0]; group.add(callout('The protein (COX-2)', [far[0], far[1], far[2]], [-4, 10, 6], KEYCOL.protein)); items.push({ label: 'Protein: the enzyme (ribbon)', color: KEYCOL.protein }); }
  if (what.includes('haem') && st.heme?.atoms.length) { const at = mean(st.heme.atoms.map(a => [a[1], a[2], a[3]])); group.add(callout('Haem (cofactor)', at, [7, 7, 5], KEYCOL.haem)); items.push({ label: 'Haem: a helper molecule built into the enzyme', color: KEYCOL.haem }); }
  if (what.includes('hbond')) items.push({ label: 'Hydrogen bond: the glowing beads', color: KEYCOL.hbond });
  v.root.add(group);
  return { group, items, ligand };
}
export { callout, labelBar };
