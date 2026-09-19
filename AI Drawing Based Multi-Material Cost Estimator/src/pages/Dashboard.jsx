import React, { useState } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore, useDeleteDrawing } from '../state/store.jsx'
import { Card, Kpi, PALETTE, Banner } from '../components/ui.jsx'
import { WORKFLOW } from '../components/Stepper.jsx'
import { money, money0, num, dateTime } from '../lib/format.js'

const F = { part: '', drawing: '', material: 'All', process: 'All', supplier: 'All', date: '', revision: 'All' }

export default function Dashboard({ go }) {
  const { state, dispatch, estimates, drawing, project } = useStore()
  const removeDrawing = useDeleteDrawing()
  const [f, setF] = useState(F)

  const analyzed = state.drawings.filter((d) => d.analyzed).length
  const materialsAnalyzed = new Set(state.history.map((h) => h.material)).size + (project?.selectedMaterials?.length || 0)
  const pending = state.drawings.length - analyzed

  const set = (k, v) => setF({ ...f, [k]: v })
  const uniq = (key) => ['All', ...new Set(state.history.map((h) => h[key]).filter(Boolean))]

  const history = state.history.filter((h) =>
    (!f.part || h.partNumber.toLowerCase().includes(f.part.toLowerCase())) &&
    (!f.drawing || String(h.drawingNumber).toLowerCase().includes(f.drawing.toLowerCase())) &&
    (f.material === 'All' || h.material === f.material) &&
    (f.process === 'All' || h.process === f.process) &&
    (f.supplier === 'All' || h.supplier === f.supplier) &&
    (f.revision === 'All' || h.revision === f.revision) &&
    (!f.date || h.date === f.date))

  const chart = estimates.map((e) => ({ name: e.materialName, total: Number(e.total.toFixed(2)) }))

  return (
    <>
      <div className="page-head">
        <h1>Costing Dashboard</h1>
        <p className="lead">
          Drawing-to-cost pipeline status. Upload an engineering drawing to begin; every value in the costing is traced back to that sheet.
        </p>
      </div>

      <div className="grid g4">
        <Kpi label="Drawings Uploaded" value={state.drawings.length} foot="In this workspace" tone="accent" />
        <Kpi label="Drawings Analyzed" value={analyzed} foot={`${pending} pending analysis`} tone="green" />
        <Kpi label="Cost Estimates Generated" value={state.history.length} foot="Saved to history" />
        <Kpi label="Materials Analyzed" value={materialsAnalyzed} foot="Distinct grades costed" />
        <Kpi label="Process Analyses Completed" value={state.stats.processAnalyses} foot="Route generations run" />
        <Kpi label="Pending Validation" value={state.history.length} foot="Every estimate needs sign-off" tone="warn" />
        <Kpi label="Active Part" value={drawing?.partNumber || '—'} foot={drawing?.partName || 'No drawing selected'} />
        <Kpi label="Lowest Estimate (active)" value={estimates.length ? money(Math.min(...estimates.map((e) => e.total))) : '—'}
          foot={estimates.length ? [...estimates].sort((a, b) => a.total - b.total)[0].materialName : 'Not costed yet'} tone="accent" />
      </div>

      <div className="grid g2">
        <Card title="Workflow Progress" hint="Thirteen steps from drawing to report">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>#</th><th>Step</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {WORKFLOW.map((s) => {
                  const done =
                    (s.id === 'upload' && !!drawing) ||
                    (['analysis', 'spec', 'weight'].includes(s.id) && !!project?.analysis) ||
                    (['materials', 'matcost'].includes(s.id) && (project?.selectedMaterials || []).length > 0) ||
                    (['process', 'proccost', 'mfgcost', 'simulator'].includes(s.id) && estimates.length > 0) ||
                    (s.id === 'compare' && estimates.length > 1) ||
                    (s.id === 'reports' && state.history.length > 0)
                  return (
                    <tr key={s.n}>
                      <td className="mono">{s.n}</td>
                      <td><b>{s.label}</b></td>
                      <td><span className={`tag ${done ? 'user' : 'neutral'}`}>{done ? 'Complete' : 'Pending'}</span></td>
                      <td className="right"><button className="btn sm" onClick={() => go(s.id)}>Open</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Active Part — Total Cost by Material">
          {chart.length ? (
            <div style={{ height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={chart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="#24303f" horizontal={false} />
                  <XAxis type="number" stroke="#6d7f94" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#6d7f94" fontSize={11} width={120} />
                  <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#151d2a', border: '1px solid #24303f', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {chart.map((c, i) => <Cell key={c.name} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No costed materials for the active drawing yet.</div>
          )}
        </Card>
      </div>

      <Card
        title="Recent Costing Reports"
        hint={`${history.length} of ${state.history.length}`}
        actions={<button className="btn sm" onClick={() => setF(F)}>Clear filters</button>}
      >
        <div className="grid g4" style={{ gap: 8, marginBottom: 12 }}>
          <div className="field"><label>Part Number</label><input className="inp sm" value={f.part} onChange={(e) => set('part', e.target.value)} placeholder="filter…" /></div>
          <div className="field"><label>Drawing Number</label><input className="inp sm" value={f.drawing} onChange={(e) => set('drawing', e.target.value)} placeholder="filter…" /></div>
          <div className="field"><label>Material</label><select className="inp sm" value={f.material} onChange={(e) => set('material', e.target.value)}>{uniq('material').map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label>Process</label><select className="inp sm" value={f.process} onChange={(e) => set('process', e.target.value)}>{uniq('process').map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label>Supplier</label><select className="inp sm" value={f.supplier} onChange={(e) => set('supplier', e.target.value)}>{uniq('supplier').map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label>Revision</label><select className="inp sm" value={f.revision} onChange={(e) => set('revision', e.target.value)}>{uniq('revision').map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label>Date</label><input className="inp sm" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Drawing</th><th>Part No.</th><th>Rev</th><th>Material</th><th>Process</th>
                <th className="num">Weight</th><th className="num">Cost / Part</th><th className="num">Batch</th><th className="num">Annual</th><th>Status</th></tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={11} className="muted" style={{ textAlign: 'center', padding: 24 }}>No saved estimates match these filters.</td></tr>}
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="nowrap">{h.date}</td>
                  <td>{h.drawingNumber}</td>
                  <td>{h.partNumber}</td>
                  <td>{h.revision}</td>
                  <td>{h.material}</td>
                  <td className="small">{h.process}</td>
                  <td className="num">{num(h.weight, 3)} kg</td>
                  <td className="num"><b>{money(h.total)}</b></td>
                  <td className="num">{money0(h.batch)}</td>
                  <td className="num">{money0(h.annual)}</td>
                  <td><span className="tag assumption">Pending validation</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Drawings" hint={`${state.drawings.length} records`} flush>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Drawing</th><th>Part</th><th>Rev</th><th>Uploaded</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {state.drawings.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>No drawings uploaded.</td></tr>}
              {state.drawings.map((d) => (
                <tr key={d.id} className={d.id === state.activeId ? 'highlight' : ''}>
                  <td><b>{d.drawingNumber || d.fileName}</b></td>
                  <td>{d.partName || '—'} <span className="muted small">{d.partNumber}</span></td>
                  <td>{d.revision || '—'}</td>
                  <td className="nowrap small muted">{dateTime(d.uploadDate)}</td>
                  <td><span className={`tag ${d.analyzed ? 'user' : 'assumption'}`}>{d.analyzed ? 'Analyzed' : 'Pending'}</span></td>
                  <td className="right nowrap">
                    <button className="btn sm" onClick={() => { dispatch({ type: 'SET_ACTIVE', id: d.id }); go('analysis') }}>Open</button>{' '}
                    <button className="btn sm danger" onClick={() => removeDrawing(d.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
