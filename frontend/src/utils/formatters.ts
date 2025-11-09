/**
 * Format metric names for display
 */
export function formatMetricName(metric: string): string {
  // Known metric mappings
  const metricNames: Record<string, string> = {
    'temperature': 'Temperature',
    'humidity': 'Humidity',
    'co2': 'CO₂',
    'pressure': 'Pressure',
    'light': 'Light Level',
    'noise': 'Noise Level',
    'pm25': 'PM2.5',
    'voc': 'VOC',
  }

  // Return mapped name or capitalize the metric
  return metricNames[metric.toLowerCase()] || 
         metric.replace(/_/g, ' ')
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1))
               .join(' ')
}

/**
 * Format device name for display
 */
export function formatDeviceName(deviceName: string): string {
  return deviceName
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Create a default widget title based on type, device, and metrics
 */
export function createDefaultWidgetTitle(
  type: string,
  deviceName: string | undefined,
  metrics: string[]
): string {
  const formattedMetrics = metrics.map(formatMetricName).join(' & ')
  
  switch (type) {
    case 'line-chart':
      if (metrics.length > 1) {
        return `${formattedMetrics}`
      }
      return `${formattedMetrics}`
    case 'stat':
      return `${formattedMetrics}`
    case 'gauge':
      return `${formattedMetrics}`
    case 'ai-insight':
      return deviceName 
        ? `AI Insights - ${formatDeviceName(deviceName)}`
        : 'AI Insights'
    default:
      return formattedMetrics
  }
}
