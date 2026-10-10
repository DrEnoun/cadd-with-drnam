"""Builds data/screening/library.json for Module 2 (virtual screening) with RDKit.
Real drugs, real computed properties and real 3D shapes. Run once:  python3 tools/prepare-library.py
Needs: pip install rdkit numpy   (RDKit is only needed to rebuild the data, not to run the site)."""
import json, math, random
import numpy as np
from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, Descriptors, Crippen, rdMolDescriptors, rdMolAlign, rdShapeHelpers, DataStructs, rdMolTransforms
from rdkit.Chem.FilterCatalog import FilterCatalog, FilterCatalogParams
import rdkit
RDLogger.DisableLog('rdApp.*')

# group: coxib (COX-2 selective drug), nsaid (non-selective NSAID), other (drug for another target), pains (assay-interference scaffold)
# active = known COX inhibitor in the literature. 'note' is shown to students.
LIB = [
 ('Celecoxib','Cc1ccc(cc1)-c1cc(nn1-c1ccc(cc1)S(N)(=O)=O)C(F)(F)F','coxib',1,'COX-2 selective drug; the co-crystal ligand of 3LN1.'),
 ('Rofecoxib','CS(=O)(=O)c1ccc(cc1)C1=C(C(=O)OC1)c1ccccc1','coxib',1,'COX-2 selective (withdrawn from the market).'),
 ('Etoricoxib','Cc1ccc(cn1)-c1ncc(Cl)cc1-c1ccc(cc1)S(C)(=O)=O','coxib',1,'COX-2 selective drug.'),
 ('Valdecoxib','Cc1onc(c1-c1ccc(cc1)S(N)(=O)=O)-c1ccccc1','coxib',1,'COX-2 selective drug (sulfonamide like celecoxib).'),
 ('Lumiracoxib','Cc1ccc(Nc2c(Cl)cccc2F)c(CC(=O)O)c1','coxib',1,'COX-2 selective acid.'),
 ('Nimesulide','CS(=O)(=O)Nc1ccc(cc1Oc1ccccc1)[N+](=O)[O-]','coxib',1,'Preferential COX-2 inhibitor.'),
 ('Meloxicam','Cc1cnc(s1)NC(=O)C1=C(O)c2ccccc2S(=O)(=O)N1C','coxib',1,'Preferential COX-2 inhibitor.'),
 ('Ibuprofen','CC(C)Cc1ccc(cc1)C(C)C(=O)O','nsaid',1,'Non-selective NSAID.'),
 ('Naproxen','COc1ccc2cc(ccc2c1)[C@H](C)C(=O)O','nsaid',1,'Non-selective NSAID.'),
 ('Diclofenac','OC(=O)Cc1ccccc1Nc1c(Cl)cccc1Cl','nsaid',1,'NSAID, somewhat COX-2 preferring.'),
 ('Indomethacin','COc1ccc2n(C(=O)c3ccc(Cl)cc3)c(C)c(CC(=O)O)c2c1','nsaid',1,'Non-selective NSAID.'),
 ('Ketoprofen','CC(C(=O)O)c1cccc(c1)C(=O)c1ccccc1','nsaid',1,'Non-selective NSAID.'),
 ('Piroxicam','CN1C(=C(O)c2ccccc2S1(=O)=O)C(=O)Nc1ccccn1','nsaid',1,'Non-selective NSAID.'),
 ('Aspirin','CC(=O)Oc1ccccc1C(=O)O','nsaid',1,'Acetylates COX (irreversible); weak on COX-2.'),
 ('Flurbiprofen','CC(C(=O)O)c1ccc(c(F)c1)-c1ccccc1','nsaid',1,'Non-selective NSAID.'),
 ('Etodolac','CCc1cccc2c1[nH]c1c2CCOC1(CC)CC(=O)O','nsaid',1,'NSAID, somewhat COX-2 preferring.'),
 ('Ketorolac','OC(=O)C1CCn2c1ccc2C(=O)c1ccccc1','nsaid',1,'Non-selective NSAID.'),
 ('Mefenamic acid','Cc1cccc(Nc2ccccc2C(=O)O)c1C','nsaid',1,'Non-selective NSAID (fenamate).'),
 ('Caffeine','Cn1cnc2c1c(=O)n(C)c(=O)n2C','other',0,'Adenosine receptor antagonist.'),
 ('Metformin','CN(C)C(=N)N=C(N)N','other',0,'Antidiabetic; very polar.'),
 ('Atenolol','CC(C)NCC(O)COc1ccc(CC(N)=O)cc1','other',0,'Beta blocker.'),
 ('Propranolol','CC(C)NCC(O)COc1cccc2ccccc12','other',0,'Beta blocker.'),
 ('Omeprazole','COc1ccc2[nH]c(nc2c1)S(=O)Cc1ncc(C)c(OC)c1C','other',0,'Proton pump inhibitor.'),
 ('Fluoxetine','CNCCC(Oc1ccc(cc1)C(F)(F)F)c1ccccc1','other',0,'Antidepressant (SSRI); has a CF3 group like celecoxib.'),
 ('Loratadine','CCOC(=O)N1CCC(CC1)=C1c2ccc(Cl)cc2CCc2cccnc12','other',0,'Antihistamine.'),
 ('Diazepam','CN1C(=O)CN=C(c2ccccc2)c2cc(Cl)ccc12','other',0,'Benzodiazepine.'),
 ('Warfarin','CC(=O)CC(c1ccccc1)c1c(O)c2ccccc2oc1=O','other',0,'Anticoagulant (VKOR inhibitor).'),
 ('Sildenafil','CCCc1nn(C)c2c1nc([nH]c2=O)-c1cc(ccc1OCC)S(=O)(=O)N1CCN(C)CC1','other',0,'PDE5 inhibitor; has a sulfonyl group.'),
 ('Atorvastatin','CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CC[C@@H](O)C[C@@H](O)CC(=O)O','other',0,'Statin; large and flexible.'),
 ('Lisinopril','NCCCC[C@H](N[C@@H](CCc1ccccc1)C(=O)O)C(=O)N1CCC[C@H]1C(=O)O','other',0,'ACE inhibitor; polar.'),
 ('Ranitidine','CNC(=C[N+](=O)[O-])NCCSCc1ccc(o1)CN(C)C','other',0,'H2 blocker.'),
 ('Hydrochlorothiazide','NS(=O)(=O)c1cc2c(NCNS2(=O)=O)cc1Cl','other',0,'Diuretic; sulfonamide.'),
 ('Furosemide','NS(=O)(=O)c1cc(C(=O)O)c(NCc2ccco2)cc1Cl','other',0,'Diuretic; an acid with a sulfonamide, so it looks like a COX inhibitor but is not.'),
 ('Haloperidol','OC1(CCN(CCCC(=O)c2ccc(F)cc2)CC1)c1ccc(Cl)cc1','other',0,'Antipsychotic.'),
 ('Carbamazepine','NC(=O)N1c2ccccc2C=Cc2ccccc12','other',0,'Anticonvulsant.'),
 ('Ciprofloxacin','OC(=O)C1=CN(C2CC2)c2cc(N3CCNCC3)c(F)cc2C1=O','other',0,'Antibiotic.'),
 ('Simvastatin','CCC(C)(C)C(=O)O[C@H]1C[C@@H](C)C=C2C=C[C@H](C)[C@H](CC[C@@H]3C[C@@H](O)CC(=O)O3)[C@@H]12','other',0,'Statin prodrug; lipophilic and large.'),
 ('Tamoxifen','CC/C(=C(\\c1ccccc1)c1ccc(OCCN(C)C)cc1)/c1ccccc1','other',0,'Oestrogen receptor modulator; very lipophilic.'),
 ('Glucose','OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O','other',0,'Sugar; far too polar to be a drug-like hit.'),
 ('Sulfamethoxazole','Cc1cc(NS(=O)(=O)c2ccc(N)cc2)no1','other',0,'Antibiotic; sulfonamide on an isoxazole, like valdecoxib.'),
 ('Paracetamol','CC(=O)Nc1ccc(O)cc1','other',0,'Analgesic; its COX effect is weak and debated, so it is treated as inactive here.'),
 ('Benzylidene rhodanine','S=C1SC(=Cc2ccccc2)C(=O)N1','pains',0,'A classic assay-interference scaffold (PAINS).'),
 ('Catechol','Oc1ccccc1O','pains',0,'Redox-active, a frequent false positive (PAINS).'),
 ('1,4-Naphthoquinone','O=C1C=CC(=O)c2ccccc12','pains',0,'Reactive quinone, a frequent false positive (PAINS).'),
 ('Quercetin','Oc1cc(O)c2c(c1)oc(-c1ccc(O)c(O)c1)c(O)c2=O','pains',0,'Natural product, a frequent hitter (PAINS).'),
]
PREP_DEMO = [  # shown in the preparation step
 ('Diclofenac sodium','[Na+].[O-]C(=O)Cc1ccccc1Nc1c(Cl)cccc1Cl','Salt form: remove the counter-ion Na+ and keep the drug (as an anion at pH 7.4).'),
 ('Dexibuprofen (S)','CC(C)Cc1ccc(cc1)[C@H](C)C(=O)O','Same compound as ibuprofen but one stereoisomer: the library already has ibuprofen, so this is a near-duplicate.'),
]

