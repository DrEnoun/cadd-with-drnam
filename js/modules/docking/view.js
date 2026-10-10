// Shared helpers for the docking steps' 3D scenes.
import { h } from '../../ui.js';
import { createViewer, ligandGroup, pocketGroup } from '../../viewer3d.js';

export const ligandAtoms = data => data.ligand3d.atoms.map(a => ({ el: a[0], p: [a[1], a[2], a[3]] }));
export const ligandPoints = data => data.ligand3d.atoms.map(a => [a[1], a[2], a[3]]);
/** Atoms and bonds of one of the mock compounds. */
export function compound(data, id) {
  const L = data.ligand3d; let atoms = ligandAtoms(data), bonds = L.bonds.map(b => [...b]);
  if (id === 'A') { L.extra.A.forEach(a => atoms.push({ el: a[0], p: [a[1], a[2], a[3]] })); bonds.push(...L.extra.A_bonds.map(b => [...b])); }
  if (id === 'C') {
    const keep = L.fragment, map = new Map(keep.map((k, i) => [k, i]));
    atoms = keep.map(k => atoms[k]); bonds = bonds.filter(([i, j]) => map.has(i) && map.has(j)).map(([i, j]) => [map.get(i), map.get(j)]);
  }
  return { atoms, bonds };
}
export const NO3D = () => h('div', { class: 'view3d-note' }, 'The 3D picture needs WebGL, which this browser does not provide. You can still do the activity with the controls and read the results below.');
/** Create a viewer or a note when WebGL is missing. Returns { v, el } where v may be null. */
export function viewer(host, opts) { const v = createViewer(host, opts); if (!v) host.append(NO3D()); return v; }
export { ligandGroup, pocketGroup };
