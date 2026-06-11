import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { IconCube, IconCheck } from '../components/icons.jsx'

const perks = [
  'Optimized 3D load plans in seconds',
  'Volume, weight and axle-load insight',
  'Shareable plans your crew can open instantly',
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnUrl = params.get('ReturnUrl') || '/app'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!email.includes('@') || password.length < 4) {
      setError('Enter a valid email and a password of at least 4 characters.')
      return
    }
    login(email)
    navigate(decodeURIComponent(returnUrl), { replace: true })
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <Link to="/" className="brand">
          <span className="logo"><IconCube width={20} height={20} /></span>
          Cargo<b>Loader</b>3D
        </Link>
        <div>
          <h2>Welcome back to your loading dock.</h2>
          <ul>
            {perks.map((p) => (
              <li key={p}><span style={{ color: 'var(--good)' }}><IconCheck width={18} height={18} /></span> {p}</li>
            ))}
          </ul>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>Free during beta · No credit card required</span>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <h1>Log in</h1>
          <p className="sub">Use any email and password to enter the demo workspace.</p>

          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="you@company.com" value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }} autoFocus />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }} />
            </div>
            <div className="auth-row">
              <label style={{ display: 'flex', gap: 7, alignItems: 'center', color: 'var(--muted)' }}>
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <a href="#">Forgot password?</a>
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, margin: '0 0 16px' }}>{error}</p>}
            <button type="submit" className="btn btn-primary btn-block">Log in</button>
          </form>

          <p className="auth-foot">
            New here? <a href="/#signup" style={{ color: 'var(--brand-2)' }}>Request beta access</a>
          </p>
        </div>
      </main>
    </div>
  )
}
