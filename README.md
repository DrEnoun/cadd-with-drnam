# CADD with Dr. NAM

Interactive, software-agnostic concept simulations for computer-aided drug design. Students learn **why** each step is done, **how** it works and **what the results mean**. Module 1 uses the **real COX-2 structure with celecoxib (PDB 3LN1)**; the docking poses, scores and compounds A, B and C are **mock** (no real docking is run). English only. Works on phone, tablet and computer with mouse or touch; no camera needed.

| Module | Status |
|---|---|
| 1. Molecular Docking | Ready |
| 2. Virtual Screening | Ready |
| 3. ADME Prediction | Ready |
| 4. Homology Modelling | Planned |

## Module 1 — Molecular Docking
Pre-test → Why dock? → Search and score → Prepare → Search box → Scoring → Validate (redocking, RMSD) → Analyse (layers of evidence) → Decide and justify (report) → Post-test and survey.

The pictures are interactive **3D cartoon-style molecules** (three.js, bundled in `vendor/`, works offline): a cut-open mock protein with a pocket, a ball-and-stick ligand, residue sticks, dotted hydrogen bonds and a 3D search box. Drag to turn, pinch or scroll to zoom. If a browser has no WebGL, the controls and feedback still work.

Every step opens with a "Why do we do this?" box and ends with a check of understanding.

## Module 2 — Virtual Screening
Pre-test → Why screen? (3D funnel and your own funnel numbers) → The library (45 real drugs in 3D property space, with an inspector) → Property filters (Lipinski and Veber, with false negatives) → Prepare (salts, duplicates, PAINS, charge, 3D) → Two methods (ligand-based shape overlay vs structure-based score, in the COX-2 pocket) → Did it work? (ROC curves, AUC, enrichment factor) → Pick hits (diversity, alerts, justification, report) → Post-test and survey.

**Real data:** the 45 drugs are real (18 known COX inhibitors and 27 drugs for other targets, including PAINS scaffolds). Properties (molecular weight, cLogP, polar surface area, donors and acceptors, rotatable bonds, Lipinski and PAINS flags) and the 3D shapes are computed with RDKit, and each shape was overlaid on the crystal celecoxib from 3LN1. **Mock:** the docking-style score (it is built from the real overlap and size plus pharmacophore features, with fixed noise) and the funnel numbers. Rebuild the data with `python3 tools/prepare-library.py` (needs `pip install rdkit numpy`). "Active" means a known COX inhibitor in the literature: please check each one before publication.

## Module 3 — ADME Prediction
Pre-test → The journey (an animated 3D body based on the four-panel overview picture: mouth, stomach and gut, portal vein and liver with CYP enzymes, heart, brain and muscle, kidneys and bladder; a tablet travels the real route, blue dots are the drug and orange dots are metabolites; match failures to A, D, M or E) → Absorption (a BOILED-Egg style map of 45 real drugs, a movable probe, ESOL solubility and a "does the dose dissolve?" check) → pH and ions (Henderson-Hasselbalch curves and a membrane where only the neutral form crosses) → Metabolism (soft spots glowing on the real 3D molecule, predict the main reaction, compare with the known route) → Half-life (a concentration-time simulator with repeated doses) → Choose (an ADME report card for eight candidates, justification, report) → Post-test and survey.

**Real data:** the 45 drugs and their 3D shapes are the same as Module 2. cLogP (Crippen), polar surface area, ESOL solubility and the soft-spot atoms are computed with RDKit (`python3 tools/prepare-adme.py`). **Simplified or typical values:** the egg ellipses are a teaching approximation of the BOILED-Egg (Daina and Zoete, 2016), not the published model; the soft-spot finder uses simple structural rules; pKa values and pharmacokinetic values (F, V, half-life, ka) are rounded typical adult figures (`data/adme/teaching.json`). Please check them against a standard reference before publication. The pharmacokinetic maths (one-compartment oral model, AUC = F·D/CL, accumulation) is tested in `npm test`.

