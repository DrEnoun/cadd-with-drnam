"""Builds data/md/runs.json for Module 6 (molecular dynamics).
THE CURVES ARE SIMULATED, NOT FROM A REAL MD RUN. They come from a stochastic model (correlated noise, relaxation, a ligand-escape event) tuned to look
like typical 100 ns trajectories. Real inputs: the 3LN1 structure (radius of gyration, crystallographic B-factors for the RMSF profile, geometry of
possible hydrogen-bond partners of celecoxib). Run: python3 tools/make-md-data.py"""
import json, math
import numpy as np
rng = np.random.default_rng(20261012)
st = json.load(open('data/docking/cox2.json'))
ca = np.array([c[:3] for c in st['ca']]); resnum = [c[4] for c in st['ca']]
# B-factors of C-alpha atoms from the real file
B = {}
for line in open('data/docking/3LN1_chainA.pdb'):
    if line.startswith('ATOM') and line[12:16].strip() == 'CA': B[int(line[22:26])] = float(line[60:66])
b = np.array([B.get(r, 30.0) for r in resnum])
rmsf_exp = np.sqrt(3 * b / (8 * math.pi ** 2))            # Angstrom, from B = 8 pi^2 <u^2> / 3
rg0 = float(np.sqrt(((ca - ca.mean(0)) ** 2).sum(1).mean()))
# possible hydrogen bonds between celecoxib and pocket residues (N/O pairs closer than 3.4 A) from the real crystal geometry
lig = [(a[0], np.array(a[1:4])) for a in st['ligand']['atoms'] if a[0] in 'NO']
hb = []
for r in st['pocket']:
    for a in r['atoms']:
        if a[0] not in 'NO': continue
        for le, lp in lig:
            d = float(np.linalg.norm(np.array(a[1:4]) - lp))
            if d < 3.4: hb.append({'res': r['label'], 'atom': a[4] if len(a) > 4 else a[0], 'ligandElement': le, 'dist': round(d, 2)})
seen = {}; [seen.setdefault(x['res'], x) for x in sorted(hb, key=lambda x: x['dist'])]
hbonds = list(seen.values())
T = 100.0; n = 1000; t = np.arange(n) * T / n; dt = T / n
def ar1(n, phi, sd):  # stationary AR(1)
    x = np.zeros(n); e = rng.normal(0, sd * math.sqrt(1 - phi ** 2), n); x[0] = rng.normal(0, sd)
    for i in range(1, n): x[i] = phi * x[i - 1] + e[i]
    return x
def relax(t, a0, a1, tau): return a1 + (a0 - a1) * np.exp(-t / tau)
def run_stable():
    prot = relax(t, .4, 1.55, 6.0) + ar1(n, .985, .13)
    ligr = relax(t, .3, 1.05, 3.0) + ar1(n, .95, .22) + 0.35 * (t > 42) * (t < 55)   # one short side-step
    rg = rg0 * (1 + .0006 * np.exp(-t / 15)) + ar1(n, .97, .06)
    dist = relax(t, .2, .7, 3.0) + ar1(n, .95, .15)
    return prot, ligr, rg, dist, 1.0
def run_candB():  # the docking analogue with the complete set of interactions: stable, slightly looser than celecoxib
    prot = relax(t, .4, 1.6, 6.5) + ar1(n, .985, .13)
    ligr = relax(t, .3, 1.35, 3.5) + ar1(n, .95, .26) + 0.3 * (t > 60) * (t < 72)
    rg = rg0 * (1 + .0006 * np.exp(-t / 15)) + ar1(n, .97, .06)
    dist = relax(t, .2, .8, 3.0) + ar1(n, .95, .17)
    return prot, ligr, rg, dist, 1.0
def run_candA():  # the large compound with an inflated score: partly outside the pocket from the start, leaves at about 48 ns
    prot = relax(t, .4, 1.6, 7.0) + ar1(n, .985, .13)
    esc = 1 / (1 + np.exp(-(t - 48) / 3.0))
    ligr = relax(t, .8, 3.0, 4.0) + esc * (5.5 + .07 * (t - 48).clip(0)) + ar1(n, .96, .34) * (1 + esc)
    rg = rg0 * (1 + .0007 * np.exp(-t / 15)) + ar1(n, .97, .06)
    dist = relax(t, .6, 2.4, 4.0) + esc * (5.0 + .07 * (t - 48).clip(0)) + ar1(n, .95, .3) * (1 + esc)
    return prot, ligr, rg, dist, 0.0
def run_candC():  # the small fragment: stays near the pocket but moves around a lot (few contacts)
    prot = relax(t, .4, 1.55, 6.0) + ar1(n, .985, .13)
    ligr = relax(t, .5, 3.4, 4.0) + ar1(n, .96, .55)
    rg = rg0 * (1 + .0006 * np.exp(-t / 15)) + ar1(n, .97, .06)
    dist = relax(t, .4, 2.5, 4.0) + ar1(n, .95, .5)
    return prot, ligr, rg, dist, .6
