// ---------------------------------------------------------------------------
// PROCESS / MACHINE MASTER  (prototype seed data)
// Hourly rates are indicative Indian job-shop rates for demonstration only.
// ---------------------------------------------------------------------------

export const PROCESS_CATEGORIES = [
  'Machining',
  'Casting',
  'Forging',
  'Fabrication',
  'Moulding',
  'Heat Treatment',
  'Surface Treatment',
  'Quality',
]

export const PROCESS_MASTER = [
  // ---- Machining ---------------------------------------------------------
  { id: 'CNC-TURN', name: 'CNC Turning', category: 'Machining', rate: 950, setupMin: 45, labourFactor: 0.5, notes: 'Rotational geometry, single/twin spindle turning centre.' },
  { id: 'CNC-MILL', name: 'CNC Milling', category: 'Machining', rate: 1100, setupMin: 60, labourFactor: 0.5, notes: '3-axis milling of prismatic features.' },
  { id: 'VMC',      name: 'VMC', category: 'Machining', rate: 1250, setupMin: 75, labourFactor: 0.5, notes: 'Vertical machining centre, multi-face with tombstone.' },
  { id: 'HMC',      name: 'HMC', category: 'Machining', rate: 1850, setupMin: 90, labourFactor: 0.4, notes: 'Horizontal machining centre, pallet change, high volume.' },
  { id: 'DRILL',    name: 'Drilling', category: 'Machining', rate: 420, setupMin: 20, labourFactor: 1.0, notes: 'Radial / pillar drilling and tapping.' },
  { id: 'GRIND',    name: 'Grinding', category: 'Machining', rate: 780, setupMin: 40, labourFactor: 0.8, notes: 'Cylindrical / surface grinding for tight tolerance and finish.' },

  // ---- Casting -----------------------------------------------------------
  { id: 'SAND-CAST', name: 'Sand Casting', category: 'Casting', rate: 620, setupMin: 30, labourFactor: 1.2, notes: 'Low tooling cost, suitable for low-to-medium volume.' },
  { id: 'GDC',       name: 'Gravity Die Casting', category: 'Casting', rate: 780, setupMin: 45, labourFactor: 1.0, notes: 'Non-ferrous, medium volume, better finish than sand.' },
  { id: 'PDC',       name: 'Pressure Die Casting', category: 'Casting', rate: 1450, setupMin: 120, labourFactor: 0.6, notes: 'High volume non-ferrous, high tooling investment.' },
  { id: 'INV-CAST',  name: 'Investment Casting', category: 'Casting', rate: 1150, setupMin: 60, labourFactor: 1.4, notes: 'Near net shape, good finish, higher piece price.' },
  { id: 'CASTING',   name: 'Casting', category: 'Casting', rate: 700, setupMin: 40, labourFactor: 1.2, notes: 'Generic foundry route pending choice of sand, gravity die, pressure die or investment.' },

  // ---- Forging -----------------------------------------------------------
  { id: 'FORGE',  name: 'Forging', category: 'Forging', rate: 1250, setupMin: 90, labourFactor: 1.1, notes: 'Closed die drop forging, superior grain flow.' },
  { id: 'EXTRUDE', name: 'Extrusion', category: 'Forging', rate: 680, setupMin: 60, labourFactor: 0.7, notes: 'Constant cross-section profiles, aluminium.' },

  // ---- Fabrication -------------------------------------------------------
  { id: 'LASER',  name: 'Laser Cutting', category: 'Fabrication', rate: 1450, setupMin: 15, labourFactor: 0.4, notes: 'Fibre laser sheet cutting.' },
  { id: 'SHEET',  name: 'Sheet Metal Fabrication', category: 'Fabrication', rate: 680, setupMin: 25, labourFactor: 1.0, notes: 'Press brake bending, punching, forming.' },
  { id: 'WELD',   name: 'Welding', category: 'Fabrication', rate: 560, setupMin: 20, labourFactor: 1.3, notes: 'MIG / TIG welding including fit-up.' },

  // ---- Moulding ----------------------------------------------------------
  { id: 'INJ-MOULD', name: 'Injection Moulding', category: 'Moulding', rate: 980, setupMin: 150, labourFactor: 0.3, notes: 'Thermoplastics, high tooling investment, very high volume.' },

  // ---- Heat treatment ----------------------------------------------------
  { id: 'HT-NORM',   name: 'Normalising', category: 'Heat Treatment', rate: 0, perKg: 22, batchCost: 3200, notes: 'Stress relief / grain refinement, batch furnace.' },
  { id: 'HT-HARD',   name: 'Hardening & Tempering', category: 'Heat Treatment', rate: 0, perKg: 46, batchCost: 5400, notes: 'Through hardening to drawing hardness spec.' },
  { id: 'HT-CASE',   name: 'Case Carburising', category: 'Heat Treatment', rate: 0, perKg: 68, batchCost: 7200, notes: 'Case depth per drawing, sealed quench furnace.' },
  { id: 'HT-SOLN',   name: 'Solution + Ageing (T6)', category: 'Heat Treatment', rate: 0, perKg: 58, batchCost: 4200, notes: 'Aluminium T6 treatment.' },
  { id: 'HT-ANNEAL', name: 'Annealing', category: 'Heat Treatment', rate: 0, perKg: 18, batchCost: 2800, notes: 'Softening prior to machining.' },

  // ---- Surface treatment -------------------------------------------------
  { id: 'ST-PAINT',  name: 'Painting', category: 'Surface Treatment', rate: 0, perDm2: 2.4, batchCost: 1200, notes: 'Primer + top coat, wet spray.' },
  { id: 'ST-POWDER', name: 'Powder Coating', category: 'Surface Treatment', rate: 0, perDm2: 3.1, batchCost: 1800, notes: 'Electrostatic powder + oven cure.' },
  { id: 'ST-ZINC',   name: 'Zinc Plating', category: 'Surface Treatment', rate: 0, perDm2: 2.8, batchCost: 1500, notes: 'Trivalent zinc passivation.' },
  { id: 'ST-ANOD',   name: 'Anodizing', category: 'Surface Treatment', rate: 0, perDm2: 4.2, batchCost: 2200, notes: 'Type II / hard anodizing for aluminium.' },
  { id: 'ST-PHOS',   name: 'Phosphating', category: 'Surface Treatment', rate: 0, perDm2: 1.6, batchCost: 900, notes: 'Manganese / zinc phosphate pre-treatment.' },
  { id: 'ST-BLAST',  name: 'Shot Blasting', category: 'Surface Treatment', rate: 0, perDm2: 1.1, batchCost: 800, notes: 'Descaling of castings and forgings.' },

  // Generic entries so the process picker can offer "Heat Treatment" and
  // "Surface Treatment" before the specific cycle has been decided.
  { id: 'HT-GEN', name: 'Heat Treatment', category: 'Heat Treatment', rate: 0, perKg: 38, batchCost: 4200, notes: 'Generic heat treatment pending specification of the cycle.' },
  { id: 'ST-GEN', name: 'Surface Treatment', category: 'Surface Treatment', rate: 0, perDm2: 2.6, batchCost: 1500, notes: 'Generic surface treatment pending specification of the system.' },
]

/**
 * The process list offered to the user when the drawing does not state a
 * manufacturing route. Order and wording follow the shop's own vocabulary.
 */
export const PROCESS_OPTIONS = [
  'CNC-TURN', 'CNC-MILL', 'VMC', 'HMC', 'DRILL', 'GRIND',
  'SHEET', 'LASER', 'WELD',
  'CASTING', 'SAND-CAST', 'GDC', 'PDC', 'INV-CAST',
  'FORGE', 'EXTRUDE', 'INJ-MOULD',
  'HT-GEN', 'ST-GEN',
]

export const processById = (id) => PROCESS_MASTER.find((p) => p.id === id)
