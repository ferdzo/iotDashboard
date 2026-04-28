import type { ComponentType } from 'react'
import type { WidgetConfig, WidgetType } from '../../hooks'

import LineChartWidget from './LineChartWidget'
import StatWidget from './StatWidget'
import GaugeWidget from './GaugeWidget'
import AiInsightWidget from './AiInsightWidget'
import AirQualityWidget from './AirQualityWidget'
import WeatherWidget from './WeatherWidget'
import ComfortIndexWidget from './ComfortIndexWidget'
import RunSuitabilityWidget from './RunSuitabilityWidget'
import HealthStatsWidget from './HealthStatsWidget'
import CalendarWidget from './CalendarWidget'
import DailyBriefingWidget from './DailyBriefingWidget'

interface WidgetProps {
  config: WidgetConfig
}

export const widgetRegistry: Record<WidgetType, ComponentType<WidgetProps>> = {
  'line-chart': LineChartWidget,
  'stat': StatWidget,
  'gauge': GaugeWidget,
  'ai-insight': AiInsightWidget,
  'bar-chart': LineChartWidget, 
  'air-quality': AirQualityWidget,
  'weather': WeatherWidget,
  'comfort-index': ComfortIndexWidget,
  'run-suitability': RunSuitabilityWidget,
  'health-stats': HealthStatsWidget,
  'calendar': CalendarWidget,
  'daily-briefing': DailyBriefingWidget,
}
