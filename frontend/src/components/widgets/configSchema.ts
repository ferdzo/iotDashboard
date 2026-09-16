/**
 * Shared core for the generic widget config form (phase-2 todo 14).
 *
 * Each widget type declares a small declarative `WidgetTypeSchema` in its own
 * co-located `widgets/<name>/schema.ts` file. This module holds the shared
 * form-value shape, field descriptors, and the builders/validators that turn
 * form values into `WidgetConfig` JSON.
 *
 * The builders reproduce the legacy AddWidgetModal/EditWidgetModal logic
 * exactly (including quirks such as the forced height-2 for wellness/briefing
 * widgets on add and the device/metric wipe for wellness widgets on edit),
 * so add/edit flows produce byte-identical configs. Key order of the emitted
 * objects matches the legacy object literals for the same reason.
 */
import type { WidgetConfig, WidgetType } from '../../hooks/dashboardConfigSchema'
import { createDefaultWidgetTitle } from '../../utils/formatters'

export type BriefingType = 'schedule' | 'environment' | 'full'

/** Single form-value shape shared by add + edit flows. */
export interface WidgetFormValues {
  title: string
  /** Single-selection device list (mirrors the legacy `selectedDevices` array). */
  deviceIds: string[]
  metricIds: string[]
  timeframeHours: number
  city: string
  calendarUrl: string
  calendarRangeHours: number
  briefingType: BriefingType
  width: number
  height: number
}

/** Clamp a form width/height onto the real grid (guards stale saved values). */
export function clampSpan(value: number, max: number, min = 2): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export const DEFAULT_ADD_VALUES: WidgetFormValues = {
  title: '',
  deviceIds: [],
  metricIds: [],
  timeframeHours: 24,
  city: 'Skopje',
  calendarUrl: '',
  calendarRangeHours: 72,
  briefingType: 'full',
  width: 4,
  height: 4,
}

/** Context needed only for id generation + device-name lookup on add. */
export interface BuildContext {
  id: string
  deviceName?: string
}

export type Step2FieldKind = 'wellness-city' | 'device-radio' | 'metrics'

export type Step3FieldKind =
  | 'city'
  | 'title'
  | 'timeframe'
  | 'calendar-url'
  | 'calendar-range'
  | 'briefing-type'
  | 'health-device'
  | 'size'
  | 'summary'

export type EditFieldKind =
  | 'device-select'
  | 'title'
  | 'metrics'
  | 'timeframe'
  | 'calendar-url'
  | 'calendar-range'
  | 'briefing-type'
  | 'city'
  | 'health-device'
  | 'size'

export interface ConditionalField<K extends string> {
  kind: K
  /** Hide the field unless this returns true (evaluated against live values). */
  when?: (values: WidgetFormValues) => boolean
}

export type Step2Field = ConditionalField<Step2FieldKind>
export type Step3Field = ConditionalField<Step3FieldKind>
export type EditField = ConditionalField<EditFieldKind>

/** Show calendar-range / health-device only for schedule+full briefings. */
export const whenBriefingHasSchedule = (values: WidgetFormValues): boolean =>
  values.briefingType === 'schedule' || values.briefingType === 'full'

/** Daily-briefing calendar range only matters once a URL is entered. */
export const whenCalendarUrlPresent = (values: WidgetFormValues): boolean =>
  values.calendarUrl.trim().length > 0

export type TitleKind =
  | 'weather'
  | 'air-quality'
  | 'run-suitability'
  | 'health-stats'
  | 'calendar'
  | 'briefing'
  | 'sensor'

export interface WidgetTypeSchema {
  meta: {
    type: WidgetType
    label: string
    blurb: string
    /** Verbatim SVG path `d` from the legacy AddWidgetModal type picker. */
    iconPath: string
  }
  /** Legacy add-flow `needsDevice` (weather/air-quality/calendar/briefing excluded). */
  addNeedsDevice: boolean
  /** Legacy edit-flow `needsDevice` (wellness types additionally excluded). */
  editNeedsDevice: boolean
  needsMetrics: boolean
  maxMetrics: number
  /** Legacy add flow skipped step 2 for these types. */
  skipsDataSource: boolean
  /** Legacy add wrote visualization.city for these types. */
  addVizCity: boolean
  /** Legacy add forced position.h = 2 for these types. */
  addForceHeight2: boolean
  titleKind: TitleKind
  step2Fields: Step2Field[]
  step3Fields: Step3Field[]
  editFields: EditField[]
  /** Hint under the step-3 city input (weather / air-quality only). */
  cityHint?: string
  /** Add-flow title placeholder; may depend on live values. */
  addTitlePlaceholder: (values: WidgetFormValues) => string
}

export function defaultTitleFor(schema: WidgetTypeSchema, values: WidgetFormValues, deviceName?: string): string {
  switch (schema.titleKind) {
    case 'weather':
      return `Weather - ${values.city}`
    case 'air-quality':
      return `Air Quality - ${values.city}`
    case 'run-suitability':
      return `Run Suitability - ${values.city}`
    case 'health-stats':
      return `Health Stats - ${deviceName || 'Device'}`
    case 'calendar':
      return 'Calendar Agenda'
    case 'briefing': {
      const labels: Record<BriefingType, string> = { schedule: 'Schedule', environment: 'Environment', full: 'Full' }
      return `${labels[values.briefingType]} Briefing`
    }
    case 'sensor':
      return createDefaultWidgetTitle(schema.meta.type, deviceName, values.metricIds)
  }
}

