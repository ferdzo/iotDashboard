import type { ComponentType } from 'react'
import type { WidgetConfig, WidgetType } from '../../hooks'

import LineChartWidget from './LineChartWidget'
import StatWidget from './StatWidget'
import GaugeWidget from './GaugeWidget'
import AiInsightWidget from './AiInsightWidget'

interface WidgetProps {
  config: WidgetConfig
}

export const widgetRegistry: Record<WidgetType, ComponentType<WidgetProps>> = {
  'line-chart': LineChartWidget,
  'stat': StatWidget,
  'gauge': GaugeWidget,
  'ai-insight': AiInsightWidget,
  'bar-chart': LineChartWidget, // Placeholder - implement later
}
