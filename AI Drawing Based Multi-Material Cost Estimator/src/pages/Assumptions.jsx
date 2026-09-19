import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { Card, Empty, Kpi, SourceTag, Validation, Banner } from '../components/ui.jsx'
import { collectAssumptions, assumptionCounts } from '../lib/assumptions.js'
import { SRC, SOURCE_ORDER } from '../lib/sources.js'
import { ENGINE_MODE } from '../lib/aiEngine.js'

export default function Assumptions({ go }) {
  const { analysis, volume, estimates, project, drawing } = useStore()
  const [filter, setFilter] = useState('All')

  if (!analysis) {
    return <Empty title="No analysis yet" action={<button className="btn primary" onClick={() => go('upload')}>Start with a drawing</button>}>
      The assumption register is built once a drawing has been analyzed.
    </Empty>
  }

  const rows = collectAssumptions({ analysis, volume, estimates, params: project.params, drawing })
  const counts = assumptionCounts(rows)
  const shown = filter === 'All' ? rows : rows.filter((r) => r.source === filter)
  const groups = [...new Set(shown.map((r) => r.group))]

  return (
    <>
      <div className="page-head">
        <h1>AI Costing Assumptions</h1>
        <p className="lead">
          Every value that influences the estimate, with its origin. Nothing in the costing is hidden behind the model —
          if a number is an assumption, it says so here.
        </p>
      </div>

      <Banner kind="info"><span>ⓘ</span><span><b>Engine mode:</b> {ENGINE_MODE}</span></Banner>

      <div className="grid g4">
        {SOURCE_ORDER.slice(0, 4).map((s, i) => (
          <Kpi key={s} label={s} value={counts[s] || 0}
            foot={{
              [SRC.DRAWING]: 'Read directly from the drawing',
              [SRC.AI]: 'Derived by calculation',
              [SRC.USER]: 'Entered or confirmed by the user',
              [SRC.ASSUMPTION]: 'Seeded assumption — validate before quoting',
            }[s]}
            tone={['accent', '', 'green', 'warn'][i]} />
        ))}
      </div>

      <Card
        title="Assumption Register"
        hint={`${shown.length} of ${rows.length} entries`}
        actions={
          <div className="flex" style={{ gap: 6 }}>
            {['All', ...SOURCE_ORDER].map((s) => (
              <button key={s} className={`btn sm ${filter === s ? 'primary' : ''}`} onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
        }
        flush
      >
        <div className="tbl-wrap">
          <table>
            <thead><tr><th style={{ width: '14%' }}>Group</th><th style={{ width: '26%' }}>Parameter</th><th style={{ width: '18%' }}>Value used</th><th style={{ width: '14%' }}>Source</th><th>Basis</th></tr></thead>
            <tbody>
              {groups.map((g) => (
                <React.Fragment key={g}>
                  {shown.filter((r) => r.group === g).map((r, i) => (
                    <tr key={`${g}-${i}`}>
                      <td className="small muted">{i === 0 ? <b>{g}</b> : ''}</td>
                      <td>{r.parameter}</td>
                      <td className="mono small">{r.value}</td>
                      <td><SourceTag source={r.source} /></td>
                      <td className="small muted">{r.note}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Data Governance Rules Applied">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Rule</th><th>Behaviour in this application</th></tr></thead>
            <tbody>
              <tr><td><span className="tag drawing">Drawing</span></td><td>Value read directly from the drawing. Never altered silently.</td></tr>
              <tr><td><span className="tag ai">AI Calculated</span></td><td>Derived arithmetically from drawing data. The full calculation trail is shown on the Weight &amp; Volume page.</td></tr>
              <tr><td><span className="tag user">User Input</span></td><td>Entered or corrected by the user. Overrides everything else and is recorded as such.</td></tr>
              <tr><td><span className="tag assumption">Estimated Assumption</span></td><td>Seeded rate or model parameter. Must be replaced with your own data before a commercial commitment.</td></tr>
              <tr><td><span className="tag na">Not Available in Drawing</span></td><td>Reported as missing. No dimension, grade, weight, price, cycle time or process parameter is ever invented.</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Validation>
        All AI-generated calculations on every page carry this label: Estimated – Engineering / Commercial Validation Required.
      </Validation>
    </>
  )
}
