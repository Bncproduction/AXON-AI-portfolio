import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { Card, Field, Banner, SourceTag } from '../components/ui.jsx'
import { MATERIAL_CATEGORIES } from '../data/materials.js'
import { PROCESS_MASTER } from '../data/processes.js'
import { DEFAULT_PARAMS } from '../lib/costing.js'
import { money } from '../lib/format.js'
import { SRC } from '../lib/sources.js'
import { ENGINE_MODE } from '../lib/aiEngine.js'

export default function Settings() {
  const { state, dispatch, project } = useStore()
  const [tab, setTab] = useState('org')
  const st = state.settings
  const setS = (patch) => dispatch({ type: 'UPDATE_SETTINGS', patch })

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
        <p className="lead">Organisation details, material and process master data, and the default costing parameters.</p>
      </div>

      <div className="flex" style={{ marginBottom: 14 }}>
        {[['org', 'Organisation'], ['materials', 'Material Master'], ['processes', 'Process Master'], ['defaults', 'Costing Defaults'], ['data', 'Data & Engine']].map(([id, label]) => (
          <button key={id} className={`btn sm ${tab === id ? 'primary' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'org' && (
        <Card title="Organisation & Report Header">
          <div className="grid g2">
            <Field label="Company / department"><input className="inp" value={st.company} onChange={(e) => setS({ company: e.target.value })} /></Field>
            <Field label="Prepared by (default)"><input className="inp" value={st.preparedBy} onChange={(e) => setS({ preparedBy: e.target.value })} /></Field>
            <Field label="Customer"><input className="inp" value={st.customer} onChange={(e) => setS({ customer: e.target.value })} /></Field>
            <Field label="Supplier"><input className="inp" value={st.supplier} onChange={(e) => setS({ supplier: e.target.value })} /></Field>
            <Field label="Engineering approval"><input className="inp" value={st.approvalEngineering} onChange={(e) => setS({ approvalEngineering: e.target.value })} /></Field>
            <Field label="Costing approval"><input className="inp" value={st.approvalCosting} onChange={(e) => setS({ approvalCosting: e.target.value })} /></Field>
            <Field label="Currency"><input className="inp" value="INR (₹)" readOnly /></Field>
          </div>
        </Card>
      )}

      {tab === 'materials' && (
        <Card title="Material Master" hint="Prices and densities used by every estimate" flush>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Material</th><th>Grade</th><th>Category</th><th className="num">Density</th><th className="num">Price ₹/kg</th>
                <th className="num">Scrap %</th><th>Source</th><th>Last Updated</th></tr></thead>
              <tbody>
                {MATERIAL_CATEGORIES.map((cat) => state.materialMaster.filter((m) => m.category === cat).map((m) => (
                  <tr key={m.id}>
                    <td><b>{m.name}</b></td>
                    <td className="muted">{m.grade}</td>
                    <td className="small muted">{m.category}</td>
                    <td className="num">
                      <input className="inp num sm" style={{ width: 70 }} type="number" step="0.01" value={m.density}
                        onChange={(e) => dispatch({ type: 'UPDATE_MATERIAL_MASTER', id: m.id, patch: { density: Number(e.target.value) } })} />
                    </td>
                    <td className="num">
                      <input className="inp num sm" style={{ width: 90 }} type="number" step="1" value={m.price}
                        onChange={(e) => dispatch({ type: 'UPDATE_MATERIAL_MASTER', id: m.id, patch: { price: Number(e.target.value) } })} />
                    </td>
                    <td className="num">
                      <input className="inp num sm" style={{ width: 62 }} type="number" step="0.5" value={m.scrapAllowancePct}
                        onChange={(e) => dispatch({ type: 'UPDATE_MATERIAL_MASTER', id: m.id, patch: { scrapAllowancePct: Number(e.target.value) } })} />
                    </td>
                    <td><SourceTag source={m.priceSource || SRC.ASSUMPTION} /></td>
                    <td className="small muted">{m.lastUpdated}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'processes' && (
        <Card title="Process Master" hint="Seeded machine hour rates — reference values for new routes" flush>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Process</th><th>Category</th><th className="num">Rate ₹/hr</th><th className="num">Default setup (min)</th>
                <th className="num">₹/kg</th><th className="num">₹/dm²</th><th className="num">Batch ₹</th><th>Notes</th></tr></thead>
              <tbody>
                {PROCESS_MASTER.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td className="small muted">{p.category}</td>
                    <td className="num">{p.rate ? money(p.rate) : '—'}</td>
                    <td className="num">{p.setupMin ?? '—'}</td>
                    <td className="num">{p.perKg ? money(p.perKg) : '—'}</td>
                    <td className="num">{p.perDm2 ? money(p.perDm2) : '—'}</td>
                    <td className="num">{p.batchCost ? money(p.batchCost) : '—'}</td>
                    <td className="small muted">{p.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted mt mb0">
            Rates on an existing route are edited on the Process Cost page so that a change never rewrites an
            estimate that has already been reviewed.
          </p>
        </Card>
      )}

      {tab === 'defaults' && (
        <Card title="Costing Defaults" hint="Applied to new drawings">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Parameter</th><th className="num">Default</th><th className="num">Active drawing</th></tr></thead>
              <tbody>
                {Object.entries(DEFAULT_PARAMS).map(([k, v]) => (
                  <tr key={k}>
                    <td className="mono small">{k}</td>
                    <td className="num">{v ?? '—'}</td>
                    <td className="num">{project?.params?.[k] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted mt mb0">Per-drawing values are edited on the Manufacturing Cost and Cost Simulator pages.</p>
        </Card>
      )}

      {tab === 'data' && (
        <>
          <Card title="Analysis Engine">
            <Banner kind="info"><span>ⓘ</span><span>{ENGINE_MODE}</span></Banner>
            <p className="small muted">
              This build is a self-contained prototype. It is not connected to an ERP, a CAD kernel, a PLM system or a
              live commodity price feed. All master data is seeded and editable, and every derived number is labelled
              with its source so it can be checked before use.
            </p>
          </Card>
          <Card title="Workspace Data">
            <p className="small muted">
              Drawings, estimates and master-data edits are stored in this browser only (local storage). Clearing it
              removes everything, including saved estimates.
            </p>
            <button className="btn danger" onClick={() => {
              if (confirm('Clear all drawings, estimates and master-data edits from this browser? This cannot be undone.')) {
                dispatch({ type: 'RESET_ALL' })
              }
            }}>Reset workspace</button>
          </Card>
        </>
      )}
    </>
  )
}
