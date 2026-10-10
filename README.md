# CADD with Dr. NAM

Interactive, software-agnostic concept simulations for computer-aided drug design. Students learn **why** each step is done, **how** it works and **what the results mean**, using mock data (no real docking is run). English only. Works on phone, tablet and computer with mouse or touch; no camera needed.

| Module | Status |
|---|---|
| 1. Molecular Docking | Ready |
| 2. Virtual Screening | Planned |
| 3. ADME Prediction | Planned |
| 4. Homology Modelling | Planned |

## Module 1 — Molecular Docking
Pre-test → Why dock? → Search and score → Prepare → Search box → Scoring → Validate (redocking, RMSD) → Analyse (layers of evidence) → Decide and justify (report) → Post-test and survey.

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

## Structure
| Path | What |
|---|---|
| `index.html`, `css/` | Page shell, Dr. NAM tokens (`tokens.css`), styles |
| `js/main.js` | Router, home, "My record", About |
| `js/eval.js`, `js/store.js` | Consent, tests, survey, CSV export; local storage |
| `js/modules/registry.js` | List of modules (add one here to add a module) |
| `js/modules/docking/` | Module 1: `index.js` (flow) and one file per step |
| `data/docking/` | `quiz.json`, `mock.json` (all mock data) |

## Teaching content
All molecules, scores and results are **mock** and fictional. The science and wording should be reviewed by the lecturer before use. Parts of the software were written with an AI coding assistant (Claude) under the author's direction.
