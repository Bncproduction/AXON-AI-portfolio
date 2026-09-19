import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { MATERIAL_MASTER, MATERIAL_CALLOUT_MAP, materialById } from '../data/materials.js'
import { analyzeDrawing, recommendRoute, suggestMaterials } from '../lib/aiEngine.js'
import { estimateVolume, estimateSurfaceAreaDm2, weightFromVolume } from '../lib/geometry.js'
import { computeEstimate, DEFAULT_PARAMS } from '../lib/costing.js'
import { SRC, f, isAvailable } from '../lib/sources.js'
import { uid, dateStr } from '../lib/format.js'
import { useConfirm } from '../components/Confirm.jsx'

const KEY = 'ai-cost-estimator-v1'

const initialSettings = {
  company: 'BNC Motors — Cost Engineering Cell',
  preparedBy: 'Cost Engineering',
  customer: '',
  supplier: 'In-house / TBD',
  currency: 'INR',
  approvalEngineering: '',
  approvalCosting: '',
}

const emptyProject = (drawingId) => ({
  drawingId,
  analysis: null,
  geometryEdits: {},
  volumeOverrideCm3: null,
  weightOverrideKg: null,
  selectedMaterials: [],
  materialNotes: {},
  processOverride: null, // user-selected primary process, wins over inference
  routes: {},
  params: { ...DEFAULT_PARAMS },
  savedAt: null,
})

const initialState = {
  drawings: [],
  activeId: null,
  projects: {},
  materialMaster: MATERIAL_MASTER.map((m) => ({ ...m })),
  settings: { ...initialSettings },
  history: [],
  stats: { analyses: 0, estimates: 0, processAnalyses: 0 },
}

function withProject(state, id, fn) {
  const prev = state.projects[id] || emptyProject(id)
  return { ...state, projects: { ...state.projects, [id]: fn(prev) } }
}