## For educational research
- **Consent screen** (research / learning only) with a random participant code. No name, email or ID is collected.
- **Pre-test and post-test** with the same 10 concept questions (`data/docking/quiz.json`), with explanations after the post-test.
- **Usability survey** (System Usability Scale, Brooke 1996) plus three perception items.
- **Logging** of answers, mistakes and seconds per step. Everything stays in the student's browser (localStorage); the student downloads a **CSV** and submits it as the lecturer instructs. There is no server.
- Fill in `data/config.json` (`ethicsRef`, `contact`) before collecting data. Get ethics approval first.
- The CSV columns are `code, consent, type, module, step, item, value, time`.

## Run locally
```
npm run serve     # then open http://localhost:8080
npm test          # checks data, scoring, RMSD and SUS maths
```
No build step: plain HTML, CSS and ES modules.

## Put it on GitHub Pages
Repository **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root**. The site appears at `https://<owner>.github.io/<repo>/`.

## Artwork
The home-page banner is `assets/img/hero.webp` (2000 px, plus a 1000 px version); the earlier dark banner is kept as `hero-dark.webp` if you want to switch back. The module pictures are in `assets/img/` (WebP, 1600 px and 800 px versions, loaded lazily with `srcset`). They are artistic illustrations supplied by the author, not to scale, and are used for the home page, module cards, module banners and the About page. Add `name.webp` and `name-800.webp` and set `art` in `js/modules/registry.js` to use a new one. If you publish, state the source of the illustrations (and whether they are AI-generated) as the journal requires.

## Structure
| Path | What |
|---|---|
| `index.html`, `css/` | Page shell, Dr. NAM tokens (`tokens.css`), styles |
| `js/main.js` | Router, home, "My record", About |
| `js/eval.js`, `js/store.js` | Consent, tests, survey, CSV export; local storage |
| `js/modules/registry.js` | List of modules (add one here to add a module) |
| `js/modules/flow.js` | Shared flow for every module: intro, consent, pre-test, steps, post-test, survey |
| `js/modules/docking/` | Module 1: `index.js` (its steps) and one file per step |
| `js/modules/adme/` | Module 3: `stats.js` (pure maths: egg map, ESOL classes, ionisation, pharmacokinetics), `scenes.js` (3D journey and molecule inspector) and one file per step |
| `data/adme/` | `drugs.json` (RDKit properties, soft spots), `teaching.json`, `quiz.json`; built by `tools/prepare-adme.py` |
| `js/modules/screening/` | Module 2: `stats.js` (pure maths: filters, ROC, enrichment), `scenes.js` (3D cloud, funnel, inspector) and one file per step |
| `js/viewer3d.js` | 3D viewer and cartoon parts (atoms, bonds, pocket, box, labels) |
| `js/modules/docking/geom.js` | Pure 3D maths (poses, RMSD, toy scoring function), tested in Node |
| `data/screening/` | `library.json` (real drugs, RDKit properties and 3D shapes), `teaching.json`, `quiz.json`; built by `tools/prepare-library.py` |
| `data/docking/` | `quiz.json`, `mock.json` (teaching text, mock poses, scores and compounds), `cox2.json` (real 3LN1 coordinates, generated) |

## The protein structure (COX-2, PDB 3LN1)
The 3D scene shows the real structure of human COX-2 with celecoxib (RCSB Protein Data Bank entry 3LN1, chain A; coordinates are free to use). `tools/prepare-pdb.mjs` turns the PDB file into `data/docking/cox2.json` (ribbon trace, ligand, haem, pocket residues and nearby atoms, centred on the ligand): `node tools/prepare-pdb.mjs path/to/3LN1.pdb`. A trimmed copy of the file is kept in `data/docking/3LN1_chainA.pdb`.

Residue labels use the usual COX-2 literature numbering (His90, Gln192, Arg513 form the selective side pocket; Arg120 and Tyr355 guard the channel entrance). The PDB file's own numbers are 14 to 15 lower.

Please add the full reference for the structure from the RCSB page (the entry's primary citation) in any publication.

## Teaching content
The protein and celecoxib are real. All docking poses, scores and the compounds A, B and C are **mock**. The science and wording should be reviewed by the lecturer before use. Parts of the software were written with an AI coding assistant (Claude) under the author's direction.
