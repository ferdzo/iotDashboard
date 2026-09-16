import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'air-quality',
    label: 'Air Quality',
    blurb: 'Pulse.eco',
    iconPath: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
  },
  addNeedsDevice: false,
  editNeedsDevice: false,
  needsMetrics: false,
  maxMetrics: 5,
  skipsDataSource: true,
  addVizCity: true,
  addForceHeight2: false,
  titleKind: 'air-quality',
  step2Fields: [],
  step3Fields: [{ kind: 'city' }, { kind: 'title' }, { kind: 'size' }, { kind: 'summary' }],
  editFields: [{ kind: 'title' }, { kind: 'timeframe' }, { kind: 'size' }],
  cityHint: 'Available cities: Skopje, Bitola, Veles, Tetovo, etc.',
  addTitlePlaceholder: (values) => `Air Quality - ${values.city}`,
}

export default schema
