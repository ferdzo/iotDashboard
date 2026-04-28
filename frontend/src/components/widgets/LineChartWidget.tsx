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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Error loading data: {error.message}</span>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="alert alert-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span>No data available for this metric</span>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 h-full overflow-hidden">
      <div className="card-body p-4">
        <h3 className="card-title text-sm mb-2">
          {config.title || metricIds.map(formatMetricName).join(' & ')}
        </h3>
        <ResponsiveContainer width="100%" height={visualization?.height || 280}>
          <LineChart 
            data={chartData} 
            margin={{ top: 5, right: 20, left: 0, bottom: 50 }}
            syncId="dashboard-charts" // Sync charts for better performance
          >
            {visualization?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            )}
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={50}
              interval="preserveStartEnd" // Reduce number of ticks
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
              }}
              labelFormatter={(label, payload) => {
                // Use fullDateTime from the data point for tooltip
                return payload && payload[0] ? payload[0].payload.fullDateTime : label
              }}
              formatter={(value: number) => [value.toFixed(2)]}
            />
            {visualization?.showLegend !== false && <Legend />}
            {lines}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export default memo(LineChartWidget)
