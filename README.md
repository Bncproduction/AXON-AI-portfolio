# BNC Motors Website

A modern, responsive website for **BNC Motors** — India's leading electric two-wheeler manufacturer. Showcasing the complete product lineup with interactive features and real product imagery.

## Products Featured

1. **Challenger S110** — ₹89,999
2. **Challenger S125** — ₹1,09,999
3. **Prefetto** — ₹1,34,999 ⭐ Best Seller
4. **Prefetto EX** (Dual Battery) — ₹1,74,999

## Features

✨ **Hero Section** — Animated particle effects, glassmorphism design
🛞 **Vehicle Gallery** — Real product images from BNC Motors official website
🔋 **Technology Showcase** — Battery tech, range specs, charging capabilities
⚡ **Fleet Solutions** — B2B and bulk purchasing options
📋 **Test Drive Form** — Multi-step form with vehicle selector
🌍 **Sustainability** — Environmental impact metrics
📱 **Fully Responsive** — Mobile, tablet, desktop optimized

## Tech Stack

- **HTML5** — Semantic markup
- **Tailwind CSS** — Utility-first styling (CDN)
- **Vanilla JavaScript** — Interactive components (forms, calculators)
- **Canvas API** — Particle animations
- **AVIF/PNG Images** — Real BNC Motors product photography

## Local Setup

```bash
# Clone the repository
git clone https://github.com/Bncproduction/AXON-AI-portfolio.git

# Navigate to project
cd "Claude projects"

# Open in browser
open voltedge_motors.html
# or for Windows
start voltedge_motors.html
```

## Vercel Deployment

### Option 1: Auto-Deploy from GitHub (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import the GitHub repo: `AXON-AI-portfolio`
4. Select branch: **`ev-manufacturing`**
5. Deploy (no build steps needed)
6. Live at: `your-project.vercel.app`

### Option 2: Deploy via CLI
```bash
npm install -g vercel
vercel
# Follow prompts to connect GitHub and deploy
```

## Project Structure

```
├── voltedge_motors.html      # Main website (standalone)
├── bnc-challenger.avif       # Challenger S125 product image
├── vercel.json              # Vercel deployment config
└── README.md                # This file
```

## Git Branches

- **`master`** — Production-ready main branch
- **`ev-manufacturing`** — Active development (current)

### Pushing Changes

```bash
# Make changes, then:
git add .
git commit -m "Description of changes"
git push origin ev-manufacturing

# Create Pull Request for review
```

## Image Assets

All product images are sourced from BNC Motors official website:
- `https://bncmotors.in/assets_v4/img/` (Challenger series)
- `https://bncmotors.in/assets_v4/img/perfetto_v2/` (Prefetto series)

Images are loaded remotely with fallback placeholders for offline viewing.

## Customization

Edit `voltedge_motors.html` to modify:
- **Colors**: Search for `#0A1628`, `#00D4FF`, `#7FFF00` (Navy, Cyan, Lime)
- **Pricing**: Look for vehicle cards (₹ values)
- **Content**: Hero copy, USP strip, about section
- **Forms**: Test drive selector, contact fields

## Browser Support

✅ Chrome/Edge (latest)
✅ Firefox (latest)
✅ Safari (latest)
✅ Mobile browsers (iOS Safari, Chrome Mobile)

## License

© 2026 BNC Motors. All rights reserved.

---

**Live Demo**: Deploy to Vercel and share the `.vercel.app` URL
**Questions?**: Check the GitHub repo issues or contact the development team
