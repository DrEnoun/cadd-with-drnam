"""Builds data/project/workbook.json: the stages, fields, hints and links of the hands-on project workbook.
Edit the wording here (or in the JSON) and rerun: python3 tools/make-workbook-spec.py
Field types: text, textarea, number, select, checks, table. The checks (rules) that read these fields live in js/project/rules.js."""
import json
def f(id, label, type='text', **k): return dict(id=id, label=label, type=type, **k)
def opts(*a): return [dict(id=x[0], label=x[1]) if isinstance(x, tuple) else dict(id=x, label=x) for x in a]
S = []
S.append(dict(id='setup', title='Project set-up', module=None,
  why='A project that cannot say what question it answers cannot say when it has finished. Write the question and your expectation first; everything later is judged against them.',
  mistakes=['Starting the software before the question is written down.', 'A question that is really a method ("I will dock compounds").', 'No expectation, so any result looks like a success.'],
  fields=[
    f('title', 'Project title', required=True),
    f('student', 'Your name or code (optional)', hint='Leave it blank if you prefer. This file stays in your browser until you download it.'),
    f('supervisor', 'Supervisor (optional)'),
    f('question', 'What question will this project answer?', 'textarea', required=True, hint='One or two sentences, for example: "Could compound X block enzyme Y, and is it worth testing in the lab?"'),
    f('disease', 'Disease or condition', required=True),
    f('hypothesis', 'What do you expect to find, and why?', 'textarea', required=True),
    f('compounds', 'Compound(s) of interest (names, source, SMILES if you have them)', 'textarea', required=True),
    f('software', 'Software and versions you will use', 'textarea', required=True, hint='For example: AutoDock Vina 1.2.5, SwissADME (web), GROMACS 2024.'),
    f('stages', 'Which stages will your project use?', 'checks', options=opts(('target', 'Target structure (and homology model if needed)'), ('screening', 'Virtual screening'), ('docking', 'Docking'), ('adme', 'ADME prediction'), ('network', 'Network pharmacology'), ('md', 'Molecular dynamics')), hint='Skipping a stage is fine. Say why below.'),
    f('skipWhy', 'If you skip a stage, why?', 'textarea')]))
S.append(dict(id='target', title='Target structure', module=dict(id='homology', label='Homology Modelling (stand-alone module)'),
  why='Every structure-based step inherits the quality of the structure. Record where it came from, how good it is, and what you did to it.',
  mistakes=['Using the first structure found without checking resolution, ligand or state.', 'Leaving waters, alternate locations or missing loops unexamined.', 'Using a homology model or prediction with low identity or low confidence in the binding site, without saying so.'],
  fields=[
    f('source', 'Where does the structure come from?', 'select', required=True, options=opts(('exp', 'Experimental (X-ray, cryo-EM or NMR)'), ('af', 'Deep-learning prediction (for example AlphaFold)'), ('hm', 'Homology model I built'))),
    f('targetName', 'Target protein and species', required=True),
    f('pdb', 'PDB ID, UniProt ID or model file name', required=True),
    f('resolution', 'Resolution (Å) — experimental structures', 'number', unit='Å', min=0, max=10, step=0.01),
    f('ligandIn', 'Ligand in the structure (if any)', hint='A co-crystallised ligand tells you where the pocket is and gives you a redocking test.'),
    f('plddt', 'Prediction confidence in the binding site (pLDDT, 0-100)', 'number', min=0, max=100, hint='Only for deep-learning predictions.'),
    f('identity', 'Template sequence identity (%) — homology models', 'number', unit='%', min=0, max=100),
    f('rama', 'Residues in the favoured Ramachandran region (%) — models', 'number', unit='%', min=0, max=100),
    f('prep', 'Preparation done', 'checks', options=opts(('chain', 'Chose the chain or biological unit and said why'), ('waters', 'Decided what to do with water molecules'), ('hydrogens', 'Added hydrogens and set protonation states (pH stated)'), ('missing', 'Checked and repaired missing residues or atoms'), ('cofactors', 'Kept important cofactors, metals or haem'), ('altloc', 'Checked alternate locations and clashes'))),
    f('notes', 'Notes on the structure and your choices', 'textarea')]))
