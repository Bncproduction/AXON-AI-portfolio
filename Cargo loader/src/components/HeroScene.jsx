import { Canvas } from '@react-three/fiber'
import { OrbitControls, Edges, Environment } from '@react-three/drei'
import { useMemo } from 'react'

const PALETTE = ['#38bdf8', '#22d3ee', '#34d399', '#fbbf24', '#f87171', '#a78bfa']

// A small deterministic stack of boxes inside a wireframe container.
function buildBoxes() {
  const boxes = []
  const W = 4, H = 2.4, D = 2.4 // container interior
  let seed = 7
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280

  // simple shelf-style fill
  let x = -W / 2
  while (x < W / 2 - 0.3) {
    const bw = 0.5 + rnd() * 0.7
    let z = -D / 2
    while (z < D / 2 - 0.3) {
      const bd = 0.4 + rnd() * 0.7
      let y = -H / 2
      const layers = 1 + Math.floor(rnd() * 3)
      for (let l = 0; l < layers; l++) {
        const bh = 0.4 + rnd() * 0.5
        if (y + bh > H / 2) break
        boxes.push({
          pos: [x + bw / 2, y + bh / 2, z + bd / 2],
          size: [bw * 0.92, bh * 0.92, bd * 0.92],
          color: PALETTE[Math.floor(rnd() * PALETTE.length)],
        })
        y += bh
      }
      z += bd
    }
    x += bw
  }
  return { boxes, dims: [W, H, D] }
}

export default function HeroScene({ variant }) {
  const { boxes, dims } = useMemo(buildBoxes, [])
  const [W, H, D] = dims
  return (
    <Canvas camera={{ position: [6, 4.2, 6.5], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={[variant === 'capabilities' ? '#0c1526' : '#0d1830']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 9, 5]} intensity={1.1} />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#38bdf8" />

      {/* container wireframe */}
      <mesh>
        <boxGeometry args={[W, H, D]} />
        <meshBasicMaterial transparent opacity={0.04} color="#38bdf8" />
        <Edges color="#38bdf8" />
      </mesh>

      {/* floor */}
      <mesh position={[0, -H / 2 - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W + 2, D + 2]} />
        <meshStandardMaterial color="#0a1322" />
      </mesh>

      {boxes.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={b.color} roughness={0.45} metalness={0.05} />
          <Edges color="#0b1220" />
        </mesh>
      ))}

      <Environment preset="city" />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.1}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  )
}
