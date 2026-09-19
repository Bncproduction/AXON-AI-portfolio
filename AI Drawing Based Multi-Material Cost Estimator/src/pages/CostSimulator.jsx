import React, { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Empty, Kpi, Validation, Slider, PALETTE } from '../components/ui.jsx'
import { computeEstimate } from '../lib/costing.js'
import { money, num } from '../lib/format.js'

const LEVERS = [
  { key: 'materialPriceDeltaPct', label: 'Material price', min: -40, max: 60, step: 1, fmt: (v) => `${v > 0 ? '+' : ''}${v} %` },
  { key: 'cycleTimeDeltaPct', label: 'Machining / cycle time', min: -50, max: 60, step: 1, fmt: (v) => `${v > 0 ? '+' : ''}${v} %` },
  { key: 'cycleTimeDeltaMin', label: 'Cycle time (absolute)', min: -30, max: 30, step: 0.5, fmt: (v) => `${v > 0 ? '+' : ''}${v} min` },
  { key: 'machineRateDeltaPct', label: 'Machine rate', min: -30, max: 50, step: 1, fmt: (v) => `${v > 0 ? '+' : ''}${v} %` },
  { key: 'labourRateDeltaPct', label: 'Labour rate', min: -30, max: 60, step: 1, fmt: (v) => `${v > 0 ? '+' : ''}${v} %` },
  { key: 'htDeltaPct', label: 'Heat treatment cost', min: -50, max: 60, step: 1, fmt: (v) => `${v > 0 ? '+' : ''}${v} %` },
  { key: 'stDeltaPct', label: 'Surface treatment cost', min: -50, max: 60, step: 1, fmt: (v) => `${v > 0 ? '+' : ''}${v} %` },
]

const DIRECT = [
  { key: 'scrapRecoveryPct', label: 'Scrap recovery %', min: 0, max: 90, step: 1, fmt: (v) => `${v} %` },
  { key: 'rejectionPct', label: 'Rejection %', min: 0, max: 20, step: 0.1, fmt: (v) => `${v} %` },
  { key: 'overheadPct', label: 'Overhead %', min: 0, max: 60, step: 0.5, fmt: (v) => `${v} %` },
  { key: 'profitPct', label: 'Profit %', min: 0, max: 40, step: 0.5, fmt: (v) => `${v} %` },
  { key: 'labourRate', label: 'Labour rate (₹/hr)', min: 100, max: 1200, step: 10, fmt: (v) => `₹${v}` },
  { key: 'energyRatePerHr', label: 'Energy cost (₹/hr)', min: 0, max: 500, step: 5, fmt: (v) => `₹${v}` },
  { key: 'toolingCost', label: 'Tooling cost (₹)', min: 0, max: 1000000, step: 5000, fmt: (v) => `₹${v.toLocaleString('en-IN')}` },
  { key: 'lotQty', label: 'Production quantity (lot)', min: 10, max: 10000, step: 10, fmt: (v) => v.toLocaleString('en-IN') },
]

const SCENARIOS = [
  { label: 'Material price +10 %', patch: { materialPriceDeltaPct: 10 } },
  { label: 'Material price −10 %', patch: { materialPriceDeltaPct: -10 } },
  { label: 'Machining time −10 min', patch: { cycleTimeDeltaMin: -10 } },
  { label: 'Machining time +10 %', patch: { cycleTimeDeltaPct: 10 } },
  { label: 'Rejection 5 % → 2 %', patch: { rejectionPct: 2 } },
  { label: 'Lot size ×4', patch: null, special: 'lot4' },
  { label: 'Labour rate +15 %', patch: { labourRateDeltaPct: 15 } },
]

