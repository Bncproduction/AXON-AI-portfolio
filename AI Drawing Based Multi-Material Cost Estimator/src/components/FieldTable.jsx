import React from 'react'
import { useStore } from '../state/store.jsx'
import { SourceTag, ConfTag } from './ui.jsx'
import { isAvailable } from '../lib/sources.js'

/**
 * Editable, provenance-tagged view over one group of extracted fields.
 * Editing any value re-tags the row as User Input — the audit trail is never lost.
 */
export default function FieldTable({ group, labels, suffixes = {} }) {
  const { analysis, dispatch } = useStore()
  const data = analysis?.[group] || {}

  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: '22%' }}>Parameter</th>
            <th style={{ width: '32%' }}>Extracted Value</th>
            <th style={{ width: '13%' }}>Source</th>
            <th style={{ width: '9%' }}>Confidence</th>
            <th>Basis / Note</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(labels).map(([key, label]) => {
            const fld = data[key]
            const available = isAvailable(fld)
            return (
              <tr key={key}>
                <td><b>{label}</b></td>
                <td>
                  <div className="flex" style={{ gap: 6, flexWrap: 'nowrap' }}>
                    <input
                      className="inp sm"
                      value={available ? fld.value : ''}
                      placeholder="Not Available in Drawing — enter to override"
                      onChange={(e) => dispatch({ type: 'UPDATE_FIELD', group, key, value: e.target.value })}
                    />
                    {suffixes[key] && <span className="muted small nowrap">{suffixes[key]}</span>}
                  </div>
                </td>
                <td><SourceTag source={fld?.source} /></td>
                <td><ConfTag level={fld?.confidence} /></td>
                <td className="small muted">{fld?.note || (available ? '' : 'Value not present on the drawing. Nothing has been assumed.')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export const DIM_LABELS = {
  length: 'Overall Length', width: 'Overall Width', height: 'Overall Height',
  diameter: 'Diameter', thickness: 'Thickness', wallThickness: 'Wall Thickness',
  holeDiameter: 'Hole Diameter', holeQuantity: 'Hole Quantity',
  threadDetails: 'Thread Details', radius: 'Radius', chamfer: 'Chamfer',
}
export const DIM_SUFFIX = {
  length: 'mm', width: 'mm', height: 'mm', diameter: 'mm', thickness: 'mm',
  wallThickness: 'mm', holeDiameter: 'mm', holeQuantity: 'nos',
}
export const PART_LABELS = {
  partName: 'Part Name', partNumber: 'Part Number', drawingNumber: 'Drawing Number',
  revision: 'Revision', componentType: 'Component Type',
}
export const QUALITY_LABELS = {
  tolerances: 'Dimensional Tolerances', gdt: 'GD&T', datums: 'Datum References',
  surfaceFinish: 'Surface Finish', criticalCharacteristics: 'Critical Characteristics',
  specialNotes: 'Special Notes',
}
export const MATERIAL_LABELS = {
  specification: 'Material Specification', grade: 'Material Grade', heatTreatment: 'Heat Treatment',
  coating: 'Coating', plating: 'Plating', surfaceTreatment: 'Surface Treatment',
}
export const MFG_LABELS = {
  casting: 'Casting Requirement', forging: 'Forging Requirement', machining: 'Machining Requirement',
  sheetMetal: 'Sheet Metal Requirement', welding: 'Welding Requirement', specialProcess: 'Special Process Requirement',
}