function reducer(state, a) {
  switch (a.type) {
    case 'HYDRATE':
      return { ...state, ...a.payload }

    case 'ADD_DRAWING': {
      const d = a.payload
      return {
        ...state,
        drawings: [d, ...state.drawings],
        activeId: d.id,
        projects: { ...state.projects, [d.id]: emptyProject(d.id) },
      }
    }
    case 'SET_ACTIVE':
      return { ...state, activeId: a.id }

    case 'DELETE_DRAWING': {
      const drawings = state.drawings.filter((d) => d.id !== a.id)
      const projects = { ...state.projects }
      delete projects[a.id]
      return { ...state, drawings, projects, activeId: state.activeId === a.id ? drawings[0]?.id ?? null : state.activeId }
    }
    case 'UPDATE_DRAWING':
      return { ...state, drawings: state.drawings.map((d) => (d.id === a.id ? { ...d, ...a.patch } : d)) }

    case 'ANALYZE': {
      const drawing = state.drawings.find((d) => d.id === a.id)
      if (!drawing) return state
      const analysis = analyzeDrawing(drawing)
      const suggested = suggestMaterials(analysis)
      const next = withProject(state, a.id, (p) => ({
        ...p,
        analysis,
        geometryEdits: {},
        selectedMaterials: suggested.slice(0, 4).map((s) => s.id),
        materialNotes: Object.fromEntries(suggested.map((s) => [s.id, s])),
        routes: {},
      }))
      // Write the identifying information back onto the drawing record so the
      // header, dashboard and reports stop showing placeholders. Anything the
      // user typed at upload time wins — extraction only fills the blanks.
      const autoFilled = []
      const patch = {}
      const fill = (key, fld) => {
        if (!drawing[key] && isAvailable(fld)) { patch[key] = fld.value; autoFilled.push(key) }
      }
      fill('drawingNumber', analysis.part.drawingNumber)
      fill('partNumber', analysis.part.partNumber)
      fill('partName', analysis.part.partName)
      fill('revision', analysis.part.revision)
      fill('componentType', analysis.part.componentType)

      return {
        ...next,
        drawings: next.drawings.map((d) =>
          d.id === a.id
            ? { ...d, ...patch, autoFilled, analyzed: true, analyzedAt: analysis.analyzedAt }
            : d),
        stats: { ...state.stats, analyses: state.stats.analyses + 1 },
      }
    }

    case 'UPDATE_FIELD': {
      const updated = withProject(state, state.activeId, (p) => {
        if (!p.analysis) return p
        const group = { ...p.analysis[a.group] }
        const prev = group[a.key] || {}
        group[a.key] = { ...prev, value: a.value, source: SRC.USER, confidence: 'High', note: 'Edited by user.' }
        return { ...p, analysis: { ...p.analysis, [a.group]: group }, routes: {} }
      })
      // Identity fields also live on the drawing record (header, dashboard,
      // report), so keep the two in step rather than letting them drift.
      if (a.group === 'part' && ['partName', 'partNumber', 'drawingNumber', 'revision'].includes(a.key)) {
        return {
          ...updated,
          drawings: updated.drawings.map((d) =>
            d.id === state.activeId
              ? { ...d, [a.key]: a.value, autoFilled: (d.autoFilled || []).filter((k) => k !== a.key) }
              : d),
        }
      }
      return updated
    }

    case 'UPDATE_WEIGHT_FIELD':
      return withProject(state, state.activeId, (p) => ({
        ...p,
        analysis: p.analysis
          ? { ...p.analysis, weight: f(a.value, SRC.USER, 'High', 'Entered by user.') }
          : p.analysis,
      }))

    case 'UPDATE_GEOMETRY':
      return withProject(state, state.activeId, (p) => ({
        ...p,
        geometryEdits: { ...p.geometryEdits, [a.key]: a.value },
        routes: {},
      }))

    case 'SET_VOLUME_OVERRIDE':
      return withProject(state, state.activeId, (p) => ({ ...p, volumeOverrideCm3: a.value, routes: {} }))
    case 'SET_WEIGHT_OVERRIDE':
      return withProject(state, state.activeId, (p) => ({ ...p, weightOverrideKg: a.value }))

    case 'TOGGLE_MATERIAL':
      return withProject(state, state.activeId, (p) => {
        const has = p.selectedMaterials.includes(a.id)
        return {
          ...p,
          selectedMaterials: has ? p.selectedMaterials.filter((x) => x !== a.id) : [...p.selectedMaterials, a.id],
        }
      })

    case 'UPDATE_MATERIAL_MASTER':
      return {
        ...state,
        materialMaster: state.materialMaster.map((m) =>
          m.id === a.id ? { ...m, ...a.patch, lastUpdated: dateStr(), priceSource: SRC.USER } : m,
        ),
      }

    case 'SET_PROCESS_OVERRIDE':
      // Changing the primary process invalidates every generated route.
      return withProject(state, state.activeId, (p) => ({ ...p, processOverride: a.processId || null, routes: {} }))

    case 'SET_ROUTE':
      return withProject(state, state.activeId, (p) => ({ ...p, routes: { ...p.routes, [a.materialId]: a.route } }))

    case 'SET_ALL_ROUTES':
      return {
        ...withProject(state, state.activeId, (p) => ({ ...p, routes: a.routes })),
        stats: { ...state.stats, processAnalyses: state.stats.processAnalyses + 1 },
      }

    case 'UPDATE_STEP':
      return withProject(state, state.activeId, (p) => {
        const route = p.routes[a.materialId]
        if (!route) return p
        return {
          ...p,
          routes: {
            ...p.routes,
            [a.materialId]: { ...route, steps: route.steps.map((s) => (s.uid === a.uid ? { ...s, ...a.patch } : s)) },
          },
        }
      })

    case 'UPDATE_STEP_EXTRA':
      return withProject(state, state.activeId, (p) => {
        const route = p.routes[a.materialId]
        if (!route) return p
        return {
          ...p,
          routes: {
            ...p.routes,
            [a.materialId]: {
              ...route,
              steps: route.steps.map((s) =>
                s.uid === a.uid
                  ? { ...s, extras: s.extras.map((e, i) => (i === a.index ? { ...e, amount: a.value } : e)) }
                  : s,
              ),
            },
          },
        }
      })

    case 'REMOVE_STEP':
      return withProject(state, state.activeId, (p) => {
        const route = p.routes[a.materialId]
        if (!route) return p
        return { ...p, routes: { ...p.routes, [a.materialId]: { ...route, steps: route.steps.filter((s) => s.uid !== a.uid) } } }
      })

    case 'ADD_STEP':
      return withProject(state, state.activeId, (p) => {
        const route = p.routes[a.materialId]
        if (!route) return p
        return { ...p, routes: { ...p.routes, [a.materialId]: { ...route, steps: [...route.steps, a.step] } } }
      })

    case 'UPDATE_PARAM':
      return withProject(state, state.activeId, (p) => ({ ...p, params: { ...p.params, [a.key]: a.value } }))

    case 'RESET_SIM':
      return withProject(state, state.activeId, (p) => ({
        ...p,
        params: {
          ...p.params,
          materialPriceDeltaPct: 0, cycleTimeDeltaPct: 0, cycleTimeDeltaMin: 0, machineRateDeltaPct: 0,
          labourRateDeltaPct: 0, htDeltaPct: 0, stDeltaPct: 0,
        },
      }))

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...a.patch } }

    case 'SAVE_ESTIMATE':
      return {
        ...state,
        history: [a.record, ...state.history].slice(0, 100),
        stats: { ...state.stats, estimates: state.stats.estimates + 1 },
      }

    case 'DELETE_HISTORY':
      return { ...state, history: state.history.filter((h) => h.id !== a.id) }

    case 'RESET_ALL':
      return { ...initialState, materialMaster: MATERIAL_MASTER.map((m) => ({ ...m })) }

    default:
      return state
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return { ...init, ...JSON.parse(raw) }
    } catch { /* ignore corrupt storage */ }
    return init
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch { /* quota — preview images are the usual cause */ }
  }, [state])

  const drawing = state.drawings.find((d) => d.id === state.activeId) || null
  const project = (state.activeId && state.projects[state.activeId]) || null
  const analysis = project?.analysis || null

  const derived = useMemo(() => deriveAll(state, drawing, project), [state, drawing, project])

  const value = { state, dispatch, drawing, project, analysis, ...derived }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useStore must be used inside StoreProvider')
  return c
}

