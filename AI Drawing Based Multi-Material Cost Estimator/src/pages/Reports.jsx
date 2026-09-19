import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Empty, Field } from '../components/ui.jsx'
import { collectAssumptions } from '../lib/assumptions.js'
import { breakdownRows } from '../lib/costing.js'
import { isAvailable, SRC, DISCLAIMER, RECO_DISCLAIMER } from '../lib/sources.js'
import { money, money0, num, dateStr, dateTime } from '../lib/format.js'
import { ENGINE_MODE } from '../lib/aiEngine.js'

const S = ({ n, title, children }) => (
  <section>
    <h2>Section {n} — {title}</h2>
    {children}
  </section>
)

const T = ({ head, rows }) => (
  <table>
    <thead><tr>{head.map((h, i) => <th key={i} className={i > 0 ? 'num' : ''}>{h}</th>)}</tr></thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i}>{r.map((c, j) => <td key={j} className={j > 0 && typeof c !== 'object' ? 'num' : ''}>{c}</td>)}</tr>
      ))}
    </tbody>
  </table>
)

const fv = (fld, suffix = '') => (isAvailable(fld) ? `${fld.value}${suffix}` : 'Not Available in Drawing')

export default function Reports({ go }) {
  const { analysis, drawing, estimates, project, volume, state, dispatch } = useStore()
  const [primary, setPrimary] = useState(null)
  const [show, setShow] = useState(false)

  if (!analysis || !estimates.length) {
    return <Empty title="Report not available yet" action={<button className="btn primary" onClick={() => go('upload')}>Start the workflow</button>}>
      A report needs an analyzed drawing and at least one costed material.
    </Empty>
  }

  const est = estimates.find((e) => e.materialId === primary) || estimates.find((e) => e.isDrawingMaterial) || estimates[0]
  const sorted = [...estimates].sort((a, b) => a.total - b.total)
  const rows = collectAssumptions({ analysis, volume, estimates, params: project.params, drawing })
  const st = state.settings
  const setS = (patch) => dispatch({ type: 'UPDATE_SETTINGS', patch })
  const L = est.lines
  const p = project.params

  return (
    <>
      <Stepper current="reports" go={go} />
      <div className="no-print">
        <div className="page-head">
          <h1>Generate Comparison Report</h1>
          <p className="lead">
            A 14-section costing report covering the drawing, the analysis, every material and process option, the
            simulation levers and the full assumption register. Print to PDF from the button below.
          </p>
        </div>

        <Card title="Report Header">
          <div className="grid g4">
            <Field label="Primary costed option">
              <select className="inp" value={est.materialId} onChange={(e) => setPrimary(e.target.value)}>
                {estimates.map((e) => <option key={e.materialId} value={e.materialId}>{e.materialName} — {money(e.total)}</option>)}
              </select>
            </Field>
            <Field label="Customer"><input className="inp" value={st.customer} onChange={(e) => setS({ customer: e.target.value })} placeholder={drawing?.customer || 'Customer name'} /></Field>
            <Field label="Supplier"><input className="inp" value={st.supplier} onChange={(e) => setS({ supplier: e.target.value })} /></Field>
            <Field label="Prepared By"><input className="inp" value={st.preparedBy} onChange={(e) => setS({ preparedBy: e.target.value })} /></Field>
            <Field label="Engineering Approval">
              <input className="inp" value={st.approvalEngineering} onChange={(e) => setS({ approvalEngineering: e.target.value })}
                placeholder={drawing?.approvedBy ? `${drawing.approvedBy} (approved the drawing)` : 'Name / designation'} />
            </Field>
            <Field label="Costing Approval"><input className="inp" value={st.approvalCosting} onChange={(e) => setS({ approvalCosting: e.target.value })} placeholder="Name / designation" /></Field>
          </div>
          <div className="flex mt">
            <button className="btn primary" onClick={() => setShow(true)}>Generate Comparison Report</button>
            <button className="btn" disabled={!show} onClick={() => window.print()}>Download / Print PDF</button>
          </div>
        </Card>
      </div>

      {show && (
        <div className="report">
          <div className="rhead">
            <div>
              <h1>Manufacturing Cost Estimate &amp; Material Comparison Report</h1>
              <div className="note">{st.company}</div>
            </div>
            <div className="right note">
              <div><b>Report date:</b> {dateStr()}</div>
              <div><b>Prepared by:</b> {st.preparedBy}</div>
              <div><b>Currency:</b> INR (₹)</div>
            </div>
          </div>

          <div className="meta">
            <div><b>Part Number</b>{drawing?.partNumber || analysis.part.partNumber?.value || '—'}</div>
            <div><b>Part Name</b>{drawing?.partName || analysis.part.partName?.value || '—'}</div>
            <div><b>Drawing Number</b>{drawing?.drawingNumber || analysis.part.drawingNumber?.value || '—'}</div>
            <div><b>Revision</b>{drawing?.revision || analysis.part.revision?.value || '—'}</div>
            <div><b>Customer</b>{st.customer || drawing?.customer || '—'}</div>
            <div><b>Supplier</b>{st.supplier || '—'}</div>
            <div><b>Costed Option</b>{est.materialName} · {est.recommendedProcess}</div>
            <div><b>Total / Part</b>{money(est.total)}</div>
          </div>

          <S n="1" title="Engineering Drawing">
            <T head={['Item', 'Detail']} rows={[
              ['File name', drawing?.fileName || '—'],
              ['Drawing number', drawing?.drawingNumber || '—'],
              ['Part number / name', `${drawing?.partNumber || '—'} / ${drawing?.partName || '—'}`],
              ['Revision', drawing?.revision || '—'],
              ['Drawing date', drawing?.drawingDate || 'Not recorded'],
              ['Drawing approved by', drawing?.approvedBy ? `${drawing.approvedBy} (from the drawing's approval block)` : 'Not stated on the drawing'],
              ['Uploaded by / on', `${drawing?.uploadedBy || '—'} · ${dateTime(drawing?.uploadDate)}`],
            ]} />
          </S>

          <S n="2" title="AI Drawing Analysis">
            <p className="note">Engine mode: {ENGINE_MODE}</p>
            <T head={['Parameter', 'Value', 'Source', 'Confidence']} rows={[
              ...Object.entries({ partName: 'Part name', partNumber: 'Part number', componentType: 'Component type' })
                .map(([k, label]) => [label, fv(analysis.part[k]), analysis.part[k]?.source, analysis.part[k]?.confidence]),
              ...Object.entries({ specification: 'Material specification', heatTreatment: 'Heat treatment', coating: 'Coating', surfaceTreatment: 'Surface treatment' })
                .map(([k, label]) => [label, fv(analysis.material[k]), analysis.material[k]?.source, analysis.material[k]?.confidence]),
              ...Object.entries({ casting: 'Casting requirement', forging: 'Forging requirement', machining: 'Machining requirement', sheetMetal: 'Sheet metal requirement', welding: 'Welding requirement', specialProcess: 'Special process' })
                .map(([k, label]) => [label, fv(analysis.manufacturing[k]), analysis.manufacturing[k]?.source, analysis.manufacturing[k]?.confidence]),
            ]} />
          </S>

          <S n="3" title="Part Specifications">
            <T head={['Parameter', 'Value', 'Source', 'Confidence']} rows={[
              ...Object.entries({ length: 'Length (mm)', width: 'Width (mm)', height: 'Height (mm)', diameter: 'Diameter (mm)', thickness: 'Thickness (mm)', wallThickness: 'Wall thickness (mm)', holeDiameter: 'Hole diameter (mm)', holeQuantity: 'Hole quantity', threadDetails: 'Threads', radius: 'Radius', chamfer: 'Chamfer' })
                .map(([k, label]) => [label, fv(analysis.dimensions[k]), analysis.dimensions[k]?.source, analysis.dimensions[k]?.confidence]),
              ...Object.entries({ tolerances: 'Tolerances', gdt: 'GD&T', datums: 'Datums', surfaceFinish: 'Surface finish', criticalCharacteristics: 'Critical characteristics', specialNotes: 'Special notes' })
                .map(([k, label]) => [label, fv(analysis.quality[k]), analysis.quality[k]?.source, analysis.quality[k]?.confidence]),
            ]} />
          </S>

          <S n="4" title="Weight &amp; Volume Estimation">
            <p className="note">Method: {volume?.method} — {volume?.basis}</p>
            <T head={['Term', 'Expression', 'Volume (cm³)']} rows={[
              ...(volume?.steps || []).map((s) => [s.label, s.expr, num(s.valueCm3, 2)]),
              ['Applied volume', volume?.basis, num(volume?.volumeCm3, 2)],
            ]} />
            <T head={['Material', 'Density (g/cm³)', 'Volume (cm³)', 'Estimated weight (kg)', 'Weight source']}
              rows={estimates.map((e) => [e.materialName, e.density.toFixed(2), num(volume?.volumeCm3, 1), num(e.netWeightKg, 3), e.weightSource])} />
          </S>

          <S n="5" title="Material Options">
            <T head={['Material', 'Grade', 'Category', 'Density', 'Price ₹/kg', 'Price updated', 'Engineering note']}
              rows={estimates.map((e) => [e.materialName, e.materialGrade, e.material.category, e.density.toFixed(2), money(e.price), e.material.lastUpdated, e.material.notes])} />
          </S>

          <S n="6" title="Material-wise Cost">
            <T head={['Material', 'Net weight (kg)', 'Scrap %', 'Gross weight (kg)', 'Price ₹/kg', 'Raw material cost', 'Scrap credit', 'Net material cost']}
              rows={estimates.map((e) => [e.materialName, num(e.netWeightKg, 3), e.scrapPct, num(e.grossWeightKg, 3), money(e.price),
                money(e.lines.materialCost), `−${money(e.lines.scrapRecovery)}`, money(e.lines.materialCost - e.lines.scrapRecovery)])} />
          </S>

          <S n="7" title="Manufacturing Process Analysis">
            <p className="note">{RECO_DISCLAIMER}</p>
            <T head={['Material', 'Recommended process', 'Alternative', 'Reason for the alternative', 'Validation']}
              rows={estimates.map((e) => [e.materialName, e.recommendedProcess, e.route.alternatives[0]?.name || '—', e.route.alternatives[0]?.reason || '—', 'Engineering validation required'])} />
          </S>

          <S n="8" title="Process Cost">
            <p className="note">Route detail for the costed option: {est.materialName} — {est.recommendedProcess}</p>
            <T head={['Operation', 'Category', 'Cycle (min)', 'Rate ₹/hr', 'Machine', 'Setup', 'Tooling', 'Charges', 'Labour', 'Total ₹/part']}
              rows={est.route.steps.map((s) => {
                const c = est.steps.find((x) => x.uid === s.uid) || {}
                return [s.name, s.category, num(s.cycleMin, 1), s.rate ? money(s.rate) : '—',
                  money(c.machine || 0), money(c.setup || 0), money(c.tooling || 0), money(c.extras || 0), money(c.labour || 0), money(c.total || 0)]
              })} />
          </S>

          <S n="9" title="Manufacturing Cost">
            <T head={['Cost element', '₹ / part']} rows={[
              ['Raw material cost', money(L.materialCost)],
              ['Less: scrap recovery', `−${money(L.scrapRecovery)}`],
              ['Process cost', money(L.processCost)],
              ['Machining cost', money(L.machiningCost)],
              ['Labour cost', money(L.labourCost)],
              ['Energy cost', money(L.energyCost)],
              ['Tooling cost (amortised)', money(L.toolingCost)],
              ['Fixture cost (amortised)', money(L.fixtureCost)],
              ['Heat treatment cost', money(L.heatTreatmentCost)],
              ['Surface treatment cost', money(L.surfaceTreatmentCost)],
              ['Inspection cost', money(L.inspectionCost)],
              ['NDT cost', money(L.ndtCost)],
              ['Packaging cost', money(L.packagingCost)],
              ['Other manufacturing costs', money(L.otherCost)],
              ['Sub-total', money(est.subtotal)],
              [`Scrap / rejection allowance (${p.rejectionPct} %)`, money(L.rejectionCost)],
              ['Manufacturing cost', money(est.manufacturingCost)],
            ]} />
          </S>

          <S n="10" title="Total Estimated Cost">
            <T head={['Element', '₹ / part', '% of total']} rows={[
              ...breakdownRows(est).map((r) => [r.key, money(r.value), `${((r.value / est.total) * 100).toFixed(1)} %`]),
              ['TOTAL ESTIMATED COST / PART', money(est.total), '100.0 %'],
            ]} />
            <T head={['Basis', 'Quantity', 'Value']} rows={[
              ['Estimated cost per part', '1', money(est.total)],
              ['Estimated batch cost', p.lotQty.toLocaleString('en-IN'), money0(est.batchCost)],
              ['Estimated annual cost', p.annualQty.toLocaleString('en-IN'), money0(est.annualCost)],
            ]} />
          </S>

          <S n="11" title="Material &amp; Process Comparison">
            <T head={['Material', 'Process', 'Weight (kg)', 'Material cost', 'Process cost', 'Machining', 'Manufacturing cost', 'Total / part', 'Δ vs lowest']}
              rows={sorted.map((e) => [e.materialName, e.recommendedProcess, num(e.netWeightKg, 3),
                money(e.lines.materialCost - e.lines.scrapRecovery), money(e.lines.processCost), money(e.lines.machiningCost),
                money(e.manufacturingCost), money(e.total),
                e.total === sorted[0].total ? '—' : `+${num(((e.total - sorted[0].total) / sorted[0].total) * 100, 1)} %`])} />
            <p className="note">
              The lowest-cost option ({sorted[0].materialName}) is identified on cost grounds only. This report does not
              approve any material or process for the application.
            </p>
          </S>

          <S n="12" title="Cost Simulation">
            <T head={['Lever', 'Applied value']} rows={[
              ['Material price change', `${p.materialPriceDeltaPct > 0 ? '+' : ''}${p.materialPriceDeltaPct} %`],
              ['Cycle time change (relative)', `${p.cycleTimeDeltaPct > 0 ? '+' : ''}${p.cycleTimeDeltaPct} %`],
              ['Cycle time change (absolute)', `${p.cycleTimeDeltaMin > 0 ? '+' : ''}${p.cycleTimeDeltaMin} min`],
              ['Machine rate change', `${p.machineRateDeltaPct > 0 ? '+' : ''}${p.machineRateDeltaPct} %`],
              ['Labour rate change', `${p.labourRateDeltaPct > 0 ? '+' : ''}${p.labourRateDeltaPct} %`],
              ['Heat treatment cost change', `${p.htDeltaPct > 0 ? '+' : ''}${p.htDeltaPct} %`],
              ['Surface treatment cost change', `${p.stDeltaPct > 0 ? '+' : ''}${p.stDeltaPct} %`],
              ['Rejection %', `${p.rejectionPct} %`],
              ['Overhead %', `${p.overheadPct} %`],
              ['Profit %', `${p.profitPct} %`],
            ]} />
          </S>

          <S n="13" title="AI Assumptions">
            <T head={['Group', 'Parameter', 'Value used', 'Source', 'Basis']}
              rows={rows.map((r) => [r.group, r.parameter, r.value, r.source, r.note])} />
          </S>

          <S n="14" title="Engineering Validation">
            <p className="note"><b>{DISCLAIMER}</b></p>
            <T head={['Item', 'Statement']} rows={[
              ['Scope', 'This report is a cost estimate produced from an engineering drawing by an automated analysis and costing engine.'],
              ['Data provenance', 'Every value is labelled Drawing, AI Calculated, User Input or Estimated Assumption. Missing information is reported as "Not Available in Drawing" and has not been invented.'],
              ['Material suitability', 'Material options are cost comparisons. Mechanical, corrosion and regulatory suitability must be confirmed by design engineering.'],
              ['Process selection', 'Process routes are recommendations derived from the drawing and production volume. They require manufacturing engineering confirmation.'],
              ['Rates and prices', 'Material prices, machine rates and labour rates are seeded indicative values, not a live market or ERP feed. Confirm with purchase and finance.'],
              ['Validity', `Valid for drawing ${drawing?.drawingNumber || '—'} revision ${drawing?.revision || '—'} only. Any revision change requires a re-estimate.`],
            ]} />
            <div className="sign">
              <div>Prepared by<br /><b>{st.preparedBy || '—'}</b><br />{dateStr()}</div>
              <div>Engineering approval<br /><b>{st.approvalEngineering || '________________'}</b><br />Date: __________</div>
              <div>Costing approval<br /><b>{st.approvalCosting || '________________'}</b><br />Date: __________</div>
              <div>Customer acceptance<br /><b>{st.customer || '________________'}</b><br />Date: __________</div>
            </div>
          </S>
        </div>
      )}
    </>
  )
}
