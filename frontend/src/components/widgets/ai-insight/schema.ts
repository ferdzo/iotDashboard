import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'ai-insight',
    label: 'AI Insight',
    blurb: 'GPT analysis',
    iconPath: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
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
