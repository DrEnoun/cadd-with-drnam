// Step 3 — Temperature, thermostat and equilibration: heat a crystal-like start, watch it melt, and learn when to start measuring.
import { h, feedback } from '../../ui.js';
import { LJSim } from './stats.js';
import { particleView } from './scenes.js';
import { linePlot } from './plot.js';

export function render(host, api) {
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'A simulation does not start in a realistic state. Atoms are placed, then given speed to match a temperature. At first the system is far from balance, so the first part of every run must be thrown away. Learning to see when the system has settled is one of the most important skills in reading MD.'),
    h('p', {}, 'The particles start on a neat lattice (like a crystal). A thermostat tells the system what temperature to have. Raise the target temperature and watch the lattice melt into a liquid. The graph on the right (radial distribution function) shows the structure: sharp peaks mean order, a flat line means a gas.'));
  const simhost = h('div'); host.append(simhost);
  let sim = new LJSim({ n: 5, rho: .75, T: .2, dt: .004, seed: 5 }), target = .2, thermo = true; sim.thermostat = { tau: .4, T: target };
  const pv = particleView(simhost, sim, { height: 340 }), Tt = [], Ts = [], Ps = [];
  const cvT = h('canvas', { style: 'width:100%;border-radius:12px;background:#fff', role: 'img', 'aria-label': 'Temperature against time' }), cvG = h('canvas', { style: 'width:100%;border-radius:12px;background:#fff', role: 'img', 'aria-label': 'Radial distribution function' }), msg = h('div', { class: 'stack' }), val = h('b', {});
  const sl = h('input', { type: 'range', min: 1, max: 30, step: 1, value: 2, 'aria-label': 'Target temperature', oninput: () => { target = +sl.value / 10; val.textContent = target.toFixed(1); sim.thermostat = thermo ? { tau: .4, T: target } : null; api.log('T', target); } }); val.textContent = target.toFixed(1);
  const cb = h('input', { type: 'checkbox', checked: true, onchange: e => { thermo = e.target.checked; sim.thermostat = thermo ? { tau: .4, T: target } : null; api.log('thermostat', thermo ? 1 : 0); } });
  let n = 0, maxT = 0;
  if (pv) pv.ctl.onStep = () => {
    n++; if (n % 8) return; Tt.push(sim.time); Ts.push(sim.temperature()); Ps.push(sim.pe / sim.N); if (Tt.length > 300) { Tt.shift(); Ts.shift(); Ps.shift(); } maxT = Math.max(maxT, target);
    if (n % 40) return;
    linePlot(cvT, [{ x: Tt, y: Ts, label: 'Temperature' }, { x: Tt, y: Ps.map(p => p + 5), label: 'Potential energy per particle (shifted)', color: '#e8590c' }], { w: 420, h: 240, xlabel: 'Time (reduced)', ylabel: 'T (reduced)', hlines: [{ y: target, label: 'target', color: '#2b9348' }], ymin: 0, ymax: 3.6 });
    const g = sim.rdf(50); linePlot(cvG, [{ x: g.map(p => p[0]), y: g.map(p => p[1]), label: 'g(r)' }], { w: 420, h: 240, xlabel: 'Distance r (particle diameters)', ylabel: 'g(r)', ymin: 0, ymax: 4 });
    const ordered = g[Math.round(g.length * .22)]?.[1] > 2.2 && target < .8, T = sim.temperature(), off = Math.abs(T - target) / target;
    msg.replaceChildren(
      off > .15 && thermo ? feedback('bad', 'Not at the target yet', `The system is at ${T.toFixed(2)}, the target is ${target.toFixed(1)}. It has not equilibrated. Measurements taken now would be wrong, so equilibration time is discarded.`) : feedback('ok', 'Close to the target', `Temperature ${T.toFixed(2)} (target ${target.toFixed(1)}).`),
      !thermo ? feedback('bad', 'No thermostat', 'Without a thermostat the temperature is free to drift as energy turns between motion and position. A real production run on a protein needs temperature control.') : '',
      target >= 1.5 ? feedback('ok', 'Hot fluid', 'Peaks of g(r) are low and wide: no long-range order, as in a hot liquid.') : ordered ? feedback('ok', 'Still ordered', 'Sharp peaks: the particles keep a regular arrangement, like a solid.') : '');
    api.done({ target, thermostat: thermo ? 1 : 0, temperature: +T.toFixed(2), time: +sim.time.toFixed(1) }); api.unlockNext();
  };
  host.append(h('label', {}, 'Target temperature: ', val, ' (reduced units; about 0.7 is a liquid, 0.2 a solid)', sl), h('label', { class: 'opt' }, cb, h('span', {}, 'Thermostat on')), h('div', { class: 'grid2' }, cvT, cvG), msg,
    h('p', { class: 'hint' }, 'In a protein run the same idea is used in steps: heating (for example to 300 K), then equilibration at constant volume (NVT) and constant pressure (NPT), and only then the production run that you analyse.'), api.nav(true));
  return () => pv?.v.dispose();
}