// ---------------------------------------------------------------------------
// DERIVATION — geometry ➜ volume ➜ per-material weight ➜ route ➜ cost
// ---------------------------------------------------------------------------
function deriveAll(state, drawing, project) {
  if (!drawing || !project || !project.analysis) {
    return { geometry: null, volume: null, estimates: [], drawingMaterialId: null, areaDm2: 0, needsGeometry: false, params: project?.params || DEFAULT_PARAMS }
  }
  const analysis = project.analysis
  const geometry = { ...(analysis.geometry || {}), ...project.geometryEdits }
  const params = project.params || DEFAULT_PARAMS

  // Which master grade does the drawing itself call for?
  const specText = isAvailable(analysis.material?.specification)
    ? String(analysis.material.specification.value).toUpperCase()
    : ''
  let drawingMaterialId = null
  for (const [k, id] of Object.entries(MATERIAL_CALLOUT_MAP)) {
    if (specText.includes(k)) { drawingMaterialId = id; break }
  }

  // ---- Volume, in the priority order required by the specification --------
  const calc = estimateVolume(geometry)
  let volume = { ...calc, priority: 3, basis: 'Calculated from drawing dimensions' }

  const drawingWeight = isAvailable(analysis.weight) ? Number(analysis.weight.value) : null
  if (drawingWeight && drawingMaterialId) {
    const dm = state.materialMaster.find((m) => m.id === drawingMaterialId)
    if (dm) {
      volume = {
        ...volume,
        volumeCm3: Number(((drawingWeight * 1000) / dm.density).toFixed(2)),
        priority: 1,
        basis: `Back-calculated from the drawing mass callout (${drawingWeight} kg ÷ ${dm.density} g/cm³)`,
        method: 'Drawing mass ÷ specified material density',
        source: analysis.weight.source === SRC.USER ? SRC.USER : SRC.DRAWING,
        confidence: 'High',
        calculatedCm3: calc.volumeCm3,
      }
    }
  }
  if (project.volumeOverrideCm3 != null && project.volumeOverrideCm3 !== '') {
    volume = {
      ...volume,
      volumeCm3: Number(project.volumeOverrideCm3),
      priority: 4,
      basis: 'Volume entered directly by the user',
      method: 'User input',
      source: SRC.USER,
      confidence: 'High',
    }
  }

  // A drawing whose geometry could not be read yields no volume. Rather than
  // costing a zero-weight part, the chain stops here and asks for a number.
  const needsGeometry = !volume.volumeCm3
  if (needsGeometry) {
    return {
      geometry, volume: { ...volume, volumeCm3: null }, areaDm2: 0,
      estimates: [], drawingMaterialId, params, needsGeometry: true,
    }
  }

  const areaDm2 = estimateSurfaceAreaDm2(geometry, volume.volumeCm3)

  // ---- Per-material weight, route and cost --------------------------------
  const estimates = (project.selectedMaterials || []).map((id) => {
    const material = state.materialMaster.find((m) => m.id === id) || materialById(id)
    if (!material) return null
    let netWeightKg = weightFromVolume(volume.volumeCm3, material.density)
    let weightSource = volume.source === SRC.USER ? SRC.USER : SRC.AI
    if (id === drawingMaterialId && drawingWeight) {
      netWeightKg = drawingWeight
      weightSource = analysis.weight.source
    }
    if (project.weightOverrideKg != null && project.weightOverrideKg !== '' && id === drawingMaterialId) {
      netWeightKg = Number(project.weightOverrideKg)
      weightSource = SRC.USER
    }

    const route =
      project.routes[id] ||
      recommendRoute(id, analysis, geometry, {
        volumeCm3: volume.volumeCm3,
        netWeightKg,
        areaDm2,
        annualQty: params.annualQty,
        lotQty: params.lotQty,
        forcedProcessId: project.processOverride,
      })

    const est = computeEstimate({ material, route, netWeightKg, areaDm2, params })
    return { ...est, route, material, weightSource, isDrawingMaterial: id === drawingMaterialId }
  }).filter(Boolean)

  return { geometry, volume, areaDm2, estimates, drawingMaterialId, params, needsGeometry: false }
}

