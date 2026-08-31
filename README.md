# AI Drawing Inspection Standard Generator & Inspection Report System

Upload an engineering drawing → AI reads its dimensions, tolerances and GD&T → a Quality Engineer
verifies the extraction → the system generates a controlled **Inspection Standard** → inspectors
record actual measurements against it → the system decides **PASS/FAIL** automatically → QA signs
off → export to PDF or Excel.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design: schema, API surface, page map and the
anti-hallucination contract.

There are two builds of the same application:

```
inspection-portal.html   Single file. Double-click to run — no install, no server, no Python.
backend/ + frontend/     FastAPI · PostgreSQL · Next.js 15 — the deployable multi-user build.
```

---

## Single-file build — `inspection-portal.html`

Open it in any modern browser. Everything is inside the one file: no build step, no dependencies,
no network calls except the optional AI request and the Google Fonts link (which falls back
cleanly offline).

There is no sign-in step — it opens straight onto the dashboard as the Administrator. Roles still
govern what may be changed, so the sidebar carries an **Acting as** switcher: drop to Inspector and
the standard editor goes read-only; drop to Viewer and uploading disappears.

It ships loaded with a real part: **Ignition Sleeve, drawing 2A041514B008 rev L4** (BNC Motors,
Nylon Black). The sheet itself is embedded, so Drawings → 2A041514B008 shows the drawing beside the
24 characteristics extracted from it — 16 dimensional and 8 appearance. The standard is
**BNC-IQC-DIM02** in draft, and **Standards → Controlled document** renders it in the BNC house
layout (appearance + dimension sections, CTQ symbols, IS:2500 sampling table, sign-off blocks)
ready to print or save as PDF.

Reports opens on **IR-2026-00001**, a blank incoming-inspection report carrying all 24 parameters —
the equivalent of a printed blank form on the bench. No measurements are invented: every row starts
pending and you fill it in. This is a real customer part, so no fake inspection history is seeded.

**Inspection reports** follow BNC-IQC-DIR01. The inspector records one reading per piece in the
sample ("20.07, 20.11, 20.06"); the system takes the min and max, fails the lot on its worst
reading and reports that excursion as the deviation — the way the paper form is filled in.
Reports → **Controlled document** renders the incoming-inspection layout: appearance and
dimensional sections, CTQ symbols, six reading cells per row, deviation, Ok/Not Ok, the
Accepted / Conditionally Accepted / Rejected status box, and the three sign-off blocks.

**What it does**

- Full workflow: upload → AI analysis → verify extraction → generate standard → edit/approve →
  create report → record actuals → automatic PASS/FAIL → summary → sign → QA approve.
- Role-based access — viewer, inspector, quality manager, admin — enforced on every action, with
  the **Acting as** switcher in the sidebar instead of a login wall.
- Dashboard, Pareto, severity donut, supplier and inspector performance, part-wise defects,
  daily/weekly/monthly trends. Charts are hand-drawn SVG, so nothing loads from a CDN.
- Export any report or the whole report list to CSV; **Print** produces a clean PDF through the
  browser's print dialog (the sidebar, toolbar and buttons are suppressed).
- Light and dark, following your system setting, with a manual toggle in the toolbar.

**Storage.** Records live in this browser's `localStorage`. Uploaded drawing *files* are held in
memory for the session only, so a reload keeps the drawing record but drops the image preview —
re-upload to see it again. Settings → **Export all data (JSON)** takes a backup;
**Reset to demo data** rebuilds the seed.

**Turning on real AI extraction.** Settings → paste an Anthropic API key. It is stored in your
browser and sent only to `api.anthropic.com`. Without a key, **Run AI analysis** loads the worked
demo extraction instead of reading your file — it never pretends to have read a drawing it hasn't.

> Browsers block cross-origin requests from `file://`, so the live AI call needs the page served
> over HTTP. Run `node .claude/serve.mjs` and open <http://localhost:4173>. Everything else works
> fine from a double-click.

---

## Multi-user build

### 1. Backend

```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # macOS/Linux: . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python seed.py --reset
uvicorn app.main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>

The default `.env` uses SQLite so nothing else needs installing. For PostgreSQL run
`docker compose up -d db` and set:

```
DATABASE_URL=postgresql+psycopg://qip:qip@localhost:5432/qip
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open <http://localhost:3000>.

### 3. Sign in

| Email | Role | Can do |
|---|---|---|
| `admin@qip.local` | Admin | everything, users, audit log |
| `qm@qip.local` | Quality Manager | verify extractions, edit/approve standards, QA sign-off |
| `inspector@qip.local` | Inspector | upload, analyze, record measurements, submit |
| `viewer@qip.local` | Viewer | read-only |

Password for all: `Password123!`

---

## Enabling real AI extraction

Without an API key the pipeline runs an **offline extractor** whose every field is marked
*Requires Manual Verification* — so the app is fully demoable but never pretends to have read a
drawing it did not. To turn on real vision extraction, set in `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-opus-5
AI_CONFIDENCE_THRESHOLD=0.75
```

PDFs are rasterised at 200 dpi with PyMuPDF (up to `AI_MAX_PAGES` sheets) and sent to a
tool-schema-constrained vision call.

**The AI never invents data.** Anything below the confidence threshold, any missing nominal and any
missing tolerance is flagged `requires_manual_verification`; those parameters cannot be evaluated
by the PASS/FAIL engine and block approval of the standard until a Quality Engineer supplies the
value. Native `.dwg`/`.dxf` files are stored but must be exported to PDF before analysis.

---

## The workflow

1. **Login** → JWT stored client-side, role decides what the sidebar shows.
2. **Drawings → Upload** — PDF/PNG/JPG/TIFF up to 40 MB; optionally analyze immediately.
3. **AI analysis** — title block, dimensions, tolerances, GD&T frames, surface finish, holes,
   threads and inspection notes.
4. **Verify extraction** — amber rows are the ones the AI could not read; the QE fills them in and
   ticks *Verified*.
5. **Generate standard** — each characteristic becomes an inspection parameter with method,
   instrument, frequency, sampling plan, acceptance criteria and criticality.
6. **Edit / approve** — the grid is fully editable while the standard is a draft. Approval is
   refused while any parameter is unverified.
7. **Create report** — header (supplier, batch, PO, invoice, shift, machine, operator…) plus one
   blank result row per parameter.
8. **Record actuals** — PASS/FAIL previews live as the inspector types; the **server** re-evaluates
   every row on save and its verdict is what gets stored.
9. **Summary** — totals, critical failures, disposition (`ACCEPTED` /
   `ACCEPTED_WITH_DEVIATION` / `REJECTED`) and accepted/rejected/rework quantities.
10. **Sign & submit** → **QA approve/reject** with quantities and remarks.
11. **Export** — PDF (ReportLab, landscape A4, failures highlighted) or Excel (openpyxl), or print
    the page directly.

---

## Tests

```bash
cd backend
pytest
```

`tests/test_evaluation.py` covers the PASS/FAIL engine (bilateral, one-sided, flipped signs,
pending states, attribute verdicts) and the summary dispositions.
`tests/test_extraction_guardrails.py` covers the anti-hallucination rules.

---

## Notes for production

- Replace `Base.metadata.create_all` with Alembic migrations.
- Move `POST /drawings/{id}/analyze` onto a task queue — it is synchronous in the MVP and a
  multi-sheet drawing can take a minute.
- Store uploads in S3/Azure Blob rather than the local `storage/` directory.
- Put the JWT in an httpOnly cookie and add refresh tokens; the MVP keeps it in `localStorage`.
- Rate-limit the analyze endpoint; it costs money per call.
