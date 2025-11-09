import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { telemetryApi } from '../../api'
import type { WidgetConfig } from '../../hooks'

interface AiInsightWidgetProps {
  config: WidgetConfig
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