S.append(dict(id='screening', title='Virtual screening', module=dict(id='screening', label='Module 1: Virtual Screening'),
  why='Screening turns a very large library into a short list that the lab can afford to test. Every filter is a decision, and the numbers at each step tell the story.',
  mistakes=['No known active or inactive compounds to test whether the method can tell them apart.', 'Taking the top of one ranking without looking at diversity or assay-interference scaffolds.', 'A hit list that is far too long to test.'],
  fields=[
    f('purpose', 'What is the screen for?', 'select', required=True, options=opts(('hits', 'Find new hits for a target'), ('repurpose', 'Test existing drugs on a new target'), ('prioritise', 'Prioritise a list I already have'))),
    f('library', 'Library (name, source, version)', required=True),
    f('method', 'Method', 'select', required=True, options=opts(('lb', 'Ligand-based (similarity or shape)'), ('sb', 'Structure-based (docking)'), ('both', 'Both, combined'))),
    f('reference', 'Known active used as reference or control', hint='For example the drug you already know binds the target.'),
    f('funnel', 'The funnel: how many compounds remain after each step?', 'table', required=True,
      columns=[dict(id='step', label='Step', type='text'), dict(id='n', label='Compounds remaining', type='number'), dict(id='rule', label='Rule or threshold', type='text')],
      defaultRows=[dict(step='Start (whole library)'), dict(step='After property filters'), dict(step='After alerts (PAINS) and duplicates'), dict(step='After the screening score'), dict(step='Hits sent forward')]),
    f('validated', 'Did you test the method on known actives and decoys?', 'select', required=True, options=opts(('yes', 'Yes'), ('no', 'No'))),
    f('auc', 'ROC AUC from that test', 'number', min=0, max=1, step=0.01),
    f('ef', 'Enrichment factor (top 1% or 5%)', 'number', min=0, step=0.1),
    f('diversity', 'I checked that the hits are not all the same scaffold', 'checks', options=opts(('div', 'Checked similarity between hits'), ('pains', 'Checked assay-interference (PAINS) alerts'), ('visual', 'Looked at the top compounds by eye'))),
    f('notes', 'Notes', 'textarea')]))
S.append(dict(id='docking', title='Docking', module=dict(id='docking', label='Module 2: Molecular Docking'),
  why='Docking predicts a pose and a score. A believable pose, with believable interactions, is worth more than the number.',
  mistakes=['No redocking test of the co-crystallised ligand.', 'Choosing by score alone, so large molecules look better only because they are large.', 'A search box that misses part of the pocket, or a pose that sits half outside it.'],
  fields=[
    f('program', 'Docking program and key settings', required=True, hint='For example: AutoDock Vina, exhaustiveness 16.'),
    f('redockLigand', 'Ligand used for the redocking test'),
    f('redockRmsd', 'Redocking RMSD (Å)', 'number', unit='Å', min=0, step=0.01, required=True),
    f('boxCenter', 'Search box centre (x, y, z in Å)'),
    f('boxSize', 'Search box size (x, y, z in Å)'),
    f('boxChecks', 'Box checks', 'checks', options=opts(('cover', 'The box covers the whole pocket with a margin'), ('notHuge', 'It is not far larger than the pocket'), ('center', 'It is centred on a known ligand or key residues'))),
    f('referenceName', 'Reference compound docked as a control', hint='Usually the known drug.'),
    f('results', 'Docking results', 'table', required=True,
      columns=[dict(id='name', label='Compound', type='text'), dict(id='score', label='Score (kcal/mol)', type='number'), dict(id='ha', label='Heavy atoms', type='number'), dict(id='hbonds', label='H-bond residues', type='text'), dict(id='key', label='Key residues contacted', type='number'), dict(id='inside', label='Inside the pocket', type='select', options=['yes', 'partly', 'no']), dict(id='rmsd', label='RMSD to reference pose (Å)', type='number'), dict(id='le', label='Ligand efficiency', computed='ligandEfficiency')],
      defaultRows=[dict(), dict(), dict()]),
    f('evidence', 'Evidence I used to choose', 'checks', options=opts(('score', 'Docking score'), ('hbonds', 'Hydrogen bonds and other interactions'), ('key', 'Contact with key residues'), ('le', 'Ligand efficiency (size-corrected)'), ('pose', 'Pose compared with the reference pose'), ('clash', 'Checked for clashes'), ('visual', 'Looked at the pose in 3D'), ('rescore', 'Rescored with a second method'))),
    f('choice', 'Compound I will take forward, and why', 'textarea', required=True)]))
