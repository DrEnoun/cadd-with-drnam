"""Builds data/homology/structures.json for Module 4 (homology modelling) from real PDB files with Biopython.
Target: rat GluA2 N-terminal domain (3HSY chain A). Templates: GluA3 NTD (3O21, 3P3W, 6FLR) and two unrelated proteins (1AKE, 3MHT).
Also builds an empirical Ramachandran map from many real chains. PDB files are read from a folder given on the command line
(here taken from the test data of open-source packages). Run:  python3 -I tools/prepare-homology.py <folder-with-pdb-files>
Needs: pip install biopython numpy"""
import glob, gzip, json, math, os, re, sys
import numpy as np
from Bio.PDB import PDBParser, PPBuilder, calc_dihedral
from Bio.SeqUtils import seq1
from Bio import Align
import warnings; warnings.filterwarnings('ignore')
root = sys.argv[1]
def find(name): return next(f for f in glob.glob(root + '/**/' + name, recursive=True))
def parse(path):
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt') as h: return PDBParser(QUIET=True).get_structure('x', h)
AA = set('ACDEFGHIKLMNPQRSTVWY')
def residues(chain):
    out = []
    for r in chain:
        if r.id[0] != ' ' or not all(a in r for a in ('N', 'CA', 'C')): continue
        a = seq1(r.get_resname())
        if a in AA: out.append(r)
    return out
def dihedrals(res):
    phi, psi = [], []
    for i, r in enumerate(res):
        def ok(a, b): return abs(a['C'].coord.__sub__(b['N'].coord).dot(a['C'].coord - b['N'].coord)) ** .5 < 1.8
        p = calc_dihedral(res[i-1]['C'].get_vector(), r['N'].get_vector(), r['CA'].get_vector(), r['C'].get_vector()) * 180 / math.pi if i > 0 and np.linalg.norm(res[i-1]['C'].coord - r['N'].coord) < 1.8 else None
        s = calc_dihedral(r['N'].get_vector(), r['CA'].get_vector(), r['C'].get_vector(), res[i+1]['N'].get_vector()) * 180 / math.pi if i < len(res) - 1 and np.linalg.norm(r['C'].coord - res[i+1]['N'].coord) < 1.8 else None
        phi.append(p); psi.append(s)
    return phi, psi
def ss_from_ca(ca):
    n = len(ca); ss = [0] * n; d = lambda i, j: float(np.linalg.norm(ca[i] - ca[j])) if 0 <= i < n and 0 <= j < n else 99
    cont = lambda i: all(np.linalg.norm(ca[k+1] - ca[k]) < 4.2 for k in range(max(0, i-1), min(n-1, i+4)))
    for i in range(n):
        if cont(i) and 4.7 < d(i, i+3) < 5.8 and 5.6 < d(i, i+4) < 6.8: ss[i] = 1
    for i in range(n - 2):
        if cont(i) and d(i, i+2) > 6.1 and ss[i] == 0: ss[i] = 2
    # a helix needs 4+ in a row, a strand 3+
    def clean(val, minlen):
        i = 0
        while i < n:
            if ss[i] == val:
                j = i
                while j < n and ss[j] == val: j += 1
                if j - i < minlen:
                    for k in range(i, j): ss[k] = 0
                i = j
            else: i += 1
    clean(1, 4); clean(2, 3)
    # extend helices by 3 so the whole helix is marked
    out = ss[:]
    for i in range(n):
        if ss[i] == 1:
            for k in range(i, min(n, i + 4)): out[k] = 1
    return out
