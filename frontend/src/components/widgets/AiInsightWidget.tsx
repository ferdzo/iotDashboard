import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { telemetryApi } from '../../api'
import type { WidgetConfig } from '../../hooks'

interface AiInsightWidgetProps {
  config: WidgetConfig
}

interface TrendSummary {
  status: 'excellent' | 'good' | 'fair' | 'poor'
  summary: string
  trends: Array<{
    metric: string
    direction: 'improving' | 'stable' | 'degrading'
    description: string
  }>
  comfort_score: {
    rating: number
    description: string
  }
  patterns: string[]
  recommendations: string[]
  forecast: string
}

interface AnomalyDetection {
  status: 'normal' | 'warning' | 'critical'
  summary: string
  anomalies: Array<{
    metric: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    value: string
    expected: string
  }>
  impacts: string[]
  actions: string[]
  root_causes: string[]
}

export default function AiInsightWidget({ config }: AiInsightWidgetProps) {
  const { deviceIds, metricIds, timeframe, title } = config
  const [promptType, setPromptType] = useState<'trend_summary' | 'anomaly_detection'>('trend_summary')
  const [showAnalysis, setShowAnalysis] = useState(false)

  const deviceId = deviceIds[0]
  const metric = metricIds[0]

  const {
    data: analysis,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ['ai-insight', deviceId, metric, promptType, timeframe],
    queryFn: async () => {
      const response = await telemetryApi.analyze({
        device_id: deviceId,
        metric,
        hours: timeframe.hours || 240,
        limit: 200,
        prompt_type: promptType,
      })
      return response.data
    },
    enabled: false, // Manual trigger
  })

  const handleAnalyze = () => {
    setShowAnalysis(true)
    refetch()
  }

  // Parse JSON analysis if it's a string
  const parsedAnalysis = analysis?.analysis ? (() => {
    try {
      return typeof analysis.analysis === 'string' 
        ? JSON.parse(analysis.analysis) 
        : analysis.analysis
    } catch {
      return null // If parsing fails, return null to show raw text
    }
  })() : null

  const isTrendSummary = promptType === 'trend_summary' && parsedAnalysis
  const isAnomalyDetection = promptType === 'anomaly_detection' && parsedAnalysis

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'badge-success'
      case 'good': return 'badge-info'
      case 'fair': return 'badge-warning'
      case 'poor': return 'badge-error'
      case 'normal': return 'badge-success'
      case 'warning': return 'badge-warning'
      case 'critical': return 'badge-error'
      default: return 'badge-ghost'
    }
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return '↑'
      case 'degrading': return '↓'
      case 'stable': return '→'
      default: return '•'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'badge-error'
      case 'high': return 'badge-warning'
      case 'medium': return 'badge-warning badge-outline'
      case 'low': return 'badge-info'
      default: return 'badge-ghost'
    }
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h3 className="card-title text-base">{title || 'AI Environmental Insights'}</h3>
          <div className="flex gap-2">
            <select
              className="select select-bordered select-sm"
              value={promptType}
              onChange={(e) => setPromptType(e.target.value as 'trend_summary' | 'anomaly_detection')}
            >
              <option value="trend_summary">Trend Summary</option>
              <option value="anomaly_detection">Anomaly Detection</option>
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAnalyze}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60">Analyzing environmental data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-bold">Analysis Failed</div>
              <div className="text-sm">{(error as Error)?.message || 'Could not connect to GPT service'}</div>
            </div>
          </div>
        )}

        {analysis && showAnalysis && !isLoading && (
          <div className="space-y-4 mt-4">
            {/* Structured Display for Trend Summary */}
            {isTrendSummary && parsedAnalysis && (
              <>
                <div className="flex items-center justify-between">
                  <div className={`badge badge-lg ${getStatusColor(parsedAnalysis.status)}`}>
                    {parsedAnalysis.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-base-content/50">
                    {analysis.data_points_analyzed} data points
                  </div>
                </div>

                {/* Summary */}
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-bold">Summary</div>
                    <div className="text-sm">{parsedAnalysis.summary}</div>
                  </div>
                </div>

                {/* Comfort Score */}
                {parsedAnalysis.comfort_score && (
                  <div className="card bg-base-200">
                    <div className="card-body p-4">
                      <div className="flex items-center gap-3">
                        <div className="radial-progress text-primary" style={{ "--value": parsedAnalysis.comfort_score.rating } as React.CSSProperties}>
                          {parsedAnalysis.comfort_score.rating}
                        </div>
                        <div>
                          <div className="font-bold">Comfort Score</div>
                          <div className="text-sm text-base-content/70">{parsedAnalysis.comfort_score.description}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trends */}
                {parsedAnalysis.trends && parsedAnalysis.trends.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Trends</h4>
                    <div className="space-y-2">
                      {parsedAnalysis.trends.map((trend: TrendSummary['trends'][0], i: number) => (
                        <div key={i} className="card bg-base-200">
                          <div className="card-body p-3">
                            <div className="flex items-start gap-2">
                              <span className="text-lg">{getDirectionIcon(trend.direction)}</span>
                              <div className="flex-1">
                                <div className="font-semibold text-sm">{trend.metric}</div>
                                <div className="text-xs text-base-content/70">{trend.description}</div>
                              </div>
                              <div className="badge badge-sm">{trend.direction}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Patterns */}
                {parsedAnalysis.patterns && parsedAnalysis.patterns.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Patterns Detected</h4>
                    <ul className="space-y-1">
                      {parsedAnalysis.patterns.map((pattern: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">▸</span>
                          <span>{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {parsedAnalysis.recommendations && parsedAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Recommendations</h4>
                    <div className="space-y-2">
                      {parsedAnalysis.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="alert alert-success alert-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Forecast */}
                {parsedAnalysis.forecast && (
                  <div className="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <div>
                      <div className="font-bold text-sm">Forecast</div>
                      <div className="text-xs">{parsedAnalysis.forecast}</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Structured Display for Anomaly Detection */}
            {isAnomalyDetection && parsedAnalysis && (
              <>
                <div className="flex items-center justify-between">
                  <div className={`badge badge-lg ${getStatusColor(parsedAnalysis.status)}`}>
                    {parsedAnalysis.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-base-content/50">
                    {analysis.data_points_analyzed} data points
                  </div>
                </div>

                {/* Summary */}
                <div className={`alert ${parsedAnalysis.status === 'critical' ? 'alert-error' : parsedAnalysis.status === 'warning' ? 'alert-warning' : 'alert-success'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-bold">Summary</div>
                    <div className="text-sm">{parsedAnalysis.summary}</div>
                  </div>
                </div>

                {/* Anomalies */}
                {parsedAnalysis.anomalies && parsedAnalysis.anomalies.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Anomalies Detected</h4>
                    <div className="space-y-2">
                      {parsedAnalysis.anomalies.map((anomaly: AnomalyDetection['anomalies'][0], i: number) => (
                        <div key={i} className="card bg-base-200 border-l-4 border-error">
                          <div className="card-body p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm">{anomaly.metric}</span>
                                  <span className={`badge badge-sm ${getSeverityColor(anomaly.severity)}`}>
                                    {anomaly.severity}
                                  </span>
                                </div>
                                <div className="text-xs text-base-content/70 mb-1">{anomaly.description}</div>
                                <div className="text-xs">
                                  <span className="text-error font-semibold">Current: {anomaly.value}</span>
                                  {' • '}
                                  <span className="text-base-content/60">Expected: {anomaly.expected}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Impacts */}
                {parsedAnalysis.impacts && parsedAnalysis.impacts.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Potential Impacts</h4>
                    <ul className="space-y-1">
                      {parsedAnalysis.impacts.map((impact: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-warning mt-0.5">▸</span>
                          <span>{impact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                {parsedAnalysis.actions && parsedAnalysis.actions.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Recommended Actions</h4>
                    <div className="space-y-2">
                      {parsedAnalysis.actions.map((action: string, i: number) => (
                        <div key={i} className="alert alert-warning alert-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Root Causes */}
                {parsedAnalysis.root_causes && parsedAnalysis.root_causes.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm mb-2">Possible Root Causes</h4>
                    <ul className="space-y-1">
                      {parsedAnalysis.root_causes.map((cause: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-info mt-0.5">▸</span>
                          <span>{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Fallback: Raw Text Display */}
            {!parsedAnalysis && (
              <>
                <div className="flex items-center justify-between">
                  <div className="badge badge-primary badge-lg">
                    {promptType === 'trend_summary' ? 'Trend Analysis' : 'Anomaly Detection'}
                  </div>
                  <div className="text-xs text-base-content/50">
                    {analysis.data_points_analyzed} data points analyzed
                  </div>
                </div>
                <div className="divider my-2"></div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-96 overflow-y-auto">
                    {analysis.analysis}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAnalysis(false)}
              >
                Close
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => refetch()}
              >
                Refresh Analysis
              </button>
            </div>
          </div>
        )}

        {!showAnalysis && (
          <div className="text-center py-8 text-base-content/60">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-sm">Click Analyze to get AI-powered environmental insights</p>
          </div>
        )}
      </div>
    </div>
  )
}
