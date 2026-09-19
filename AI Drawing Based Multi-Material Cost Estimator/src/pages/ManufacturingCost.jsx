import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Empty, Kpi, Validation, PALETTE, BarRow, NoEstimates } from '../components/ui.jsx'
import { breakdownRows } from '../lib/costing.js'
import { money, money0, num, uid, dateStr } from '../lib/format.js'

const PARAM_FIELDS = [
  ['lotQty', 'Production quantity (lot)', 'pcs', 1],
  ['annualQty', 'Annual quantity', 'pcs/yr', 1],
  ['overheadPct', 'Overhead %', '%', 0.5],
  ['profitPct', 'Profit %', '%', 0.5],
  ['rejectionPct', 'Rejection %', '%', 0.1],
  ['scrapRecoveryPct', 'Scrap recovery %', '%', 1],
  ['labourRate', 'Labour rate', '₹/hr', 5],
  ['energyRatePerHr', 'Energy cost', '₹/hr', 5],
  ['toolingCost', 'Tooling cost (one-time)', '₹', 1000],
  ['toolingLifeQty', 'Tooling life', 'pcs', 500],
  ['fixtureCost', 'Fixture cost (one-time)', '₹', 1000],
  ['fixtureLifeQty', 'Fixture life', 'pcs', 500],
  ['inspectionCost', 'Inspection cost', '₹/part', 1],
  ['ndtCost', 'NDT cost', '₹/part', 1],
  ['packagingCost', 'Packaging cost', '₹/part', 1],
  ['otherCost', 'Other manufacturing cost', '₹/part', 1],
]