def meta(path):
    t = open(path).read().splitlines(); g = lambda p: [l for l in t if l.startswith(p)]
    res = re.search(r'RESOLUTION\.\s+([\d.]+)', '\n'.join(g('REMARK   2')))
    title = ' '.join(l[10:].strip() for l in g('TITLE')).title()
    jr = ' '.join(l[19:].strip() for l in g('JRNL        TITL')).title(); au = ' '.join(l[19:].strip() for l in g('JRNL        AUTH'))
    ref = [l for l in g('JRNL        REF ')]; doi = [l for l in g('JRNL        DOI')]
    mol = [l[20:].strip().rstrip(';') for l in g('COMPND') if 'MOLECULE:' in l]
    org = [l.split(':')[1].strip().rstrip(';') for l in g('SOURCE') if 'ORGANISM_COMMON' in l]
    return dict(resolution=float(res.group(1)) if res else None, title=title, paper=jr, authors=au, ref=ref[0][19:].strip() if ref else '', doi=doi[0][19:].strip() if doi else '', molecule=mol[0].title() if mol else '', organism=org[0].title() if org else '')
def entry(pdb, chain, label, note):
    path = find(pdb); s = parse(path); ch = s[0][chain]; res = residues(ch)
    ca = np.array([r['CA'].coord for r in res]); phi, psi = dihedrals(res)
    cen = ca.mean(axis=0); seq = ''.join(seq1(r.get_resname()) for r in res)
    bur = [int(np.sum(np.linalg.norm(ca - c, axis=1) < 10) - 1) for c in ca]
    return dict(id=pdb.replace('pdb', '').replace('.pdb', '').upper(), chain=chain, label=label, note=note, seq=seq, resnum=[r.id[1] for r in res],
        ca=[[round(float(x), 2) for x in (c - cen)] for c in ca], ss=ss_from_ca(ca), phi=[None if p is None else round(p, 1) for p in phi], psi=[None if p is None else round(p, 1) for p in psi], burial=bur, **meta(path)), ca - cen
ENTRIES = [('pdb3hsy.pdb', 'A', 'target', 'Rat GluA2 N-terminal domain. In the exercise this structure is hidden until the end and used as the "truth".'),
           ('pdb3o21.pdb', 'A', 't1', 'Rat GluA3 N-terminal domain, high resolution.'),
           ('pdb3p3w.pdb', 'A', 't2', 'Rat GluA3 N-terminal domain, very low resolution.'),
           ('pdb6flr.pdb', 'A', 't3', 'Rat GluA3 N-terminal domain in a different, "super-open" shape.'),
           ('pdb1ake.pdb', 'A', 't4', 'E. coli adenylate kinase: an unrelated protein.'),
           ('pdb3mht.pdb', 'A', 't5', 'A DNA methyltransferase: an unrelated protein.')]
data, coords = {}, {}
for e in ENTRIES:
    d, c = entry(*e); data[e[2]] = d; coords[e[2]] = c
    print(e[2], d['id'], d['organism'], len(d['seq']), 'res', d['resolution'], d['molecule'])
# sequence alignment (BLOSUM62, gap 10/0.5) and a structure-based reference alignment (CA superposition + DP)
al = Align.PairwiseAligner(); al.mode = 'global'; al.substitution_matrix = Align.substitution_matrices.load('BLOSUM62'); al.open_gap_score = -10; al.extend_gap_score = -0.5
def pairs_from(aln): return [(i0 + k, j0 + k) for (i0, i1), (j0, j1) in zip(*aln.aligned) for k in range(i1 - i0)]
def kabsch(P, Q):
    Pc, Qc = P - P.mean(0), Q - Q.mean(0); U, S, Vt = np.linalg.svd(Pc.T @ Qc); d = np.sign(np.linalg.det(Vt.T @ U.T)); D = np.diag([1, 1, d]); R = Vt.T @ D @ U.T
    return R, Q.mean(0) - R @ P.mean(0)
