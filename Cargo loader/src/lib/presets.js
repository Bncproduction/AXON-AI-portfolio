// Dimensions in metres, weight in kilograms. Common shipping equipment.
export const CONTAINER_PRESETS = [
  { id: '20dv', label: "20' Standard", w: 5.9, h: 2.39, d: 2.35, maxWeight: 28200 },
  { id: '40dv', label: "40' Standard", w: 12.03, h: 2.39, d: 2.35, maxWeight: 26700 },
  { id: '40hc', label: "40' High Cube", w: 12.03, h: 2.69, d: 2.35, maxWeight: 26500 },
  { id: '45hc', label: "45' High Cube", w: 13.56, h: 2.69, d: 2.35, maxWeight: 27600 },
  { id: 'truck', label: 'Euro Truck (13.6m)', w: 13.6, h: 2.7, d: 2.45, maxWeight: 24000 },
  { id: 'van', label: 'Box Van', w: 4.3, h: 2.1, d: 2.1, maxWeight: 4500 },
]

export const ITEM_COLORS = [
  '#38bdf8', '#22d3ee', '#34d399', '#fbbf24',
  '#f87171', '#a78bfa', '#f472b6', '#facc15',
]

export const STARTER_ITEMS = [
  { id: 'i1', name: 'Euro Pallet Box', w: 1.2, h: 1.0, d: 0.8, weight: 320, qty: 12, color: '#38bdf8', stackable: true },
  { id: 'i2', name: 'Half Pallet', w: 0.8, h: 0.9, d: 0.6, weight: 140, qty: 10, color: '#34d399', stackable: true },
  { id: 'i3', name: 'Drum', w: 0.6, h: 0.9, d: 0.6, weight: 210, qty: 8, color: '#fbbf24', stackable: false },
  { id: 'i4', name: 'Large Crate', w: 1.6, h: 1.3, d: 1.1, weight: 540, qty: 4, color: '#f87171', stackable: true },
]