export default function CostSimulator({ go }) {
  const { estimates, project, dispatch } = useStore()
  const [active, setActive] = useState(null)

  const est = estimates.find((e) => e.materialId === active) || estimates[0] || null
  const p = project?.params || {}
  const set = (key, value) => dispatch({ type: 'UPDATE_PARAM', key, value })

  // Baseline = the same route with every what-if lever returned to zero.
  const baseParams = useMemo(() => ({
    ...p, materialPriceDeltaPct: 0, cycleTimeDeltaPct: 0, cycleTimeDeltaMin: 0,
    machineRateDeltaPct: 0, labourRateDeltaPct: 0, htDeltaPct: 0, stDeltaPct: 0,
  }), [p])

  const baseline = useMemo(() => (est ? computeEstimate({
    material: est.material, route: est.route, netWeightKg: est.netWeightKg, areaDm2: est.route.analysisInputs.surfaceAreaDm2, params: baseParams,
  }) : null), [est, baseParams])

  // Sensitivity sweep of material price against total cost, for every material
  const sweep = useMemo(() => {
    const points = [-20, -10, 0, 10, 20, 30, 40]
    return points.map((d) => {
      const row = { delta: `${d > 0 ? '+' : ''}${d}%` }
      estimates.forEach((e) => {
        const r = computeEstimate({
          material: e.material, route: e.route, netWeightKg: e.netWeightKg,
          areaDm2: e.route.analysisInputs.surfaceAreaDm2, params: { ...p, materialPriceDeltaPct: d },
        })
        row[e.materialName] = Number(r.total.toFixed(2))
      })
      return row
    })
  }, [estimates, p])

  if (!est) {
    return <Empty title="Nothing to simulate yet" action={<button className="btn primary" onClick={() => go('materials')}>Go to Material Selection</button>}>
      Build an estimate first, then use this page to test its sensitivity.
    </Empty>
  }

  const delta = est.total - baseline.total
  const deltaPct = (delta / baseline.total) * 100

  const applyScenario = (s) => {
    if (s.special === 'lot4') { set('lotQty', p.lotQty * 4); return }
    Object.entries(s.patch).forEach(([k, v]) => set(k, v))
  }

  const compareRows = [
    ['Material cost', baseline.lines.materialCost, est.lines.materialCost],
    ['Process cost', baseline.lines.processCost, est.lines.processCost],
    ['Machining cost', baseline.lines.machiningCost, est.lines.machiningCost],
    ['Labour + energy', baseline.lines.labourCost + baseline.lines.energyCost, est.lines.labourCost + est.lines.energyCost],
    ['Heat treatment', baseline.lines.heatTreatmentCost, est.lines.heatTreatmentCost],
    ['Surface treatment', baseline.lines.surfaceTreatmentCost, est.lines.surfaceTreatmentCost],
    ['Rejection allowance', baseline.lines.rejectionCost, est.lines.rejectionCost],
    ['Overhead', baseline.lines.overhead, est.lines.overhead],
    ['Profit', baseline.lines.profit, est.lines.profit],
    ['Manufacturing cost', baseline.manufacturingCost, est.manufacturingCost],
    ['Total / part', baseline.total, est.total],
  ]

  return (
    <>
      <Stepper current="simulator" go={go} />
      <div className="page-head">
        <h1>What-If Cost Simulator</h1>
        <p className="lead">
          Move any lever and the whole estimate recalculates immediately. The baseline column always shows the
          un-simulated estimate so the effect of each change stays visible.
        </p>
      </div>

      <div className="flex" style={{ marginBottom: 14 }}>
        {estimates.map((e) => (
          <button key={e.materialId} className={`btn sm ${e.materialId === est.materialId ? 'primary' : ''}`} onClick={() => setActive(e.materialId)}>
            {e.materialName}
          </button>
        ))}
        <div className="spacer" />
        <button className="btn" onClick={() => dispatch({ type: 'RESET_SIM' })}>Reset simulation</button>
      </div>

      <div className="grid g4">
        <Kpi label="Baseline Total / Part" value={money(baseline.total)} foot="All what-if levers at zero" />
        <Kpi label="Simulated Total / Part" value={money(est.total)} foot={est.materialName} tone="accent" />
        <Kpi label="Change" value={`${delta >= 0 ? '+' : ''}${money(delta)}`} foot={`${deltaPct >= 0 ? '+' : ''}${num(deltaPct, 2)} %`} tone={delta > 0 ? 'warn' : 'green'} />
        <Kpi label="Simulated Annual Cost" value={money(est.annualCost)} foot={`${est.annualQty.toLocaleString('en-IN')} pcs/yr`} />
      </div>

      <Card title="Quick Scenarios">
        <div className="flex">
          {SCENARIOS.map((s) => (
            <button key={s.label} className="btn sm" onClick={() => applyScenario(s)}>{s.label}</button>
          ))}
        </div>
      </Card>

      <div className="grid g2">
        <Card title="What-if Levers" hint="Relative changes against the current estimate">
          {LEVERS.map((l) => (
            <Slider key={l.key} label={l.label} value={p[l.key] ?? 0} min={l.min} max={l.max} step={l.step}
              onChange={(v) => set(l.key, v)} format={l.fmt} />
          ))}
        </Card>
        <Card title="Direct Inputs" hint="Absolute values used by the costing engine">
          {DIRECT.map((l) => (
            <Slider key={l.key} label={l.label} value={p[l.key] ?? 0} min={l.min} max={l.max} step={l.step}
              onChange={(v) => set(l.key, v)} format={l.fmt} />
          ))}
        </Card>
      </div>

      <Card title="Baseline vs Simulated" hint={est.materialName} flush>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Cost element</th><th className="num">Baseline</th><th className="num">Simulated</th><th className="num">Δ ₹</th><th className="num">Δ %</th></tr></thead>
            <tbody>
              {compareRows.map(([k, b, s]) => {
                const d = s - b
                return (
                  <tr key={k} className={k === 'Total / part' ? 'highlight' : ''}>
                    <td>{k === 'Total / part' ? <b>{k}</b> : k}</td>
                    <td className="num">{money(b)}</td>
                    <td className="num">{money(s)}</td>
                    <td className="num" style={{ color: d > 0.005 ? 'var(--warn)' : d < -0.005 ? 'var(--accent-2)' : undefined }}>
                      {d === 0 ? '—' : `${d > 0 ? '+' : ''}${money(d)}`}
                    </td>
                    <td className="num muted">{b ? `${d > 0 ? '+' : ''}${num((d / b) * 100, 1)} %` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Material Price Sensitivity" hint="Total cost per part across a price sweep">
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={sweep}>
              <CartesianGrid stroke="#24303f" />
              <XAxis dataKey="delta" stroke="#6d7f94" fontSize={11} />
              <YAxis stroke="#6d7f94" fontSize={11} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#151d2a', border: '1px solid #24303f', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {estimates.map((e, i) => (
                <Line key={e.materialId} type="monotone" dataKey={e.materialName} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Validation>
        Simulation output inherits every assumption behind the baseline estimate. Estimated – Engineering / Commercial Validation Required.
      </Validation>

      <div className="flex">
        <button className="btn primary" onClick={() => go('reports')}>Continue to Report →</button>
      </div>
    </>
  )
}