def struct_align(ta, tb):
    # dynamic programming on CA distances after superposing with the sequence-based alignment
    pr = pairs_from(al.align(data[ta]['seq'], data[tb]['seq'])[0]); A, B = coords[ta], coords[tb]
    for _ in range(3):
        R, t = kabsch(B[[j for i, j in pr]], A[[i for i, j in pr]]); Bm = (R @ B.T).T + t
        D = np.linalg.norm(A[:, None, :] - Bm[None, :, :], axis=2); sc = 4.0 - D; sc[D > 5] = -3
        n, m = D.shape; H = np.zeros((n + 1, m + 1)); T = np.zeros((n + 1, m + 1), dtype=int); gap = -1.5
        H[:, 0] = np.arange(n + 1) * gap; H[0, :] = np.arange(m + 1) * gap
        for i in range(1, n + 1):
            for j in range(1, m + 1):
                opts = (H[i-1, j-1] + sc[i-1, j-1], H[i-1, j] + gap, H[i, j-1] + gap); k = int(np.argmax(opts)); H[i, j] = opts[k]; T[i, j] = k
        i, j, out = n, m, []
        while i > 0 and j > 0:
            if T[i, j] == 0:
                if D[i-1, j-1] < 4.0: out.append((i - 1, j - 1))
                i -= 1; j -= 1
            elif T[i, j] == 1: i -= 1
            else: j -= 1
        pr = out[::-1]
        if len(pr) < 10: break
    return pr
def rmsd(P, Q):
    R, t = kabsch(P, Q); return float(np.sqrt(np.mean(np.sum(((R @ P.T).T + t - Q) ** 2, axis=1))))
for tid in ('t1', 't2', 't3', 't4', 't5'):
    T, G = data[tid], data['target']; seq_pr = pairs_from(al.align(G['seq'], T['seq'])[0])
    ident = sum(1 for i, j in seq_pr if G['seq'][i] == T['seq'][j]) / len(G['seq'])
    ref_pr = struct_align('target', tid) if tid in ('t1', 't2', 't3') else seq_pr
    T['seqIdentity'] = round(ident, 3); T['coverage'] = round(len(seq_pr) / len(G['seq']), 3); T['refAlign'] = [[int(i), int(j)] for i, j in ref_pr]
    T['rmsdTruth'] = round(rmsd(coords[tid][[j for i, j in ref_pr]], coords['target'][[i for i, j in ref_pr]]), 2) if len(ref_pr) > 10 else None
    print(tid, T['id'], 'identity', T['seqIdentity'], 'coverage', T['coverage'], 'refpairs', len(ref_pr), 'rmsd to truth', T['rmsdTruth'])
# empirical Ramachandran map from many real chains (non-Gly, non-Pro), 10-degree bins
grid = np.zeros((36, 36)); n_res = 0
for f in glob.glob(root + '/**/*', recursive=True):
    if not f.endswith(('.pdb', '.pdb.gz', '.ent')): continue
    try:
        s = parse(f)
        for ch in s[0]:
            res = residues(ch)
            if len(res) < 40: continue
            phi, psi = dihedrals(res)
            for r, p, q in zip(res, phi, psi):
                if p is None or q is None or r.get_resname() in ('GLY', 'PRO'): continue
                grid[int((q + 180) // 10) % 36, int((p + 180) // 10) % 36] += 1; n_res += 1
    except Exception: pass
order = np.argsort(grid.ravel())[::-1]; cum = np.cumsum(grid.ravel()[order]) / grid.sum(); cls = np.zeros(grid.size, dtype=int)
cls[order[cum <= 0.95]] = 2; cls[order[(cum > 0.95) & (cum <= 0.995)]] = 1
print('Ramachandran from', n_res, 'residues; favoured cells', int((cls == 2).sum()), 'allowed', int((cls == 1).sum()))
json.dump(dict(_about='Real structures from the Protein Data Bank (public domain), read with Biopython. ca = C-alpha coordinates (A, centred), ss = 0 coil 1 helix 2 strand (from C-alpha geometry), phi and psi in degrees, burial = number of C-alpha atoms within 10 A. rama[psi_bin][phi_bin] = 2 favoured, 1 allowed, 0 outlier (empirical, 10-degree bins, from the residues of many real chains). refAlign = structure-based alignment (target index, template index).',
    rama=cls.reshape(36, 36).tolist(), ramaResidues=n_res, structures=data), open('data/homology/structures.json', 'w'), separators=(',', ':'))
print('written', os.path.getsize('data/homology/structures.json') // 1024, 'KB')