S.append(dict(id='adme', title='ADME', module=dict(id='adme', label='Module 3: ADME Prediction'),
  why='A strong binder is not a drug if the body cannot absorb it, carry it, survive it or clear it. Predict the obvious failures early.',
  mistakes=['Ignoring the route of administration.', 'Reading a green tick as a guarantee.', 'Forgetting that charge and pH change absorption.'],
  fields=[
    f('tools', 'ADME tool(s) used', required=True, hint='For example SwissADME or pkCSM.'),
    f('route', 'Intended route of administration', 'select', required=True, options=opts(('oral', 'Oral'), ('topical', 'Topical or skin'), ('inject', 'Injection'), ('inhal', 'Inhaled'))),
    f('table', 'Predicted properties', 'table', required=True,
      columns=[dict(id='name', label='Compound', type='text'), dict(id='mw', label='MW (Da)', type='number'), dict(id='logp', label='cLogP', type='number'), dict(id='tpsa', label='TPSA (Å²)', type='number'), dict(id='hbd', label='H-bond donors', type='number'), dict(id='hba', label='H-bond acceptors', type='number'), dict(id='rotb', label='Rotatable bonds', type='number'), dict(id='gi', label='GI absorption', type='select', options=['high', 'low']), dict(id='pains', label='PAINS alerts', type='number'), dict(id='viol', label='Rule-of-five breaks', computed='ro5'), dict(id='veber', label='Veber', computed='veber')],
      defaultRows=[dict(), dict(), dict()]),
    f('considered', 'I also thought about', 'checks', options=opts(('ph', 'Ionisation at the pH of the gut or blood'), ('met', 'Metabolic soft spots (for example CYP oxidation)'), ('bbb', 'Whether it needs to, or must not, enter the brain'), ('clear', 'How it is cleared and how long it lasts'))),
    f('decision', 'Compound(s) I continue with, and what I would measure next', 'textarea', required=True)]))
S.append(dict(id='network', title='Network pharmacology', module=dict(id='network', label='Module 4: Network Pharmacology'),
  why='A drug rarely hits one protein. A network shows which targets and pathways may matter, and where to look in the lab. It is a map of hypotheses.',
  mistakes=['Using a "top 50" cut-off instead of a score threshold.', 'Reporting enriched pathways without correction or without saying the background.', 'Calling hub proteins "the targets".'],
  fields=[
    f('targetTools', 'Target prediction tool(s)', required=True, hint='The protocol recommends at least two with different methods.'),
    f('diseaseDbs', 'Disease gene database(s)', required=True),
    f('selection', 'How did you select genes?', 'select', required=True, options=opts(('threshold', 'By a published score threshold'), ('topn', 'By taking the top N'), ('none', 'No selection'))),
    f('nCompound', 'Number of compound targets', 'number', min=0, required=True),
    f('nDisease', 'Number of disease genes', 'number', min=0, required=True),
    f('nOverlap', 'Number in both lists (candidate targets)', 'number', min=0, required=True),
    f('stringConf', 'STRING minimum confidence', 'number', min=0, max=1, step=0.05, required=True),
    f('hubs', 'Hub proteins (list)', required=True),
    f('hubMethod', 'Hub measure(s)', 'select', options=opts(('degree', 'Degree only'), ('multi', 'Degree plus betweenness and closeness'))),
    f('background', 'Background used for enrichment', 'select', required=True, options=opts(('genome', 'Whole genome'), ('study', 'Only the genes in this study'), ('unsure', 'I do not know'))),
    f('pathways', 'Top enriched pathways', 'table', columns=[dict(id='name', label='Pathway', type='text'), dict(id='genes', label='Genes', type='number'), dict(id='q', label='Corrected p (FDR q)', type='number')], defaultRows=[dict(), dict(), dict()]),
    f('plan', 'What will you test in the lab or with another method?', 'textarea', required=True)]))
