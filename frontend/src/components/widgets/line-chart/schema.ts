import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'line-chart',
    label: 'Line Chart',
    blurb: 'Time series',
    iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
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
