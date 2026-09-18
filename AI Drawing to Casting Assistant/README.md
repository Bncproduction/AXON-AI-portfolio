# AI Drawing to Casting Assistant

An AI-assisted workflow for manufacturing and quality engineering teams:

**Drawing → AI analysis → Casting concept → Inspection standard → Quality report**

Upload an engineering drawing, extract its technical content, derive the raw casting
configuration it implies, assess casting feasibility and defect risk, generate a casting
inspection standard, and produce a sign-off ready casting analysis report.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. The workspace seeds itself with three worked examples so the
dashboard, history and report pages are populated on first load.

## Workflow

| Page | What it does |
| --- | --- |
| **Dashboard** | Counts, workflow shortcuts, recent analysis history, validation policy |
| **Upload Drawing** | Drag-and-drop upload (PDF, JPG, PNG, DWG, DXF) with live preview, plus four built-in sample drawings |
| **AI Analysis** | Editable extraction table, critical dimensions, GD&T and datums, hole and thread details, notes, quality requirements |
| **Casting** | Casting concept, drawing-vs-casting comparison, feasibility analysis, process recommendation, defect prediction |
| **Inspection** | Full casting inspection standard — spec, tolerance, method, instrument, frequency, acceptance |
| **Reports** | 11-section casting analysis report with approvals; print / save as PDF |
| **History** | Search and filter every record; record or withdraw engineering validation |
| **Settings** | Organisation defaults, engineering defaults, extraction backend, integration roadmap |

## AI validation rules

The application never presents AI output as approved manufacturing data.

- Every value carries provenance: **From drawing**, **AI derived**, **User edited**,
  **Engineering validated**, or **Not in drawing**.
- Derived content is shown under *"AI Recommendation – Engineering Validation Required."*
- Generated casting geometry is labelled *"AI-Generated Concept – Engineering Validation Required."*
- Where a drawing is silent, the application prints *"Information Not Available in Drawing."*
  rather than filling the gap silently. The process recommender returns
  **Insufficient Information** instead of choosing a process it cannot justify.
- Only a named human approver can move a record to `validated`.

## Architecture

```
src/
  app/                  Next.js App Router pages + API routes
    api/analyze         Drawing extraction stage
    api/casting         Casting concept + feasibility + defects + recommendation
    api/inspection      Inspection standard generation
  components/           UI: shell, technical SVG views, tables, report document
  lib/
    types.ts            Domain model (provenance is part of every derived value)
    samples.ts          Built-in drawing profiles used by the demo extraction
    engine/             analysis · casting · geometry · feasibility · defects ·
                        recommendation · inspection
    pipeline.ts         Stage orchestration shared by the API routes and the seeder
    store.tsx           Client workflow store (localStorage persistence)
  integrations/         Adapter interfaces for CAD, STEP/STL, DWG/DXF, ERP, PLM,
                        MES, supplier quality and digital inspection
```

### Extraction backend

`/api/analyze` runs a deterministic rule engine against a matched sample profile, so the
full workflow is testable offline. To use a real vision model, implement
`ExtractionAdapter` (`src/integrations/index.ts`) and replace the body of that route — it
returns the same `DrawingAnalysis` shape, so nothing downstream changes.

### Casting geometry

`src/lib/engine/geometry.ts` builds a 2-D parametric section model (finished outline, raw
casting outline grown by the machining allowance, cores, parting line, draft, datums,
dimensions). It is deliberately not a CAD kernel: a real STEP/STL generator plugs in behind
`ModelGenerationAdapter` without touching the UI.

In the comparison view the machining allowance can be drawn 3× or 6× oversize so the band is
legible; the annotated values always remain the true allowance, and the view is labelled
whenever it is not true scale.

## Known limitations

- DWG/DXF files are accepted and tracked, but cannot be rendered in a browser without a
  conversion service; the app says so and falls back to a schematic section view.
- Reports export through the browser's print dialog (Save as PDF), which keeps text
  selectable and line work vector.
- Records live in `localStorage`, so a workspace is per-browser and not shared.