/**
 * Legacy AddWidgetModal.handleSubmit, flag-driven. Key order (id, type, title,
 * deviceIds, metricIds, timeframe, visualization, calendar, briefing, position)
 * matches the legacy literal so JSON output is byte-identical.
 */
export function buildAddFromSchema(
  schema: WidgetTypeSchema,
  values: WidgetFormValues,
  ctx: BuildContext,
): WidgetConfig {
  const isBriefing = schema.titleKind === 'briefing'
  const isCalendar = schema.titleKind === 'calendar'
  return {
    id: ctx.id,
    type: schema.meta.type,
    title: values.title || defaultTitleFor(schema, values, ctx.deviceName),
    deviceIds: schema.addNeedsDevice ? values.deviceIds : [],
    metricIds: schema.needsMetrics ? values.metricIds : [],
    timeframe: {
      hours: values.timeframeHours,
    },
    visualization: {
      showLegend: true,
      showGrid: true,
      height: schema.meta.type === 'line-chart' ? 300 : undefined,
      city: schema.addVizCity ? values.city : undefined,
    },
    calendar: isCalendar
      ? {
        icalUrl: values.calendarUrl.trim(),
        timeRangeHours: values.calendarRangeHours,
      }
      : undefined,
    briefing: isBriefing
      ? {
        briefingType: values.briefingType,
        city: values.city,
        healthDeviceId: values.deviceIds[0],
        calendarUrl: values.calendarUrl.trim() || undefined,
        calendarRangeHours: values.calendarRangeHours,
      }
      : undefined,
    position: {
      x: 0,
      y: 0,
      w: values.width,
      h: schema.addForceHeight2 ? 2 : values.height,
    },
  }
}

/**
 * Legacy EditWidgetModal.handleSubmit branches (calendar / daily-briefing /
 * generic), flag-driven. Key order matches the legacy literals.
 */
export function buildEditFromSchema(
  schema: WidgetTypeSchema,
  widget: WidgetConfig,
  values: WidgetFormValues,
): Partial<WidgetConfig> {
  const position = {
    ...widget.position,
    x: widget.position?.x || 0,
    y: widget.position?.y || 0,
    w: values.width,
    h: values.height,
  }
  if (schema.titleKind === 'calendar') {
    return {
      title: values.title,
      calendar: {
        icalUrl: values.calendarUrl.trim(),
        timeRangeHours: values.calendarRangeHours,
      },
      position,
    }
  }
  if (schema.titleKind === 'briefing') {
    return {
      title: values.title,
      visualization: {
        ...widget.visualization,
        city: values.city,
      },
      briefing: {
        briefingType: values.briefingType,
        city: values.city,
        healthDeviceId: values.deviceIds[0] || undefined,
        calendarUrl: values.calendarUrl.trim() || undefined,
        calendarRangeHours: values.calendarRangeHours,
      },
      position,
    }
  }
  return {
    title: values.title,
    deviceIds: schema.editNeedsDevice ? [values.deviceIds[0]] : [],
    metricIds: schema.needsMetrics ? values.metricIds : [],
    timeframe: {
      hours: values.timeframeHours,
    },
    position,
  }
}

/** Legacy add-flow alert order, returned as a message instead of alert(). */
export function validateAddFromSchema(schema: WidgetTypeSchema, values: WidgetFormValues): string | null {
  if (schema.addNeedsDevice && values.deviceIds.length === 0) return 'Please select a device'
  if (schema.needsMetrics && values.metricIds.length === 0) return 'Please select at least one metric'
  if ((schema.meta.type === 'run-suitability' || schema.meta.type === 'health-stats') && !values.city) {
    return 'Please enter a city for wellness widgets'
  }
  if (schema.titleKind === 'calendar' && !values.calendarUrl.trim()) return 'Please provide an iCal URL'
  if (schema.titleKind === 'briefing' && !values.city) return 'Please enter a city for daily briefing'
  return null
}

/** Legacy edit-flow alert order, returned as a message instead of alert(). */
export function validateEditFromSchema(schema: WidgetTypeSchema, values: WidgetFormValues): string | null {
  if (schema.titleKind === 'calendar') {
    if (!values.calendarUrl.trim()) return 'Please provide an iCal URL'
    return null
  }
  if (schema.titleKind === 'briefing') {
    if (!values.city.trim()) return 'Please enter a city'
    return null
  }
  if (schema.editNeedsDevice && !values.deviceIds[0]) return 'Please select a device'
  if (schema.needsMetrics && values.metricIds.length === 0) return 'Please select at least one metric'
  return null
}

/** Legacy EditWidgetModal initial-value mapping, verbatim. */
export function editInitialValues(widget: WidgetConfig): WidgetFormValues {
  // Legacy: selectedDeviceId = deviceIds[0] || briefing.healthDeviceId || ''.
  // Represented as a 0/1-length array to match the add-flow shape.
  const initialDeviceId = widget.deviceIds[0] || widget.briefing?.healthDeviceId || ''
  return {
    title: widget.title || '',
    deviceIds: initialDeviceId ? [initialDeviceId] : [],
    metricIds: widget.metricIds || [],
    timeframeHours: widget.timeframe?.hours || 24,
    width: widget.position?.w || 4,
    height: widget.position?.h || 4,
    calendarUrl: widget.calendar?.icalUrl || widget.briefing?.calendarUrl || '',
    calendarRangeHours: widget.calendar?.timeRangeHours || widget.briefing?.calendarRangeHours || 72,
    briefingType: (widget.briefing?.briefingType as BriefingType) || 'full',
    city: widget.visualization?.city || widget.briefing?.city || 'Skopje',
  }
}
