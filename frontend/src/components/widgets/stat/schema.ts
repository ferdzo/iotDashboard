import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'stat',
    label: 'Stat Card',
    blurb: 'Min/Max/Avg',
    iconPath: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
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
