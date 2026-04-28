import { useState, useCallback } from 'react'
import { wellnessApi } from '../../api'
import type { WidgetConfig } from '../../hooks'
import './widget-styles.css'

interface DailyBriefingWidgetProps {
  config: WidgetConfig
}

interface BriefingData {
  status_emoji: string
  status_line: string
  insights: string[]
  recommendations: string[]
  briefing_type: string
  generated_at: string
  context: {
    indoor: Record<string, number> | null
    outdoor: Record<string, number | string | null> | null
    health: Record<string, number> | null
    calendar_event_count: number
  }
}

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
)

const LightbulbIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const StatusIcon = ({ status }: { status: string }) => {
  if (status.includes('good') || status.includes('great') || status.includes('optimal')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (status.includes('warning') || status.includes('moderate') || status.includes('attention')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

const BRIEFING_TYPES = [
  { value: 'schedule', label: 'Schedule', Icon: CalendarIcon, description: 'Calendar & activity focus' },
  { value: 'environment', label: 'Environment', Icon: BuildingIcon, description: 'Workspace conditions' },
  { value: 'full', label: 'Full', Icon: ClipboardIcon, description: 'Complete overview' },
] as const

type BriefingType = typeof BRIEFING_TYPES[number]['value']

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

export default function DailyBriefingWidget({ config }: DailyBriefingWidgetProps) {
  const briefingConfig = config.briefing
  const [briefingType, setBriefingType] = useState<BriefingType>(
    (briefingConfig?.briefingType as BriefingType) || 'full'
  )
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const city = config.visualization?.city || briefingConfig?.city || 'Skopje'
  const healthDeviceId = config.deviceIds?.[0] || briefingConfig?.healthDeviceId
  const calendarUrl = briefingConfig?.calendarUrl

  const generateBriefing = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await wellnessApi.getDailyBriefing({
        briefing_type: briefingType,
        city,
        health_device_id: healthDeviceId,
        calendar_url: calendarUrl,
        calendar_range_hours: briefingConfig?.calendarRangeHours || 24,
      })

      setBriefingData(response.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate briefing'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [briefingType, city, healthDeviceId, calendarUrl, briefingConfig?.calendarRangeHours])

  const getBriefingTypeInfo = (type: BriefingType) => {
    return BRIEFING_TYPES.find(t => t.value === type) || BRIEFING_TYPES[2]
  }

  const CurrentIcon = getBriefingTypeInfo(briefingType).Icon

  // No config state - show setup message
  if (!city) {
    return (
      <div className="widget-card card bg-base-100 h-full">
        <div className="card-body p-4">
          <h2 className="card-title text-sm">{config.title || 'Daily Briefing'}</h2>
          <p className="text-sm opacity-70">
            Configure a city to generate briefings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="widget-card card bg-base-100 h-full flex flex-col">
      <div className="card-body p-3 flex-1 flex flex-col gap-2 min-h-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-60 flex items-center gap-1">
              <CurrentIcon /> {getBriefingTypeInfo(briefingType).label} Briefing
            </p>
            <h2 className="card-title text-sm leading-tight">{config.title || 'Daily Briefing'}</h2>
          </div>
        </div>

        {/* Briefing Type Selector */}
        <div className="flex gap-1">
          {BRIEFING_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              className={`btn btn-xs flex-1 gap-1 ${
                briefingType === type.value ? 'btn-primary' : 'btn-outline'
              }`}
              onClick={() => setBriefingType(type.value)}
              title={type.description}
            >
              <type.Icon /> {type.label}
            </button>
          ))}
        </div>

        {/* Generate Button or Content */}
        {!briefingData && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <p className="text-sm opacity-60 text-center">
              Get AI-powered insights for your day
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={generateBriefing}
              disabled={isLoading}
            >
              Generate Briefing
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="text-sm opacity-60">Analyzing your environment...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex-1 flex flex-col gap-2">
            <div className="alert alert-error text-xs">
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={generateBriefing}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Briefing Content */}
        {briefingData && !isLoading && (
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
            {/* Status Line */}
            <div className="bg-base-200 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <StatusIcon status={briefingData.status_line.toLowerCase()} />
                <p className="text-sm font-medium">{briefingData.status_line}</p>
              </div>
            </div>

            {/* Insights */}
            {briefingData.insights.length > 0 && (
              <div className="space-y-1.5">
                {briefingData.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span className="opacity-90">{insight}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {briefingData.recommendations.length > 0 && (
              <div className="bg-primary/10 rounded-lg p-2 mt-auto">
                <div className="flex items-start gap-2">
                  <LightbulbIcon />
                  <div className="space-y-1">
                    {briefingData.recommendations.map((rec, i) => (
                      <p key={i} className="text-sm opacity-90">{rec}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer with timestamp and refresh */}
            <div className="flex items-center justify-between pt-1 border-t border-base-200 mt-auto">
              <span className="text-[10px] opacity-50">
                Generated {timeFormatter.format(new Date(briefingData.generated_at))}
              </span>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={generateBriefing}
                disabled={isLoading}
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
