import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { Card, Kpi, Banner } from '../components/ui.jsx'
import { money, money0, num } from '../lib/format.js'

export default function History() {
  const { state, dispatch } = useStore()
  const [q, setQ] = useState('')

  const rows = state.history.filter((h) =>
    !q || `${h.partNumber} ${h.drawingNumber} ${h.material} ${h.process} ${h.partName}`.toLowerCase().includes(q.toLowerCase()))

  const avg = rows.length ? rows.reduce((a, r) => a + r.total, 0) / rows.length : 0
  const csv = () => {
    const head = ['Date', 'Drawing', 'Part No', 'Part Name', 'Rev', 'Material', 'Process', 'Weight kg', 'Cost/Part', 'Lot', 'Batch Cost', 'Annual Cost', 'Prepared By']
    const body = rows.map((h) => [h.date, h.drawingNumber, h.partNumber, h.partName, h.revision, h.material, h.process,
      h.weight, h.total.toFixed(2), h.lotQty, h.batch.toFixed(2), h.annual.toFixed(2), h.preparedBy])
    const text = [head, ...body].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `cost-estimates-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="page-head">
        <h1>Estimate History</h1>
        <p className="lead">Every estimate saved from the Manufacturing Cost page, with the quantity basis it was built on.</p>
      </div>

      <div className="grid g4">
        <Kpi label="Saved Estimates" value={state.history.length} foot="This workspace" tone="accent" />
        <Kpi label="Average Cost / Part" value={money(avg)} foot="Across filtered rows" />
        <Kpi label="Distinct Parts" value={new Set(state.history.map((h) => h.partNumber)).size} foot="By part number" />
        <Kpi label="Distinct Materials" value={new Set(state.history.map((h) => h.material)).size} foot="Grades costed" tone="green" />
      </div>

      <Banner kind="info"><span>ⓘ</span><span>Every saved estimate remains marked <b>pending engineering and commercial validation</b> until signed off outside this tool.</span></Banner>

      <Card
        title="Saved Estimates"
        hint={`${rows.length} of ${state.history.length}`}
        actions={
          <div className="flex" style={{ gap: 6 }}>
            <input className="inp sm" style={{ width: 220 }} placeholder="Search part, drawing, material…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn sm" onClick={csv} disabled={!rows.length}>Export CSV</button>
          </div>
        }
        flush
      >
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Drg./Part No.</th><th>Part No.</th><th>Part Name</th><th>Rev</th><th>Material</th><th>Process</th>
                <th className="num">Weight</th><th className="num">Lot</th><th className="num">Cost / Part</th>
                <th className="num">Batch</th><th className="num">Annual</th><th>Prepared By</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={14} className="muted" style={{ textAlign: 'center', padding: 28 }}>No estimates saved yet. Save one from the Manufacturing Cost page.</td></tr>}
              {rows.map((h) => (
                <tr key={h.id}>
                  <td className="nowrap">{h.date}</td>
                  <td>{h.drawingNumber}</td>
                  <td>{h.partNumber}</td>
                  <td>{h.partName}</td>
                  <td>{h.revision}</td>
                  <td>{h.material}</td>
                  <td className="small">{h.process}</td>
                  <td className="num">{num(h.weight, 3)} kg</td>
                  <td className="num">{h.lotQty?.toLocaleString('en-IN')}</td>
                  <td className="num"><b>{money(h.total)}</b></td>
                  <td className="num">{money0(h.batch)}</td>
                  <td className="num">{money0(h.annual)}</td>
                  <td className="small muted">{h.preparedBy}</td>
                  <td className="right"><button className="btn sm danger" onClick={() => dispatch({ type: 'DELETE_HISTORY', id: h.id })}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
