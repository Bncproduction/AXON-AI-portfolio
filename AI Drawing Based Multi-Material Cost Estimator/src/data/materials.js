// ---------------------------------------------------------------------------
// MATERIAL MASTER  (prototype seed data)
// Prices are indicative Indian market landed rates used for demonstration only.
// Every rate carries a lastUpdated stamp and is editable in the application.
// ---------------------------------------------------------------------------

export const MATERIAL_CATEGORIES = [
  'Steel',
  'Stainless Steel',
  'Cast Materials',
  'Aluminium',
  'Copper Alloys',
  'Other Engineering Materials',
]

// form: how raw stock arrives -> drives default scrap / buy-to-fly and route
// scrapAllowancePct: default extra material bought over net weight
export const MATERIAL_MASTER = [
  // ---- Steel -------------------------------------------------------------
  { id: 'MS-IS2062', name: 'Mild Steel', grade: 'IS 2062 E250 Br', category: 'Steel', density: 7.85, price: 68, lastUpdated: '2026-08-28', form: 'Bar / Plate', scrapAllowancePct: 12, machinability: 0.9, weldable: true, castable: false, forgeable: true, notes: 'General fabrication and low-stress machined parts.' },
  { id: 'CS-EN8',   name: 'Carbon Steel', grade: 'EN8 / C45', category: 'Steel', density: 7.85, price: 82, lastUpdated: '2026-08-28', form: 'Bar', scrapAllowancePct: 14, machinability: 0.8, weldable: true, castable: false, forgeable: true, notes: 'Medium carbon, responds to induction hardening.' },
  { id: 'AS-EN19',  name: 'Alloy Steel', grade: 'EN19 / 42CrMo4', category: 'Steel', density: 7.85, price: 118, lastUpdated: '2026-08-28', form: 'Bar / Forging', scrapAllowancePct: 16, machinability: 0.65, weldable: false, castable: false, forgeable: true, notes: 'Through-hardening alloy steel for loaded shafts and gears.' },
  { id: 'TS-D2',    name: 'Tool Steel', grade: 'AISI D2', category: 'Steel', density: 7.70, price: 395, lastUpdated: '2026-08-20', form: 'Block', scrapAllowancePct: 22, machinability: 0.35, weldable: false, castable: false, forgeable: true, notes: 'Die / punch applications, hardened 58-62 HRC.' },

  // ---- Stainless ---------------------------------------------------------
  { id: 'SS304', name: 'SS304', grade: 'AISI 304 / X5CrNi18-10', category: 'Stainless Steel', density: 8.00, price: 268, lastUpdated: '2026-09-02', form: 'Bar / Plate', scrapAllowancePct: 15, machinability: 0.5, weldable: true, castable: true, forgeable: true, notes: 'General corrosion resistance, food and general industry.' },
  { id: 'SS316', name: 'SS316', grade: 'AISI 316L', category: 'Stainless Steel', density: 8.00, price: 340, lastUpdated: '2026-09-02', form: 'Bar / Plate', scrapAllowancePct: 15, machinability: 0.45, weldable: true, castable: true, forgeable: true, notes: 'Molybdenum bearing, chloride / marine environments.' },
  { id: 'SS410', name: 'SS410', grade: 'AISI 410', category: 'Stainless Steel', density: 7.75, price: 232, lastUpdated: '2026-09-02', form: 'Bar', scrapAllowancePct: 15, machinability: 0.55, weldable: false, castable: true, forgeable: true, notes: 'Martensitic, hardenable stainless for valve trim.' },

  // ---- Cast --------------------------------------------------------------
  { id: 'FG260', name: 'Grey Cast Iron', grade: 'IS 210 FG260', category: 'Cast Materials', density: 7.20, price: 78, lastUpdated: '2026-08-30', form: 'Casting', scrapAllowancePct: 6, machinability: 1.15, weldable: false, castable: true, forgeable: false, notes: 'Excellent damping, housings and machine bases.' },
  { id: 'SG500', name: 'Ductile Iron', grade: 'SG Iron 500/7', category: 'Cast Materials', density: 7.10, price: 92, lastUpdated: '2026-08-30', form: 'Casting', scrapAllowancePct: 7, machinability: 1.0, weldable: false, castable: true, forgeable: false, notes: 'Nodular graphite, good strength + ductility.' },
  { id: 'SG700', name: 'SG Iron 700/2', grade: 'SG 700/2', category: 'Cast Materials', density: 7.10, price: 104, lastUpdated: '2026-08-30', form: 'Casting', scrapAllowancePct: 7, machinability: 0.85, weldable: false, castable: true, forgeable: false, notes: 'Higher strength pearlitic grade.' },
  { id: 'CS-WCB', name: 'Cast Carbon Steel', grade: 'ASTM A216 WCB', category: 'Cast Materials', density: 7.85, price: 158, lastUpdated: '2026-08-30', form: 'Casting', scrapAllowancePct: 9, machinability: 0.75, weldable: true, castable: true, forgeable: false, notes: 'Pressure-retaining cast steel components.' },

  // ---- Aluminium ---------------------------------------------------------
  { id: 'AL6061', name: 'Aluminium 6061', grade: '6061-T6', category: 'Aluminium', density: 2.70, price: 315, lastUpdated: '2026-09-05', form: 'Bar / Plate', scrapAllowancePct: 18, machinability: 1.6, weldable: true, castable: false, forgeable: true, notes: 'Structural aluminium, good all-round machinability.' },
  { id: 'AL6063', name: 'Aluminium 6063', grade: '6063-T5', category: 'Aluminium', density: 2.70, price: 295, lastUpdated: '2026-09-05', form: 'Extrusion', scrapAllowancePct: 12, machinability: 1.7, weldable: true, castable: false, forgeable: true, notes: 'Extrusion grade, architectural / heat sink profiles.' },
  { id: 'AL7075', name: 'Aluminium 7075', grade: '7075-T651', category: 'Aluminium', density: 2.81, price: 640, lastUpdated: '2026-09-05', form: 'Plate', scrapAllowancePct: 25, machinability: 1.4, weldable: false, castable: false, forgeable: true, notes: 'High strength aerospace grade, poor weldability.' },
  { id: 'A356',  name: 'A356 Aluminium', grade: 'A356-T6', category: 'Aluminium', density: 2.68, price: 282, lastUpdated: '2026-09-05', form: 'Casting', scrapAllowancePct: 8, machinability: 1.5, weldable: true, castable: true, forgeable: false, notes: 'Gravity die casting alloy, heat treatable.' },
  { id: 'ADC12', name: 'ADC12', grade: 'ADC12 / A383', category: 'Aluminium', density: 2.74, price: 258, lastUpdated: '2026-09-05', form: 'Casting', scrapAllowancePct: 6, machinability: 1.35, weldable: false, castable: true, forgeable: false, notes: 'Standard pressure die casting alloy, high volume.' },

  // ---- Copper alloys -----------------------------------------------------
  { id: 'CU-ETP', name: 'Copper', grade: 'Cu-ETP', category: 'Copper Alloys', density: 8.94, price: 895, lastUpdated: '2026-09-10', form: 'Bar', scrapAllowancePct: 14, machinability: 0.7, weldable: true, castable: true, forgeable: true, notes: 'Electrical conductivity applications.' },
  { id: 'BRASS',  name: 'Brass', grade: 'CuZn39Pb3 / IS 319', category: 'Copper Alloys', density: 8.50, price: 645, lastUpdated: '2026-09-10', form: 'Bar', scrapAllowancePct: 16, machinability: 2.2, weldable: false, castable: true, forgeable: true, notes: 'Free cutting brass, excellent for turned parts.' },
  { id: 'BRONZE', name: 'Bronze', grade: 'LTB2 / CuSn10', category: 'Copper Alloys', density: 8.80, price: 785, lastUpdated: '2026-09-10', form: 'Casting / Bar', scrapAllowancePct: 12, machinability: 1.1, weldable: false, castable: true, forgeable: false, notes: 'Bearing bushes, wear applications.' },

  // ---- Other -------------------------------------------------------------
  { id: 'ZA-ZAMAK5', name: 'Zinc Alloy', grade: 'ZAMAK 5', category: 'Other Engineering Materials', density: 6.60, price: 285, lastUpdated: '2026-09-08', form: 'Casting', scrapAllowancePct: 5, machinability: 1.5, weldable: false, castable: true, forgeable: false, notes: 'Hot chamber die casting, fine detail parts.' },
  { id: 'MG-AZ91D', name: 'Magnesium Alloy', grade: 'AZ91D', category: 'Other Engineering Materials', density: 1.81, price: 495, lastUpdated: '2026-09-08', form: 'Casting', scrapAllowancePct: 8, machinability: 2.0, weldable: false, castable: true, forgeable: false, notes: 'Lightest structural metal, special handling required.' },
  { id: 'TI-GR5',   name: 'Titanium Alloy', grade: 'Ti-6Al-4V Gr5', category: 'Other Engineering Materials', density: 4.43, price: 3150, lastUpdated: '2026-09-08', form: 'Bar', scrapAllowancePct: 30, machinability: 0.22, weldable: true, castable: true, forgeable: true, notes: 'High cost, low machinability; verify commercially.' },
  { id: 'PA66GF30', name: 'Engineering Plastic', grade: 'PA66 + 30% GF', category: 'Other Engineering Materials', density: 1.36, price: 320, lastUpdated: '2026-09-08', form: 'Granules', scrapAllowancePct: 4, machinability: 2.5, weldable: false, castable: false, forgeable: false, moulded: true, notes: 'Injection moulding, requires tool investment.' },
]

export const materialById = (id) => MATERIAL_MASTER.find((m) => m.id === id)

// Text fragments that may appear on a drawing's material callout -> master id
export const MATERIAL_CALLOUT_MAP = {
  'IS 2062': 'MS-IS2062', 'EN8': 'CS-EN8', 'C45': 'CS-EN8', 'EN19': 'AS-EN19',
  '42CRMO4': 'AS-EN19', 'D2': 'TS-D2', 'SS304': 'SS304', 'AISI 304': 'SS304',
  '316': 'SS316', '410': 'SS410', 'FG260': 'FG260', 'FG 260': 'FG260',
  'SG IRON': 'SG500', 'SG 500': 'SG500', 'GGG50': 'SG500', 'WCB': 'CS-WCB',
  '6061': 'AL6061', '6063': 'AL6063', '7075': 'AL7075', 'A356': 'A356',
  'ADC12': 'ADC12', 'BRASS': 'BRASS', 'BRONZE': 'BRONZE', 'ZAMAK': 'ZA-ZAMAK5',
  'AZ91': 'MG-AZ91D', 'TI-6AL-4V': 'TI-GR5', 'PA66': 'PA66GF30',
}
