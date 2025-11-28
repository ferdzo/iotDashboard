import { useCallback, useEffect, useRef, useState } from 'react'
import type { AxiosError } from 'axios'
import ICAL from 'ical.js'
import { calendarApi } from '../../api'
import type { WidgetConfig } from '../../hooks'
import './widget-styles.css'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000
const MAX_EVENTS = 25

interface CalendarWidgetProps {
  config: WidgetConfig
}

interface AgendaEvent {
  id: string
  summary: string
  start: Date
  end: Date
  location?: string | null
  description?: string | null
  isAllDay: boolean
}

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function formatDayLabel(date: Date) {
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffMs = startOfDate.getTime() - startOfToday.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))

  if (Math.abs(diffDays) <= 1) {
    return relativeFormatter.format(diffDays, 'day')
  }

  return dayFormatter.format(date)
}

function formatEventRange(event: AgendaEvent) {
  const sameDay = event.start.toDateString() === event.end.toDateString()
  const dayLabel = formatDayLabel(event.start)

  if (event.isAllDay) {
    return `${dayLabel} - All day`
  }

  if (sameDay) {
    return `${dayLabel} - ${timeFormatter.format(event.start)} to ${timeFormatter.format(event.end)}`
  }

  return `${dayLabel} ${timeFormatter.format(event.start)} -> ${formatDayLabel(event.end)} ${timeFormatter.format(event.end)}`
}

function createAgendaEvents(
  component: ICAL.Component,
  windowStart: Date,
  windowEnd: Date,
): AgendaEvent[] {
  const event = new ICAL.Event(component)
  const results: AgendaEvent[] = []
  const eventTemplate = {
    summary: event.summary || 'Untitled event',
    location: event.location || null,
    description: event.description || null,
  }

  const addOccurrence = (start: ICAL.Time, end?: ICAL.Time | null) => {
    const jsStart = start.toJSDate()
    const jsEnd = (end || start).toJSDate()

    if (jsEnd < windowStart || jsStart > windowEnd) {
      return
    }

    results.push({
      id: `${event.uid || event.summary}-${jsStart.toISOString()}`,
      summary: eventTemplate.summary,
      location: eventTemplate.location,
      description: eventTemplate.description,
      start: jsStart,
      end: jsEnd,
      isAllDay: start.isDate,
    })
  }

  const overlapWindowStart = new Date(windowStart.getTime() - 24 * 60 * 60 * 1000)
  const iteratorStart = ICAL.Time.fromJSDate(overlapWindowStart)

  if (event.isRecurring()) {
    const iterator = event.iterator(iteratorStart)
    let next = iterator.next()
    while (next) {
      const occurrence = event.getOccurrenceDetails(next)
      addOccurrence(occurrence.startDate, occurrence.endDate)
      const jsStart = occurrence.startDate.toJSDate()
      if (jsStart > windowEnd) {
        break
      }
      next = iterator.next()
    }
  } else {
    addOccurrence(event.startDate, event.endDate)
  }

  return results
}

export default function CalendarWidget({ config }: CalendarWidgetProps) {
  const calendarConfig = config.calendar
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const fetchEvents = useCallback(async () => {
    if (!calendarConfig?.icalUrl) {
      setEvents([])
      setError('Calendar URL is missing')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsLoading(true)
    setError(null)

    try {
      const response = await calendarApi.fetch(calendarConfig.icalUrl, {
        signal: controller.signal,
      })

      const raw = response.data?.calendar_data
      if (!raw) {
        throw new Error('Calendar feed was empty')
      }
      const parsed = ICAL.parse(raw)
      const comp = new ICAL.Component(parsed)
      const vevents = comp.getAllSubcomponents('vevent') || []

      const now = new Date()
      const windowStart = new Date(now.getTime() - 30 * 60 * 1000) // keep events that started recently
      const windowEnd = new Date(now.getTime() + (calendarConfig.timeRangeHours || 72) * 60 * 60 * 1000)

      const agendaEvents = vevents
        .flatMap((vevent) => createAgendaEvents(vevent, windowStart, windowEnd))
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .slice(0, MAX_EVENTS)

      setEvents(agendaEvents)
      setLastUpdated(new Date())
    } catch (err) {
      if (controller.signal.aborted) {
        return
      }

      const axiosError = err as AxiosError<{ error?: string; detail?: string }>
      const message = axiosError?.response?.data?.error
        || axiosError?.response?.data?.detail
        || axiosError?.message
        || 'Failed to load calendar'
      setError(message)
      setEvents([])
    } finally {
      if (!controller.signal.aborted && requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [calendarConfig?.icalUrl, calendarConfig?.timeRangeHours])

  useEffect(() => {
    if (!calendarConfig?.icalUrl) {
      return
    }

    fetchEvents()
    const interval = setInterval(fetchEvents, REFRESH_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [calendarConfig?.icalUrl, fetchEvents])

  const handleManualRefresh = () => {
    fetchEvents()
  }

  if (!calendarConfig) {
    return (
      <div className="widget-card card bg-base-100 h-full">
        <div className="card-body p-4 text-sm">
          <h2 className="card-title text-sm mb-2">{config.title || 'Calendar'}</h2>
          <p className="opacity-70">
            Configure an iCal URL to see your agenda.
          </p>
        </div>
      </div>
    )
  }

  const rangeLabel = `Next ${calendarConfig.timeRangeHours || 72}h`

  return (
    <div className="widget-card card bg-base-100 h-full">
      <div className="card-body p-3 h-full flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-60">Agenda</p>
            <h2 className="card-title text-sm leading-tight">{config.title || 'Calendar'}</h2>
            <p className="text-xs opacity-60">{rangeLabel}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            {lastUpdated && (
              <span className="text-[10px] opacity-60">
                Updated {timeFormatter.format(lastUpdated)}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-error text-xs">
            <span>{error}</span>
          </div>
        )}

        {!error && events.length === 0 && !isLoading && (
          <div className="flex-1 flex items-center justify-center text-sm opacity-60 text-center">
            No upcoming events in this window.
          </div>
        )}

        {isLoading && events.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="loading loading-spinner"></span>
          </div>
        )}

        {events.length > 0 && (
          <ul className="flex-1 overflow-y-auto divide-y divide-base-200">
            {events.map((event) => (
              <li key={event.id} className="py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      {event.summary || 'Untitled event'}
                    </p>
                    <p className="text-xs opacity-70">
                      {formatEventRange(event)}
                    </p>
                    {event.location && (
                      <p className="text-[11px] opacity-70 mt-1 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 11c1.38 0 2.5-1.12 2.5-2.5S13.38 6 12 6s-2.5 1.12-2.5 2.5S10.62 11 12 11zm0 0c-4 0-5 4-5 4v.5a2.5 2.5 0 002.5 2.5h5a2.5 2.5 0 002.5-2.5V15s-1-4-5-4z"
                          />
                        </svg>
                        {event.location}
                      </p>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-right whitespace-nowrap">
                    {event.isAllDay ? 'All day' : timeFormatter.format(event.start)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
