import React from 'react'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Empty, Kpi, SourceTag, Validation, Banner, Field } from '../components/ui.jsx'
import { weightFromVolume } from '../lib/geometry.js'
import { num } from '../lib/format.js'
import { SRC, isAvailable } from '../lib/sources.js'

const PRIORITY = [
  { n: 1, label: 'Actual weight from the drawing', note: 'Used directly when a mass callout exists in the title block.' },
  { n: 2, label: '3D CAD geometry', note: 'Used when a STEP/STP solid is supplied — highest geometric accuracy.' },
  { n: 3, label: 'Calculated from drawing dimensions', note: 'Envelope and feature arithmetic shown in the calculation trail.' },
  { n: 4, label: 'User input', note: 'Requested when the drawing does not carry enough geometry.' },
]

const GEOM_FIELDS = [
  ['length', 'Length', 'mm'], ['width', 'Width', 'mm'], ['height', 'Height', 'mm'],
  ['diameter', 'Diameter', 'mm'], ['thickness', 'Thickness', 'mm'], ['wallThickness', 'Wall Thickness', 'mm'],
  ['boreDiameter', 'Bore Diameter', 'mm'], ['holeDiameter', 'Hole Diameter', 'mm'],
  ['holeQuantity', 'Hole Quantity', 'nos'], ['holeDepth', 'Hole Depth', 'mm'],
  ['fillFactor', 'Solid Fraction', '0–1'],
]

