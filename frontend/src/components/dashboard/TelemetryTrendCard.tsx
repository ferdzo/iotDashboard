import { ResponsiveContainer, LineChart, Line, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

interface TelemetryTrendCardProps {
  title: string
  data: Array<{ time: string; value: number }>
  unit?: string
  accentColor?: string
  subtitle?: string
}

function formatTimeLabel(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatValue(value: number, unit?: string) {
  const rounded = Number.isInteger(value) ? value : value.toFixed(1)
  return unit ? `${rounded} ${unit}` : String(rounded)
}

export default function TelemetryTrendCard({ title, data, unit, accentColor = '#2563eb', subtitle }: TelemetryTrendCardProps) {
  const latest = data.at(-1)

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-base-content/60">{subtitle}</p>}
          </div>
          {latest ? (
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {formatValue(latest.value, unit)}
              </div>
              <div className="text-xs text-base-content/60">as of {formatTimeLabel(latest.time)}</div>
            </div>
          ) : (
            <div className="text-sm text-base-content/60">No data</div>
          )}
        </div>

        <div className="h-48">
          {data.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--bc) / 0.1)" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTimeLabel}
                  tick={{ fontSize: 12, fill: '#ffffff' }}
                  stroke="rgba(255, 255, 255, 0.3)"
                />
                <YAxis
                  tickFormatter={(val) => formatValue(val, unit)}
                  width={48}
                  tick={{ fontSize: 12, fill: '#ffffff' }}
                  stroke="rgba(255, 255, 255, 0.3)"
                />
                <Tooltip
                  formatter={(value: number) => formatValue(value, unit)}
                  labelFormatter={(label) => formatTimeLabel(String(label))}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={accentColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-base-content/60">
              Not enough telemetry to chart yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
