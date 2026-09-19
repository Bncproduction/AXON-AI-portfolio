import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Empty, Kpi, Validation, Banner, Num, NoEstimates } from '../components/ui.jsx'
import { PROCESS_MASTER, processById } from '../data/processes.js'
import { money, num, uid } from '../lib/format.js'

const BASIS_LABEL = { part: '₹/part', lot: '₹/lot', kg: '₹/kg', dm2: '₹/dm²' }

export default function ProcessCost({ go }) {
  const { estimates, project, dispatch, needsGeometry } = useStore()
  const [active, setActive] = useState(null)
  const [adding, setAdding] = useState('')

  if (!estimates.length) {
    return <NoEstimates go={go} needsGeometry={needsGeometry} />
  }

  const est = estimates.find((e) => e.materialId === active) || estimates[0]
  const route = est.route
  const params = project.params

  // Persist a modified copy of the route (routes are generated on demand until edited)
  const saveRoute = (steps) =>
    dispatch({ type: 'SET_ROUTE', materialId: est.materialId, route: { ...route, steps } })

  const patchStep = (uidKey, patch) =>
    saveRoute(route.steps.map((s) => (s.uid === uidKey ? { ...s, ...patch } : s)))

  const patchExtra = (uidKey, i, value) =>
    saveRoute(route.steps.map((s) =>
      s.uid === uidKey ? { ...s, extras: s.extras.map((e, idx) => (idx === i ? { ...e, amount: value } : e)) } : s))

  const removeStep = (uidKey) => saveRoute(route.steps.filter((s) => s.uid !== uidKey))

  const addStep = (processId) => {
    if (!processId) return
    const p = processById(processId)
    saveRoute([...route.steps, {
      uid: `${processId}-${uid()}`,
      processId, name: p.name, category: p.category,
      rate: p.rate || 0, cycleMin: 0, setupMin: p.setupMin || 0,
      labourFactor: p.labourFactor ?? 1, toolCostPerPart: 0,
      extras: [
        ...(p.perKg ? [{ label: 'Weight-based charge', amount: p.perKg, basis: 'kg' }] : []),
        ...(p.perDm2 ? [{ label: 'Area-based charge', amount: p.perDm2, basis: 'dm2' }] : []),
        ...(p.batchCost ? [{ label: 'Batch charge', amount: p.batchCost, basis: 'lot' }] : []),
      ],
      reason: 'Added manually by the user.',
    }])
    setAdding('')
  }

  const totals = est.steps.reduce((a, s) => ({
    machine: a.machine + s.machine, setup: a.setup + s.setup, tooling: a.tooling + s.tooling,
    extras: a.extras + s.extras, labour: a.labour + s.labour, energy: a.energy + s.energy, total: a.total + s.total,
  }), { machine: 0, setup: 0, tooling: 0, extras: 0, labour: 0, energy: 0, total: 0 })

  return (
    <>
      <Stepper current="proccost" go={go} />
      <div className="page-head">
        <h1>Process Cost</h1>
        <p className="lead">
          Every operation is costed from its own machine rate, cycle time, setup time and process-specific charges.
          Setup, tooling and batch charges are amortised over the lot size. All values are editable.
        </p>
      </div>

      <div className="flex" style={{ marginBottom: 14 }}>
        {estimates.map((e) => (
          <button key={e.materialId} className={`btn sm ${e.materialId === est.materialId ? 'primary' : ''}`}
            onClick={() => setActive(e.materialId)}>
            {e.materialName} · {money(e.lines.processCost + e.lines.machiningCost)}
          </button>
        ))}
      </div>

      <div className="grid g4">
        <Kpi label="Route" value={route.recommended} foot={`${route.steps.length} operations`} tone="accent" />
        <Kpi label="Total Cycle Time" value={`${num(est.totalCycleMin, 1)} min`} foot="Sum of all operation cycles" />
        <Kpi label="Process + Machining" value={money(est.lines.processCost + est.lines.machiningCost)} foot="Excludes labour, HT and surface treatment" />
        <Kpi label="Lot Size Used" value={params.lotQty.toLocaleString('en-IN')} foot="Setup and batch charges divided by this" tone="green" />
      </div>

      <Banner kind="info">
        <span>ⓘ</span>
        <span>
          Per-part cost of an operation = (cycle ÷ 60 × machine rate) + (setup ÷ 60 × rate ÷ lot) + tooling per part
          + process charges. Labour and energy are reported separately so they are not double counted.
        </span>
      </Banner>

      {route.steps.map((s) => {
        const c = est.steps.find((x) => x.uid === s.uid)
        return (
          <div className="route-step" key={s.uid}>
            <div className="rs-head">
              <b>{s.name}</b>
              <span className="tag neutral">{s.category}</span>
              <span className="mono small muted">{money(c?.total || 0)} / part</span>
              <div className="spacer" />
              <button className="btn sm danger" onClick={() => removeStep(s.uid)}>Remove</button>
            </div>

            <div className="grid g4" style={{ gap: 10 }}>
              <div className="field"><label>Machine rate (₹/hr)</label>
                <Num value={s.rate} onChange={(v) => patchStep(s.uid, { rate: v })} width={100} /></div>
              <div className="field"><label>Cycle time (min)</label>
                <Num value={s.cycleMin} onChange={(v) => patchStep(s.uid, { cycleMin: v })} step={0.1} width={100} /></div>
              <div className="field"><label>Setup time (min)</label>
                <Num value={s.setupMin} onChange={(v) => patchStep(s.uid, { setupMin: v })} width={100} /></div>
              <div className="field"><label>Tool cost (₹/part)</label>
                <Num value={s.toolCostPerPart} onChange={(v) => patchStep(s.uid, { toolCostPerPart: v })} step={0.5} width={100} /></div>
            </div>

            {s.extras.length > 0 && (
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Process charge</th><th>Basis</th><th className="num">Rate</th><th className="num">₹ / part</th></tr></thead>
                  <tbody>
                    {s.extras.map((x, i) => (
                      <tr key={i}>
                        <td>{x.label}</td>
                        <td><span className="tag neutral">{BASIS_LABEL[x.basis]}</span></td>
                        <td className="num">
                          <input className="inp num sm" style={{ width: 110 }} type="number" step="1"
                            value={x.amount} onChange={(e) => patchExtra(s.uid, i, Number(e.target.value))} />
                        </td>
                        <td className="num">{money(c?.extraLines?.[i]?.perPart || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid g4 mt" style={{ gap: 10 }}>
              {[['Machine time', c?.machine], ['Setup (amortised)', c?.setup], ['Tooling', c?.tooling],
                ['Process charges', c?.extras], ['Labour', c?.labour], ['Energy', c?.energy]].map(([k, v]) => (
                <div key={k} className="small"><span className="muted">{k}</span><br /><b className="mono">{money(v || 0)}</b></div>
              ))}
            </div>
            <p className="reason">{s.reason}</p>
          </div>
        )
      })}

      <Card title="Add an operation">
        <div className="flex">
          <select className="inp" style={{ maxWidth: 320 }} value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Select a process…</option>
            {PROCESS_MASTER.map((p) => <option key={p.id} value={p.id}>{p.category} — {p.name}</option>)}
          </select>
          <button className="btn primary" disabled={!adding} onClick={() => addStep(adding)}>Add to route</button>
          <span className="muted small">Added operations start at zero cycle time — enter your own.</span>
        </div>
      </Card>

      <Card title={`Process Cost Summary — ${est.materialName}`} flush>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Operation</th><th>Category</th><th className="num">Machine</th><th className="num">Setup</th>
                <th className="num">Tooling</th><th className="num">Charges</th><th className="num">Labour</th>
                <th className="num">Energy</th><th className="num">Total ₹/part</th></tr>
            </thead>
            <tbody>
              {est.steps.map((s) => (
                <tr key={s.uid}>
                  <td><b>{s.name}</b></td>
                  <td className="small muted">{s.category}</td>
                  <td className="num">{money(s.machine)}</td>
                  <td className="num">{money(s.setup)}</td>
                  <td className="num">{money(s.tooling)}</td>
                  <td className="num">{money(s.extras)}</td>
                  <td className="num">{money(s.labour)}</td>
                  <td className="num">{money(s.energy)}</td>
                  <td className="num"><b>{money(s.total)}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td className="num">{money(totals.machine)}</td><td className="num">{money(totals.setup)}</td>
                <td className="num">{money(totals.tooling)}</td><td className="num">{money(totals.extras)}</td>
                <td className="num">{money(totals.labour)}</td><td className="num">{money(totals.energy)}</td>
                <td className="num">{money(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Validation>
        Machine rates, cycle times and process charges are estimated assumptions seeded from job-shop averages.
        Estimated – Engineering / Commercial Validation Required.
      </Validation>

      <div className="flex">
        <button className="btn primary" onClick={() => go('mfgcost')}>Continue to Manufacturing Cost →</button>
      </div>
    </>
  )
}
