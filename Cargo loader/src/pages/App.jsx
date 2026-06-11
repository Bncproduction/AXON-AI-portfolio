import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import LoadScene from '../components/LoadScene.jsx'
import { packContainer, axleLoads } from '../lib/packer.js'
import { CONTAINER_PRESETS, ITEM_COLORS, STARTER_ITEMS } from '../lib/presets.js'
import {
  IconBox2, IconHelp, IconSave, IconUpload, IconPdf, IconRuler, IconGrid,
  IconSort, IconWeight, IconClose, IconLayers, IconScale, IconBolt, IconBell,
  IconExpand, IconSearch, IconFilter, IconChevron, IconApps, IconPanel,
  IconGroupAdd, IconBoxAdd, IconBoxMenu, IconUpright, IconNoStack, IconNoTilt,
  IconFloorOnly, IconTrash, IconReset, IconForward, IconPause,
} from '../components/icons.jsx'

let nextItemId = 100
let nextGroupId = 10

const TABS = ['Spaces', 'Items', 'Backups', 'Shipments', 'Team']
const categoryOf = (c) => (c.id === 'truck' ? 'Truck' : c.id === 'van' ? 'Van' : 'Container')
const cm = (m) => (m * 100).toFixed(1)
const newFlags = () => ({ upright: false, noStack: false, noTilt: false, floorOnly: false })

// Build the initial single group from the starter catalogue.
const initialGroups = () => [{
  id: 'g1', name: 'Grp. 1', collapsed: false,
  items: STARTER_ITEMS.map((it, i) => ({
    id: it.id, color: it.color, name: it.name,
    w: it.w, h: it.h, d: it.d, weight: it.weight, count: it.qty,
    selected: true, flags: { ...newFlags(), noStack: it.stackable === false },
  })),
}]

const blankItem = () => ({
  id: `i${nextItemId++}`, color: ITEM_COLORS[Math.floor(Math.random() * ITEM_COLORS.length)],
  name: 'New Item', w: 1, h: 1, d: 1, weight: 10, count: 1, selected: true, flags: newFlags(),
})

