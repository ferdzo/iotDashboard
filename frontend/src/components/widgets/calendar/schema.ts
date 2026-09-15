import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'calendar',
    label: 'Calendar',
    blurb: 'Agenda (iCal)',
    iconPath: 'M8 7V3m8 4V3m-9 8h10m-12 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  addNeedsDevice: false,
  editNeedsDevice: false,
  needsMetrics: false,
  maxMetrics: 5,
  skipsDataSource: true,
  addVizCity: false,
  addForceHeight2: false,
  titleKind: 'calendar',
  step2Fields: [],
  step3Fields: [
    { kind: 'calendar-url' },
    { kind: 'calendar-range' },
    { kind: 'title' },
    { kind: 'size' },
    { kind: 'summary' },
  ],
  editFields: [{ kind: 'title' }, { kind: 'calendar-url' }, { kind: 'calendar-range' }, { kind: 'size' }],
  addTitlePlaceholder: () => 'Calendar Agenda',
}

export default schema
