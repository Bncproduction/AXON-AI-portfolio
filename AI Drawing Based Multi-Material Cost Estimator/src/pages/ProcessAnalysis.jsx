import React from 'react'
import { useStore } from '../state/store.jsx'
import Stepper from '../components/Stepper.jsx'
import { Card, Empty, Kpi, Validation, Banner, SourceTag } from '../components/ui.jsx'
import { recommendRoute, finestRa, tightestToleranceMm } from '../lib/aiEngine.js'
import { money, num } from '../lib/format.js'
import { SRC, isAvailable, RECO_DISCLAIMER } from '../lib/sources.js'

const FACTORS = [
  ['Geometry complexity', (a, g) => `${g?.shape || '—'} · solid fraction ${g?.fillFactor ?? '—'}`],
  ['Part size', (a, g) => `${g?.length ?? '—'} × ${g?.width ?? g?.diameter ?? '—'} × ${g?.height ?? g?.thickness ?? '—'} mm`],
  ['Tolerance', (a) => (isAvailable(a.quality.tolerances) ? a.quality.tolerances.value : 'Not Available in Drawing')],
  ['Surface finish', (a) => (isAvailable(a.quality.surfaceFinish) ? a.quality.surfaceFinish.value : 'Not Available in Drawing')],
  ['Machining requirement', (a) => (isAvailable(a.manufacturing.machining) ? a.manufacturing.machining.value : 'Not Available in Drawing')],
  ['Special process', (a) => (isAvailable(a.manufacturing.specialProcess) ? a.manufacturing.specialProcess.value : 'Not Available in Drawing')],
]