export default function ManufacturingCost({ go }) {
  const { estimates, project, dispatch, state, drawing, needsGeometry } = useStore()
  const [active, setActive] = useState(null)

  if (!estimates.length) {
    return <NoEstimates go={go} needsGeometry={needsGeometry} />
  }

  const est = estimates.find((e) => e.materialId === active) || estimates[0]
  const p = project.params
  const L = est.lines
  const rows = breakdownRows(est)
  const maxRow = Math.max(...rows.map((r) => r.value))

  const set = (key, value) => dispatch({ type: 'UPDATE_PARAM', key, value })

  const save = () => {
    dispatch({
      type: 'SAVE_ESTIMATE',
      record: {
        id: uid(),
        date: dateStr(),
        drawingNumber: drawing?.drawingNumber || drawing?.fileName,
        partNumber: drawing?.partNumber || '—',
        partName: drawing?.partName || '—',
        revision: drawing?.revision || '—',
        material: est.materialName,
        process: est.recommendedProcess,
        supplier: state.settings.supplier,
        weight: est.netWeightKg,
        total: est.total,
        batch: est.batchCost,
        annual: est.annualCost,
        lotQty: est.lotQty,
        preparedBy: state.settings.preparedBy,
      },
    })
  }

  const MFG_ROWS = [
    ['Raw Material Cost', L.materialCost],
    ['Less: Scrap Recovery', -L.scrapRecovery],
    ['Process Cost (forming / casting / fabrication)', L.processCost],
    ['Machining Cost', L.machiningCost],
    ['Labour Cost', L.labourCost],
    ['Energy Cost', L.energyCost],
    ['Tooling Cost (amortised)', L.toolingCost],
    ['Fixture Cost (amortised)', L.fixtureCost],
    ['Heat Treatment Cost', L.heatTreatmentCost],
    ['Surface Treatment Cost', L.surfaceTreatmentCost],
    ['Inspection Cost', L.inspectionCost],
    ['NDT Cost', L.ndtCost],
    ['Packaging Cost', L.packagingCost],
    ['Other Manufacturing Costs', L.otherCost],
  ]

  return (
    <>
      <Stepper current="mfgcost" go={go} />
      <div className="page-head">
        <h1>Manufacturing Cost &amp; Total Estimated Cost</h1>
        <p className="lead">
          Manufacturing cost aggregates every direct element and the rejection allowance. Overhead and profit are then
          applied to reach the total estimated cost per part.
        </p>
      </div>

      <div className="flex" style={{ marginBottom: 14 }}>
        {estimates.map((e) => (
          <button key={e.materialId} className={`btn sm ${e.materialId === est.materialId ? 'primary' : ''}`} onClick={() => setActive(e.materialId)}>
            {e.materialName} · {money(e.total)}
          </button>
        ))}
        <div className="spacer" />
        <button className="btn success" onClick={save}>Save Estimate to History</button>
      </div>

      <div className="hero-total" style={{ marginBottom: 16 }}>
        <div className="flex" style={{ alignItems: 'flex-end', gap: 28 }}>
          <div>
            <div className="label muted small" style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Estimated Cost / Part</div>
            <div className="amount">{money(est.total)} <span className="unit">/ part</span></div>
            <div className="muted small mt">
              {est.materialName} ({est.materialGrade}) · {est.recommendedProcess} · {num(est.netWeightKg, 3)} kg · lot {est.lotQty.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="spacer" />
          <div className="grid g3" style={{ gap: 14, minWidth: 420 }}>
            <Kpi label="Manufacturing Cost" value={money(est.manufacturingCost)} foot="Before overhead & profit" />
            <Kpi label="Estimated Batch Cost" value={money0(est.batchCost)} foot={`${est.lotQty.toLocaleString('en-IN')} pcs`} tone="accent" />
            <Kpi label="Estimated Annual Cost" value={money0(est.annualCost)} foot={`${est.annualQty.toLocaleString('en-IN')} pcs/yr`} tone="green" />
          </div>
        </div>
      </div>

      <div className="grid g2">
        <Card title="Manufacturing Cost Calculation" hint="Per part" flush>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Cost element</th><th className="num">₹ / part</th><th className="num">% of total</th></tr></thead>
              <tbody>
                {MFG_ROWS.map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className="num" style={{ color: v < 0 ? 'var(--accent-2)' : undefined }}>{money(v)}</td>
                    <td className="num muted">{((v / est.total) * 100).toFixed(1)} %</td>
                  </tr>
                ))}
                <tr><td><b>Sub-total</b></td><td className="num"><b>{money(est.subtotal)}</b></td><td className="num muted">{((est.subtotal / est.total) * 100).toFixed(1)} %</td></tr>
                <tr><td>Scrap / Rejection Allowance ({p.rejectionPct} %)</td><td className="num">{money(L.rejectionCost)}</td><td className="num muted">{((L.rejectionCost / est.total) * 100).toFixed(1)} %</td></tr>
                <tr className="highlight"><td><b>Manufacturing Cost</b></td><td className="num"><b>{money(est.manufacturingCost)}</b></td><td className="num muted">{((est.manufacturingCost / est.total) * 100).toFixed(1)} %</td></tr>
                <tr><td>Overhead ({p.overheadPct} %)</td><td className="num">{money(L.overhead)}</td><td className="num muted">{((L.overhead / est.total) * 100).toFixed(1)} %</td></tr>
                <tr><td>Profit ({p.profitPct} %)</td><td className="num">{money(L.profit)}</td><td className="num muted">{((L.profit / est.total) * 100).toFixed(1)} %</td></tr>
              </tbody>
              <tfoot>
                <tr><td>Total Estimated Cost / Part</td><td className="num">{money(est.total)}</td><td className="num">100.0 %</td></tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <div>
          <Card title="Cost Distribution">
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={rows} dataKey="value" nameKey="key" innerRadius={58} outerRadius={100} paddingAngle={2} stroke="none">
                    {rows.map((r, i) => <Cell key={r.key} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#151d2a', border: '1px solid #24303f', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend">
              {rows.map((r, i) => (
                <span key={r.key}><i style={{ background: PALETTE[i % PALETTE.length] }} />{r.key} · {money(r.value)}</span>
              ))}
            </div>
          </Card>

          <Card title="Cost Element Ranking">
            {[...rows].sort((a, b) => b.value - a.value).map((r, i) => (
              <BarRow key={r.key} name={r.key} value={r.value} max={maxRow} color={PALETTE[i % PALETTE.length]}
                display={`${money(r.value)} · ${((r.value / est.total) * 100).toFixed(1)}%`} />
            ))}
          </Card>
        </div>
      </div>

      <Card title="Commercial &amp; Quantity Inputs" hint="User Input — drives every estimate on this page">
        <div className="grid g4" style={{ gap: 10 }}>
          {PARAM_FIELDS.map(([key, label, unit, step]) => (
            <div className="field" key={key}>
              <label>{label} <span className="muted">({unit})</span></label>
              <input className="inp num" type="number" step={step} value={p[key] ?? ''} onChange={(e) => set(key, Number(e.target.value))} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Quantity Sensitivity" hint="How the per-part cost moves with lot size">
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={[50, 100, 250, 500, 1000, 2500, 5000].map((q) => {
              const setupShare = est.steps.reduce((a, s) => a + s.setup, 0) * (est.lotQty / q)
              const batchShare = est.steps.reduce((a, s) => a + (s.extraLines || []).filter((x) => x.basis === 'lot').reduce((b, x) => b + x.perPart, 0), 0) * (est.lotQty / q)
              const base = est.total - est.steps.reduce((a, s) => a + s.setup, 0)
                - est.steps.reduce((a, s) => a + (s.extraLines || []).filter((x) => x.basis === 'lot').reduce((b, x) => b + x.perPart, 0), 0)
              return { qty: q.toLocaleString('en-IN'), cost: Number((base + setupShare + batchShare).toFixed(2)) }
            })}>
              <CartesianGrid stroke="#24303f" vertical={false} />
              <XAxis dataKey="qty" stroke="#6d7f94" fontSize={11} />
              <YAxis stroke="#6d7f94" fontSize={11} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#151d2a', border: '1px solid #24303f', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="cost" fill="#37a2ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="small muted mb0">
          Only setup and batch-based charges are re-amortised; material, cycle time and per-part charges are held constant.
        </p>
      </Card>

      <Validation>
        This total is an estimate built from AI-calculated geometry, seeded rates and stated assumptions.
        Estimated – Engineering / Commercial Validation Required.
      </Validation>

      <div className="flex">
        <button className="btn primary" onClick={() => go('compare')}>Continue to Cost Comparison →</button>
      </div>
    </>
  )
}
