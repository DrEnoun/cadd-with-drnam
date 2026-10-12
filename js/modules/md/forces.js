// Step 2 — Forces and time steps: a real, small MD simulation (Lennard-Jones particles) in the browser.
import { h, feedback } from '../../ui.js';
import { LJSim } from './stats.js';
import { particleView } from './scenes.js';
import { linePlot } from './plot.js';

export function render(host, api) {
  host.append(
    h('div', { class: 'why' }, h('strong', {}, 'Why do we do this? '), 'MD is simple at heart: work out the force on every atom, move every atom a tiny step, and repeat millions of times. The size of the step matters a great deal. Too big and the simulation falls apart; too small and you waste computer time. Here you can run the real thing on a small box of particles.'),
    h('p', {}, 'Each ball is an atom that attracts its neighbours at a distance and repels them up close (a Lennard-Jones force, in reduced units). The simulation uses the velocity-Verlet method that real MD programs use. Colour shows speed. The total energy of an isolated system should stay constant.'));
  const simhost = h('div', { class: 'simhost' }); host.append(simhost);
  let dt = .004, sim = new LJSim({ n: 5, rho: .7, T: 1, dt }), pv = particleView(simhost, sim, { height: 360 });
  const E = [], tt = [], cv = h('canvas', { style: 'width:100%;max-width:640px;border-radius:12px;background:#fff', role: 'img', 'aria-label': 'Total energy against time' }), msg = h('div', { class: 'stack' }), val = h('b', {});
  let E0 = sim.energy(), count = 0, exploded = false;
  const reset = () => { sim = new LJSim({ n: 5, rho: .7, T: 1, dt }); E0 = sim.energy(); E.length = tt.length = 0; exploded = false; count = 0; if (pv) { pv.v.dispose(); pv = particleView(simhost, sim, { height: 360 }); hook(); } };
  const sl = h('input', { type: 'range', min: 1, max: 40, step: 1, value: 4, 'aria-label': 'Time step', oninput: () => { dt = +sl.value / 1000; val.textContent = dt.toFixed(3); sim.dt = dt; api.log('dt', dt); } });
  val.textContent = dt.toFixed(3);
  const hook = () => { if (!pv) return; pv.ctl.onStep = () => {
    count++; if (count % 6) return; const e = sim.energy(); if (!Number.isFinite(e) || Math.abs(e) > 1e6) { exploded = true; pv.ctl.run = false; }
    E.push(Number.isFinite(e) ? e : NaN); tt.push(sim.time); if (E.length > 400) { E.shift(); tt.shift(); }
    const drift = Math.abs((sim.energy() - E0) / Math.abs(E0)); lastDrift = drift; if (E.length % 8 === 0 || exploded) paint(drift);
  }; };
  let lastDrift = 0;
  const paint = drift => {
    linePlot(cv, [{ x: tt, y: E.map(x => Math.max(-1e4, Math.min(1e4, x))), label: 'Total energy' }], { xlabel: 'Simulation time (reduced units)', ylabel: 'Energy (reduced)', hlines: [{ y: E0, label: 'starting energy', color: '#2b9348' }] });
    msg.replaceChildren(
      exploded ? feedback('bad', 'The simulation exploded', 'The time step is too big. Atoms jump into each other, the forces become huge and the energy shoots up. Reset and use a smaller step.') : drift > .03 ? feedback('bad', `Energy drifting (${(drift * 100).toFixed(0)}%)`, 'The step is getting too large for the fastest motions. Energy should stay flat when nothing is added or removed.') : feedback('ok', `Energy stable (change ${(drift * 100).toFixed(2)}%)`, 'This time step follows the motion well.'));
    api.log('drift', +drift.toFixed(4)); api.done({ dt, drift: +drift.toFixed(4), exploded: exploded ? 1 : 0, time: +sim.time.toFixed(2) }); if (E.length > 20) api.unlockNext();
  };
  host.append(h('label', {}, 'Time step: ', val, ' (reduced units)', sl), h('div', { class: 'row', style: 'margin-top:8px' },
    h('button', { class: 'sticker', type: 'button', onclick: () => { if (pv) { pv.ctl.run = !pv.ctl.run; } } }, 'Pause / resume'), h('button', { class: 'sticker', type: 'button', onclick: reset }, 'Reset with this time step')), cv, msg,
    h('p', { class: 'hint' }, 'Real MD of proteins uses steps of 1 to 2 femtoseconds (0.000000000000001 s), because the fastest motion, a bond with a hydrogen atom, vibrates in about 10 fs. Special tricks (constraints) allow 2 fs. A 100 ns run is therefore 50 million steps.'),
    h('details', { class: 'fine' }, h('summary', {}, 'What is this simulation, exactly?'), h('p', {}, '125 particles in a periodic box (a particle leaving one side comes back on the opposite side), Lennard-Jones forces with a cut-off of 2.5, velocity-Verlet integration, reduced units. This is real molecular dynamics, but of a simple fluid and not of a protein.')));
  hook(); paint(0); host.append(api.nav(true));
  return () => pv?.v.dispose();
}
