import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'health-stats',
    label: 'Health Stats',
    blurb: 'Steps & HR',
    iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  },
  addNeedsDevice: true,
  editNeedsDevice: false,
  needsMetrics: false,
  maxMetrics: 5,
  skipsDataSource: false,
  addVizCity: true,
  addForceHeight2: true,
  titleKind: 'health-stats',
  step2Fields: [{ kind: 'wellness-city' }, { kind: 'device-radio' }],
  step3Fields: [{ kind: 'title' }, { kind: 'timeframe' }, { kind: 'size' }, { kind: 'summary' }],
  editFields: [{ kind: 'title' }, { kind: 'timeframe' }, { kind: 'size' }],
  addTitlePlaceholder: () => 'Auto-generated if empty',
}

export default schema
