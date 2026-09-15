import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'comfort-index',
    label: 'Comfort Index',
    blurb: 'Multi-factor',
    iconPath: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  addNeedsDevice: true,
  editNeedsDevice: true,
  needsMetrics: true,
  maxMetrics: 5,
  skipsDataSource: false,
  addVizCity: false,
  addForceHeight2: false,
  titleKind: 'sensor',
  step2Fields: [{ kind: 'device-radio' }, { kind: 'metrics' }],
  step3Fields: [{ kind: 'title' }, { kind: 'timeframe' }, { kind: 'size' }, { kind: 'summary' }],
  editFields: [
    { kind: 'device-select' },
    { kind: 'title' },
    { kind: 'metrics' },
    { kind: 'timeframe' },
    { kind: 'size' },
  ],
  addTitlePlaceholder: () => 'Auto-generated if empty',
}

export default schema
