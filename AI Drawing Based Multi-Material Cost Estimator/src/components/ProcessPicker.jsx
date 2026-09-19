import React from 'react'
import { useStore } from '../state/store.jsx'
import { PROCESS_OPTIONS, processById } from '../data/processes.js'
import { Card, Banner, SourceTag } from '../components/ui.jsx'
import { SRC, isAvailable } from '../lib/sources.js'

/**
 * Lets the user name the primary manufacturing process.
 * The drawing often states no route — this is where that gap gets filled,
 * and the choice is recorded as User Input, overriding the engine's guess.
 */
export default function ProcessPicker({ compact }) {
  const { analysis, project, dispatch, estimates } = useStore()
  if (!analysis) return null

  const chosen = project?.processOverride || ''
  const mfg = analysis.manufacturing || {}
  const stated = Object.entries({
    casting: 'Casting', forging: 'Forging', machining: 'Machining',
    sheetMetal: 'Sheet metal', welding: 'Welding', specialProcess: 'Special process',
  })
    .filter(([k]) => isAvailable(mfg[k]) && !/not applicable|not required/i.test(String(mfg[k].value)))
    .map(([, label]) => label)

  const grouped = PROCESS_OPTIONS.map((id) => processById(id)).filter(Boolean)
  const categories = [...new Set(grouped.map((p) => p.category))]

  const select = (
    <select
      className="inp"
      style={{ maxWidth: compact ? 280 : 360 }}
      value={chosen}
      onChange={(e) => dispatch({ type: 'SET_PROCESS_OVERRIDE', processId: e.target.value || null })}
    >
      <option value="">
        {stated.length ? 'Use the route inferred from the drawing' : 'Not stated on the drawing — select a process…'}
      </option>
      {categories.map((cat) => (
        <optgroup key={cat} label={cat}>
          {grouped.filter((p) => p.category === cat).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  if (compact) {
    return (
      <div className="flex">
        {select}
        {chosen && <SourceTag source={SRC.USER} />}
        {chosen && (
          <button className="btn sm" onClick={() => dispatch({ type: 'SET_PROCESS_OVERRIDE', processId: null })}>
            Clear
          </button>
        )}
      </div>
    )
  }

  return (
    <Card
      title="Primary Manufacturing Process"
      hint={chosen ? 'Selected by the user' : stated.length ? `Drawing states: ${stated.join(', ')}` : 'Not stated on the drawing'}
    >
      {!stated.length && !chosen && (
        <Banner kind="warn">
          <span>⚠</span>
          <span>
            This drawing carries no manufacturing callout, so the component type could not be classified. Pick the
            process below and every route, cycle time and cost is rebuilt around it — nothing is assumed on your behalf.
          </span>
        </Banner>
      )}
      <div className="flex">
        {select}
        {chosen && <SourceTag source={SRC.USER} />}
        {chosen && (
          <button className="btn sm" onClick={() => dispatch({ type: 'SET_PROCESS_OVERRIDE', processId: null })}>
            Clear selection
          </button>
        )}
      </div>
      {chosen && (
        <p className="small muted mt mb0">
          <b>{processById(chosen)?.name}</b> — {processById(chosen)?.notes}
          {estimates.length > 0 && ` Applied to all ${estimates.length} costed material${estimates.length > 1 ? 's' : ''}; secondary operations (machining, heat and surface treatment) are still added around it.`}
        </p>
      )}
    </Card>
  )
}
