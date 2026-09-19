import React from 'react'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, SourceTag, ConfTag, Empty, Validation, Kpi } from '../components/ui.jsx'
import { isAvailable, SRC } from '../lib/sources.js'
import { num } from '../lib/format.js'

const ROWS = [
  ['part', 'partName', 'Part Name', ''],
  ['part', 'partNumber', 'Part Number', ''],
  ['part', 'drawingNumber', 'Drawing Number', ''],
  ['part', 'revision', 'Revision', ''],
  ['part', 'componentType', 'Component Type', ''],
  ['material', 'specification', 'Material', ''],
  ['material', 'grade', 'Material Grade', ''],
  ['dimensions', 'length', 'Length', 'mm'],
  ['dimensions', 'width', 'Width', 'mm'],
  ['dimensions', 'height', 'Height', 'mm'],
  ['dimensions', 'diameter', 'Diameter', 'mm'],
  ['dimensions', 'thickness', 'Thickness', 'mm'],
  ['dimensions', 'wallThickness', 'Wall Thickness', 'mm'],
  ['dimensions', 'holeDiameter', 'Hole Diameter', 'mm'],
  ['dimensions', 'holeQuantity', 'Hole Quantity', 'nos'],
  ['quality', 'tolerances', 'Tolerance', ''],
  ['quality', 'surfaceFinish', 'Surface Finish', ''],
  ['quality', 'gdt', 'GD&T', ''],
  ['material', 'heatTreatment', 'Heat Treatment', ''],
  ['material', 'coating', 'Coating / Plating', ''],
]

export default function PartSpecification({ go }) {
  const { analysis, dispatch, volume, estimates, drawingMaterialId, state } = useStore()

  if (!analysis) {
    return <Empty title="Run the drawing analysis first" action={<button className="btn primary" onClick={() => go('analysis')}>Go to AI Drawing Analysis</button>}>
      The part specification sheet is built from the extraction output.
    </Empty>
  }

  const drawingMat = state.materialMaster.find((m) => m.id === drawingMaterialId)
  const specWeight = estimates.find((e) => e.materialId === drawingMaterialId)
  const weightField = analysis.weight

  const counts = ROWS.reduce((acc, [g, k]) => {
    const s = analysis[g]?.[k]?.source || SRC.NA
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <>
      <Stepper current="spec" go={go} />
      <div className="page-head">
        <h1>Part Specification</h1>
        <p className="lead">
          The consolidated specification sheet used by every downstream calculation. Each parameter carries its
          source and confidence. Edit any value to override it — the row is then recorded as User Input.
        </p>
      </div>

      <div className="grid g4">
        <Kpi label="From Drawing" value={counts[SRC.DRAWING] || 0} foot="Directly read from the drawing" tone="accent" />
        <Kpi label="AI Calculated" value={counts[SRC.AI] || 0} foot="Derived from drawing data" />
        <Kpi label="User Input" value={counts[SRC.USER] || 0} foot="Manually entered or corrected" tone="green" />
        <Kpi label="Not Available" value={counts[SRC.NA] || 0} foot="Missing on the drawing" tone="warn" />
      </div>

      <Card title="Specification Sheet" hint="All values editable" flush>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th style={{ width: '20%' }}>Parameter</th><th style={{ width: '34%' }}>Extracted Value</th><th>Source</th><th>Confidence</th><th>Note</th></tr>
            </thead>
            <tbody>
              {ROWS.map(([group, key, label, unit]) => {
                const fld = analysis[group]?.[key]
                const ok = isAvailable(fld)
                return (
                  <tr key={`${group}.${key}`}>
                    <td><b>{label}</b></td>
                    <td>
                      <div className="flex" style={{ gap: 6, flexWrap: 'nowrap' }}>
                        <input className="inp sm" value={ok ? fld.value : ''}
                          placeholder="Not Available in Drawing"
                          onChange={(e) => dispatch({ type: 'UPDATE_FIELD', group, key, value: e.target.value })} />
                        {unit && <span className="muted small">{unit}</span>}
                      </div>
                    </td>
                    <td><SourceTag source={fld?.source} /></td>
                    <td><ConfTag level={fld?.confidence} /></td>
                    <td className="small muted">{fld?.note || (ok ? '' : 'Not present on the drawing.')}</td>
                  </tr>
                )
              })}

              {/* Weight is special: drawing callout first, otherwise derived */}
              <tr className="highlight">
                <td><b>Weight</b></td>
                <td>
                  <div className="flex" style={{ gap: 6, flexWrap: 'nowrap' }}>
                    <input className="inp sm" type="number" step="0.001"
                      value={isAvailable(weightField) ? weightField.value : (specWeight?.netWeightKg ?? '')}
                      onChange={(e) => dispatch({ type: 'UPDATE_WEIGHT_FIELD', value: e.target.value === '' ? null : Number(e.target.value) })} />
                    <span className="muted small">kg</span>
                  </div>
                </td>
                <td><SourceTag source={isAvailable(weightField) ? weightField.source : SRC.AI} /></td>
                <td><ConfTag level={isAvailable(weightField) ? weightField.confidence : (volume?.confidence || 'Medium')} /></td>
                <td className="small muted">
                  {isAvailable(weightField)
                    ? weightField.note
                    : `Derived: ${num(volume?.volumeCm3, 1)} cm³ × ${drawingMat ? `${drawingMat.density} g/cm³ (${drawingMat.name})` : 'material density'} ÷ 1000.`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Validation>
        This specification sheet is an extraction aid, not a controlled document. Confirm every dimension, tolerance
        and material callout against the released drawing before quoting. Estimated – Engineering / Commercial Validation Required.
      </Validation>

      <div className="flex">
        <button className="btn primary" onClick={() => go('weight')}>Continue to Weight &amp; Volume →</button>
      </div>
    </>
  )
}
