"""Builds data/adme/drugs.json for Module 3 (ADME) from data/screening/library.json with RDKit:
cLogP (Crippen), TPSA, ESOL aqueous solubility (Delaney 2004) and metabolic 'soft spot' atoms found by SMARTS.
Run:  python3 tools/prepare-adme.py   (needs: pip install rdkit)"""
import json, math
from rdkit import Chem, RDLogger
from rdkit.Chem import Descriptors, Crippen, rdMolDescriptors
import rdkit
RDLogger.DisableLog('rdApp.*')
lib = json.load(open('data/screening/library.json'))['compounds']
# soft-spot classes: id -> (SMARTS with the atom to mark first, phase, short name)
SPOTS = {
  'arCH3':   ('[CH3;$([CH3]c)]', 'I',  'Aromatic methyl'),
  'OCH3':    ('[CH3;$([CH3]Oc)]', 'I', 'Methoxy on a ring'),
  'NCH3':    ('[CH3;$([CH3][#7])]', 'I', 'N-methyl'),
  'Nalkyl':  ('[CX4;H1,H2;$([CX4][NX3;!$(N-C=O);!$(N-S=O);!$(N-c)])]', 'I', 'Carbon next to an amine N'),
  'benzyl':  ('[CX4;H1,H2;$([C]c);!$([CH3])]', 'I', 'Benzylic CH or CH2'),
  'ester':   ('[CX3;$([CX3]([#6])(=O)[OX2][#6])]', 'I', 'Ester'),
  'acid':    ('[CX3;$([CX3](=O)[OX2H1])]', 'II', 'Carboxylic acid'),
  'phenol':  ('[OX2H;$([OX2H]c)]', 'II', 'Phenol OH'),
}
pats = {k: Chem.MolFromSmarts(v[0]) for k, v in SPOTS.items()}
out = []
for c in lib:
    m = Chem.MolFromSmiles(c['smiles'])
    mw = Descriptors.MolWt(m); logp = Crippen.MolLogP(m); rb = rdMolDescriptors.CalcNumRotatableBonds(m)
    heavy = m.GetNumHeavyAtoms(); ap = sum(1 for a in m.GetAtoms() if a.GetIsAromatic()) / heavy
    esol = 0.16 - 0.63 * logp - 0.0062 * mw + 0.066 * rb - 0.74 * ap          # log10 mol/L
    sol_mg_ml = (10 ** esol) * mw                                               # mg/mL
    spots = []
    for k, p in pats.items():
        for (i,) in m.GetSubstructMatches(p):
            spots.append({'type': k, 'atom': i})
    out.append(dict(id=c['id'], name=c['name'], smiles=c['smiles'], group=c['group'], active=c['active'],
        mw=c['mw'], wlogp=c['logp'], tpsa=c['tpsa'], hbd=c['hbd'], hba=c['hba'], rotb=c['rotb'], ro5=c['ro5'], veber=c['veber'], pains=c['pains'],
        esol=round(esol, 2), solmgml=round(sol_mg_ml, 4), spots=spots, atoms=c['atoms'], bonds=c['bonds']))

# --- Docking-module compounds carried into ADME (Module 2 -> 3 of the project). B and C are MOCK analogues of celecoxib (see data/docking/mock.json).
# B: the tolyl methyl replaced by chlorine. C: the 4-(pyrazol-1-yl)benzenesulfonamide fragment. Coordinates are taken from the aligned celecoxib in the library.
from rdkit.Chem import Lipinski
cel = next(c for c in lib if c['name'] == 'Celecoxib'); cm = Chem.MolFromSmiles(cel['smiles'])
def props(name, smi, atoms, bonds, cid, note):
    m = Chem.MolFromSmiles(smi); mw = Descriptors.MolWt(m); logp = Crippen.MolLogP(m); rb = rdMolDescriptors.CalcNumRotatableBonds(m); tpsa = rdMolDescriptors.CalcTPSA(m)
    hbd = Lipinski.NumHDonors(m); hba = Lipinski.NumHAcceptors(m); heavy = m.GetNumHeavyAtoms(); ap = sum(1 for a in m.GetAtoms() if a.GetIsAromatic()) / heavy
    esol = 0.16 - 0.63 * logp - 0.0062 * mw + 0.066 * rb - 0.74 * ap
    ro5 = int(mw > 500) + int(logp > 5) + int(hbd > 5) + int(hba > 10)
    spots = [{'type': k, 'atom': i} for k, p_ in pats.items() for (i,) in m.GetSubstructMatches(p_)]
    return dict(id=cid, name=name, smiles=smi, group='mock', active=1, mock=True, note=note, mw=round(mw, 1), wlogp=round(logp, 2), tpsa=round(tpsa, 1), hbd=hbd, hba=hba, rotb=rb, ro5=ro5, veber=int(tpsa <= 140 and rb <= 10), pains=0,
        esol=round(esol, 2), solmgml=round((10 ** esol) * mw, 4), spots=spots, atoms=atoms, bonds=bonds)
atomsB = [list(a) for a in cel['atoms']]; atomsB[0][0] = 'Cl'
bsmi = 'Clc1ccc(cc1)-c1cc(nn1-c1ccc(cc1)S(N)(=O)=O)C(F)(F)F'
bm = Chem.MolFromSmiles(bsmi); assert [a.GetSymbol() for a in bm.GetAtoms()][:3] == ['Cl', 'C', 'C']
extras = []
extras.append(props('Compound B (docking analogue, mock)', bsmi, atomsB, cel['bonds'], 'mockB', 'MOCK chloro analogue of celecoxib from the docking module.'))
csmi = 'NS(=O)(=O)c1ccc(cc1)-n1cccn1'; qm = Chem.MolFromSmiles(csmi); match = cm.GetSubstructMatch(qm); assert len(match) == qm.GetNumAtoms(), 'fragment not found in celecoxib'
atomsC = [list(cel['atoms'][match[i]]) for i in range(qm.GetNumAtoms())]
bondsC = [[b.GetBeginAtomIdx(), b.GetEndAtomIdx()] for b in qm.GetBonds()]
extras.append(props('Compound C (docking fragment, mock)', csmi, atomsC, bondsC, 'mockC', 'MOCK small fragment of celecoxib from the docking module.'))
json.dump(dict(_about=f'ADME properties computed with RDKit {rdkit.__version__}: cLogP is Crippen (RDKit), TPSA, ESOL logS (Delaney 2004, an estimate), soft spots by simple SMARTS rules. 3D atoms are copied from data/screening/library.json.',
    spots={k: dict(phase=v[1], name=v[2]) for k, v in SPOTS.items()}, drugs=out, extras=extras), open('data/adme/drugs.json', 'w'), separators=(',', ':'))
for d in out:
    if d['name'] in ('Celecoxib','Ibuprofen','Naproxen','Diclofenac','Caffeine','Aspirin','Paracetamol','Propranolol','Fluoxetine','Warfarin'):
        print(f"{d['name']:12s} logS {d['esol']:5.2f} spots", [(s['type'], s['atom']) for s in d['spots']])
