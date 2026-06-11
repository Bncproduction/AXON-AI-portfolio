import { Link } from 'react-router-dom'
import { IconCube } from './icons.jsx'

export default function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-grid">
          <div style={{ maxWidth: 280 }}>
            <Link to="/" className="brand" style={{ marginBottom: 14 }}>
              <span className="logo"><IconCube width={20} height={20} /></span>
              Cargo<b>Loader</b>3D
            </Link>
            <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.6 }}>
              3D load planning for containers and trucks. Maximize space, minimize costs.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#capabilities">Capabilities</a></li>
              <li><a href="#roadmap">Roadmap</a></li>
              <li><Link to="/login">Log in</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Docs</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">Cookie policy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} CargoLoader3D. All rights reserved.</span>
          <span>Made for logistics teams who hate empty space.</span>
        </div>
      </div>
    </footer>
  )
}
