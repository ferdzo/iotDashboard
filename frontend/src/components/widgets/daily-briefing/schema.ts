import { whenBriefingHasSchedule, whenCalendarUrlPresent } from '../configSchema'
import type { WidgetTypeSchema } from '../configSchema'

const schema: WidgetTypeSchema = {
  meta: {
    type: 'daily-briefing',
    label: 'Daily Briefing',
    blurb: 'AI Summary',
    iconPath: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  },
  addNeedsDevice: false,
  editNeedsDevice: false,
  needsMetrics: false,
  maxMetrics: 5,
  skipsDataSource: true,
  addVizCity: true,
  addForceHeight2: true,
  titleKind: 'briefing',
  step2Fields: [],
  step3Fields: [
    { kind: 'briefing-type' },
    { kind: 'city' },
    { kind: 'calendar-url' },
    { kind: 'calendar-range', when: whenCalendarUrlPresent },
    { kind: 'health-device', when: whenBriefingHasSchedule },
    { kind: 'title' },
    { kind: 'size' },
    { kind: 'summary' },
  ],
  editFields: [
    { kind: 'title' },
    { kind: 'briefing-type' },
    { kind: 'city' },
    { kind: 'calendar-url' },
    { kind: 'calendar-range', when: whenCalendarUrlPresent },
    { kind: 'health-device', when: whenBriefingHasSchedule },
    { kind: 'size' },
  ],
  addTitlePlaceholder: (values) =>
    `${values.briefingType.charAt(0).toUpperCase() + values.briefingType.slice(1)} Briefing`,
}

export default schema
