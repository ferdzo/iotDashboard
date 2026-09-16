/**
 * Generic widget config form (phase-2 todo 14).
 *
 * Single renderer driven by the co-located per-widget schemas in
 * `widgets/<name>/schema.ts` (aggregated in `./widgets/widgetSchemas`).
 * Replaces the ~1300 LOC of AddWidgetModal + EditWidgetModal, which are now
 * thin wrappers around this component. Widget runtime props are untouched and
 * the emitted WidgetConfig JSON is byte-identical to the legacy flows.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { devicesApi } from '../api'
import type { Device } from '../types/api'
import type { WidgetConfig, WidgetType } from '../hooks'
import {
  DEFAULT_ADD_VALUES,
  buildAddFromSchema,
  buildEditFromSchema,
  editInitialValues,
  validateAddFromSchema,
  validateEditFromSchema,
} from './widgets/configSchema'
import type {
  BriefingType,
  EditField,
  Step2Field,
  Step3Field,
  WidgetFormValues,
  WidgetTypeSchema,
} from './widgets/configSchema'
import { getWidgetSchema, widgetSchemaList } from './widgets/widgetSchemas'
import { defaultSpanFor } from '../hooks/dashboardConfigSchema'

export interface AddFormProps {
  mode: 'add'
  onAdd: (widget: WidgetConfig) => void
  onClose: () => void
}

export interface EditFormProps {
  mode: 'edit'
  widget: WidgetConfig
  onSave: (widgetId: string, updates: Partial<WidgetConfig>) => void
  onClose: () => void
}

export type WidgetConfigFormProps = AddFormProps | EditFormProps

const TIMEFRAME_OPTIONS = [
  { value: 1, label: 'Last 1 hour' },
  { value: 6, label: 'Last 6 hours' },
  { value: 24, label: 'Last 24 hours' },
  { value: 168, label: 'Last 7 days' },
  { value: 720, label: 'Last 30 days' },
]

const CALENDAR_RANGE_OPTIONS = [
  { value: 24, label: 'Next 24 hours' },
  { value: 72, label: 'Next 3 days' },
  { value: 168, label: 'Next 7 days' },
]

// Widths are spans of the 12-column responsive grid.
const WIDTH_OPTIONS = [
  { value: 3, label: 'Quarter' },
  { value: 4, label: 'Third' },
  { value: 6, label: 'Half' },
  { value: 12, label: 'Full width' },
]

const HEIGHT_OPTIONS = [
  { value: 2, label: 'Short' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'Tall' },
  { value: 6, label: 'Extra tall' },
]

function toggleMetricInList(list: string[], metric: string, maxMetrics: number): string[] {
  if (list.includes(metric)) return list.filter((m) => m !== metric)
  if (list.length >= maxMetrics) {
    if (maxMetrics === 1) return [metric]
    return list
  }
  return [...list, metric]
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function useDevices() {
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await devicesApi.getAll()
      return response.data
    },
  })
  const devices: Device[] = devicesData?.results || []
  return devices
}

function useDeviceMetrics(deviceId: string) {
  const { data: deviceMetricsData } = useQuery({
    queryKey: ['device-metrics', deviceId || undefined],
    queryFn: async () => {
      if (!deviceId) return []
      const response = await devicesApi.getMetrics(deviceId)
      return response.data.metrics
    },
    enabled: deviceId.length > 0,
  })
  return deviceMetricsData || []
}

function TypeIcon({ path }: { path: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  )
}

function InfoAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert alert-info mb-2">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span className="text-sm">{children}</span>
    </div>
  )
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="alert alert-error" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span className="text-sm">{message}</span>
    </div>
  )
}

interface FieldContext {
  values: WidgetFormValues
  setValues: React.Dispatch<React.SetStateAction<WidgetFormValues>>
  schema: WidgetTypeSchema
  devices: Device[]
  availableMetrics: string[]
  isEdit: boolean
  originalWidget?: WidgetConfig
}

function DeviceRadioField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues, devices } = ctx
  const selectDevice = (deviceId: string) => {
    setValues((v) => ({
      ...v,
      deviceIds: [deviceId],
      metricIds: v.deviceIds[0] === deviceId ? v.metricIds : [],
    }))
  }
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">Select Device</span>
        <span className="label-text-alt">{values.deviceIds.length} selected</span>
      </label>
      <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
        {devices.length === 0 ? (
          <div className="text-center text-base-content/60 py-4">No devices found</div>
        ) : (
          devices.map((device) => (
            <label key={device.id} className="flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer">
              <input
                type="radio"
                name="device"
                className="radio radio-sm"
                checked={values.deviceIds.includes(device.id)}
                onChange={() => selectDevice(device.id)}
              />
              <div className="flex-1">
                <div className="font-medium">{device.name}</div>
                <div className="text-xs text-base-content/60">{device.location || 'No location'}</div>
              </div>
              <div className="badge badge-sm">{device.protocol}</div>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

function DeviceSelectField({ ctx, required }: { ctx: FieldContext; required: boolean }) {
  const { values, setValues, devices, originalWidget } = ctx
  const handleChange = (deviceId: string) => {
    setValues((v) => ({
      ...v,
      deviceIds: deviceId ? [deviceId] : [],
      // Legacy edit quirk: metrics reset only when the device differs from the saved one.
      metricIds:
        required && deviceId && originalWidget && deviceId !== originalWidget.deviceIds[0]
          ? []
          : v.metricIds,
    }))
  }
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">{required ? 'Device' : 'Health Device (Optional)'}</span>
      </label>
      <select
        className="select select-bordered"
        value={values.deviceIds[0] || ''}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="">{required ? 'Select a device' : 'No health device'}</option>
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.name} ({device.location || 'No location'})
          </option>
        ))}
      </select>
      {!required && (
        <label className="label">
          <span className="label-text-alt">Optional: Include step count and activity data</span>
        </label>
      )}
    </div>
  )
}

function MetricsField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues, schema, availableMetrics } = ctx
  const single = schema.maxMetrics === 1
  const toggleMetric = (metric: string) => {
    setValues((v) => ({ ...v, metricIds: toggleMetricInList(v.metricIds, metric, schema.maxMetrics) }))
  }
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">Select Metric(s)</span>
        <span className="label-text-alt">{values.metricIds.length} selected</span>
      </label>
      {values.deviceIds.length === 0 ? (
        <div className="border rounded-lg p-4 text-center text-base-content/60">
          Please select a device first
        </div>
      ) : (
        <>
          {single && <InfoAlert>This widget type supports only one metric</InfoAlert>}
          <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
            {availableMetrics.length === 0 ? (
              <div className="text-center text-base-content/60 py-4">
                {ctx.isEdit ? 'Loading metrics...' : 'No metrics found for this device'}
              </div>
            ) : (
              availableMetrics.map((metric) => (
                <label key={metric} className="flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer">
                  <input
                    type={single ? 'radio' : 'checkbox'}
                    name={single ? 'single-metric' : undefined}
                    className={single ? 'radio radio-sm' : 'checkbox checkbox-sm'}
                    checked={values.metricIds.includes(metric)}
                    onChange={() => toggleMetric(metric)}
                  />
                  <span className="capitalize">{metric.replace(/_/g, ' ')}</span>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function WellnessCityField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues } = ctx
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">City (for weather/air quality)</span>
      </label>
      <input
        type="text"
        className="input input-bordered"
        placeholder="Enter city name (e.g., Skopje)"
        value={values.city}
        onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
      />
      <label className="label">
        <span className="label-text-alt">Used for weather and air quality context</span>
      </label>
    </div>
  )
}

function CityField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues, schema } = ctx
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">City</span>
      </label>
      <input
        type="text"
        className="input input-bordered"
        placeholder="Enter city name (e.g., Skopje)"
        value={values.city}
        onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
      />
      {schema.cityHint && (
        <label className="label">
          <span className="label-text-alt">{schema.cityHint}</span>
        </label>
      )}
    </div>
  )
}

function BriefingCityField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues } = ctx
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">City (for weather/air quality)</span>
      </label>
      <input
        type="text"
        className="input input-bordered"
        placeholder="Enter city name (e.g., Skopje)"
        value={values.city}
        onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
      />
    </div>
  )
}

function TitleField({ ctx, placeholder }: { ctx: FieldContext; placeholder: string }) {
  const { values, setValues, isEdit } = ctx
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">{isEdit ? 'Widget Title' : 'Widget Title (Optional)'}</span>
      </label>
      <input
        type="text"
        className="input input-bordered"
        placeholder={placeholder}
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
      />
    </div>
  )
}

function TimeframeField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues } = ctx
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">Time Range</span>
      </label>
      <select
        className="select select-bordered"
        value={values.timeframeHours}
        onChange={(e) => setValues((v) => ({ ...v, timeframeHours: Number(e.target.value) }))}
      >
        {TIMEFRAME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function CalendarUrlField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues, schema } = ctx
  const [showUrl, setShowUrl] = useState(false)
  const isCalendar = schema.titleKind === 'calendar'
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">{isCalendar ? 'iCal URL' : 'Calendar URL (Optional)'}</span>
      </label>
      <div className="flex gap-2">
        <input
          type={showUrl ? 'text' : 'password'}
          className="input input-bordered flex-1"
          placeholder="https://calendar.google.com/calendar/ical/..."
          value={values.calendarUrl}
          onChange={(e) => setValues((v) => ({ ...v, calendarUrl: e.target.value }))}
        />
        <button type="button" className="btn btn-outline" onClick={() => setShowUrl((p) => !p)}>
          {showUrl ? 'Hide' : 'Show'}
        </button>
      </div>
      <label className="label">
        <span className="label-text-alt">
          {isCalendar ? 'Link is saved with the widget configuration' : 'Optional: Include calendar events in your briefing'}
        </span>
      </label>
    </div>
  )
}

function CalendarRangeField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues } = ctx
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">{ctx.schema.titleKind === 'calendar' ? 'Agenda Range' : 'Calendar Range'}</span>
      </label>
      <select
        className="select select-bordered"
        value={values.calendarRangeHours}
        onChange={(e) => setValues((v) => ({ ...v, calendarRangeHours: Number(e.target.value) }))}
      >
        {CALENDAR_RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function BriefingTypeField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues } = ctx
  const options: { value: BriefingType; label: string; hint: string }[] = [
    { value: 'schedule', label: '📅 Schedule', hint: 'Focus on your calendar and daily activity' },
    { value: 'environment', label: '🌡️ Environment', hint: 'Focus on indoor/outdoor conditions for productivity' },
    { value: 'full', label: '✨ Full', hint: 'Complete briefing with all insights combined' },
  ]
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">Briefing Type</span>
      </label>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`btn flex-1 ${values.briefingType === o.value ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setValues((v) => ({ ...v, briefingType: o.value }))}
          >
            {o.label}
          </button>
        ))}
      </div>
      <label className="label">
        <span className="label-text-alt">{options.find((o) => o.value === values.briefingType)?.hint}</span>
      </label>
    </div>
  )
}

function SizeField({ ctx }: { ctx: FieldContext }) {
  const { values, setValues } = ctx
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="form-control">
        <label className="label py-1">
          <span className="label-text text-[13px]">Width</span>
        </label>
        <select
          className="select select-bordered select-sm"
          value={values.width}
          onChange={(e) => setValues((v) => ({ ...v, width: Number(e.target.value) }))}
        >
          {WIDTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="form-control">
        <label className="label py-1">
          <span className="label-text text-[13px]">Height</span>
        </label>
        <select
          className="select select-bordered select-sm"
          value={values.height}
          onChange={(e) => setValues((v) => ({ ...v, height: Number(e.target.value) }))}
        >
          {HEIGHT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function SummaryBox({ ctx }: { ctx: FieldContext }) {
  const { values, schema, devices } = ctx
  const deviceName = devices.find((d) => d.id === values.deviceIds[0])?.name
  return (
    <div className="alert">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div className="text-sm">
        <div className="font-semibold">Widget Summary</div>
        <div>Type: <span className="badge badge-sm">{schema.meta.type}</span></div>
        <div>Device: {schema.addNeedsDevice ? (deviceName || 'Not selected') : 'Not required'}</div>
        <div>Metrics: {schema.needsMetrics ? (values.metricIds.join(', ') || 'Not selected') : 'Not required'}</div>
        <div>Size: {values.width} × {values.height}</div>
        {schema.titleKind === 'calendar' && <div>Range: Next {values.calendarRangeHours}h</div>}
        {schema.titleKind === 'briefing' && <div>Briefing: {capitalize(values.briefingType)}</div>}
      </div>
    </div>
  )
}

function renderStep2Field(kind: Step2Field, ctx: FieldContext, key: string) {
  switch (kind.kind) {
    case 'wellness-city':
      return <WellnessCityField key={key} ctx={ctx} />
    case 'device-radio':
      return <DeviceRadioField key={key} ctx={ctx} />
    case 'metrics':
      return <MetricsField key={key} ctx={ctx} />
  }
}

function renderStep3Field(kind: Step3Field, ctx: FieldContext, key: string) {
  if (kind.when && !kind.when(ctx.values)) return null
  switch (kind.kind) {
    case 'city':
      return ctx.schema.titleKind === 'briefing'
        ? <BriefingCityField key={key} ctx={ctx} />
        : <CityField key={key} ctx={ctx} />
    case 'title':
      return <TitleField key={key} ctx={ctx} placeholder={ctx.schema.addTitlePlaceholder(ctx.values)} />
    case 'timeframe':
      return <TimeframeField key={key} ctx={ctx} />
    case 'calendar-url':
      return <CalendarUrlField key={key} ctx={ctx} />
    case 'calendar-range':
      return <CalendarRangeField key={key} ctx={ctx} />
    case 'briefing-type':
      return <BriefingTypeField key={key} ctx={ctx} />
    case 'health-device':
      return ctx.devices.length > 0 ? <DeviceSelectField key={key} ctx={ctx} required={false} /> : null
    case 'size':
      return <SizeField key={key} ctx={ctx} />
    case 'summary':
      return <SummaryBox key={key} ctx={ctx} />
  }
}

function renderEditField(kind: EditField, ctx: FieldContext, key: string) {
  if (kind.when && !kind.when(ctx.values)) return null
  switch (kind.kind) {
    case 'device-select':
      return <DeviceSelectField key={key} ctx={ctx} required />
    case 'title':
      return <TitleField key={key} ctx={ctx} placeholder="Auto-generated if empty" />
    case 'metrics':
      return <MetricsField key={key} ctx={ctx} />
    case 'timeframe':
      return <TimeframeField key={key} ctx={ctx} />
    case 'calendar-url':
      return <CalendarUrlField key={key} ctx={ctx} />
    case 'calendar-range':
      return <CalendarRangeField key={key} ctx={ctx} />
    case 'briefing-type':
      return <BriefingTypeField key={key} ctx={ctx} />
    case 'city':
      return <CityField key={key} ctx={ctx} />
    case 'health-device':
      return ctx.devices.length > 0 ? <DeviceSelectField key={key} ctx={ctx} required={false} /> : null
    case 'size':
      return <SizeField key={key} ctx={ctx} />
  }
}

function AddFlow({ onAdd, onClose }: { onAdd: AddFormProps['onAdd']; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [widgetType, setWidgetType] = useState<WidgetType>('stat')
  const [values, setValues] = useState<WidgetFormValues>(DEFAULT_ADD_VALUES)
  const [error, setError] = useState<string | null>(null)

  const schema = getWidgetSchema(widgetType)
  const devices = useDevices()
  const availableMetrics = useDeviceMetrics(values.deviceIds[0] || '')

  const ctx: FieldContext = { values, setValues, schema, devices, availableMetrics, isEdit: false }

  const selectType = (type: WidgetType) => {
    setWidgetType(type)
    setError(null)
    // Seed a footprint that suits the type instead of one generic size.
    const span = defaultSpanFor(type)
    setValues((v) => ({ ...v, width: span.w, height: span.h }))
  }

  const handleSubmit = () => {
    const message = validateAddFromSchema(schema, values)
    if (message) {
      setError(message)
      return
    }
    const device = devices.find((d) => d.id === values.deviceIds[0])
    onAdd(buildAddFromSchema(schema, values, { id: `widget-${Date.now()}`, deviceName: device?.name }))
    onClose()
  }

  const nextFromStep1 = () => (schema.skipsDataSource ? 3 : 2)
  const backFromStep3 = () => (schema.skipsDataSource ? 1 : 2)
  const step2NextDisabled =
    (schema.addNeedsDevice && values.deviceIds.length === 0) ||
    (schema.needsMetrics && values.metricIds.length === 0)

  return (
    <>
      <h3 className="font-bold text-lg mb-4">Add Widget</h3>

      <ul className="steps w-full mb-6">
        <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Type</li>
        <li className={`step ${step >= 2 ? 'step-primary' : ''}`}>Data Source</li>
        <li className={`step ${step >= 3 ? 'step-primary' : ''}`}>Configure</li>
      </ul>

      {step === 1 && (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Select Widget Type</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {widgetSchemaList.map((s) => (
                <button
                  key={s.meta.type}
                  className={`btn ${widgetType === s.meta.type ? 'btn-primary' : 'btn-outline'} justify-start`}
                  onClick={() => selectType(s.meta.type)}
                >
                  <TypeIcon path={s.meta.iconPath} />
                  <div className="text-left">
                    <div className="font-semibold">{s.meta.label}</div>
                    <div className="text-xs opacity-70">{s.meta.blurb}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="modal-action">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setStep(nextFromStep1())}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && !schema.skipsDataSource && (
        <div className="space-y-4">
          {error && <ErrorAlert message={error} />}
          {schema.step2Fields.map((f, i) => renderStep2Field(f, ctx, `${f.kind}-${i}`))}
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)} disabled={step2NextDisabled}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {error && <ErrorAlert message={error} />}
          {schema.step3Fields.map((f, i) => renderStep3Field(f, ctx, `${f.kind}-${i}`))}
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setStep(backFromStep3())}>Back</button>
            <button className="btn btn-primary" onClick={handleSubmit}>Add Widget</button>
          </div>
        </div>
      )}
    </>
  )
}

function EditFlow({
  widget,
  onSave,
  onClose,
}: {
  widget: WidgetConfig
  onSave: EditFormProps['onSave']
  onClose: () => void
}) {
  const schema = getWidgetSchema(widget.type)
  const [values, setValues] = useState<WidgetFormValues>(() => editInitialValues(widget))
  const [error, setError] = useState<string | null>(null)

  const devices = useDevices()
  const availableMetrics = useDeviceMetrics(values.deviceIds[0] || '')

  const ctx: FieldContext = { values, setValues, schema, devices, availableMetrics, isEdit: true, originalWidget: widget }

  const handleSubmit = () => {
    const message = validateEditFromSchema(schema, values)
    if (message) {
      setError(message)
      return
    }
    onSave(widget.id, buildEditFromSchema(schema, widget, values))
    onClose()
  }

  return (
    <>
      <h3 className="font-bold text-lg mb-4">Edit Widget</h3>

      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">Widget Type</span>
          </label>
          <div className="badge badge-lg badge-primary">{widget.type}</div>
        </div>

        {schema.editFields.map((f, i) => renderEditField(f, ctx, `${f.kind}-${i}`))}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Save Changes</button>
        </div>
      </div>
    </>
  )
}

export default function WidgetConfigForm(props: WidgetConfigFormProps) {
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {props.mode === 'add' ? (
          <AddFlow onAdd={props.onAdd} onClose={props.onClose} />
        ) : (
          <EditFlow widget={props.widget} onSave={props.onSave} onClose={props.onClose} />
        )}
      </div>
      <div className="modal-backdrop" onClick={props.onClose}></div>
    </div>
  )
}
