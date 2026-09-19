import React from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Empty, Kpi, Validation, Banner, PALETTE } from '../components/ui.jsx'
import { money, money0, num } from '../lib/format.js'
import { RECO_DISCLAIMER } from '../lib/sources.js'

export default function CostComparison({ go }) {
  const { estimates, project } = useStore()

  if (estimates.length < 1) {
    return <Empty title="Nothing to compare yet" action={<button className="btn primary" onClick={() => go('materials')}>Go to Material Selection</button>}>
      Select two or more materials to build a comparison.
    </Empty>
  }

  const sorted = [...estimates].sort((a, b) => a.total - b.total)
  const lowest = sorted[0]
  const highest = sorted[sorted.length - 1]
  const drawingEst = estimates.find((e) => e.isDrawingMaterial)

  const chartData = estimates.map((e) => ({
    name: e.materialName,
    Material: Number((e.lines.materialCost - e.lines.scrapRecovery).toFixed(2)),
    Process: Number(e.lines.processCost.toFixed(2)),
    Machining: Number(e.lines.machiningCost.toFixed(2)),
    Labour: Number((e.lines.labourCost + e.lines.energyCost).toFixed(2)),
    Tooling: Number((e.lines.toolingCost + e.lines.fixtureCost).toFixed(2)),
    'Heat/Surface': Number((e.lines.heatTreatmentCost + e.lines.surfaceTreatmentCost).toFixed(2)),
    Quality: Number(e.lines.qualityCost.toFixed(2)),
    'Rejection/OH/Profit': Number((e.lines.rejectionCost + e.lines.overhead + e.lines.profit).toFixed(2)),
  }))

  const radarData = ['Weight', 'Material cost', 'Cycle time', 'Total cost', 'Process charges'].map((metric) => {
    const row = { metric }
    const vals = {
      Weight: (e) => e.netWeightKg,
      'Material cost': (e) => e.lines.materialCost,
      'Cycle time': (e) => e.totalCycleMin,
      'Total cost': (e) => e.total,
      'Process charges': (e) => e.lines.processCost + e.lines.machiningCost,
    }[metric]
    const max = Math.max(...estimates.map(vals)) || 1
    estimates.forEach((e) => { row[e.materialName] = Number(((vals(e) / max) * 100).toFixed(1)) })
    return row
  })

  return (
    <>
      <Stepper current="compare" go={go} />
      <div className="page-head">
        <h1>Material &amp; Process Cost Comparison</h1>
        <p className="lead">
          Every combination is shown side by side with the same geometry, quantity and commercial assumptions.
          The lowest cost option is identified as a cost fact only — it is not a technical approval.
        </p>
      </div>

      <Banner kind="warn"><span>⚠</span><span>{RECO_DISCLAIMER}</span></Banner>

      <div className="grid g4">
        <Kpi label="Lowest Total Cost" value={money(lowest.total)} foot={`${lowest.materialName} · ${lowest.recommendedProcess}`} tone="green" />
        <Kpi label="Highest Total Cost" value={money(highest.total)} foot={`${highest.materialName} · ${highest.recommendedProcess}`} tone="warn" />
        <Kpi label="Spread" value={`${num(((highest.total - lowest.total) / lowest.total) * 100, 1)} %`} foot={`${money(highest.total - lowest.total)} per part`} tone="accent" />
        <Kpi label="Drawing Material Rank"
          value={drawingEst ? `${sorted.findIndex((e) => e.materialId === drawingEst.materialId) + 1} of ${sorted.length}` : 'n/a'}
          foot={drawingEst ? `${drawingEst.materialName} · ${money(drawingEst.total)}` : 'Drawing material not in the selection'} />
      </div>

      <Card title="Comparison Table" hint={`Lot ${project.params.lotQty.toLocaleString('en-IN')} · ${project.params.annualQty.toLocaleString('en-IN')} pcs/yr`} flush>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Material</th><th>Process Route</th><th className="num">Weight</th><th className="num">Material Cost</th>
                <th className="num">Process Cost</th><th className="num">Machining</th><th className="num">Manufacturing Cost</th>
                <th className="num">Total / Part</th><th className="num">Batch Cost</th><th className="num">Annual Cost</th><th className="num">Δ vs lowest</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.materialId} className={e.materialId === lowest.materialId ? 'highlight' : ''}>
                  <td>
                    <b>{e.materialName}</b> <span className="muted small">{e.materialGrade}</span>
                    {e.isDrawingMaterial && <span className="tag drawing" style={{ marginLeft: 6 }}>Drawing</span>}
                  </td>
                  <td className="small">{e.recommendedProcess}</td>
                  <td className="num">{num(e.netWeightKg, 3)} kg</td>
                  <td className="num">{money(e.lines.materialCost - e.lines.scrapRecovery)}</td>
                  <td className="num">{money(e.lines.processCost)}</td>
                  <td className="num">{money(e.lines.machiningCost)}</td>
                  <td className="num">{money(e.manufacturingCost)}</td>
                  <td className="num"><b>{money(e.total)}</b></td>
                  <td className="num">{money0(e.batchCost)}</td>
                  <td className="num">{money0(e.annualCost)}</td>
                  <td className="num" style={{ color: e.total === lowest.total ? 'var(--accent-2)' : 'var(--warn)' }}>
                    {e.total === lowest.total ? '—' : `+${num(((e.total - lowest.total) / lowest.total) * 100, 1)} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Cost Build-up by Material" hint="Stacked — each band is a cost element">
        <div style={{ height: 340 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid stroke="#24303f" vertical={false} />
              <XAxis dataKey="name" stroke="#6d7f94" fontSize={11} />
              <YAxis stroke="#6d7f94" fontSize={11} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#151d2a', border: '1px solid #24303f', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {['Material', 'Process', 'Machining', 'Labour', 'Tooling', 'Heat/Surface', 'Quality', 'Rejection/OH/Profit'].map((k, i) => (
                <Bar key={k} dataKey={k} stackId="a" fill={PALETTE[i % PALETTE.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid g2">
        <Card title="Total Cost per Part">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={sorted.map((e) => ({ name: e.materialName, total: Number(e.total.toFixed(2)) }))} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid stroke="#24303f" horizontal={false} />
                <XAxis type="number" stroke="#6d7f94" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <YAxis type="category" dataKey="name" stroke="#6d7f94" fontSize={11} width={110} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ background: '#151d2a', border: '1px solid #24303f', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {sorted.map((e, i) => <Cell key={e.materialId} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Relative Profile" hint="Each axis normalised to the highest value = 100">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius={95}>
                <PolarGrid stroke="#24303f" />
                <PolarAngleAxis dataKey="metric" stroke="#9fb0c4" fontSize={11} />
                {estimates.map((e, i) => (
                  <Radar key={e.materialId} name={e.materialName} dataKey={e.materialName}
                    stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.14} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#151d2a', border: '1px solid #24303f', borderRadius: 8, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Engineering Information for Evaluation">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Material</th><th>Route</th><th>Engineering considerations</th><th>Status</th></tr></thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.materialId}>
                  <td><b>{e.materialName}</b></td>
                  <td className="small">{e.recommendedProcess}</td>
                  <td className="small muted">{e.material.notes}</td>
                  <td><span className="tag assumption">Engineering validation required</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Validation>
        Cost differences are shown for evaluation. No option is technically approved by this application.
      </Validation>

      <div className="flex">
        <button className="btn primary" onClick={() => go('simulator')}>Continue to Cost Simulator →</button>
      </div>
    </>
  )
}
