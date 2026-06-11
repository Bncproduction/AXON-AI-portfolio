import { Canvas } from '@react-three/fiber'
import { OrbitControls, Edges, GizmoHelper, GizmoViewcube, Grid, Html } from '@react-three/drei'
import { useMemo } from 'react'

// The packer uses an origin at one corner (0..W, 0..H, 0..D). We recenter on the
// floor so the container sits nicely above the grid and orbits around its base.
function Box({ p, offset, dim, selected, onClick, label, isNew }) {
  const [ox, oy, oz] = offset
  const cx = p.x + p.w / 2 - ox
  const cy = p.y + p.h / 2 - oy
  const cz = p.z + p.d / 2 - oz
  return (
    <group>
      <mesh position={[cx, cy, cz]} onClick={(e) => { e.stopPropagation(); onClick?.(p) }}>
        <boxGeometry args={[p.w * 0.985, p.h * 0.985, p.d * 0.985]} />
        <meshStandardMaterial
          color={p.color}
          roughness={0.55}
          metalness={0.04}
          transparent={!!dim}
          opacity={dim ? 0.14 : 1}
          emissive={isNew ? '#ffffff' : selected ? p.color : '#000000'}
          emissiveIntensity={isNew ? 0.45 : selected ? 0.4 : 0}
        />
        <Edges color={isNew ? '#0f172a' : selected ? '#0f172a' : '#475569'} />
      </mesh>
      {label && !dim && (
        <Html position={[cx, cy, cz]} center distanceFactor={10}
          style={{ font: '700 12px Inter, sans-serif', color: 'rgba(15,23,42,0.85)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {label}
        </Html>
      )}
    </group>
  )
}

// Numbered tick marks along the front-bottom (length) and front-left (height) edges.
function Rulers({ W, H, D, show }) {
  if (!show) return null
  const ticks = []
  for (let i = 0; i <= Math.floor(W); i++) {
    ticks.push(
      <Html key={`x${i}`} position={[-W / 2 + i, -H / 2 - 0.06, D / 2 + 0.06]} center
        style={{ font: '600 10px Inter, sans-serif', color: '#64748b', pointerEvents: 'none' }}>
        {i}
      </Html>
    )
  }
  for (let i = 0; i <= Math.floor(H); i++) {
    ticks.push(
      <Html key={`y${i}`} position={[-W / 2 - 0.08, -H / 2 + i, D / 2]} center
        style={{ font: '600 10px Inter, sans-serif', color: '#64748b', pointerEvents: 'none' }}>
        {i}
      </Html>
    )
  }
  return <group>{ticks}</group>
}

export default function LoadScene({ container, placed, highlightItemId, onSelect, showRulers = true, loading = false, newId = null }) {
  const { w: W, h: H, d: D } = container
  const offset = [W / 2, H / 2, D / 2]
  const showLabels = placed.length <= 60

  const camPos = useMemo(() => {
    const r = Math.max(W, D) * 0.95 + 2
    return [r, H + Math.max(W, D) * 0.55, r * 1.05]
  }, [W, H, D])

  return (
    <Canvas camera={{ position: camPos, fov: 42 }} dpr={[1, 2]} className="ws-canvas">
      <color attach="background" args={['#eef2f7']} />
      <hemisphereLight args={['#ffffff', '#cbd5e1', 0.9]} />
      <directionalLight position={[8, 14, 6]} intensity={1.0} />
      <directionalLight position={[-6, 6, -6]} intensity={0.35} />

      {/* container */}
      <mesh>
        <boxGeometry args={[W, H, D]} />
        <meshBasicMaterial transparent opacity={0.015} color="#334155" />
        <Edges color="#94a3b8" />
      </mesh>

      {/* shaded floor inside the container — turns teal during loading */}
      <mesh position={[0, -H / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={loading ? '#7fdcc8' : '#cdd6e2'} transparent opacity={loading ? 0.85 : 1} />
      </mesh>

      <Grid
        position={[0, -H / 2 - 0.001, 0]}
        args={[W + 8, D + 8]}
        cellSize={0.5}
        cellColor="#dbe2ec"
        sectionSize={2}
        sectionColor="#c2cdda"
        fadeDistance={45}
        infiniteGrid={false}
      />

      <Rulers W={W} H={H} D={D} show={showRulers} />

      {placed.map((p) => (
        <Box
          key={p.id}
          p={p}
          offset={offset}
          dim={highlightItemId && p.itemId !== highlightItemId}
          selected={highlightItemId && p.itemId === highlightItemId}
          onClick={onSelect}
          label={showLabels ? p.name : null}
          isNew={newId === p.id}
        />
      ))}

      <OrbitControls makeDefault enablePan minDistance={3} maxDistance={70} />
      <GizmoHelper alignment="top-right" margin={[72, 90]}>
        <GizmoViewcube
          color="#f8fafc" textColor="#475569" strokeColor="#cbd5e1"
          hoverColor="#2f9be0" faces={['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back']}
        />
      </GizmoHelper>
    </Canvas>
  )
}