export default function App() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('Items')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [containerId, setContainerId] = useState('40dv')
  const [groups, setGroups] = useState(initialGroups)
  const [loadMode, setLoadMode] = useState(false)   // entered the loading sequence
  const [playing, setPlaying] = useState(false)      // animation running
  const [revealed, setRevealed] = useState(0)        // boxes placed so far
  const [highlight, setHighlight] = useState(null)
  const [shipName, setShipName] = useState('')
  const [showRulers, setShowRulers] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [userMenu, setUserMenu] = useState(false)

  const container = useMemo(() => CONTAINER_PRESETS.find((c) => c.id === containerId), [containerId])

  // Flatten selected items into the packer's expected shape.
  const packItems = useMemo(() => groups.flatMap((g) => g.items)
    .filter((i) => i.selected && i.count > 0)
    .map((i) => ({
      id: i.id, name: i.name, color: i.color,
      w: +i.w, h: +i.h, d: +i.d, weight: +i.weight, qty: +i.count,
      stackable: !i.flags.noStack,
    })), [groups])

  const result = useMemo(() => packContainer(container, packItems), [container, packItems])
  const allPlaced = result.placed

  // Any change to the inputs cancels the loading sequence.
  useEffect(() => { setLoadMode(false); setPlaying(false); setRevealed(0) }, [containerId, packItems])

  // Animate placement: reveal one box at a time while playing.
  useEffect(() => {
    if (!playing) return
    if (revealed >= allPlaced.length) { setPlaying(false); return }
    const t = setTimeout(() => setRevealed((r) => Math.min(r + 1, allPlaced.length)), 180)
    return () => clearTimeout(t)
  }, [playing, revealed, allPlaced.length])

  const placed = loadMode ? allPlaced.slice(0, revealed) : []
  const done = loadMode && revealed >= allPlaced.length
  const newId = placed.length ? placed[placed.length - 1].id : null

  const volume = container.w * container.h * container.d
  const totalUnits = packItems.reduce((a, i) => a + Number(i.qty || 0), 0)
  const axles = useMemo(() => axleLoads(placed, container), [placed, container])

  // live loading stats (based on revealed boxes)
  const usedVol = placed.reduce((a, p) => a + p.w * p.h * p.d, 0)
  const usedWeight = placed.reduce((a, p) => a + p.weight, 0)
  const usedLen = placed.reduce((a, p) => Math.max(a, p.x + p.w), 0)
  const freeLen = Math.max(0, container.w - usedLen)
  const remVol = Math.max(0, volume - usedVol)
  const remWeight = Math.max(0, container.maxWeight - usedWeight)
  const volPct = volume ? Math.round((usedVol / volume) * 100) : 0
  const wPct = container.maxWeight ? Math.round((usedWeight / container.maxWeight) * 100) : 0
  const lenPct = container.w ? Math.round((usedLen / container.w) * 100) : 0
  const loadedItems = placed.length
  const remItems = totalUnits - loadedItems

  const loadedPerItem = useMemo(() => {
    const counts = {}
    for (const p of placed) counts[p.itemId] = (counts[p.itemId] || 0) + 1
    return counts
  }, [placed])

  const legend = useMemo(() =>
    packItems.map((it) => ({ ...it, placed: loadedPerItem[it.id] || 0 })),
    [packItems, loadedPerItem])

  function startLoading() {
    if (loadMode && done) { setLoadMode(false); setRevealed(0); setPlaying(false); return } // reset
    if (!loadMode) { setLoadMode(true); setRevealed(0); setPlaying(true); return }          // begin
    setPlaying((p) => !p)                                                                    // pause / resume
  }
  function resetLoading() { setLoadMode(false); setRevealed(0); setPlaying(false) }

  const spaces = useMemo(() => {
    const q = search.trim().toLowerCase()
    return CONTAINER_PRESETS.filter((c) => !q || c.label.toLowerCase().includes(q))
  }, [search])

  const shipments = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('cl3d_shipments') || '[]') } catch { return [] }
  }, [tab])

  // ----- group / item mutations -----
  const patchItem = (gid, iid, patch) => setGroups((gs) => gs.map((g) =>
    g.id !== gid ? g : { ...g, items: g.items.map((it) => it.id === iid ? { ...it, ...patch } : it) }))
  const toggleFlag = (gid, iid, key) => setGroups((gs) => gs.map((g) =>
    g.id !== gid ? g : { ...g, items: g.items.map((it) => it.id === iid ? { ...it, flags: { ...it.flags, [key]: !it.flags[key] } } : it) }))
  const addItemTo = (gid) => setGroups((gs) => gs.map((g) => g.id === gid ? { ...g, items: [...g.items, blankItem()] } : g))
  const removeItem = (gid, iid) => setGroups((gs) => gs.map((g) => g.id === gid ? { ...g, items: g.items.filter((it) => it.id !== iid) } : g))
  const resetItem = (gid, iid) => patchItem(gid, iid, { w: 1, h: 1, d: 1, weight: 10, count: 1, flags: newFlags() })
  const toggleGroup = (gid) => setGroups((gs) => gs.map((g) => g.id === gid ? { ...g, collapsed: !g.collapsed } : g))
  const renameGroup = (gid, name) => setGroups((gs) => gs.map((g) => g.id === gid ? { ...g, name } : g))
  const addGroup = () => setGroups((gs) => [...gs, { id: `g${nextGroupId++}`, name: `Grp. ${gs.length + 1}`, collapsed: false, items: [blankItem()] }])

  function saveShipment() {
    const all = JSON.parse(localStorage.getItem('cl3d_shipments') || '[]')
    all.push({ name: shipName || 'Untitled', container: container.label, units: totalUnits, savedAt: Date.now() })
    localStorage.setItem('cl3d_shipments', JSON.stringify(all))
    alert(`Shipment "${shipName || 'Untitled'}" saved.`)
  }

  const FLAG_DEFS = [
    { key: 'upright', label: 'This way up', Icon: IconUpright },
    { key: 'noStack', label: 'Do not stack', Icon: IconNoStack },
    { key: 'noTilt', label: 'Do not tilt', Icon: IconNoTilt },
    { key: 'floorOnly', label: 'Floor only', Icon: IconFloorOnly },
  ]

  return (
    <div className="app2">
      <div className="app2-strip"><IconApps width={14} height={14} /></div>

      <header className="app2-nav">
        <div className="app2-logo">
          <span className="mark">CL<br />3D</span>
          <span className="word">cargo<b>Loader</b></span>
        </div>
        <nav className="app2-tabs">
          {TABS.map((t) => (
            <button key={t} className={`app2-tab ${tab === t ? 'active' : ''}`}
              onClick={() => { setTab(t); setSidebarOpen(true) }}>{t}</button>
          ))}
        </nav>
        <div className="app2-nav-right">
          <span className="app2-flag"><span className="em">🇺🇸</span><IconChevron width={13} height={13} /></span>
          <div style={{ position: 'relative' }}>
            <button className="app2-user" onClick={() => setUserMenu((m) => !m)}>
              {user?.name ? user.name[0].toUpperCase() + user.name.slice(1) : 'Account'} <IconChevron width={14} height={14} />
            </button>
            {userMenu && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff',
                border: '1px solid var(--w-border)', borderRadius: 10, boxShadow: '0 10px 30px rgba(15,23,42,0.15)',
                padding: 8, width: 200, zIndex: 60 }}>
                <div style={{ padding: '8px 10px', fontSize: 12.5, color: 'var(--w-muted)' }}>{user?.email}</div>
                <button className="w-btn" style={{ background: '#f1f5f9', color: '#ef4444' }}
                  onClick={() => { logout(); navigate('/') }}>Log out</button>
              </div>
            )}
          </div>
          <button className="app2-iconbtn" title="Notifications"><IconBell width={20} height={20} /></button>
          <button className="app2-iconbtn" title="Fullscreen"
            onClick={() => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.() }}>
            <IconExpand width={20} height={20} /></button>
        </div>
      </header>

      <div className="app2-body">
        {!sidebarOpen && (
          <button className="spaces-reopen" title="Open panel" onClick={() => setSidebarOpen(true)}>
            <IconPanel width={18} height={18} />
          </button>
        )}
        <aside className={`spaces ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="spaces-head">
            {tab === 'Items' && <button className="it-headbtn" title="Add group" onClick={addGroup}><IconGroupAdd width={18} height={18} /></button>}
            <h2 style={{ flex: 1, textAlign: tab === 'Items' ? 'center' : 'left' }}>{tab}</h2>
            <button title="Collapse" onClick={() => setSidebarOpen(false)}><IconPanel width={20} height={20} /></button>
          </div>

          {/* -------- Items editor -------- */}
          {tab === 'Items' && (
            <div className="it-scroll">
              {loadMode && (
                <div style={{ marginBottom: 14 }}>
                  <p className="w-section-title">Loading progress</p>
                  {legend.map((l) => {
                    const complete = l.placed >= l.qty
                    return (
                      <div className="it-progress" key={l.id}>
                        <span className="dot" style={{ background: l.color }} />
                        <span className="pmeta"><b>{l.name}</b>
                          <span>{Math.round(l.w * 100)} × {Math.round(l.d * 100)} × {Math.round(l.h * 100)} cm · {l.weight} kg</span></span>
                        <span className={`cnt ${complete ? 'done' : ''}`}>{complete ? '✓ ' : ''}{l.placed}/{l.qty}</span>
                      </div>
                    )
                  })}
                  {result.stats.unplacedCount > 0 && done &&
                    <p className="spaces-empty" style={{ color: '#d97706', padding: '8px 0 0' }}>
                      {result.stats.unplacedCount} unit(s) didn't fit in this space.</p>}
                </div>
              )}
              {groups.map((g) => (
                <div className="it-group" key={g.id}>
                  <div className="it-group-head">
                    <button className={`chev ${g.collapsed ? 'collapsed' : ''}`} onClick={() => toggleGroup(g.id)}>
                      <IconChevron width={18} height={18} />
                    </button>
                    <span className="gname-label">{g.name}</span>
                    <input className="gname" value={g.name === `Grp. ${groups.indexOf(g) + 1}` ? '' : g.name}
                      placeholder="group" onChange={(e) => renameGroup(g.id, e.target.value || `Grp. ${groups.indexOf(g) + 1}`)} />
                    <button className="gbtn" title="Add saved item"><IconBoxMenu width={20} height={20} /></button>
                    <button className="gbtn" title="Add item" onClick={() => addItemTo(g.id)}><IconBoxAdd width={20} height={20} /></button>
                  </div>

                  {!g.collapsed && g.items.map((it) => (
                    <div className="it-card" key={it.id}
                      onMouseEnter={() => setHighlight(it.id)} onMouseLeave={() => setHighlight(null)}>
                      <div className="it-top">
                        <label className="it-swatch" style={{ background: it.color }} title="Item colour">
                          <input type="color" value={it.color} onChange={(e) => patchItem(g.id, it.id, { color: e.target.value })} />
                        </label>
                        <div className="it-name">
                          <small>Item Name</small>
                          <input value={it.name} onChange={(e) => patchItem(g.id, it.id, { name: e.target.value })} />
                        </div>
                        <label className={`it-select ${it.selected ? 'on' : ''}`} title="Include in load">
                          <input type="checkbox" checked={it.selected} onChange={(e) => patchItem(g.id, it.id, { selected: e.target.checked })} />
                          {it.selected ? '✓' : ''}
                        </label>
                      </div>

                      <div className="it-flags">
                        {FLAG_DEFS.map(({ key, label, Icon }) => (
                          <button key={key} className={`it-flag ${it.flags[key] ? 'on' : ''}`}
                            title={label} onClick={() => toggleFlag(g.id, it.id, key)}>
                            <span className="chk">{it.flags[key] ? '✓' : ''}</span>
                            <Icon className="ic" width={20} height={20} />
                          </button>
                        ))}
                      </div>

                      <div className="it-dims">
                        <div className="it-field"><label>Length(cm)</label>
                          <input type="number" min="1" value={Math.round(it.w * 100)}
                            onChange={(e) => patchItem(g.id, it.id, { w: Math.max(1, +e.target.value) / 100 })} /></div>
                        <div className="it-field"><label>Width(cm)</label>
                          <input type="number" min="1" value={Math.round(it.d * 100)}
                            onChange={(e) => patchItem(g.id, it.id, { d: Math.max(1, +e.target.value) / 100 })} /></div>
                        <div className="it-field"><label>Height(cm)</label>
                          <input type="number" min="1" value={Math.round(it.h * 100)}
                            onChange={(e) => patchItem(g.id, it.id, { h: Math.max(1, +e.target.value) / 100 })} /></div>
                      </div>

                      <div className="it-bottom">
                        <div className="it-field"><label>Weight(kg)</label>
                          <input type="number" min="0" value={it.weight}
                            onChange={(e) => patchItem(g.id, it.id, { weight: +e.target.value })} /></div>
                        <div className="it-field"><label>Count</label>
                          <input type="number" min="1" value={it.count}
                            onChange={(e) => patchItem(g.id, it.id, { count: Math.max(1, +e.target.value) })} /></div>
                        <span className="sp" />
                        <button className="it-iconbtn del" title="Delete item" onClick={() => removeItem(g.id, it.id)}><IconTrash width={18} height={18} /></button>
                        <button className="it-iconbtn reset" title="Reset item" onClick={() => resetItem(g.id, it.id)}><IconReset width={18} height={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <button className="it-addgroup" onClick={addGroup}><IconGroupAdd width={16} height={16} /> Add group</button>
            </div>
          )}

          {/* -------- Spaces -------- */}
          {tab === 'Spaces' && (
            <>
              <div className="spaces-search">
                <div className="box"><IconSearch width={15} height={15} />
                  <input placeholder="Search Spaces..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <button className="filt" title="Filter"><IconFilter width={15} height={15} /></button>
              </div>
              <div className="spaces-list">
                {spaces.map((c) => (
                  <button key={c.id} className={`space-card ${containerId === c.id ? 'sel' : ''}`} onClick={() => setContainerId(c.id)}>
                    <span className="space-thumb"><IconBox2 width={24} height={24} /></span>
                    <span className="space-meta"><b>{c.label}</b>
                      <span>{cm(c.w)} x {cm(c.d)} x {cm(c.h)} cm · {c.maxWeight.toLocaleString()} kg</span></span>
                    <span className="space-cat">{categoryOf(c)}</span>
                  </button>
                ))}
                {spaces.length === 0 && <p className="spaces-empty">No spaces match your search.</p>}
              </div>
            </>
          )}

          {tab === 'Shipments' && (
            <div className="spaces-list" style={{ padding: '0 16px 16px' }}>
              {shipments.length === 0 && <p className="spaces-empty">No saved shipments yet. Name a plan and hit save.</p>}
              {shipments.map((sh, i) => (
                <div className="w-item" key={i}>
                  <span className="dot" style={{ background: 'var(--w-blue)' }} />
                  <div className="meta"><b>{sh.name}</b>
                    <span>{sh.container} · {sh.units} units · {new Date(sh.savedAt).toLocaleDateString()}</span></div>
                </div>
              ))}
            </div>
          )}

          {(tab === 'Backups' || tab === 'Team') && (
            <p className="spaces-empty" style={{ marginTop: 30 }}>
              {tab} is part of the cloud workspace — available once a backend is connected.
            </p>
          )}
        </aside>

        {/* -------- Canvas workspace -------- */}
        <div className="ws">
          <LoadScene container={container} placed={placed} highlightItemId={highlight}
            onSelect={(p) => setHighlight(p.itemId)} showRulers={showRulers}
            loading={loadMode} newId={playing ? newId : null} />

          <div className="ws-stats">
            <span className="ws-stat">Volume <b>{volPct}%</b></span>
            <span className="ws-stat">Weight <b>{wPct}%</b></span>
            {done && result.stats.unplacedCount > 0 &&
              <span className="ws-stat warn"><b>{result.stats.unplacedCount}</b> didn't fit</span>}
          </div>

          <button className="ws-help" title="Help"
            onClick={() => alert('Pick a Space, add Items, then press Load. Drag to orbit · scroll to zoom.')}>
            <IconHelp width={17} height={17} /></button>

          <div className="ws-toolbar">
            <button className="ws-tool" title="Weight summary"
              onClick={() => alert(`Total weight: ${result.stats.totalWeight.toLocaleString()} kg\nMax payload: ${container.maxWeight.toLocaleString()} kg`)}>
              <IconWeight width={20} height={20} /></button>
            <button className={`ws-tool ${reportOpen ? 'active' : ''}`} title="Load report"
              onClick={() => setReportOpen((o) => !o)}><IconSort width={20} height={20} /></button>
            <button className={`ws-tool ${tab === 'Items' ? 'active' : ''}`} title="Items"
              onClick={() => { setTab('Items'); setSidebarOpen(true) }}><IconGrid width={20} height={20} /></button>
            <button className="ws-tool" title="Axle weights"
              onClick={() => alert(`Estimated axle loads\nFront: ${axles.front.toLocaleString()} kg\nRear: ${axles.rear.toLocaleString()} kg`)}>
              <IconScale width={20} height={20} /></button>
            <button className={`ws-tool ${showRulers ? 'active' : ''}`} title="Toggle rulers"
              onClick={() => setShowRulers((r) => !r)}><IconRuler width={20} height={20} /></button>
          </div>

          <button
            className={`ws-load ${playing ? 'playing' : ''} ${done ? 'done' : ''}`}
            onClick={startLoading}
            title={!loadMode ? 'Start loading' : done ? 'Reset' : playing ? 'Pause' : 'Continue'}>
            {!loadMode && <>Load<small>{totalUnits} units</small></>}
            {loadMode && playing && <IconPause width={34} height={34} />}
            {loadMode && !playing && !done && <IconForward width={34} height={34} />}
            {loadMode && done && <><IconReset width={26} height={26} /><small>Reset</small></>}
          </button>

          {loadMode && (
            <div className="ws-loadctl">
              <button className="ws-ctlbtn reset" title="Stop & reset" onClick={resetLoading}><IconReset width={20} height={20} /></button>
            </div>
          )}

          <button className="ws-upload" title="Import from Excel"
            onClick={() => alert('Excel import: map spreadsheet columns to size, weight and quantity. (Demo placeholder)')}>
            <IconUpload width={20} height={20} /></button>

          <div className="ws-bottom">
            <div className="ship">
              <input className="shipname" placeholder="Shipment Name" value={shipName}
                onChange={(e) => setShipName(e.target.value)} />
              <button className="ws-icon-btn" title="Save shipment" onClick={saveShipment}><IconSave width={17} height={17} /></button>
            </div>
            <div className="ws-cont-tab">
              <span className="name">{container.label}</span>
              <span className="cat">{categoryOf(container)}</span>
            </div>
            <div className="ws-dims">
              <span>Length <b>{cm(container.w)} cm</b></span>
              <span>Width <b>{cm(container.d)} cm</b></span>
              <span>Height <b>{cm(container.h)} cm</b></span>
              <span>Max Load <b>{container.maxWeight.toLocaleString()} kg</b></span>
              <span>Volume <b>{volume.toFixed(1)} m³</b></span>
            </div>
            <button className="ws-icon-btn ghost" title="Export PDF" onClick={() => window.print()}><IconPdf width={18} height={18} /></button>
          </div>

          {loadMode && (
            <div className="ws-loadstats">
              <div className="lstat"><div className="k">Loaded Items</div><div className="v">{loadedItems}</div></div>
              <div className="lstat"><div className="k">Remaining Items</div><div className="v">{remItems}</div></div>
              <div className="lstat big"><div className="k">Remaining Free Meter</div><div className="v">{freeLen.toFixed(1)}m</div>
                <div className="lbar"><i style={{ width: `${lenPct}%` }} /></div>
                <div className="sub">{usedLen.toFixed(1)}m ({lenPct}%)</div></div>
              <div className="lstat big"><div className="k">Remaining Volume</div><div className="v">{remVol.toFixed(1)}m³</div>
                <div className="lbar"><i style={{ width: `${volPct}%` }} /></div>
                <div className="sub">{usedVol.toFixed(1)}m³ ({volPct}%)</div></div>
              <div className="lstat big"><div className="k">Remaining Weight</div><div className="v">{remWeight.toLocaleString()}kg</div>
                <div className="lbar"><i style={{ width: `${wPct}%` }} /></div>
                <div className="sub">{usedWeight.toLocaleString()}kg ({wPct}%)</div></div>
            </div>
          )}

          <span className="ws-version">Beta · v0.1.0</span>

          {reportOpen && (
            <div className="ws-drawer">
              <div className="ws-drawer-head">
                <h3>Load report</h3>
                <button onClick={() => setReportOpen(false)}><IconClose width={18} height={18} /></button>
              </div>
              <div className="ws-drawer-body">
                {!loadMode && <p style={{ color: 'var(--w-muted)', fontSize: 13, marginTop: 0 }}>Press <b>Load</b> to generate a plan.</p>}
                <div className="w-stat-grid">
                  <div className="w-stat-box"><b>{volPct}%</b><span>Volume used</span>
                    <div className="w-bar"><i style={{ width: `${Math.min(volPct, 100)}%` }} /></div></div>
                  <div className="w-stat-box"><b style={{ color: '#16a34a' }}>{wPct}%</b><span>Payload used</span>
                    <div className="w-bar"><i style={{ width: `${Math.min(wPct, 100)}%` }} /></div></div>
                </div>
                <div className="w-legend">
                  <div className="row"><IconLayers width={15} height={15} />Items loaded<span className="v">{loadedItems}</span></div>
                  <div className="row"><IconBolt width={15} height={15} />Not fitted<span className="v">{done ? result.stats.unplacedCount : 0}</span></div>
                  <div className="row"><IconScale width={15} height={15} />Total weight<span className="v">{usedWeight.toLocaleString()} kg</span></div>
                </div>
                <div className="w-divider" />
                <p className="w-section-title">By item</p>
                <div className="w-legend">
                  {legend.map((l) => (
                    <div className="row" key={l.id}><span className="dot" style={{ background: l.color }} />{l.name}
                      <span className="v">{l.placed}/{l.qty}</span></div>
                  ))}
                </div>
                <div className="w-divider" />
                <button className="w-btn" onClick={() => window.print()}>Export load plan (PDF)</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