# ---- reference: crystal celecoxib from 3LN1 (heavy atoms, coordinates centred on the ligand)
cox = json.load(open('data/docking/cox2.json'))
lig = cox['ligand']; ref = Chem.RWMol()
for a in lig['atoms']: ref.AddAtom(Chem.Atom(a[0].capitalize() if len(a[0])==1 else a[0].capitalize()))
for i, j in lig['bonds']: ref.AddBond(i, j, Chem.BondType.SINGLE)
ref = ref.GetMol(); Chem.SanitizeMol(ref, Chem.SANITIZE_NONE)
tmpl = Chem.MolFromSmiles('Cc1ccc(cc1)-c1cc(nn1-c1ccc(cc1)S(N)(=O)=O)C(F)(F)F')
ref.UpdatePropertyCache(strict=False)
refm = AllChem.AssignBondOrdersFromTemplate(tmpl, ref)
conf = Chem.Conformer(refm.GetNumAtoms())
for i, a in enumerate(lig['atoms']): conf.SetAtomPosition(i, (a[1], a[2], a[3]))
refm.AddConformer(conf); Chem.SanitizeMol(refm)
refH = Chem.AddHs(refm, addCoords=True)
near = np.array([[n[1], n[2], n[3]] for n in cox['near']])
ref_fp = AllChem.GetMorganFingerprintAsBitVect(refm, 2, 2048)

