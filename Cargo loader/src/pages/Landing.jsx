import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import HeroScene from '../components/HeroScene.jsx'
import {
  IconCube, IconBox, IconChart, IconCloud, IconShare, IconSheet, IconScale,
  IconBolt, IconTruck, IconWarehouse, IconFactory, IconCheck, IconArrow, IconLayers,
} from '../components/icons.jsx'

const features = [
  { icon: <IconCube />, title: '3D visualization', text: 'See every box in an interactive 3D scene. Rotate, zoom and inspect placement before a single pallet moves.' },
  { icon: <IconBolt />, title: 'Smart optimization', text: 'A packing engine arranges cargo to squeeze out empty space and cut the number of containers you need.' },
  { icon: <IconChart />, title: 'Detailed reports', text: 'Volume and weight utilization, load lists and a shareable PDF summary for the warehouse floor.' },
  { icon: <IconCloud />, title: 'Cloud storage', text: 'Save containers, storage areas and shipments. Pick up exactly where you left off on any device.' },
  { icon: <IconShare />, title: 'One-click sharing', text: 'Send a load plan with a single link. Recipients open it instantly — no account required.' },
  { icon: <IconSheet />, title: 'Excel import', text: 'Bring item lists straight from a spreadsheet. Map columns once and import hundreds of SKUs.' },
]

const capabilities = [
  'Build a catalogue of reusable container and truck presets',
  'Define cargo items with size, weight, quantity and stacking rules',
  'Run automatic optimization or place items by hand',
  'Track real-time volume and weight utilization',
  'Calculate axle weights for transport compliance',
  'Export a clean PDF load plan for the loading crew',
]

const industries = [
  { icon: <IconWarehouse />, title: 'Warehouses & 3PLs', text: 'Plan outbound loads in minutes and stop shipping air. Fewer trips, fuller trucks.' },
  { icon: <IconTruck />, title: 'Freight forwarders', text: 'Quote with confidence using accurate container counts and compliant weight distribution.' },
  { icon: <IconFactory />, title: 'Manufacturers', text: 'Standardize packing plans across plants so every shipment loads the same, optimal way.' },
]

const roadmap = [
  { yr: '2023', text: 'First 3D engine and core packing algorithm.', state: 'done' },
  { yr: '2024', text: 'Cloud storage, Excel import and PDF reporting.', state: 'done' },
  { yr: '2025', text: 'Axle-weight compliance and one-click load sharing.', state: 'active' },
  { yr: '2026', text: 'Team workspaces, API access and licensed plans.', state: '' },
]

const testimonials = [
  { name: 'Marta Kovač', role: 'Logistics Lead, NordFreight', text: 'We cut a full container off our weekly Asia route in the first month. The 3D view makes it obvious where space is being wasted.' },
  { name: 'Daniel Roy', role: 'Operations, Atlas 3PL', text: 'Onboarding a new packer used to take weeks. Now they follow the load plan on a tablet and load it right the first time.' },
  { name: 'Priya Nair', role: 'Export Manager, Vega Mfg', text: 'Axle-weight calculations alone paid for it. No more reloading at the weighbridge.' },
]

export default function Landing() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="pill"><IconCheck width={15} height={15} /> Free during beta</span>
            <h1>Maximize space.<br /><span className="grad">Minimize costs.</span></h1>
            <p className="lead">
              CargoLoader3D turns a messy list of boxes into an optimized, fully visualized
              load plan for any container or truck — in seconds, right in your browser.
            </p>
            <div className="hero-actions">
              <a href="#signup" className="btn btn-primary">Start free <IconArrow width={16} height={16} /></a>
              <Link to="/login" className="btn btn-ghost">Open the app</Link>
            </div>
            <div className="hero-stats">
              <div className="stat"><b>30%</b><span>less wasted space</span></div>
              <div className="stat"><b>5 min</b><span>to a full load plan</span></div>
              <div className="stat"><b>0€</b><span>during beta</span></div>
            </div>
          </div>
          <div className="hero-visual"><HeroScene /></div>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Everything in one place</div>
            <h2>Fast, smart and budget-friendly load planning</h2>
            <p>From the first box to the final PDF, CargoLoader3D handles the whole packing workflow.</p>
          </div>
          <div className="grid-3">
            {features.map((f) => (
              <div className="card" key={f.title}>
                <div className="ico">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="section alt" id="capabilities">
        <div className="container grid-2" style={{ alignItems: 'center', gap: 48 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--brand-2)', fontWeight: 700, letterSpacing: '0.18em', fontSize: 12, textTransform: 'uppercase' }}>What you can do</div>
            <h2 style={{ fontSize: 34, letterSpacing: '-0.02em', margin: '12px 0 18px' }}>
              A complete toolkit for the loading dock
            </h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
              Set up your equipment and cargo once, then let the engine do the heavy lifting —
              or take manual control when a shipment needs a human touch.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 14 }}>
              {capabilities.map((c) => (
                <li key={c} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--good)', marginTop: 2 }}><IconCheck width={18} height={18} /></span>
                  <span style={{ color: 'var(--text)' }}>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: 380 }}>
            <HeroScene variant="capabilities" />
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="section" id="industries">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Who it's for</div>
            <h2>Built for everyone who moves freight</h2>
          </div>
          <div className="grid-3">
            {industries.map((i) => (
              <div className="industry" key={i.title}>
                <span className="ico">{i.icon}</span>
                <div>
                  <h3 style={{ margin: '2px 0 8px', fontSize: 17 }}>{i.title}</h3>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.6 }}>{i.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="section alt" id="roadmap">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Where we're going</div>
            <h2>Product roadmap</h2>
          </div>
          <div className="roadmap">
            {roadmap.map((r) => (
              <div className={`road-step ${r.state}`} key={r.yr}>
                <span className="dot" />
                <div className="yr">{r.yr}</div>
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Loved on the dock</div>
            <h2>What teams are saying</h2>
          </div>
          <div className="grid-3">
            {testimonials.map((t) => (
              <div className="quote" key={t.name}>
                <p>“{t.text}”</p>
                <div className="who">
                  <span className="avatar">{t.name.split(' ').map((n) => n[0]).join('')}</span>
                  <div><b>{t.name}</b><span>{t.role}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signup CTA */}
      <section className="cta" id="signup">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div className="eyebrow">Get started</div>
            <h2>Pack your first container today</h2>
            <p>Join the free beta. No credit card, no setup — just a faster loading dock.</p>
          </div>
          {sent ? (
            <p style={{ color: 'var(--good)', marginTop: 24, fontWeight: 600 }}>
              <IconCheck width={18} height={18} /> Thanks! Check your inbox to activate your beta access.
            </p>
          ) : (
            <form
              className="signup-form"
              onSubmit={(e) => { e.preventDefault(); if (email.includes('@')) setSent(true) }}
            >
              <input
                type="email" required placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Request access</button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </>
  )
}