S.append(dict(id='md', title='Molecular dynamics', module=dict(id='md', label='Module 5: Molecular Dynamics'),
  why='Docking gives one frozen picture. MD asks whether the pose survives when everything moves. A short, single, unequilibrated run answers very little.',
  mistakes=['Averaging over the part of the run that was still settling.', 'One run only.', 'Quoting an MM-GBSA energy as if it were a measured binding energy, or from a run where the drug left.'],
  fields=[
    f('program', 'MD program and force field', required=True, hint='For example GROMACS 2024, CHARMM36.'),
    f('water', 'Water model, ions and box', required=True, hint='For example TIP3P, 0.15 M NaCl, cubic box 1.0 nm from the protein.'),
    f('temperature', 'Temperature (K)', 'number', min=0),
    f('pressure', 'Pressure (bar)', 'number', min=0),
    f('dt', 'Time step (fs)', 'number', min=0, step=0.5, required=True),
    f('constraints', 'Bond constraints used (for example LINCS or SHAKE on hydrogen bonds)', 'select', options=opts(('yes', 'Yes'), ('no', 'No'))),
    f('prep', 'Preparation steps done', 'checks', options=opts(('min', 'Energy minimisation'), ('nvt', 'NVT equilibration'), ('npt', 'NPT equilibration'))),
    f('length', 'Production run length per replica (ns)', 'number', min=0, required=True),
    f('replicas', 'Number of independent replicas', 'number', min=1, required=True),
    f('discard', 'Time discarded as equilibration (ns)', 'number', min=0),
    f('plateau', 'Did protein RMSD reach a plateau?', 'select', required=True, options=opts(('yes', 'Yes'), ('no', 'No'), ('unsure', 'Not sure'))),
    f('ligRmsd', 'Ligand RMSD after fitting on the protein (Å, mean)', 'number', min=0, step=0.1),
    f('left', 'Did the ligand leave the pocket?', 'select', required=True, options=opts(('no', 'No'), ('yes', 'Yes'), ('partly', 'Partly or temporarily'))),
    f('hbOcc', 'Occupancy of the key hydrogen bond (% of frames)', 'number', unit='%', min=0, max=100),
    f('dG', 'MM-GBSA or MM-PBSA binding energy (kcal/mol), if calculated', 'number', step=0.1),
    f('dGerr', 'Error on that value (standard error)', 'number', min=0, step=0.1),
    f('notes', 'What do the RMSD, RMSF and hydrogen-bond graphs show?', 'textarea', required=True)]))
S.append(dict(id='conclude', title='Conclusions', module=None,
  why='A conclusion says what the evidence supports and what it does not. Weak evidence honestly described is better than strong claims.',
  mistakes=['Calling a prediction a proof.', 'No limitations.', 'A next step that does not test the hypothesis.'],
  fields=[
    f('claim', 'What do your results show?', 'select', required=True, options=opts(('hyp', 'A computer-based hypothesis that needs experimental testing'), ('proof', 'Proof that the compound works'), ('mech', 'The mechanism of action'))),
    f('summary', 'Summary of what you found', 'textarea', required=True),
    f('limits', 'Limitations (at least three)', 'textarea', required=True, hint='Think about the structure, the scoring or model, the data and the number of runs.'),
    f('nextSteps', 'Next steps', 'checks', options=opts(('assay', 'Laboratory binding or activity assay'), ('mut', 'Mutate a key residue and measure the effect'), ('repeat', 'Repeat with another method or software'), ('adme', 'Measure solubility, permeability or stability'), ('md', 'Longer or repeated simulations'))),
    f('reflection', 'Reflection: which step taught you the most, and what would you do differently?', 'textarea', required=True)]))
json.dump(dict(_about='Spec of the hands-on project workbook. Edit via tools/make-workbook-spec.py.', stages=S), open('data/project/workbook.json', 'w'), indent=1)
print(len(S), sum(len(s['fields']) for s in S))