params = FilterCatalogParams(); params.AddCatalog(FilterCatalogParams.FilterCatalogs.PAINS); pains = FilterCatalog(params)
rng = random.Random(7); nprng = np.random.default_rng(7)
out = []
for k, (name, smi, group, active, note) in enumerate(LIB):
    m = Chem.MolFromSmiles(smi); Chem.SanitizeMol(m)
    fp = AllChem.GetMorganFingerprintAsBitVect(m, 2, 2048)
    mh = Chem.AddHs(m)
    cids = AllChem.EmbedMultipleConfs(mh, numConfs=60, randomSeed=11)
    if not len(cids): raise SystemExit('embed failed ' + name)
    AllChem.MMFFOptimizeMoleculeConfs(mh, maxIters=500)
    pp = AllChem.MMFFGetMoleculeProperties(mh); rp = AllChem.MMFFGetMoleculeProperties(refH)
    best = None
    for cid in cids:
        o3a = rdMolAlign.GetO3A(mh, refH, pp, rp, prbCid=cid)
        sc = o3a.Score()
        if best is None or sc > best[0]: best = (sc, cid, o3a)
    sc, cid, o3a = best; o3a.Align()
    shape = 1 - rdShapeHelpers.ShapeTanimotoDist(mh, refH, confId1=cid, confId2=0)
    heavy = [a.GetIdx() for a in mh.GetAtoms() if a.GetAtomicNum() > 1]
    c = mh.GetConformer(cid); pos = np.array([list(c.GetAtomPosition(i)) for i in heavy])
    clash = int(sum(1 for p in pos if (np.linalg.norm(near - p, axis=1) < 2.6).any()))
    idx = {a: n for n, a in enumerate(heavy)}
    atoms = [[mh.GetAtomWithIdx(i).GetSymbol(), round(float(pos[n][0]), 2), round(float(pos[n][1]), 2), round(float(pos[n][2]), 2)] for n, i in enumerate(heavy)]
    bonds = [[idx[b.GetBeginAtomIdx()], idx[b.GetEndAtomIdx()]] for b in mh.GetBonds() if b.GetBeginAtomIdx() in idx and b.GetEndAtomIdx() in idx]
    mw = Descriptors.MolWt(m); logp = Crippen.MolLogP(m); tpsa = rdMolDescriptors.CalcTPSA(m)
    hbd = rdMolDescriptors.CalcNumHBD(m); hba = rdMolDescriptors.CalcNumHBA(m); rot = rdMolDescriptors.CalcNumRotatableBonds(m)
    ro5 = sum([mw > 500, logp > 5, hbd > 5, hba > 10])
    out.append(dict(id=f'c{k+1:02d}', name=name, smiles=smi, group=group, active=active, note=note,
        mw=round(mw, 1), logp=round(logp, 2), tpsa=round(tpsa, 1), hbd=hbd, hba=hba, rotb=rot, rings=rdMolDescriptors.CalcNumRings(m), arom=rdMolDescriptors.CalcNumAromaticRings(m), heavy=m.GetNumHeavyAtoms(),
        ro5=ro5, veber=int(rot <= 10 and tpsa <= 140), pains=int(pains.HasMatch(m)),
        tanimoto=round(DataStructs.TanimotoSimilarity(fp, ref_fp), 3), shape=round(float(shape), 3), clash=clash, atoms=atoms, bonds=bonds))
    print(f'{name:22s} MW {mw:6.1f} logP {logp:5.2f} TPSA {tpsa:6.1f} Tc {out[-1]["tanimoto"]:.2f} shape {shape:.2f} clash {clash}')