/**
 * Delete a drawing from anywhere in the app.
 * Deleting also discards that drawing's analysis, material selection and
 * routes, so the user is told what goes with it before it happens.
 * Estimates already saved to History are independent records and are kept.
 */
export function useDeleteDrawing() {
  const { state, dispatch } = useStore()
  const confirm = useConfirm()
  return async (id, { ask = true } = {}) => {
    const d = state.drawings.find((x) => x.id === id)
    if (!d) return false
    const p = state.projects[id]
    const loses = []
    if (p?.analysis) loses.push('its AI drawing analysis')
    if (p?.selectedMaterials?.length) loses.push(`${p.selectedMaterials.length} costed material option${p.selectedMaterials.length > 1 ? 's' : ''}`)

    if (ask) {
      const ok = await confirm({
        title: `Delete "${d.drawingNumber || d.fileName}"?`,
        message: loses.length
          ? `This also discards ${loses.join(' and ')}. Estimates already saved to History are kept.`
          : 'This drawing will be removed from the workspace.',
        detail: 'This cannot be undone.',
        confirmLabel: 'Delete drawing',
        tone: 'danger',
      })
      if (!ok) return false
    }
    if (d.previewUrl) { try { URL.revokeObjectURL(d.previewUrl) } catch { /* already revoked */ } }
    dispatch({ type: 'DELETE_DRAWING', id })
    return true
  }
}