export default function ProcessAnalysis({ go }) {
  const { analysis, geometry, estimates, project, dispatch, volume, areaDm2 } = useStore()

  if (!estimates.length) {
    return <Empty title="No materials selected" action={<button className="btn primary" onClick={() => go('materials')}>Go to Material Selection</button>}>
      Process routes are generated per material.
    </Empty>
  }

  const params = project.params

  const rerun = () => {
    const routes = {}
    project.selectedMaterials.forEach((id) => {
      const est = estimates.find((e) => e.materialId === id)
      routes[id] = recommendRoute(id, analysis, geometry, {
        volumeCm3: volume.volumeCm3,
        netWeightKg: est?.netWeightKg ?? 0,
        areaDm2,
        annualQty: params.annualQty,
        lotQty: params.lotQty,
      })
    })
    dispatch({ type: 'SET_ALL_ROUTES', routes })
  }

  const ra = finestRa(analysis)
  const tol = tightestToleranceMm(analysis)

  return (
    <>
      <Stepper current="process" go={go} />
      <div className="page-head">
        <h1>AI Manufacturing Process Analysis</h1>
        <p className="lead">
          For every candidate material the engine proposes a primary route, names a credible alternative, and states
          why. Routes are generated from the drawing's own manufacturing callouts, the geometry and the production volume.
        </p>
      </div>

      <Banner kind="warn"><span>⚠</span><span>{RECO_DISCLAIMER}</span></Banner>

      <div className="grid g4">
        <Kpi label="Production Volume" value={`${params.annualQty.toLocaleString('en-IN')} /yr`} foot={`Lot size ${params.lotQty.toLocaleString('en-IN')}`} tone="accent" />
        <Kpi label="Finest Surface Finish" value={ra != null ? `Ra ${ra}` : 'Not stated'} foot={ra != null && ra <= 0.8 ? 'Grinding / honing class' : 'Achievable by machining'} />
        <Kpi label="Tightest Tolerance" value={tol != null ? `±${tol} mm` : 'Not stated'} foot={tol != null && tol <= 0.1 ? 'Precision class' : 'General class'} />
        <Kpi label="Routes Generated" value={estimates.length} foot="One per selected material" tone="green" />
      </div>

      <Card
        title="Analysis Inputs"
        hint="What the route decision was based on"
        actions={<button className="btn primary sm" onClick={rerun}>Re-run Process Analysis</button>}
      >
        <div className="tbl-wrap">
          <table>
            <thead><tr><th style={{ width: '24%' }}>Factor</th><th>Value considered</th><th style={{ width: '16%' }}>Source</th></tr></thead>
            <tbody>
              {FACTORS.map(([label, fn]) => (
                <tr key={label}><td><b>{label}</b></td><td className="small">{fn(analysis, geometry)}</td>
                  <td><SourceTag source={label === 'Geometry complexity' || label === 'Part size' ? SRC.AI : SRC.DRAWING} /></td></tr>
              ))}
              <tr><td><b>Production volume</b></td><td className="small">{params.annualQty.toLocaleString('en-IN')} pcs/yr, lot {params.lotQty.toLocaleString('en-IN')}</td><td><SourceTag source={SRC.USER} /></td></tr>
              <tr><td><b>Tooling requirement</b></td><td className="small">Derived per route — die / pattern / fixture costs are listed in each route below.</td><td><SourceTag source={SRC.ASSUMPTION} /></td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      {estimates.map((e) => {
        const r = e.route
        const ai = r.analysisInputs
        return (
          <Card key={e.materialId} title={`${e.materialName} — ${e.materialGrade}`}
            hint={e.isDrawingMaterial ? 'Material specified on the drawing' : 'Comparison candidate'}>
            <div className="grid g3" style={{ gap: 12, marginBottom: 12 }}>
              <div className="kpi accent"><div className="label">Recommended Process</div><div className="value" style={{ fontSize: 16 }}>{r.recommended}</div>
                <div className="foot">Primary route proposed by the engine</div></div>
              <div className="kpi"><div className="label">Alternative Process</div>
                <div className="value" style={{ fontSize: 16 }}>{r.alternatives[0]?.name}</div>
                <div className="foot">{r.alternatives[0]?.reason}</div></div>
              <div className="kpi warn"><div className="label">Engineering Validation</div><div className="value" style={{ fontSize: 16 }}>Required</div>
                <div className="foot">Route is a recommendation, not an approval</div></div>
            </div>

            <div className="tbl-wrap">
              <table>
                <thead><tr><th>#</th><th>Operation</th><th>Category</th><th className="num">Cycle (min)</th><th className="num">Rate ₹/hr</th><th>Reason</th></tr></thead>
                <tbody>
                  {r.steps.map((s, i) => (
                    <tr key={s.uid}>
                      <td className="mono">{i + 1}</td>
                      <td><b>{s.name}</b></td>
                      <td><span className="tag neutral">{s.category}</span></td>
                      <td className="num">{s.cycleMin ? num(s.cycleMin, 1) : '—'}</td>
                      <td className="num">{s.rate ? money(s.rate) : '—'}</td>
                      <td className="small muted">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {r.reasons.length > 0 && (
              <ul className="small muted mt" style={{ margin: '10px 0 0 18px', lineHeight: 1.6 }}>
                {r.reasons.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            )}

            <div className="grid g4 mt" style={{ gap: 10 }}>
              {[['Part volume', `${num(ai.partVolumeCm3, 1)} cm³`], ['Stock volume', `${num(ai.stockVolumeCm3, 1)} cm³`],
                ['Material removed', `${num(ai.removalCm3, 1)} cm³`], ['Assumed removal rate', `${ai.assumedMrr} cm³/min`],
                ['Machinability index', ai.machinabilityIndex], ['Machined area', `${num(ai.machinedAreaDm2 ?? ai.surfaceAreaDm2, 1)} of ${num(ai.surfaceAreaDm2, 1)} dm²`],
                ['Finest Ra', ai.finestRa ?? 'n/s'], ['Tightest tol.', ai.tightestToleranceMm != null ? `±${ai.tightestToleranceMm} mm` : 'n/s']].map(([k, v]) => (
                <div key={k} className="small"><span className="muted">{k}</span><br /><b className="mono">{v}</b></div>
              ))}
            </div>

            <div className="mt">
              <div className="small muted" style={{ marginBottom: 6 }}>Alternatives considered:</div>
              {r.alternatives.map((a, i) => (
                <div key={i} className="small" style={{ marginBottom: 4 }}>
                  <span className="tag ai">{a.name}</span> <span className="muted">{a.reason}</span>
                </div>
              ))}
            </div>
          </Card>
        )
      })}

      <Validation>
        Cycle times, removal rates and tooling costs in these routes are model-derived estimates, not quotations from
        a manufacturing engineer. Estimated – Engineering / Commercial Validation Required.
      </Validation>

      <div className="flex">
        <button className="btn primary" onClick={() => go('proccost')}>Continue to Process Cost →</button>
      </div>
    </>
  )
}
