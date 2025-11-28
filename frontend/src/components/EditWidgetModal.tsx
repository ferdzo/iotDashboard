import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { devicesApi } from '../api'
import type { WidgetConfig } from '../hooks'

interface EditWidgetModalProps {
  isOpen: boolean
  widget: WidgetConfig | null
  onClose: () => void
  onSave: (widgetId: string, updates: Partial<WidgetConfig>) => void
}

export default function EditWidgetModal({ isOpen, widget, onClose, onSave }: EditWidgetModalProps) {
  const [title, setTitle] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [timeframeHours, setTimeframeHours] = useState(24)
  const [widgetWidth, setWidgetWidth] = useState(1)
  const [widgetHeight, setWidgetHeight] = useState(2)
  const [calendarUrl, setCalendarUrl] = useState('')
  const [showCalendarUrl, setShowCalendarUrl] = useState(false)
  const [calendarRangeHours, setCalendarRangeHours] = useState(72)
  const [briefingType, setBriefingType] = useState<'schedule' | 'environment' | 'full'>('full')
  const [city, setCity] = useState('Skopje')

  // Fetch all devices
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await devicesApi.getAll()
      return response.data.results
    },
    enabled: isOpen,
  })

  // Fetch metrics for the selected device
  const { data: deviceMetricsData } = useQuery({
    queryKey: ['device-metrics', selectedDeviceId],
    queryFn: async () => {
      if (!selectedDeviceId) return []
      const response = await devicesApi.getMetrics(selectedDeviceId)
      return response.data.metrics
    },
    enabled: !!selectedDeviceId && isOpen,
  })

  const availableMetrics = Array.isArray(deviceMetricsData) ? deviceMetricsData : []
  const devices = Array.isArray(devicesData) ? devicesData : []

  // Load widget data when modal opens
  useEffect(() => {
    if (isOpen && widget) {
      setTitle(widget.title || '')
      setSelectedDeviceId(widget.deviceIds[0] || widget.briefing?.healthDeviceId || '')
      setSelectedMetrics(widget.metricIds || [])
      setTimeframeHours(widget.timeframe?.hours || 24)
      setWidgetWidth(widget.position?.w || 1)
      setWidgetHeight(widget.position?.h || 2)
      setCalendarUrl(widget.calendar?.icalUrl || widget.briefing?.calendarUrl || '')
      setCalendarRangeHours(widget.calendar?.timeRangeHours || widget.briefing?.calendarRangeHours || 72)
      setShowCalendarUrl(false)
      setBriefingType((widget.briefing?.briefingType as 'schedule' | 'environment' | 'full') || 'full')
      setCity(widget.visualization?.city || widget.briefing?.city || 'Skopje')
    }
  }, [isOpen, widget])

  // Reset metrics when device changes
  useEffect(() => {
    if (selectedDeviceId && widget && selectedDeviceId !== widget.deviceIds[0]) {
      setSelectedMetrics([])
    }
  }, [selectedDeviceId, widget])

  const handleSubmit = () => {
    if (!widget) return

    const needsDevice = !['weather', 'air-quality', 'run-suitability', 'health-stats', 'calendar', 'daily-briefing'].includes(widget.type)
    const needsMetrics = !['weather', 'air-quality', 'run-suitability', 'health-stats', 'calendar', 'daily-briefing'].includes(widget.type)

    if (widget.type === 'calendar') {
      if (!calendarUrl.trim()) {
        alert('Please provide an iCal URL')
        return
      }

      onSave(widget.id, {
        title,
        calendar: {
          icalUrl: calendarUrl.trim(),
          timeRangeHours: calendarRangeHours,
        },
        position: {
          ...widget.position,
          x: widget.position?.x || 0,
          y: widget.position?.y || 0,
          w: widgetWidth,
          h: widgetHeight,
        },
      })
      onClose()
      return
    }

    if (widget.type === 'daily-briefing') {
      if (!city.trim()) {
        alert('Please enter a city')
        return
      }

      onSave(widget.id, {
        title,
        visualization: {
          ...widget.visualization,
          city,
        },
        briefing: {
          briefingType,
          city,
          healthDeviceId: selectedDeviceId || undefined,
          calendarUrl: calendarUrl.trim() || undefined,
          calendarRangeHours: calendarRangeHours,
        },
        position: {
          ...widget.position,
          x: widget.position?.x || 0,
          y: widget.position?.y || 0,
          w: widgetWidth,
          h: widgetHeight,
        },
      })
      onClose()
      return
    }

    if (needsDevice && (!selectedDeviceId)) {
      alert('Please select a device')
      return
    }

    if (needsMetrics && selectedMetrics.length === 0) {
      alert('Please select at least one metric')
      return
    }

    onSave(widget.id, {
      title,
      deviceIds: needsDevice ? [selectedDeviceId] : [],
      metricIds: needsMetrics ? selectedMetrics : [],
      timeframe: {
        hours: timeframeHours,
      },
      position: {
        ...widget.position,
        x: widget.position?.x || 0,
        y: widget.position?.y || 0,
        w: widgetWidth,
        h: widgetHeight,
      },
    })
    onClose()
  }

  const toggleMetric = (metric: string) => {
    // Stat and gauge widgets only allow one metric
    const singleMetricWidgets = ['stat', 'gauge']
    const maxMetrics = widget && singleMetricWidgets.includes(widget.type) ? 1 : 5

    setSelectedMetrics((prev) => {
      if (prev.includes(metric)) {
        return prev.filter((m) => m !== metric)
      }
      
      // If adding would exceed max, replace last or prevent
      if (prev.length >= maxMetrics) {
        if (maxMetrics === 1) {
          return [metric] // Replace for single-metric widgets
        }
        return prev // Don't add more for multi-metric widgets
      }
      
      return [...prev, metric]
    })
  }

  if (!isOpen || !widget) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Edit Widget</h3>

        <div className="space-y-4">
          {/* Widget Type (read-only) */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Widget Type</span>
            </label>
            <div className="badge badge-lg badge-primary">{widget.type}</div>
          </div>

          {/* Device Selection */}
          {!['weather', 'air-quality', 'run-suitability', 'health-stats', 'calendar', 'daily-briefing'].includes(widget.type) && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Device</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
              >
                <option value="">Select a device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} ({device.location || 'No location'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Widget Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="Auto-generated if empty"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Metrics */}
          {!['weather', 'air-quality', 'run-suitability', 'health-stats', 'calendar', 'daily-briefing'].includes(widget.type) && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Select Metric(s)</span>
                <span className="label-text-alt">{selectedMetrics.length} selected</span>
              </label>
              {(['stat', 'gauge'].includes(widget.type)) && (
                <div className="alert alert-info mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-sm">This widget type supports only one metric</span>
                </div>
              )}
              <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                {!selectedDeviceId ? (
                  <div className="text-center text-base-content/60 py-4">
                    Please select a device first
                  </div>
                ) : availableMetrics.length === 0 ? (
                  <div className="text-center text-base-content/60 py-4">
                    Loading metrics...
                  </div>
                ) : (
                  availableMetrics.map((metric) => (
                    <label key={metric} className="flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer">
                      <input
                        type={(['stat', 'gauge'].includes(widget.type)) ? 'radio' : 'checkbox'}
                        name={(['stat', 'gauge'].includes(widget.type)) ? 'single-metric' : undefined}
                        className={(['stat', 'gauge'].includes(widget.type)) ? 'radio radio-sm' : 'checkbox checkbox-sm'}
                        checked={selectedMetrics.includes(metric)}
                        onChange={() => toggleMetric(metric)}
                      />
                      <span className="capitalize">{metric.replace(/_/g, ' ')}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Time Range */}
          {!['calendar', 'daily-briefing'].includes(widget.type) && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Time Range</span>
              </label>
              <select
                className="select select-bordered"
                value={timeframeHours}
                onChange={(e) => setTimeframeHours(Number(e.target.value))}
              >
                <option value={1}>Last 1 hour</option>
                <option value={6}>Last 6 hours</option>
                <option value={24}>Last 24 hours</option>
                <option value={168}>Last 7 days</option>
                <option value={720}>Last 30 days</option>
              </select>
            </div>
          )}

          {widget.type === 'calendar' && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">iCal URL</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type={showCalendarUrl ? 'text' : 'password'}
                    className="input input-bordered flex-1"
                    placeholder="https://calendar.google.com/calendar/ical/..."
                    value={calendarUrl}
                    onChange={(e) => setCalendarUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowCalendarUrl((prev) => !prev)}
                  >
                    {showCalendarUrl ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Agenda Range</span>
                </label>
                <select
                  className="select select-bordered"
                  value={calendarRangeHours}
                  onChange={(e) => setCalendarRangeHours(Number(e.target.value))}
                >
                  <option value={24}>Next 24 hours</option>
                  <option value={72}>Next 3 days</option>
                  <option value={168}>Next 7 days</option>
                </select>
              </div>
            </>
          )}

          {widget.type === 'daily-briefing' && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Briefing Type</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`btn flex-1 ${briefingType === 'schedule' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setBriefingType('schedule')}
                  >
                    📅 Schedule
                  </button>
                  <button
                    type="button"
                    className={`btn flex-1 ${briefingType === 'environment' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setBriefingType('environment')}
                  >
                    🌡️ Environment
                  </button>
                  <button
                    type="button"
                    className={`btn flex-1 ${briefingType === 'full' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setBriefingType('full')}
                  >
                    ✨ Full
                  </button>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">City</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="Enter city name (e.g., Skopje)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              {(briefingType === 'schedule' || briefingType === 'full') && (
                <>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Calendar URL (Optional)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showCalendarUrl ? 'text' : 'password'}
                        className="input input-bordered flex-1"
                        placeholder="https://calendar.google.com/calendar/ical/..."
                        value={calendarUrl}
                        onChange={(e) => setCalendarUrl(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setShowCalendarUrl((prev) => !prev)}
                      >
                        {showCalendarUrl ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {calendarUrl && (
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Calendar Range</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={calendarRangeHours}
                        onChange={(e) => setCalendarRangeHours(Number(e.target.value))}
                      >
                        <option value={24}>Next 24 hours</option>
                        <option value={72}>Next 3 days</option>
                        <option value={168}>Next 7 days</option>
                      </select>
                    </div>
                  )}

                  {devices.length > 0 && (
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Health Device (Optional)</span>
                      </label>
                      <select
                        className="select select-bordered"
                        value={selectedDeviceId || ''}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                      >
                        <option value="">No health device</option>
                        {devices.map((device) => (
                          <option key={device.id} value={device.id}>
                            {device.name} ({device.location || 'No location'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Width</span>
              </label>
              <select
                className="select select-bordered"
                value={widgetWidth}
                onChange={(e) => setWidgetWidth(Number(e.target.value))}
              >
                <option value={1}>Small (1 column)</option>
                <option value={2}>Medium (2 columns)</option>
                <option value={3}>Large (3 columns)</option>
                <option value={4}>Full Width (4 columns)</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Height</span>
              </label>
              <select
                className="select select-bordered"
                value={widgetHeight}
                onChange={(e) => setWidgetHeight(Number(e.target.value))}
              >
                <option value={1}>Short</option>
                <option value={2}>Medium</option>
                <option value={3}>Tall</option>
                <option value={4}>Extra Tall</option>
              </select>
            </div>
          </div>

          <div className="modal-action">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}
