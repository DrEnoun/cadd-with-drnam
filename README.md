# CADD with Dr. NAM

Interactive, software-agnostic concept simulations for computer-aided drug design. Students learn **why** each step is done, **how** it works and **what the results mean**. Module 1 uses the **real COX-2 structure with celecoxib (PDB 3LN1)**; the docking poses, scores and compounds A, B and C are **mock** (no real docking is run). English only. Works on phone, tablet and computer with mouse or touch; no camera needed.

| Module | Status |
|---|---|
| 1. Molecular Docking | Ready |
| 2. Virtual Screening | Planned |
| 3. ADME Prediction | Planned |
| 4. Homology Modelling | Planned |

## Module 1 — Molecular Docking
Pre-test → Why dock? → Search and score → Prepare → Search box → Scoring → Validate (redocking, RMSD) → Analyse (layers of evidence) → Decide and justify (report) → Post-test and survey.

The pictures are interactive **3D cartoon-style molecules** (three.js, bundled in `vendor/`, works offline): a cut-open mock protein with a pocket, a ball-and-stick ligand, residue sticks, dotted hydrogen bonds and a 3D search box. Drag to turn, pinch or scroll to zoom. If a browser has no WebGL, the controls and feedback still work.

Every step opens with a "Why do we do this?" box and ends with a check of understanding.

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
The module pictures are in `assets/img/` (WebP, 1600 px and 800 px versions, loaded lazily with `srcset`). They are artistic illustrations supplied by the author, not to scale, and are used for the home page, module cards, module banners and the About page. Add `name.webp` and `name-800.webp` and set `art` in `js/modules/registry.js` to use a new one. If you publish, state the source of the illustrations (and whether they are AI-generated) as the journal requires.

## Structure
| Path | What |
|---|---|
| `index.html`, `css/` | Page shell, Dr. NAM tokens (`tokens.css`), styles |
| `js/main.js` | Router, home, "My record", About |
| `js/eval.js`, `js/store.js` | Consent, tests, survey, CSV export; local storage |
| `js/modules/registry.js` | List of modules (add one here to add a module) |
| `js/modules/docking/` | Module 1: `index.js` (flow) and one file per step |
| `js/viewer3d.js` | 3D viewer and cartoon parts (atoms, bonds, pocket, box, labels) |
| `js/modules/docking/geom.js` | Pure 3D maths (poses, RMSD, toy scoring function), tested in Node |
| `data/docking/` | `quiz.json`, `mock.json` (teaching text, mock poses, scores and compounds), `cox2.json` (real 3LN1 coordinates, generated) |

## The protein structure (COX-2, PDB 3LN1)
The 3D scene shows the real structure of human COX-2 with celecoxib (RCSB Protein Data Bank entry 3LN1, chain A; coordinates are free to use). `tools/prepare-pdb.mjs` turns the PDB file into `data/docking/cox2.json` (ribbon trace, ligand, haem, pocket residues and nearby atoms, centred on the ligand): `node tools/prepare-pdb.mjs path/to/3LN1.pdb`. A trimmed copy of the file is kept in `data/docking/3LN1_chainA.pdb`.

Residue labels use the usual COX-2 literature numbering (His90, Gln192, Arg513 form the selective side pocket; Arg120 and Tyr355 guard the channel entrance). The PDB file's own numbers are 14 to 15 lower.

Please add the full reference for the structure from the RCSB page (the entry's primary citation) in any publication.

## Teaching content
The protein and celecoxib are real. All docking poses, scores and the compounds A, B and C are **mock**. The science and wording should be reviewed by the lecturer before use. Parts of the software were written with an AI coding assistant (Claude) under the author's direction.
