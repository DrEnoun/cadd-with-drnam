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
json.dump(dict(_about=f'ADME properties computed with RDKit {rdkit.__version__}: cLogP is Crippen (RDKit), TPSA, ESOL logS (Delaney 2004, an estimate), soft spots by simple SMARTS rules. 3D atoms are copied from data/screening/library.json.',
    spots={k: dict(phase=v[1], name=v[2]) for k, v in SPOTS.items()}, drugs=out), open('data/adme/drugs.json', 'w'), separators=(',', ':'))
for d in out:
    if d['name'] in ('Celecoxib','Ibuprofen','Naproxen','Diclofenac','Caffeine','Aspirin','Paracetamol','Propranolol','Fluoxetine','Warfarin'):
        print(f"{d['name']:12s} logS {d['esol']:5.2f} spots", [(s['type'], s['atom']) for s in d['spots']])
