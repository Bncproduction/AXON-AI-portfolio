# AI Engineering Drawing → Multi-Material Manufacturing Cost Estimator

A working prototype that turns an engineering drawing into a transparent, editable,
multi-material manufacturing cost estimate — and shows, for every number on screen,
whether it came from the drawing, from a calculation, from the user, or from an assumption.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # production bundle in dist/
```

## The workflow

Upload → AI analysis → part specification → weight/volume → material selection →
material cost → process analysis → process cost → manufacturing cost → total cost →
comparison → what-if simulation → report.

Every step has its own page; the stepper at the top of each workflow page moves between them.
Start from **Dashboard → load a sample drawing** (Pump Housing, Drive Shaft or Mounting Bracket)
to see the complete chain without uploading a file.

## Data provenance rules

| Label | Meaning |
|---|---|
| `Drawing` | Read directly from the drawing |
| `AI Calculated` | Derived arithmetically from drawing data (calculation trail is shown) |
| `User Input` | Entered or corrected by the user — overrides everything else |
| `Estimated Assumption` | Seeded rate or model parameter, must be replaced with your own data |
| `Not Available in Drawing` | Missing — **never** filled in with an invented value |

No dimension, material grade, weight, market price, machining time or process parameter is
fabricated. Every AI-derived figure is marked *Estimated – Engineering / Commercial Validation Required*,
and material/process selections are labelled as recommendations, not approvals.
The full register is on the **AI Assumptions** page and in section 13 of the report.

## How the numbers are produced

- **Volume** — priority order: drawing mass callout → 3D CAD solid → geometric calculation
  from drawing dimensions → user input. The arithmetic is itemised on the Weight & Volume page.
  `src/lib/geometry.js`
- **Weight** — volume × density, computed for every candidate material from the same geometry.
- **Route** — rule-based selection from the drawing's manufacturing callouts, geometry,
  tolerance/finish class and annual volume (sand vs gravity vs pressure die casting, forging,
  sheet metal, moulding, machining-from-stock). `src/lib/aiEngine.js`
- **Cycle time** — modelled from material removed ÷ an assumed removal rate scaled by a
  machinability index, plus a finishing term over the machined area only.
- **Cost** — per-operation machine time, amortised setup, tooling, and process-specific
  charges (mould/core/melting/fettling, die/heating/trimming, cutting/bending/welding,
  per-kg heat treatment, per-dm² surface treatment), then labour, energy, quality, packaging,
  rejection, overhead and profit. `src/lib/costing.js`

## Scope of this build

Self-contained prototype: no ERP, CAD kernel, PLM or live commodity price feed is connected.
The analysis engine is deterministic and rule-based, seeded with sample drawing data;
material and process master data are seeded indicative Indian job-shop values, each with a
*last updated* date, and all of them are editable in the UI. Drawings, estimates and master-data
edits are stored in the browser's local storage only.

DWG, DXF, STEP/STP and IGES uploads are accepted and recorded, but are not parsed in the
browser in this build — the file-type support note on the upload page states what each
format would contribute.

## Layout

```
src/
  data/       material master, process master, sample drawing extractions
  lib/        sources (provenance), geometry, aiEngine, costing, assumptions, format
  state/      store.jsx — reducer, persistence, and the derivation pipeline
  components/ ui primitives, provenance-tagged field table, workflow stepper
  pages/      one file per navigation entry
```
