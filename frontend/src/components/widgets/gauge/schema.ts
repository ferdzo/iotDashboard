import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'gauge',
    label: 'Gauge',
    blurb: 'Circular meter',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  addNeedsDevice: true,
  editNeedsDevice: true,
  needsMetrics: true,
  maxMetrics: 1,
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
