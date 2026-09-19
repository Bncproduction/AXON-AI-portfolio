import React from 'react'
import { useStore } from '../state/store.jsx'

export const WORKFLOW = [
  { n: 1, id: 'upload', label: 'Upload Drawing' },
  { n: 2, id: 'analysis', label: 'AI Analysis' },
  { n: 3, id: 'spec', label: 'Part Specification' },
  { n: 4, id: 'weight', label: 'Weight / Volume' },
  { n: 5, id: 'materials', label: 'Material Selection' },
  { n: 6, id: 'matcost', label: 'Material Cost' },
  { n: 7, id: 'process', label: 'Process Analysis' },
  { n: 8, id: 'proccost', label: 'Process Cost' },
  { n: 9, id: 'mfgcost', label: 'Manufacturing Cost' },
  { n: 10, id: 'mfgcost', label: 'Total Cost' },
  { n: 11, id: 'compare', label: 'Comparison' },
  { n: 12, id: 'simulator', label: 'What-If Simulation' },
  { n: 13, id: 'reports', label: 'Report' },
]

export default function Stepper({ current, go }) {
  const { project, estimates, state } = useStore()
  const analyzed = !!project?.analysis
  const mats = (project?.selectedMaterials || []).length > 0
  const costed = estimates.length > 0

  const isDone = (id) => {
    if (id === 'upload') return !!project
    if (['analysis', 'spec', 'weight'].includes(id)) return analyzed
    if (['materials', 'matcost'].includes(id)) return mats
    if (['process', 'proccost', 'mfgcost', 'simulator'].includes(id)) return costed
    if (id === 'compare') return estimates.length > 1
    if (id === 'reports') return state.history.length > 0
    return false
  }

  return (
    <div className="stepper no-print">
      {WORKFLOW.map((s) => (
        <button
          key={s.n}
          className={`s ${current === s.id ? 'active' : ''} ${isDone(s.id) && current !== s.id ? 'done' : ''}`}
          onClick={() => go(s.id)}
          title={`Step ${s.n}`}
        >
          <b className="mono">{s.n}</b> {s.label}
        </button>
      ))}
    </div>
  )
}
