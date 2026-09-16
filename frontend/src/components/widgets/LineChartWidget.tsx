import { useMemo, memo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTelemetrySeries } from '../../hooks'
import type { WidgetConfig } from '../../hooks'
import { formatMetricName } from '../../utils/formatters'
import { WidgetSkeleton, WidgetError, WidgetEmpty } from '../ui'

interface LineChartWidgetProps {
  config: WidgetConfig
}

// Optimized date formatter - cache formatters to avoid recreating
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// Helper to format date efficiently
function formatTime(date: Date): string {
  return timeFormatter.format(date)
}

function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date)
}

// Helper component to fetch data for a single metric
function useMultiMetricData(deviceId: string, metricIds: string[], timeframe: WidgetConfig['timeframe']) {
  // Only fetch data for metrics that exist (up to 5)
  const metric1 = useTelemetrySeries({
    deviceId,
    metric: metricIds[0] || '',
    hours: timeframe.hours,
    startTime: timeframe.startTime,
    endTime: timeframe.endTime,
    limit: 500, // Limit data points for performance
  })
  
  const metric2 = useTelemetrySeries({
    deviceId,
    metric: metricIds[1] || '',
    hours: timeframe.hours,
    startTime: timeframe.startTime,
    endTime: timeframe.endTime,
    limit: 500,
    enabled: metricIds.length > 1,
  })
  
  const metric3 = useTelemetrySeries({
    deviceId,
    metric: metricIds[2] || '',
    hours: timeframe.hours,
    startTime: timeframe.startTime,
    endTime: timeframe.endTime,
    limit: 500,
    enabled: metricIds.length > 2,
  })
  
  const metric4 = useTelemetrySeries({
    deviceId,
    metric: metricIds[3] || '',
    hours: timeframe.hours,
    startTime: timeframe.startTime,
    endTime: timeframe.endTime,
    limit: 500,
    enabled: metricIds.length > 3,
  })
  
  const metric5 = useTelemetrySeries({
    deviceId,
    metric: metricIds[4] || '',
    hours: timeframe.hours,
    startTime: timeframe.startTime,
    endTime: timeframe.endTime,
    limit: 500,
    enabled: metricIds.length > 4,
  })

  const queries = [metric1, metric2, metric3, metric4, metric5].slice(0, metricIds.length)
  
  return { queries, metricIds }
}

function LineChartWidget({ config }: LineChartWidgetProps) {
  const { deviceIds, metricIds, timeframe, visualization } = config
  const deviceId = deviceIds[0]

  const { queries } = useMultiMetricData(deviceId, metricIds, timeframe)

  const isLoading = queries.some((q) => q.isLoading)
  const error = queries.find((q) => q.error)?.error

  // Combine data from all metrics into a single chart dataset (optimized)
  const chartData = useMemo(() => {
    if (queries.length === 0 || !queries[0]?.data || queries[0].data.length === 0) return []

    // Limit total data points for performance (max 300 points)
    const MAX_POINTS = 300
    const totalPoints = queries.reduce((sum, q) => sum + (q.data?.length || 0), 0)
    const shouldDownsample = totalPoints > MAX_POINTS
    const step = shouldDownsample ? Math.ceil(totalPoints / MAX_POINTS) : 1

    // Create a map of timestamp -> data point (using timestamp as key for better performance)
    const timeMap = new Map<number, Record<string, number | string>>()

    queries.forEach((query, index) => {
      const metric = metricIds[index]
      if (!query.data || query.data.length === 0) return
      
      // Process data points efficiently (with downsampling if needed)
      query.data.forEach((point, pointIndex) => {
        // Skip points if downsampling
        if (shouldDownsample && pointIndex % step !== 0) return
        
        const timestamp = new Date(point.time).getTime()
        
        if (!timeMap.has(timestamp)) {
          const date = new Date(timestamp)
          timeMap.set(timestamp, { 
            time: formatTime(date), 
            fullDateTime: formatDateTime(date),
            timestamp 
          })
        }
        
        const entry = timeMap.get(timestamp)!
        entry[metric] = point.value
      })
    })

    // Sort by timestamp and convert to array
    const result = Array.from(timeMap.values()).sort((a, b) => {
      return (a.timestamp as number) - (b.timestamp as number)
    })

    return result
  }, [queries, metricIds])

  // Memoize colors to avoid recreating array
  const colors = useMemo(() => 
    visualization?.colors || [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
    ],
    [visualization?.colors]
  )

  // Memoize lines to avoid recreating on every render
  const lines = useMemo(() => 
    metricIds.map((metric, index) => (
      <Line
        key={metric}
        type="monotone"
        dataKey={metric}
        stroke={colors[index % colors.length]}
        strokeWidth={2}
        dot={false} // Disable dots for better performance
        activeDot={{ r: 4 }}
        connectNulls={true}
        name={formatMetricName(metric)}
        isAnimationActive={false} // Disable animations for better performance
      />
    )),
    [metricIds, colors]
  )

  if (isLoading) return <WidgetSkeleton lines={4} />
  if (error) return <WidgetError message={error.message} />
  if (chartData.length === 0) return <WidgetEmpty message="No data available for this metric" />

  return (
    <div className="h-full min-h-0 tnum">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 12, left: -8, bottom: 0 }}
          syncId="dashboard-charts" // Sync charts for better performance
        >
            {visualization?.showGrid !== false && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-base-content)"
                opacity={0.12}
              />
            )}
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: 'var(--color-base-content)', opacity: 0.55 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd" // Reduce number of ticks
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-base-content)', opacity: 0.55 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-base-300)',
                border: '1px solid var(--color-base-300)',
                borderRadius: '0.5rem',
                color: 'var(--color-base-content)',
                fontSize: 12,
              }}
              labelFormatter={(label, payload) => {
                // Use fullDateTime from the data point for tooltip
                return payload && payload[0] ? payload[0].payload.fullDateTime : label
              }}
              formatter={(value: number) => [value.toFixed(2)]}
            />
            {visualization?.showLegend !== false && (
              <Legend wrapperStyle={{ fontSize: 12 }} />
            )}
            {lines}
          </LineChart>
        </ResponsiveContainer>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(LineChartWidget)
