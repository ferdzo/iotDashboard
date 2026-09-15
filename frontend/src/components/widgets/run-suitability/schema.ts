import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'run-suitability',
    label: 'Run Suitability',
    blurb: 'Go / No Go',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  addNeedsDevice: true,
  editNeedsDevice: false,
  needsMetrics: false,
  maxMetrics: 5,
  skipsDataSource: false,
  addVizCity: true,
  addForceHeight2: true,
  titleKind: 'run-suitability',
  step2Fields: [{ kind: 'wellness-city' }, { kind: 'device-radio' }],
  step3Fields: [{ kind: 'title' }, { kind: 'timeframe' }, { kind: 'size' }, { kind: 'summary' }],
  editFields: [{ kind: 'title' }, { kind: 'timeframe' }, { kind: 'size' }],
  addTitlePlaceholder: () => 'Auto-generated if empty',
}

export default schema
