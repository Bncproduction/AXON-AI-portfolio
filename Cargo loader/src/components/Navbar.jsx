import { Link } from 'react-router-dom'
import { IconCube } from './icons.jsx'

export default function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand">
          <span className="logo"><IconCube width={20} height={20} /></span>
          Cargo<b>Loader</b>3D
        </Link>
        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#capabilities">What you can do</a>
          <a href="#industries">Industries</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="nav-cta">
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <a href="#signup" className="btn btn-primary">Try free beta</a>
        </div>
      </div>
    </header>
  )
}
