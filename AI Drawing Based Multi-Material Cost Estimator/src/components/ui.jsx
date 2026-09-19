import React from 'react'
import { SRC, DISCLAIMER } from '../lib/sources.js'

export const Card = ({ title, hint, actions, children, className = '', flush }) => (
  <div className={`card ${flush ? 'flush' : ''} ${className}`}>
    {(title || actions) && (
      <div className="card-head" style={flush ? { padding: '14px 16px 0' } : undefined}>
        {title && <h3>{title}</h3>}
        {hint && <span className="hint">{hint}</span>}
        <div className="spacer" />
        {actions}
      </div>
    )}
    {children}
  </div>
)

const SRC_CLASS = {
  [SRC.DRAWING]: 'drawing',
  [SRC.AI]: 'ai',
  [SRC.USER]: 'user',
  [SRC.ASSUMPTION]: 'assumption',
  [SRC.NA]: 'na',
}

export const SourceTag = ({ source }) => (
  <span className={`tag ${SRC_CLASS[source] || 'neutral'}`}>{source || '—'}</span>
)

export const ConfTag = ({ level }) => (
  <span className={`tag ${String(level).toLowerCase()}`}>{level || '—'}</span>
)

export const Banner = ({ kind = 'info', children }) => <div className={`banner ${kind}`}>{children}</div>

export const Validation = ({ children }) => (
  <Banner kind="warn">
    <span>⚠</span>
    <span>{children || DISCLAIMER}</span>
  </Banner>
)

export const Kpi = ({ label, value, foot, tone = '' }) => (
  <div className={`kpi ${tone}`}>
    <div className="label">{label}</div>
    <div className="value">{value}</div>
    {foot && <div className="foot">{foot}</div>}
  </div>
)

export const Empty = ({ title, children, action }) => (
  <div className="card">
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
      {action && <div className="mt">{action}</div>}
    </div>
  </div>
)

export const Num = ({ value, onChange, step = 1, min, max, suffix, width = 110, disabled }) => (
  <div className="flex" style={{ gap: 6, justifyContent: 'flex-end' }}>
    <input
      className="inp num sm"
      type="number"
      style={{ width }}
      value={value ?? ''}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
    {suffix && <span className="muted small nowrap">{suffix}</span>}
  </div>
)

export const Txt = ({ value, onChange, placeholder, disabled }) => (
  <input
    className="inp sm"
    value={value ?? ''}
    placeholder={placeholder}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
  />
)

export const Field = ({ label, children }) => (
  <div className="field">
    <label>{label}</label>
    {children}
  </div>
)

export const Slider = ({ label, value, min, max, step = 1, onChange, format }) => (
  <div className="field">
    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span className="mono" style={{ color: 'var(--accent)' }}>{format ? format(value) : value}</span>
    </label>
    <input className="slider" type="range" min={min} max={max} step={step} value={value ?? 0}
      onChange={(e) => onChange(Number(e.target.value))} />
  </div>
)

export const BarRow = ({ name, value, max, color, display }) => (
  <div className="bar-row">
    <span className="name">{name}</span>
    <span className="track"><span className="fill" style={{ width: `${max ? Math.max(1, (value / max) * 100) : 0}%`, background: color }} /></span>
    <span className="val">{display}</span>
  </div>
)

export const PALETTE = ['#37a2ff', '#14e0a0', '#a77bff', '#ffb020', '#ff5f6d', '#4fd1e3', '#f97fb5', '#8ed16b', '#f0c419', '#6c8cff', '#c0c8d4']
