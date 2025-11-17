import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { devicesApi } from '../api'
import type { WidgetType, WidgetConfig } from '../hooks'
import { createDefaultWidgetTitle } from '../utils/formatters'

interface AddWidgetModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (widget: WidgetConfig) => void
}

export default function AddWidgetModal({ isOpen, onClose, onAdd }: AddWidgetModalProps) {
  const [step, setStep] = useState(1)
  const [widgetType, setWidgetType] = useState<WidgetType>('stat')
  const [title, setTitle] = useState('')
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [timeframeHours, setTimeframeHours] = useState(24)
  const [widgetWidth, setWidgetWidth] = useState(1)
  const [widgetHeight, setWidgetHeight] = useState(2) 
  const [city, setCity] = useState('Skopje') 

  // Fetch devices
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await devicesApi.getAll()
      return response.data
    },
  })

  // Fetch metrics for selected device(s)
  const { data: deviceMetricsData } = useQuery({
    queryKey: ['device-metrics', selectedDevices[0]],
    queryFn: async () => {
      if (selectedDevices.length === 0) return []
      const response = await devicesApi.getMetrics(selectedDevices[0])
      return response.data.metrics
    },
    enabled: selectedDevices.length > 0,
  })

  const devices = devicesData?.results || []
  const availableMetrics = deviceMetricsData || []

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setWidgetType('stat')
      setTitle('')
      setSelectedDevices([])
      setSelectedMetrics([])
      setTimeframeHours(24)
      setWidgetWidth(1)
      setWidgetHeight(2)
    }
  }, [isOpen])

  // Reset metrics when device changes
  useEffect(() => {
    setSelectedMetrics([])
  }, [selectedDevices])

  const handleSubmit = () => {
    // Weather and air-quality widgets don't need device/metric validation
    if (widgetType !== 'weather' && widgetType !== 'air-quality') {
      if (selectedDevices.length === 0 || selectedMetrics.length === 0) {
        alert('Please select at least one device and one metric')
        return
      }
    }

    // Create title
    let defaultTitle = ''
    if (widgetType === 'weather') {
      defaultTitle = `Weather - ${city}`
    } else if (widgetType === 'air-quality') {
      defaultTitle = `Air Quality - ${city}`
    } else {
      const selectedDevice = devices.find(d => d.id === selectedDevices[0])
      defaultTitle = createDefaultWidgetTitle(widgetType, selectedDevice?.name, selectedMetrics)
    }

    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      title: title || defaultTitle,
      deviceIds: widgetType === 'weather' || widgetType === 'air-quality' ? [] : selectedDevices,
      metricIds: widgetType === 'weather' || widgetType === 'air-quality' ? [] : selectedMetrics,
      timeframe: {
        hours: timeframeHours,
      },
      visualization: {
        showLegend: true,
        showGrid: true,
        height: widgetType === 'line-chart' ? 300 : undefined,
        city: widgetType === 'weather' || widgetType === 'air-quality' ? city : undefined,
      },
      position: {
        x: 0,
        y: 0,
        w: widgetWidth,
        h: widgetHeight,
      },
    }

    onAdd(newWidget)
    onClose()
  }

  const toggleDevice = (deviceId: string) => {
    // Only allow single device selection for better UX
    setSelectedDevices([deviceId])
  }

  const toggleMetric = (metric: string) => {
    // Stat and gauge widgets only allow one metric
    const singleMetricWidgets = ['stat', 'gauge']
    const maxMetrics = singleMetricWidgets.includes(widgetType) ? 1 : 5

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

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Add Widget</h3>

        {/* Progress steps */}
        <ul className="steps w-full mb-6">
          <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Type</li>
          <li className={`step ${step >= 2 ? 'step-primary' : ''}`}>Data Source</li>
          <li className={`step ${step >= 3 ? 'step-primary' : ''}`}>Configure</li>
        </ul>

        {/* Step 1: Widget Type */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Select Widget Type</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`btn ${widgetType === 'stat' ? 'btn-primary' : 'btn-outline'} justify-start`}
                  onClick={() => setWidgetType('stat')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">Stat Card</div>
                    <div className="text-xs opacity-70">Min/Max/Avg</div>
                  </div>
                </button>

                <button
                  className={`btn ${widgetType === 'line-chart' ? 'btn-primary' : 'btn-outline'} justify-start`}
                  onClick={() => setWidgetType('line-chart')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">Line Chart</div>
                    <div className="text-xs opacity-70">Time series</div>
                  </div>
                </button>

                <button
                  className={`btn ${widgetType === 'gauge' ? 'btn-primary' : 'btn-outline'} justify-start`}
                  onClick={() => setWidgetType('gauge')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">Gauge</div>
                    <div className="text-xs opacity-70">Circular meter</div>
                  </div>
                </button>

                <button
                  className={`btn ${widgetType === 'ai-insight' ? 'btn-primary' : 'btn-outline'} justify-start`}
                  onClick={() => setWidgetType('ai-insight')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">AI Insight</div>
                    <div className="text-xs opacity-70">GPT analysis</div>
                  </div>
                </button>

                <button
                  className={`btn ${widgetType === 'weather' ? 'btn-primary' : 'btn-outline'} justify-start`}
                  onClick={() => setWidgetType('weather')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">Weather</div>
                    <div className="text-xs opacity-70">Open-Meteo</div>
                  </div>
                </button>

                <button
                  className={`btn ${widgetType === 'air-quality' ? 'btn-primary' : 'btn-outline'} justify-start`}
                  onClick={() => setWidgetType('air-quality')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">Air Quality</div>
                    <div className="text-xs opacity-70">Pulse.eco</div>
                  </div>
                </button>

                <button
                  className={`btn ${widgetType === 'comfort-index' ? 'btn-primary' : 'btn-outline'} justify-start`}
                  onClick={() => setWidgetType('comfort-index')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">Comfort Index</div>
                    <div className="text-xs opacity-70">Multi-factor</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  // Skip data source step for weather and air quality widgets
                  if (widgetType === 'weather' || widgetType === 'air-quality') {
                    setStep(3)
                  } else {
                    setStep(2)
                  }
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Data Source */}
        {step === 2 && widgetType !== 'weather' && widgetType !== 'air-quality' && (
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Select Device</span>
                <span className="label-text-alt">{selectedDevices.length} selected</span>
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
                        checked={selectedDevices.includes(device.id)}
                        onChange={() => toggleDevice(device.id)}
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

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Select Metric(s)</span>
                <span className="label-text-alt">{selectedMetrics.length} selected</span>
              </label>
              {selectedDevices.length === 0 ? (
                <div className="border rounded-lg p-4 text-center text-base-content/60">
                  Please select a device first
                </div>
              ) : (
                <>
                  {(['stat', 'gauge'].includes(widgetType)) && (
                    <div className="alert alert-info mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span className="text-sm">This widget type supports only one metric</span>
                    </div>
                  )}
                  <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                    {availableMetrics.length === 0 ? (
                      <div className="text-center text-base-content/60 py-4">
                        No metrics found for this device
                      </div>
                    ) : (
                      availableMetrics.map((metric) => (
                        <label key={metric} className="flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer">
                          <input
                            type={(['stat', 'gauge'].includes(widgetType)) ? 'radio' : 'checkbox'}
                            name={(['stat', 'gauge'].includes(widgetType)) ? 'single-metric' : undefined}
                            className={(['stat', 'gauge'].includes(widgetType)) ? 'radio radio-sm' : 'checkbox checkbox-sm'}
                            checked={selectedMetrics.includes(metric)}
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

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(3)}
                disabled={selectedDevices.length === 0 || selectedMetrics.length === 0}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 3 && (
          <div className="space-y-4">
            {/* City input for weather and air-quality widgets */}
            {(widgetType === 'weather' || widgetType === 'air-quality') ? (
              <>
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
                  <label className="label">
                    <span className="label-text-alt">
                      {widgetType === 'air-quality' 
                        ? 'Available cities: Skopje, Bitola, Veles, Tetovo, etc.' 
                        : 'Enter any city name for weather data'}
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Widget Title (Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    placeholder={widgetType === 'weather' ? `Weather - ${city}` : `Air Quality - ${city}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </>
            ) : (
              // Original configuration for sensor-based widgets
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Widget Title (Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    placeholder="Auto-generated if empty"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

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
              </>
            )}

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

            <div className="alert">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div className="text-sm">
                <div className="font-semibold">Widget Summary</div>
                <div>Type: <span className="badge badge-sm">{widgetType}</span></div>
                <div>Device: {devices.find(d => d.id === selectedDevices[0])?.name}</div>
                <div>Metrics: {selectedMetrics.join(', ')}</div>
                <div>Size: {widgetWidth} × {widgetHeight}</div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                Add Widget
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  )
}