def run_drift():  # protein not equilibrated: slow unfolding-like drift, ligand is carried along
    prot = .5 + .045 * t + ar1(n, .985, .18)
    ligr = relax(t, .3, 1.3, 3.0) + .018 * t + ar1(n, .95, .24)
    rg = rg0 * (1 + .0004 * t) + ar1(n, .97, .06)
    dist = relax(t, .2, .9, 3.0) + .01 * t + ar1(n, .95, .18)
    return prot, ligr, rg, dist, .7
def hbond_series(occ, bound):  # one two-state process per hydrogen bond partner; occupancy falls to zero when the ligand has left
    tot = np.zeros(n)
    for p in occ:
        s = np.zeros(n); state = 1
        for i in range(n):
            stay = .8
            if rng.random() > stay: state = 1 if rng.random() < p else 0
            s[i] = state
        tot += s
    return tot * bound
def mmgbsa(bound_mean, dist):  # kcal/mol: bound level plus noise, near zero once the ligand has left
    x = bound_mean + ar1(n, .9, 3.2); out = np.where(dist < 3.2, x, -2.0 + ar1(n, .8, 1.5)); return out
def rmsf(scale, kind):
    base = scale * rmsf_exp * .72 + .15
    # smooth correlated variation along the sequence, plus larger ends
    wav = np.convolve(rng.normal(0, .12, len(base) + 20), np.ones(9) / 9, mode='same')[10:10 + len(base)]
    ends = np.zeros(len(base)); ends[:12] = np.linspace(1.4, 0, 12); ends[-12:] = np.linspace(0, 1.1, 12)
    return (base + wav + ends).clip(.2)
runs = {}
for key, fn, name, desc, occ, mm in [
    ('ref', run_stable, 'Reference: celecoxib, crystal pose', 'The known drug in its crystal pose. The control for the project.', [.9, .85, .8, .6, .45], -41),
    ('candB', run_candB, 'Compound B', 'The celecoxib analogue with the complete set of key interactions.', [.9, .8, .75, .55, .4], -43),
    ('candA', run_candA, 'Compound A', 'The large compound whose docking score was inflated by its size.', [.35, .15, .1, .05, .05], -45),
    ('candC', run_candC, 'Compound C', 'The small fragment with few contacts.', [.55, .4, .3, .1, .1], -24),
    ('drift', run_drift, 'Celecoxib, run not equilibrated', 'Same pose as the reference, but the system was not equilibrated properly.', [.85, .8, .7, .55, .4], -36)]:
    prot, ligr, rg, dist, bound = fn()
    hbc = hbond_series(occ, 1.0)
    if key == 'candA': hbc = hbc * (1 / (1 + np.exp((t - 48) / 3.0)))
    run = {'name': name, 'about': desc, 'protRmsd': np.round(prot, 3).tolist(), 'ligRmsd': np.round(ligr.clip(.1), 3).tolist(), 'rg': np.round(rg, 3).tolist(), 'dist': np.round(dist.clip(.1), 3).tolist(), 'hbonds': np.round(hbc).astype(int).tolist(),
           'dG': np.round(mmgbsa(mm, dist), 2).tolist(), 'rmsf': np.round(rmsf(1.0 if key != 'drift' else 1.35, key), 3).tolist()}
    runs[key] = run
# per-residue decomposition for the pocket residues (illustrative)
dec = {r['label']: round(float(-rng.uniform(.4, 4.8)), 1) for r in st['pocket']}
for r in ['ARG513', 'HIS90', 'GLN192', 'VAL523', 'LEU352', 'PHE518']: dec[r] = round(dec.get(r, -2) - 1.6, 1)
out = {'_about': 'SIMULATED curves for Module 6. Not from a real molecular dynamics run. Real inputs: 3LN1 C-alpha radius of gyration, crystallographic B-factors (RMSF profile) and the geometry of possible hydrogen-bond partners. Everything else comes from a stochastic model in tools/make-md-data.py.',
       'time': np.round(t, 2).tolist(), 'dt': dt, 'length': T, 'rg0': round(rg0, 3), 'resnum': resnum, 'rmsfExp': np.round(rmsf_exp, 3).tolist(), 'hbondPartners': hbonds, 'runs': runs, 'pocketResidues': {r['label']: r['seq'] for r in st['pocket']}, 'decomposition': dec}
json.dump(out, open('data/md/runs.json', 'w'), separators=(',', ':'))
print({k: (round(float(np.mean(v['protRmsd'][500:])), 2), round(float(np.mean(v['ligRmsd'][500:])), 2)) for k, v in runs.items()})
