// Shared helpers for the docking steps' 3D scenes.
import { h } from '../../ui.js';
import { createViewer, ligandGroup, pocketGroup } from '../../viewer3d.js';
export { ligandAtoms, ligandPoints, compound, analyseLigands, le } from './compounds.js';

export const NO3D = () => h('div', { class: 'view3d-note' }, 'The 3D picture needs WebGL, which this browser does not provide. You can still do the activity with the controls and read the results below.');
/** Create a viewer or a note when WebGL is missing. Returns the viewer, or null. */
export function viewer(host, opts) { const v = createViewer(host, opts); if (!v) host.append(NO3D()); return v; }
export const NOTE_NUMBERING = 'Residue numbers follow the usual COX-2 literature (the PDB file numbers are 14 to 15 lower).';
export { ligandGroup, pocketGroup };
