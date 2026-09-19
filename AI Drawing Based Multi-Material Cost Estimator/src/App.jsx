import React, { useState } from 'react'
import { useStore } from './state/store.jsx'
import { money } from './lib/format.js'

import Dashboard from './pages/Dashboard.jsx'
import DrawingUpload from './pages/DrawingUpload.jsx'
import AIAnalysis from './pages/AIAnalysis.jsx'
import PartSpecification from './pages/PartSpecification.jsx'
import WeightVolume from './pages/WeightVolume.jsx'
import MaterialSelection from './pages/MaterialSelection.jsx'
import MaterialCosting from './pages/MaterialCosting.jsx'
import ProcessAnalysis from './pages/ProcessAnalysis.jsx'
import ProcessCost from './pages/ProcessCost.jsx'
import ManufacturingCost from './pages/ManufacturingCost.jsx'
import CostComparison from './pages/CostComparison.jsx'
import CostSimulator from './pages/CostSimulator.jsx'
import Assumptions from './pages/Assumptions.jsx'
import Reports from './pages/Reports.jsx'
import History from './pages/History.jsx'
import Settings from './pages/Settings.jsx'

export const PAGES = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview', Comp: Dashboard },
  { id: 'upload', label: 'Drawing Upload', group: 'Workflow', step: 1, Comp: DrawingUpload },
  { id: 'analysis', label: 'AI Drawing Analysis', group: 'Workflow', step: 2, Comp: AIAnalysis },
  { id: 'spec', label: 'Part Specification', group: 'Workflow', step: 3, Comp: PartSpecification },
  { id: 'weight', label: 'Weight & Volume', group: 'Workflow', step: 4, Comp: WeightVolume },
  { id: 'materials', label: 'Material Selection', group: 'Workflow', step: 5, Comp: MaterialSelection },
  { id: 'matcost', label: 'Material Costing', group: 'Workflow', step: 6, Comp: MaterialCosting },
  { id: 'process', label: 'Process Analysis', group: 'Workflow', step: 7, Comp: ProcessAnalysis },
  { id: 'proccost', label: 'Process Cost', group: 'Workflow', step: 8, Comp: ProcessCost },
  { id: 'mfgcost', label: 'Manufacturing Cost', group: 'Workflow', step: 9, Comp: ManufacturingCost },
  { id: 'compare', label: 'Cost Comparison', group: 'Workflow', step: 11, Comp: CostComparison },
  { id: 'simulator', label: 'Cost Simulator', group: 'Workflow', step: 12, Comp: CostSimulator },
  { id: 'assumptions', label: 'AI Assumptions', group: 'Governance', Comp: Assumptions },
  { id: 'reports', label: 'Reports', group: 'Governance', step: 13, Comp: Reports },
  { id: 'history', label: 'History', group: 'Governance', Comp: History },
  { id: 'settings', label: 'Settings', group: 'Governance', Comp: Settings },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const { drawing, project, estimates, state } = useStore()
  const Current = PAGES.find((p) => p.id === page)?.Comp || Dashboard

  const analyzed = !!project?.analysis
  const done = {
    upload: !!drawing,
    analysis: analyzed,
    spec: analyzed,
    weight: analyzed,
    materials: (project?.selectedMaterials || []).length > 0,
    matcost: (project?.selectedMaterials || []).length > 0,
    process: estimates.length > 0,
    proccost: estimates.length > 0,
    mfgcost: estimates.length > 0,
    compare: estimates.length > 1,
    simulator: estimates.length > 0,
    reports: state.history.length > 0,
  }

  const groups = [...new Set(PAGES.map((p) => p.group))]
  const best = estimates.length ? [...estimates].sort((a, b) => a.total - b.total)[0] : null

  return (
    <div className="app">
      <aside className="sidebar no-print">
        <div className="brand">
          <div className="logo">
            <span className="mark">AI</span>
            <span>Drawing → Cost Estimator</span>
          </div>
          <div className="sub">Multi-material manufacturing cost estimation with full source traceability</div>
        </div>
        <nav className="nav">
          {groups.map((g) => (
            <div key={g}>
              <div className="nav-group">{g}</div>
              {PAGES.filter((p) => p.group === g).map((p) => (
                <button
                  key={p.id}
                  className={`nav-item ${page === p.id ? 'active' : ''} ${done[p.id] ? 'done' : ''}`}
                  onClick={() => setPage(p.id)}
                >
                  <span className="idx">{p.step ?? '•'}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="ctx">
            <div>Active Drawing<b>{drawing ? drawing.drawingNumber || drawing.fileName : 'None selected'}</b></div>
            <div>Part Number<b>{drawing?.partNumber || '—'}</b></div>
            <div>Revision<b>{drawing?.revision || '—'}</b></div>
            <div>Status<b style={{ color: analyzed ? 'var(--accent-2)' : 'var(--warn)' }}>{analyzed ? 'Analyzed' : drawing ? 'Awaiting analysis' : 'No drawing'}</b></div>
            {best && <div>Lowest Estimated Total<b style={{ color: 'var(--accent)' }}>{money(best.total)} · {best.materialName}</b></div>}
          </div>
          <div className="spacer" />
          <button className="btn sm" onClick={() => setPage('upload')}>+ New Drawing</button>
        </header>

        <div className="content">
          <Current go={setPage} />
        </div>
      </main>
    </div>
  )
}