# ---- mock docking-style score, built from the real shape overlap and size so it behaves like a real screen. Deterministic noise.
PAT = {k: Chem.MolFromSmarts(v) for k, v in dict(acid='[CX3](=O)[OX2H1]', sulfonamide='[SX4](=O)(=O)[NX3]', sulfone='[SX4](=O)(=O)[#6]', sulfonylNH='[SX4](=O)(=O)[NX3H1]').items()}
for c, (name, smi, *_r) in zip(out, LIB):
    m = Chem.MolFromSmiles(smi)
    acid = m.HasSubstructMatch(PAT['acid']); sulf = m.HasSubstructMatch(PAT['sulfonamide']) or m.HasSubstructMatch(PAT['sulfone'])
    c['features'] = [f for f, on in (('acid', acid), ('sulfonyl', sulf)) if on]
    # a docking-like score: shape fit + size + hydrogen-bond features that suit the COX-2 pocket (acid to Arg120, sulfonyl group to Arg513/His90), small penalty for clashes
    c['dock'] = round(-(4.2 + 0.07 * c['heavy'] + 2.6 * c['shape'] + 0.3 * c['arom'] - 0.12 * c['rotb'] - 0.35 * min(c['clash'], 5) + 1.3 * acid + 1.5 * sulf) + nprng.normal(0, 0.45), 2)

demo = []
for name, smi, note in PREP_DEMO:
    m = Chem.MolFromSmiles(smi); frags = Chem.GetMolFrags(m, asMols=True)
    mh = Chem.AddHs(max(frags, key=lambda x: x.GetNumHeavyAtoms())); AllChem.EmbedMolecule(mh, randomSeed=5); AllChem.MMFFOptimizeMolecule(mh)
    heavy = [a.GetIdx() for a in mh.GetAtoms() if a.GetAtomicNum() > 1]; c = mh.GetConformer(); idx = {a: n for n, a in enumerate(heavy)}
    atoms = [[mh.GetAtomWithIdx(i).GetSymbol(), round(c.GetAtomPosition(i).x, 2), round(c.GetAtomPosition(i).y, 2), round(c.GetAtomPosition(i).z, 2)] for i in heavy]
    bonds = [[idx[b.GetBeginAtomIdx()], idx[b.GetEndAtomIdx()]] for b in mh.GetBonds() if b.GetBeginAtomIdx() in idx and b.GetEndAtomIdx() in idx]
    demo.append(dict(name=name, smiles=smi, note=note, atoms=atoms, bonds=bonds, salt=('[Na+]' in smi)))

fps = [AllChem.GetMorganFingerprintAsBitVect(Chem.MolFromSmiles(c['smiles']), 2, 2048) for c in out]
sim = [[round(DataStructs.TanimotoSimilarity(a, b), 2) for b in fps] for a in fps]
json.dump(dict(sim=sim, _about=f'Real drugs with properties computed by RDKit {rdkit.__version__}. 3D shapes are ETKDG/MMFF conformers overlaid on crystal celecoxib (3LN1) with O3A. tanimoto = Morgan2 similarity to celecoxib; shape = shape Tanimoto after overlay; clash = atoms within 2.6 A of the protein in the overlay. dock is a MOCK score built from the shape and size to behave like a real docking screen. active = known COX inhibitor in the literature (check before publication).',
    rdkit=rdkit.__version__, compounds=out, prepDemo=demo), open('data/screening/library.json', 'w'), separators=(',', ':'))
print('wrote', len(out), 'compounds,', sum(c['active'] for c in out), 'actives')
