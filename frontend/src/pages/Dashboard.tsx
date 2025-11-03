import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, telemetryApi } from '../api'
import TelemetryTrendCard from '../components/dashboard/TelemetryTrendCard'
import type { DashboardOverview, Telemetry } from '../types/api'

type TelemetryQueryResult = Telemetry[] | { results?: Telemetry[] }

type MetricSummary = {
	metricKey: string
	label: string
	unit?: string
	samples: Array<{ time: string; value: number }>
	latest?: { time: string; value: number }
	earliest?: { time: string; value: number }
	average: number
	change?: number
	count: number
}

export default function Dashboard() {
	const {
		data: overview,
		isLoading: overviewLoading,
		isFetching: overviewFetching,
		refetch: refetchOverview,
	} = useQuery({
		queryKey: ['dashboard', 'overview'],
		queryFn: async (): Promise<DashboardOverview> => {
			const response = await dashboardApi.getOverview()
			return response.data
		},
		refetchInterval: 5000,
	})

	const {
		data: telemetryFeed,
		isLoading: telemetryLoading,
		isFetching: telemetryFetching,
		refetch: refetchTelemetry,
	} = useQuery({
		queryKey: ['telemetry', 'feed', { page_size: 200 }],
		queryFn: async (): Promise<TelemetryQueryResult> => {
			const response = await telemetryApi.query({ page_size: 200 })
			return response.data
		},
		refetchInterval: 15000,
	})

	const telemetrySamples = useMemo<Telemetry[]>(() => {
		if (!telemetryFeed) {
			return []
		}

		if (Array.isArray(telemetryFeed)) {
			return telemetryFeed
		}

		const maybeResults = telemetryFeed.results
		if (Array.isArray(maybeResults)) {
			return maybeResults
		}

		return []
	}, [telemetryFeed])

	const metricSummaries = useMemo<MetricSummary[]>(() => {
		if (!telemetrySamples.length) {
			return []
		}

		const groups = new Map<string, MetricSummary>()

		telemetrySamples.forEach((sample) => {
			const metricKey = sample.metric.toLowerCase()
			if (!groups.has(metricKey)) {
				const label = sample.metric
					.replace(/_/g, ' ')
					.replace(/\b\w/g, (char) => char.toUpperCase())

				groups.set(metricKey, {
					metricKey,
					label,
					unit: sample.unit,
					samples: [],
					average: 0,
					count: 0,
				})
			}

			groups.get(metricKey)!.samples.push({ time: sample.time, value: sample.value })
		})

		return Array.from(groups.values())
			.map((group) => {
				const ordered = [...group.samples].sort(
					(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
				)

				const total = ordered.reduce((acc, cur) => acc + Number(cur.value), 0)
				const average = total / ordered.length
				const latest = ordered.at(-1)
				const earliest = ordered[0]
				const change = latest && earliest ? latest.value - earliest.value : undefined

				return {
					...group,
					samples: ordered,
					latest,
					earliest,
					average,
					change,
					count: ordered.length,
				}
			})
			.sort((a, b) => b.count - a.count)
	}, [telemetrySamples])

	const primaryMetric = useMemo<MetricSummary | undefined>(() => {
			if (!metricSummaries.length) {
				return undefined
			}

			const prefersTrend = metricSummaries.find(
				(metric) => metric.count > 1 && metric.metricKey.includes('temp'),
			)

			if (prefersTrend) {
				return prefersTrend
			}

			const anyWithTrend = metricSummaries.find((metric) => metric.count > 1)
			if (anyWithTrend) {
				return anyWithTrend
			}

			return metricSummaries[0]
		}, [metricSummaries])

	const isLoading = overviewLoading && telemetryLoading

	const formatValue = (value?: number, unit?: string) => {
		if (value === undefined || Number.isNaN(value)) {
			return '—'
		}

		const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1))
		return unit ? `${rounded} ${unit}` : `${rounded}`
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	return (
		<div className="p-6 space-y-10">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<h1 className="text-3xl font-bold">Environment Overview</h1>
					<p className="text-base-content/70">
						Live snapshot of workplace telemetry and system health. Focus on environmental
						trends—device controls are just a click away.
					</p>
				</div>
				<button
					className="btn btn-outline btn-sm w-full sm:w-auto"
					onClick={() => {
						refetchOverview()
						refetchTelemetry()
					}}
					disabled={overviewFetching || telemetryFetching}
				>
					{overviewFetching || telemetryFetching ? (
						<span className="loading loading-spinner loading-xs"></span>
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M20 20v-5h-.581m-15.357-2a8.003 8.003 0 0115.357 2"
							/>
						</svg>
					)}
					<span className="ml-2">Refresh</span>
				</button>
			</div>

			{/* Environmental Snapshot */}
			<section className="space-y-4">
				<h2 className="text-xl font-semibold">Environmental Snapshot</h2>
				{telemetryLoading && !metricSummaries.length ? (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3].map((key) => (
							<div key={key} className="card bg-base-200 animate-pulse">
								<div className="card-body h-32"></div>
							</div>
						))}
					</div>
				) : metricSummaries.length ? (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{metricSummaries.slice(0, 3).map((metric) => (
							<div key={metric.metricKey} className="card bg-base-100 shadow">
								<div className="card-body">
									<div className="text-sm uppercase tracking-wide text-base-content/60">
										{metric.label}
									</div>
									<div className="text-4xl font-bold text-primary">
										{formatValue(metric.latest?.value, metric.unit)}
									</div>
									<div className="flex items-center justify-between text-sm text-base-content/60">
										<span>Avg (last {metric.count})</span>
										<span>{formatValue(metric.average, metric.unit)}</span>
									</div>
									{metric.change !== undefined && metric.change !== 0 && (
										<div
											className={`text-sm font-medium ${
												metric.change > 0 ? 'text-warning' : 'text-success'
											}`}
										>
											{metric.change > 0 ? '+' : ''}
											{formatValue(metric.change, metric.unit)} since first sample
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="card bg-base-200">
						<div className="card-body text-sm text-base-content/70">
							No telemetry ingested yet. Connect devices or publish MQTT data to see environmental metrics.
						</div>
					</div>
				)}
			</section>

			{/* Featured Trend */}
			{primaryMetric && (
				<section className="space-y-4">
					<h2 className="text-xl font-semibold">Featured Trend</h2>
					<TelemetryTrendCard
						title={primaryMetric.label}
						data={primaryMetric.samples}
						unit={primaryMetric.unit}
						subtitle={`Latest ${primaryMetric.count} readings`}
					/>
				</section>
			)}

			{/* Stats Grid */}
			<section className="space-y-4">
				<h2 className="text-xl font-semibold">System Health</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<div className="stats shadow">
						<div className="stat">
							<div className="stat-figure text-primary">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									className="inline-block w-8 h-8 stroke-current"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
									/>
								</svg>
							</div>
							<div className="stat-title">Total Devices</div>
							<div className="stat-value text-primary">{overview?.total_devices ?? 0}</div>
							<div className="stat-desc">Registered in system</div>
						</div>
					</div>

					<div className="stats shadow">
						<div className="stat">
							<div className="stat-figure text-success">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									className="inline-block w-8 h-8 stroke-current"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div className="stat-title">Active Devices</div>
							<div className="stat-value text-success">{overview?.active_devices ?? 0}</div>
							<div className="stat-desc">Currently online</div>
						</div>
					</div>

					<div className="stats shadow">
						<div className="stat">
							<div className="stat-figure text-secondary">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									className="inline-block w-8 h-8 stroke-current"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-15.857 21.213 0"
									/>
								</svg>
							</div>
							<div className="stat-title">MQTT Devices</div>
							<div className="stat-value text-secondary">{overview?.mqtt_devices ?? 0}</div>
							<div className="stat-desc">Using mTLS</div>
						</div>
					</div>

					<div className="stats shadow">
						<div className="stat">
							<div className="stat-figure text-warning">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									className="inline-block w-8 h-8 stroke-current"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							</div>
							<div className="stat-title">Expiring Soon</div>
							<div className="stat-value text-warning">
								{overview?.certificates_expiring_soon ?? 0}
							</div>
							<div className="stat-desc">Certificates need renewal</div>
						</div>
					</div>
				</div>
			</section>

			{/* Recent Telemetry */}
			{overview?.recent_telemetry?.length ? (
				<section className="space-y-4">
					<h2 className="text-2xl font-bold">Recent Telemetry</h2>
					<div className="overflow-x-auto">
						<table className="table table-zebra">
							<thead>
								<tr>
									<th>Device</th>
									<th>Metric</th>
									<th>Value</th>
									<th>Time</th>
								</tr>
							</thead>
							<tbody>
								{overview.recent_telemetry.map((t, idx) => (
									<tr key={`${t.device_id}-${t.metric}-${idx}`} className="hover">
										<td>
											<div className="font-bold">{t.device_name}</div>
											<div className="text-sm opacity-50">{t.device_id}</div>
										</td>
										<td>
											<div className="badge badge-ghost">{t.metric}</div>
										</td>
										<td className="font-mono font-semibold">
											{formatValue(t.value, t.unit)}
										</td>
										<td className="text-sm opacity-70">
											{new Date(t.time).toLocaleString()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			) : null}
		</div>
	)
}