export default function WeightVolume({ go }) {
  const { analysis, geometry, volume, areaDm2, project, dispatch, state, drawingMaterialId } = useStore()

  if (!analysis) {
    return <Empty title="Run the drawing analysis first" action={<button className="btn primary" onClick={() => go('analysis')}>Go to AI Drawing Analysis</button>}>
      Weight and volume are derived from the extracted geometry.
    </Empty>
  }

  const selected = project.selectedMaterials.length
    ? state.materialMaster.filter((m) => project.selectedMaterials.includes(m.id))
    : state.materialMaster.slice(0, 5)

  const insufficient = !volume?.volumeCm3

  return (
    <>
      <Stepper current="weight" go={go} />
      <div className="page-head">
        <h1>Weight &amp; Volume Estimation</h1>
        <p className="lead">
          Volume is established once, then converted to a theoretical weight for every candidate material.
          The source priority below is applied automatically, and the full arithmetic is shown so the number can be checked.
        </p>
      </div>

      {insufficient && (
        <Banner kind="danger">
          <span>⚠</span>
          <span><b>Volume cannot be calculated from the available geometry.</b> Enter the part volume or weight manually below — no value has been assumed.</span>
        </Banner>
      )}

      <div className="grid g4">
        <Kpi label="Estimated Volume" value={`${num(volume?.volumeCm3, 1)} cm³`} foot={volume?.basis} tone="accent" />
        <Kpi label="Volume Source" value={volume?.source === SRC.USER ? 'User Input' : volume?.priority === 1 ? 'Drawing' : 'AI Calculated'} foot={`Priority ${volume?.priority} of 4`} />
        <Kpi label="Surface Area (est.)" value={`${num(areaDm2, 1)} dm²`} foot="Used for surface-treatment costing" />
        <Kpi label="Drawing Mass Callout" value={isAvailable(analysis.weight) ? `${analysis.weight.value} kg` : 'Not Available'} foot={isAvailable(analysis.weight) ? analysis.weight.note : 'No mass in the title block'} tone={isAvailable(analysis.weight) ? 'green' : 'warn'} />
      </div>

      <div className="grid g2">
        <Card title="Volume Calculation Trail" hint={volume?.method}>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Term</th><th>Expression</th><th className="num">Volume (cm³)</th></tr></thead>
              <tbody>
                {(volume?.steps || []).map((s, i) => (
                  <tr key={i}>
                    <td>{s.label}</td>
                    <td className="mono small muted">{s.expr}</td>
                    <td className="num" style={{ color: s.valueCm3 < 0 ? 'var(--danger)' : 'inherit' }}>{num(s.valueCm3, 2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>Geometric volume from drawing dimensions</td><td className="num">{num(volume?.calculatedCm3 ?? volume?.volumeCm3, 2)}</td></tr>
                {volume?.priority === 1 && (
                  <tr><td colSpan={2}>Applied volume — {volume.basis}</td><td className="num" style={{ color: 'var(--accent-2)' }}>{num(volume.volumeCm3, 2)}</td></tr>
                )}
              </tfoot>
            </table>
          </div>
          {volume?.priority === 1 && volume?.calculatedCm3 != null && (
            <Banner kind="info">
              <span>ⓘ</span>
              <span>
                The drawing mass callout takes priority over the geometric estimate. The two differ by{' '}
                <b>{num(Math.abs(volume.volumeCm3 - volume.calculatedCm3) / volume.volumeCm3 * 100, 1)} %</b> — a large gap usually means
                the solid-fraction assumption needs review.
              </span>
            </Banner>
          )}
          <div className="grid g2 mt">
            <Field label="Override volume (cm³)">
              <input className="inp num" type="number" step="0.1" placeholder="leave blank to use calculated"
                value={project.volumeOverrideCm3 ?? ''}
                onChange={(e) => dispatch({ type: 'SET_VOLUME_OVERRIDE', value: e.target.value === '' ? null : Number(e.target.value) })} />
            </Field>
            <Field label="Override part weight (kg) — drawing material only">
              <input className="inp num" type="number" step="0.001" placeholder="leave blank to use derived"
                value={project.weightOverrideKg ?? ''}
                onChange={(e) => dispatch({ type: 'SET_WEIGHT_OVERRIDE', value: e.target.value === '' ? null : Number(e.target.value) })} />
            </Field>
          </div>
        </Card>

        <div>
          <Card title="Geometry Inputs" hint={geometry?.shape ? `Shape model: ${geometry.shape}` : 'No geometry read from the drawing'}>
            {!geometry?.shape && (
              <Banner kind="warn">
                <span>⚠</span>
                <span>
                  No dimensions were read from this drawing. Either enter the volume directly on the left, or pick the
                  closest shape below and enter the dimensions — the volume is then calculated and shown as a trail.
                </span>
              </Banner>
            )}
            <div className="field">
              <label>Shape model</label>
              <select className="inp" value={geometry?.shape || ''}
                onChange={(e) => dispatch({ type: 'UPDATE_GEOMETRY', key: 'shape', value: e.target.value })}>
                <option value="">Select a shape…</option>
                <option value="plate">Plate / sheet (L × W × t)</option>
                <option value="cylinder">Cylinder (Ø × L)</option>
                <option value="stepped-cylinder">Stepped shaft (Ø steps)</option>
                <option value="hollow-box">Hollow body / housing (envelope × solid fraction)</option>
                <option value="prismatic">Prismatic block (L × W × H)</option>
              </select>
            </div>
            <p className="small muted">{geometry?.fillFactorNote}</p>
            <div className="grid g2" style={{ gap: 8 }}>
              {GEOM_FIELDS.filter(([k]) => geometry?.[k] !== undefined || (geometry?.shape && !geometry.steps)).map(([k, label, unit]) => (
                <Field key={k} label={`${label} (${unit})`}>
                  <input className="inp num" type="number" step={k === 'fillFactor' ? 0.01 : 1}
                    value={geometry[k] ?? ''}
                    onChange={(e) => dispatch({ type: 'UPDATE_GEOMETRY', key: k, value: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
              ))}
            </div>
            {geometry?.steps && (
              <>
                <div className="small muted mt">Stepped diameters read from the drawing:</div>
                <div className="tbl-wrap mt">
                  <table>
                    <thead><tr><th>#</th><th className="num">Ø (mm)</th><th className="num">Length (mm)</th></tr></thead>
                    <tbody>
                      {geometry.steps.map((s, i) => (
                        <tr key={i}><td>{i + 1}</td><td className="num">{s.dia}</td><td className="num">{s.len}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          <Card title="Source Priority Applied">
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>#</th><th>Source</th><th>Status</th><th>Note</th></tr></thead>
                <tbody>
                  {PRIORITY.map((p) => {
                    const used = p.n === volume?.priority
                    const unavailable =
                      (p.n === 1 && !isAvailable(analysis.weight)) ||
                      (p.n === 2)
                    return (
                      <tr key={p.n} className={used ? 'highlight' : ''}>
                        <td className="mono">{p.n}</td>
                        <td><b>{p.label}</b></td>
                        <td><span className={`tag ${used ? 'user' : unavailable ? 'na' : 'neutral'}`}>{used ? 'Applied' : unavailable ? 'Not available' : 'Available'}</span></td>
                        <td className="small muted">{p.n === 2 ? 'No 3D solid attached to this drawing record in this build.' : p.note}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Theoretical Weight by Material" hint="Volume × density — identical geometry, different alloy" flush>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Material</th><th>Grade</th><th className="num">Density (g/cm³)</th><th className="num">Estimated Volume (cm³)</th>
                <th className="num">Estimated Weight (kg)</th><th>Source</th></tr>
            </thead>
            <tbody>
              {selected.map((m) => {
                const isDrawing = m.id === drawingMaterialId
                const w = isDrawing && isAvailable(analysis.weight)
                  ? Number(analysis.weight.value)
                  : weightFromVolume(volume?.volumeCm3, m.density)
                return (
                  <tr key={m.id} className={isDrawing ? 'highlight' : ''}>
                    <td><b>{m.name}</b>{isDrawing && <span className="tag drawing" style={{ marginLeft: 8 }}>Drawing specified</span>}</td>
                    <td className="muted">{m.grade}</td>
                    <td className="num">{m.density.toFixed(2)}</td>
                    <td className="num">{num(volume?.volumeCm3, 1)}</td>
                    <td className="num"><b>{num(w, 3)}</b></td>
                    <td><SourceTag source={isDrawing && isAvailable(analysis.weight) ? analysis.weight.source : SRC.AI} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Validation>
        Volume and weight shown here are AI-calculated / estimated from the drawing information available.
        Confirm against a 3D model or a physical sample before release. Estimated – Engineering / Commercial Validation Required.
      </Validation>

      <div className="flex">
        <button className="btn primary" onClick={() => go('materials')}>Continue to Material Selection →</button>
      </div>
    </>
  )
}
