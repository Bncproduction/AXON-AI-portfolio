import React from 'react'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Empty, Kpi, SourceTag, Validation, BarRow, PALETTE, Banner, NoEstimates } from '../components/ui.jsx'
import { money, num } from '../lib/format.js'
import { SRC } from '../lib/sources.js'

export default function MaterialCosting({ go }) {
  const { estimates, project, dispatch, state, volume, needsGeometry } = useStore()

  if (!estimates.length) {
    return <NoEstimates go={go} needsGeometry={needsGeometry} />
  }

  const p = project.params
  const maxCost = Math.max(...estimates.map((e) => e.lines.materialCost))
  const cheapest = [...estimates].sort((a, b) => a.lines.materialCost - b.lines.materialCost)[0]

  return (
    <>
      <Stepper current="matcost" go={go} />
      <div className="page-head">
        <h1>Material-wise Costing</h1>
        <p className="lead">
          Raw material cost = gross weight × price per kg. Gross weight adds the scrap / buy-to-fly allowance for the
          stock form; any recovered scrap value is credited back separately.
        </p>
      </div>

      <div className="grid g4">
        <Kpi label="Part Volume" value={`${num(volume?.volumeCm3, 1)} cm³`} foot={volume?.basis} />
        <Kpi label="Materials Costed" value={estimates.length} foot="Same geometry, different alloy" />
        <Kpi label="Lowest Material Cost" value={money(cheapest.lines.materialCost)} foot={cheapest.materialName} tone="green" />
        <Kpi label="Scrap Recovery Credit" value={`${p.scrapRecoveryPct} %`} foot="Of the scrap weight's material value" tone="accent" />
      </div>

      <Card title="Raw Material Cost" hint="Rates and scrap allowances are editable" flush>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Material</th><th>Grade</th><th className="num">Density</th><th className="num">Net Weight</th>
                <th className="num">Scrap %</th><th className="num">Gross Weight</th><th className="num">Price ₹/kg</th>
                <th className="num">Raw Material Cost</th><th className="num">Scrap Credit</th><th className="num">Net Material Cost</th>
                <th>Price Source</th><th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((e) => {
                const m = state.materialMaster.find((x) => x.id === e.materialId)
                return (
                  <tr key={e.materialId} className={e.isDrawingMaterial ? 'highlight' : ''}>
                    <td>
                      <b>{e.materialName}</b>
                      {e.isDrawingMaterial && <span className="tag drawing" style={{ marginLeft: 6 }}>Drawing</span>}
                    </td>
                    <td className="muted">{e.materialGrade}</td>
                    <td className="num">{e.density.toFixed(2)}</td>
                    <td className="num">{num(e.netWeightKg, 3)} kg</td>
                    <td className="num">
                      <input className="inp num sm" style={{ width: 62 }} type="number" step="0.5"
                        value={m.scrapAllowancePct}
                        onChange={(ev) => dispatch({ type: 'UPDATE_MATERIAL_MASTER', id: e.materialId, patch: { scrapAllowancePct: Number(ev.target.value) } })} />
                    </td>
                    <td className="num">{num(e.grossWeightKg, 3)} kg</td>
                    <td className="num">
                      <input className="inp num sm" style={{ width: 82 }} type="number" step="1"
                        value={m.price}
                        onChange={(ev) => dispatch({ type: 'UPDATE_MATERIAL_MASTER', id: e.materialId, patch: { price: Number(ev.target.value) } })} />
                    </td>
                    <td className="num">{money(e.lines.materialCost)}</td>
                    <td className="num" style={{ color: 'var(--accent-2)' }}>−{money(e.lines.scrapRecovery)}</td>
                    <td className="num"><b>{money(e.lines.materialCost - e.lines.scrapRecovery)}</b></td>
                    <td><SourceTag source={m.priceSource || SRC.ASSUMPTION} /></td>
                    <td className="small muted nowrap">{m.lastUpdated}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid g2">
        <Card title="Material Cost Comparison">
          {estimates.map((e, i) => (
            <BarRow key={e.materialId} name={e.materialName} value={e.lines.materialCost} max={maxCost}
              color={PALETTE[i % PALETTE.length]} display={money(e.lines.materialCost)} />
          ))}
          <div className="legend mt"><span className="muted small">Raw material cost per part, before any process content.</span></div>
        </Card>

        <Card title="Price Governance">
          <Banner kind="warn">
            <span>⚠</span>
            <span>
              Prices in this build are <b>seeded indicative rates</b>, not a live market feed. Each carries a
              <b> Last Updated</b> date. Overwrite them with your own purchase data before quoting.
            </span>
          </Banner>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Material</th><th className="num">Price ₹/kg</th><th>Source</th><th>Last Updated</th></tr></thead>
              <tbody>
                {estimates.map((e) => {
                  const m = state.materialMaster.find((x) => x.id === e.materialId)
                  return (
                    <tr key={e.materialId}>
                      <td>{m.name} <span className="muted small">{m.grade}</span></td>
                      <td className="num">{money(m.price)}</td>
                      <td><SourceTag source={m.priceSource || SRC.ASSUMPTION} /></td>
                      <td className="small muted">{m.lastUpdated}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Validation>
        Material prices are estimated assumptions pending confirmation from purchase. Estimated – Engineering / Commercial Validation Required.
      </Validation>

      <div className="flex">
        <button className="btn primary" onClick={() => go('process')}>Continue to Process Analysis →</button>
      </div>
    </>
  )
}
