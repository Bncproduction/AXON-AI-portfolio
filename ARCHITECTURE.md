# AI Drawing Inspection Standard Generator & Inspection Report System

Enterprise application that ingests an engineering drawing (PDF/image/CAD export), extracts
technical requirements with an AI vision pipeline, generates a reviewable **Inspection Standard**,
and drives a **Digital Inspection Report** with automatic PASS/FAIL evaluation, QA approval and
PDF/Excel export.

---

## 1. System architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  Browser — Next.js 15 (App Router) + Tailwind + Recharts               │
│  Sidebar shell · Dashboard · Drawings · Standards · Reports · Admin    │
└───────────────┬────────────────────────────────────────────────────────┘
                │  REST + JWT (Bearer)
┌───────────────▼────────────────────────────────────────────────────────┐
│  FastAPI (Python 3.11+)                                                │
│  ├── api/v1  routers: auth, users, suppliers, instruments, parts,      │
│  │            drawings, standards, reports, dashboard, exports         │
│  ├── core    settings · JWT · password hashing · RBAC dependencies     │
│  ├── services                                                          │
│  │     ├── ai_extraction   PDF→raster→Claude vision→ExtractionResult   │
│  │     ├── standard_builder extraction → inspection parameters         │
│  │     ├── evaluation      actual value → PASS/FAIL + deviation        │
│  │     ├── summary         report roll-up + disposition                │
│  │     └── exporters       ReportLab PDF · openpyxl XLSX               │
│  └── models  SQLAlchemy 2.0 ORM                                        │
└───────────────┬─────────────────────────────┬──────────────────────────┘
                │                             │
        ┌───────▼────────┐            ┌───────▼─────────┐
        │  PostgreSQL 15 │            │ Object storage  │
        │  (SQLite dev)  │            │ ./storage/*     │
        └────────────────┘            └─────────────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │ Anthropic Claude   │
                                    │ vision (opus-5)    │
                                    └────────────────────┘
```

### Layering rules
- Routers do HTTP + authorization only; no business logic.
- Services are pure-ish and unit-testable (`evaluation`, `standard_builder`, `summary` have no DB).
- Every state change writes an `audit_logs` row.

---

## 2. AI extraction pipeline

```
upload → store file → create DrawingRevision(status=analyzing)
      → rasterize (PyMuPDF, 200 dpi, max 6 pages) or pass image through
      → Claude vision call, tool-schema-constrained JSON output
      → validate against ExtractionResult (Pydantic)
      → persist extraction_json + per-field confidence
      → status=analyzed  → user verification screen
```

**Anti-hallucination contract (enforced in three places):**

1. *Prompt* — the model is instructed that omission is correct behaviour and that inventing a
   tolerance is a critical failure.
2. *Schema* — every extracted field carries `confidence` (0–1) and `source_note`. Nominal/tolerance
   values are `float | null`; there is no default.
3. *Post-processing* — `ai_extraction.flag_low_confidence()` sets
   `requires_manual_verification = true` whenever confidence < `AI_CONFIDENCE_THRESHOLD` (0.75),
   or a tolerance is missing, or the value could not be parsed. Those parameters render as
   **"Requires Manual Verification"** in the UI and **cannot be evaluated** by the PASS/FAIL engine
   until a Quality Engineer supplies the value. Standards containing unverified parameters cannot
   be approved.

When `ANTHROPIC_API_KEY` is unset the pipeline falls back to a deterministic offline extractor so
the MVP is fully demoable; every field it emits is marked `requires_manual_verification`.

---

## 3. Database schema

14 tables. `→` = FK.

| Table | Key columns |
|---|---|
| `users` | id, email ᵁ, full_name, hashed_password, role, is_active |
| `suppliers` | id, code ᵁ, name, contact_email, rating |
| `instruments` | id, code ᵁ, name, type, least_count, range_text, calibration_due |
| `defects` | id, code ᵁ, name, category, severity |
| `parts` | id, part_number ᵁ, part_name, material, customer_name, supplier → suppliers |
| `drawings` | id, drawing_number, part → parts, file_name/path, status, uploaded_by → users |
| `drawing_revisions` | id, drawing → drawings, revision, is_current, extraction_json, extraction_confidence, status |
| `inspection_standards` | id, code ᵁ, drawing_revision → drawing_revisions, part → parts, version, status, created_by/approved_by → users |
| `inspection_parameters` | id, standard → inspection_standards, seq, parameter, specification, nominal_value, upper_tolerance, lower_tolerance, unit, inspection_method, instrument → instruments, frequency, sampling_plan, acceptance_criteria, classification, reference_dimension, remarks, is_attribute, requires_manual_verification, source_confidence |
| `inspection_reports` | id, report_number ᵁ, standard/part/drawing/supplier FKs, header fields (company, customer, batch, po, invoice, date, shift, machine, operator, inspector), qty fields, summary fields, status, signatures, qa_approver → users |
| `inspection_results` | id, report → inspection_reports, parameter → inspection_parameters, actual_value, actual_text, result, deviation, defect → defects, defect_description, remarks |
| `approvals` | id, entity_type, entity_id, action, status, actor → users, remarks |
| `audit_logs` | id, actor → users, action, entity_type, entity_id, payload(JSON), ip |

Cardinality: Part 1─N Drawing 1─N DrawingRevision 1─N InspectionStandard 1─N InspectionParameter;
InspectionStandard 1─N InspectionReport 1─N InspectionResult (1─1 with a parameter).

---

## 4. API structure (`/api/v1`)

| Method | Path | Role |
|---|---|---|
| POST | `/auth/login` (OAuth2 password form) | public |
| GET | `/auth/me` | any |
| GET/POST | `/users` · PATCH `/users/{id}` | admin |
| GET/POST | `/suppliers`, `/instruments`, `/defects`, `/parts` | viewer+ / QM+ to write |
| POST | `/drawings/upload` (multipart) | inspector+ |
| GET | `/drawings`, `/drawings/{id}`, `/drawings/{id}/file` | viewer+ |
| POST | `/drawings/{id}/analyze` | inspector+ |
| GET/PUT | `/drawings/revisions/{id}/extraction` | QM+ to write |
| POST | `/drawings/revisions/{id}/generate-standard` | QM+ |
| GET | `/standards`, `/standards/{id}` | viewer+ |
| PUT | `/standards/{id}` · PUT `/standards/{id}/parameters` | QM+ |
| POST | `/standards/{id}/approve` | QM+ |
| POST | `/reports` · GET `/reports` · GET `/reports/{id}` | inspector+ |
| PUT | `/reports/{id}` (header) · PUT `/reports/{id}/results` (bulk, auto-evaluates) | inspector+ |
| POST | `/reports/{id}/submit` · `/reports/{id}/qa-approve` | inspector+ / QM+ |
| GET | `/reports/{id}/export.pdf` · `/export.xlsx` | viewer+ |
| GET | `/dashboard/summary`, `/trends`, `/pareto`, `/suppliers`, `/inspectors`, `/parts` | viewer+ |
| GET | `/audit-logs` | admin |

RBAC ranking: `viewer(0) < inspector(1) < quality_manager(2) < admin(3)`, enforced by
`require_role(min_role)` dependencies.

---

## 5. Page structure & navigation flow

```
/login
└── (app shell: sidebar + topbar + search)
    /                       Dashboard — KPI tiles, trends, Pareto, supplier/inspector tables
    /drawings               list + filters, upload dialog
    /drawings/[id]          preview pane | extracted-parameter verification table
                            └─▶ "Generate Inspection Standard"
    /standards              list + status badges
    /standards/[id]         editable parameter grid, approve action
                            └─▶ "Create Inspection Report"
    /reports                list + search by part/drawing/supplier/batch/date
    /reports/[id]           header form · result entry grid (live PASS/FAIL) ·
                            summary · signature · QA approval · print/PDF/XLSX
    /analytics              deeper charts
    /admin                  users, suppliers, instruments
```

Workflow: **Login → Upload → AI analyze → Verify extraction → Generate standard → Edit/approve →
Create report → Enter actuals (auto PASS/FAIL) → Summary → Submit → QA approve → History/Export.**

---

## 6. PASS/FAIL engine

For a variable parameter with `nominal`, `upper_tolerance` (signed, ≥0 normally) and
`lower_tolerance` (signed, ≤0 normally):

```
usl = nominal + upper_tolerance
lsl = nominal + lower_tolerance
PASS  if lsl <= actual <= usl
FAIL  otherwise, deviation = actual - usl  (if above)  or  actual - lsl  (if below)
```

Limit-only specs (e.g. `Ra ≤ 1.6`, `min 6H thread`) are handled by leaving the unused tolerance
`null`. Attribute parameters (`is_attribute`) are judged by the inspector and require a text result.
Parameters flagged `requires_manual_verification` evaluate to `PENDING` and block report submission.

Summary: totals, pass/fail counts, critical failures, overall result
(`ACCEPTED` / `ACCEPTED_WITH_DEVIATION` / `REJECTED`) plus accepted/rejected/rework quantities.

---

## 7. Repository layout

```
backend/    FastAPI app, models, services, seed script, tests
frontend/   Next.js app router, Tailwind, components
```
