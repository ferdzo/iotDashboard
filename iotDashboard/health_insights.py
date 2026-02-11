"""
Health Insights Calculator

Correlates health metrics with environmental data to provide contextual insights.
Shows how weather and air quality affect health metrics.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class HealthMetrics:
    """Current health metrics."""
    steps: int = 0
    active_calories: int = 0
    heart_rate: Optional[float] = None
    resting_heart_rate: Optional[float] = None
    sleep_duration: Optional[float] = None  # minutes
    timestamp: Optional[datetime] = None


@dataclass
class EnvironmentalContext:
    """Environmental context for health insights."""
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    air_quality_status: Optional[str] = None
    weather_description: Optional[str] = None


@dataclass
class HealthInsight:
    """Individual health insight."""
    metric: str
    value: float
    context: str
    correlation: Optional[str] = None
    recommendation: Optional[str] = None


@dataclass
class HealthInsightsResult:
    """Health insights with environmental context."""
    health_metrics: Dict[str, float]
    environmental_context: Dict[str, Optional[float]]
    insights: List[HealthInsight]
    correlations: List[str]
    recommendations: List[str]
    trend_indicators: List[str]


class HealthInsightsCalculator:
    """Calculate contextual health insights from health and environmental data."""
    
    # Thresholds for correlations
    TEMP_HR_CORRELATION_THRESHOLD = 3.0  # bpm per degree C above 22°C
    PM25_HR_THRESHOLD = 20.0  # μg/m³ - above this may affect HR
    PM10_HR_THRESHOLD = 30.0  # μg/m³ - above this may affect HR
    OPTIMAL_TEMP_FOR_ACTIVITY = (18.0, 22.0)  # °C
    
    @staticmethod
    def analyze_heart_rate(
        hr: Optional[float],
        resting_hr: Optional[float],
        env: EnvironmentalContext
    ) -> List[HealthInsight]:
        """Analyze heart rate with environmental context."""
        insights = []
        
        if hr is None:
            return insights
        
        # Base insight
        hr_insight = HealthInsight(
            metric="Heart Rate",
            value=hr,
            context=f"Current: {hr:.0f} bpm"
        )
        
        # Compare with resting HR
        if resting_hr is not None:
            elevation = hr - resting_hr
            if elevation > 20:
                hr_insight.context += f" (elevated by {elevation:.0f} bpm from resting)"
                if env.temperature is not None and env.temperature > 25:
                    hr_insight.correlation = f"High temperature ({env.temperature:.1f}°C) may be contributing to elevated HR"
                    hr_insight.recommendation = "Stay hydrated and avoid intense activity in heat"
            elif elevation > 10:
                hr_insight.context += f" (slightly elevated by {elevation:.0f} bpm)"
        
        # Temperature correlation
        if env.temperature is not None:
            if env.temperature > 25:
                expected_hr_increase = (env.temperature - 22) * HealthInsightsCalculator.TEMP_HR_CORRELATION_THRESHOLD
                if hr_insight.correlation is None:
                    hr_insight.correlation = f"Temperature ({env.temperature:.1f}°C) may increase HR by ~{expected_hr_increase:.0f} bpm"
            elif env.temperature < 15:
                hr_insight.correlation = f"Cool temperature ({env.temperature:.1f}°C) - HR may be lower than usual"
        
        # Air quality correlation
        if env.pm25 is not None and env.pm25 > HealthInsightsCalculator.PM25_HR_THRESHOLD:
            if hr_insight.correlation:
                hr_insight.correlation += f". Poor air quality (PM2.5: {env.pm25:.1f} μg/m³) may also affect HR"
            else:
                hr_insight.correlation = f"Poor air quality (PM2.5: {env.pm25:.1f} μg/m³) may be affecting HR"
            hr_insight.recommendation = "Consider indoor activity when air quality improves"
        
        if env.pm10 is not None and env.pm10 > HealthInsightsCalculator.PM10_HR_THRESHOLD:
            if hr_insight.correlation and "air quality" not in hr_insight.correlation.lower():
                hr_insight.correlation += f". High PM10 ({env.pm10:.1f} μg/m³) may affect breathing"
        
        insights.append(hr_insight)
        return insights
    
    @staticmethod
    def analyze_activity(
        steps: int,
        calories: int,
        env: EnvironmentalContext
    ) -> List[HealthInsight]:
        """Analyze activity levels with environmental context."""
        insights = []
        
        # Steps insight
        steps_insight = HealthInsight(
            metric="Steps",
            value=steps,
            context=f"Today: {steps:,} steps"
        )
        
        # Activity level assessment
        if steps >= 10000:
            steps_insight.context += " - Excellent activity level!"
        elif steps >= 7500:
            steps_insight.context += " - Good activity level"
        elif steps >= 5000:
            steps_insight.context += " - Moderate activity"
        else:
            steps_insight.context += " - Low activity today"
            if env.temperature is not None:
                temp_min, temp_max = HealthInsightsCalculator.OPTIMAL_TEMP_FOR_ACTIVITY
                if temp_min <= env.temperature <= temp_max:
                    steps_insight.recommendation = f"Perfect weather ({env.temperature:.1f}°C) - great time for outdoor activity!"
                elif env.temperature > temp_max:
                    steps_insight.recommendation = f"Warm weather ({env.temperature:.1f}°C) - consider early morning or evening activity"
                else:
                    steps_insight.recommendation = f"Cool weather ({env.temperature:.1f}°C) - dress warmly for outdoor activity"
        
        # Weather correlation
        if env.weather_description:
            if "clear" in env.weather_description.lower() or "sunny" in env.weather_description.lower():
                if steps < 5000:
                    steps_insight.correlation = "Clear weather - perfect for outdoor activity"
            elif "rain" in env.weather_description.lower() or "snow" in env.weather_description.lower():
                steps_insight.correlation = f"Weather: {env.weather_description} - may limit outdoor activity"
        
        insights.append(steps_insight)
        
        # Calories insight
        calories_insight = HealthInsight(
            metric="Active Calories",
            value=calories,
            context=f"Today: {calories:,} kcal"
        )
        
        if calories >= 500:
            calories_insight.context += " - Great calorie burn!"
        elif calories >= 300:
            calories_insight.context += " - Good calorie burn"
        
        insights.append(calories_insight)
        return insights
    
    @staticmethod
    def generate_correlations(
        health: HealthMetrics,
        env: EnvironmentalContext
    ) -> List[str]:
        """Generate correlation statements."""
        correlations = []
        
        # HR vs Temperature
        if health.heart_rate is not None and env.temperature is not None:
            if env.temperature > 25:
                correlations.append(f"Your HR ({health.heart_rate:.0f} bpm) may be elevated due to high temperature ({env.temperature:.1f}°C)")
            elif env.temperature < 15:
                correlations.append(f"Cool temperature ({env.temperature:.1f}°C) may result in lower HR than usual")
        
        # HR vs Air Quality
        if health.heart_rate is not None:
            if env.pm25 is not None and env.pm25 > HealthInsightsCalculator.PM25_HR_THRESHOLD:
                correlations.append(f"Elevated HR may be related to poor air quality (PM2.5: {env.pm25:.1f} μg/m³)")
            if env.pm10 is not None and env.pm10 > HealthInsightsCalculator.PM10_HR_THRESHOLD:
                correlations.append(f"High PM10 ({env.pm10:.1f} μg/m³) may affect breathing and HR")
        
        # Activity vs Weather
        if health.steps > 0 and env.weather_description:
            if "clear" in env.weather_description.lower() or "sunny" in env.weather_description.lower():
                if health.steps >= 10000:
                    correlations.append("Great activity on a clear day!")
            elif "rain" in env.weather_description.lower():
                correlations.append("Rainy weather may have limited outdoor activity")
        
        # Activity vs Temperature
        if health.steps > 0 and env.temperature is not None:
            temp_min, temp_max = HealthInsightsCalculator.OPTIMAL_TEMP_FOR_ACTIVITY
            if temp_min <= env.temperature <= temp_max:
                if health.steps >= 10000:
                    correlations.append(f"Optimal temperature ({env.temperature:.1f}°C) for high activity")
            elif env.temperature > temp_max:
                correlations.append(f"Warm weather ({env.temperature:.1f}°C) may reduce activity levels")
        
        return correlations
    
    @staticmethod
    def generate_recommendations(
        health: HealthMetrics,
        env: EnvironmentalContext
    ) -> List[str]:
        """Generate personalized recommendations."""
        recommendations = []
        
        # Activity recommendations
        if health.steps < 5000:
            if env.temperature is not None:
                temp_min, temp_max = HealthInsightsCalculator.OPTIMAL_TEMP_FOR_ACTIVITY
                if temp_min <= env.temperature <= temp_max:
                    recommendations.append(f"Perfect weather ({env.temperature:.1f}°C) - great time for a walk or run!")
                elif env.temperature > temp_max:
                    recommendations.append(f"Warm weather ({env.temperature:.1f}°C) - consider early morning or evening activity")
                else:
                    recommendations.append(f"Cool weather ({env.temperature:.1f}°C) - dress warmly for outdoor activity")
        
        # Air quality recommendations
        if env.pm25 is not None and env.pm25 > HealthInsightsCalculator.PM25_HR_THRESHOLD:
            recommendations.append(f"Air quality is moderate (PM2.5: {env.pm25:.1f} μg/m³) - sensitive individuals should limit outdoor activity")
        
        if env.pm10 is not None and env.pm10 > HealthInsightsCalculator.PM10_HR_THRESHOLD:
            recommendations.append(f"High PM10 ({env.pm10:.1f} μg/m³) - consider indoor alternatives")
        
        # HR recommendations
        if health.heart_rate is not None and health.resting_heart_rate is not None:
            elevation = health.heart_rate - health.resting_heart_rate
            if elevation > 20:
                if env.temperature is not None and env.temperature > 25:
                    recommendations.append("Elevated HR in hot weather - stay hydrated and rest if needed")
                elif env.pm25 is not None and env.pm25 > HealthInsightsCalculator.PM25_HR_THRESHOLD:
                    recommendations.append("Elevated HR may be related to air quality - consider indoor rest")
                else:
                    recommendations.append("Elevated HR - may indicate stress or fatigue, consider rest")
        
        # Goal progress
        if health.steps > 0:
            goal_progress = (health.steps / 10000) * 100
            if goal_progress < 50:
                recommendations.append(f"Daily goal: {goal_progress:.0f}% complete - good time for activity")
            elif goal_progress >= 100:
                recommendations.append("Daily goal exceeded - excellent work!")
        
        return recommendations
    
    @staticmethod
    def generate_trend_indicators(
        health: HealthMetrics,
        env: EnvironmentalContext
    ) -> List[str]:
        """Generate trend indicators (simplified - no historical data yet)."""
        indicators = []
        
        # Activity trends (would need historical data for real trends)
        if health.steps >= 10000:
            indicators.append("High activity level today")
        elif health.steps >= 7500:
            indicators.append("Good activity level")
        
        # Environmental impact indicators
        if env.temperature is not None:
            temp_min, temp_max = HealthInsightsCalculator.OPTIMAL_TEMP_FOR_ACTIVITY
            if temp_min <= env.temperature <= temp_max:
                indicators.append("Optimal temperature for activity")
            elif env.temperature > temp_max:
                indicators.append("Warm weather may reduce activity")
        
        if env.pm25 is not None and env.pm25 < 15:
            indicators.append("Good air quality - ideal for outdoor activity")
        elif env.pm25 is not None and env.pm25 > HealthInsightsCalculator.PM25_HR_THRESHOLD:
            indicators.append("Moderate air quality - may affect activity")
        
        return indicators
    
    @classmethod
    def calculate(
        cls,
        health: HealthMetrics,
        env: EnvironmentalContext
    ) -> HealthInsightsResult:
        """
        Calculate health insights with environmental context.
        
        Args:
            health: Current health metrics
            env: Environmental context
        
        Returns:
            HealthInsightsResult with insights, correlations, and recommendations
        """
        # Analyze individual metrics
        insights = []
        insights.extend(cls.analyze_heart_rate(health.heart_rate, health.resting_heart_rate, env))
        insights.extend(cls.analyze_activity(health.steps, health.active_calories, env))
        
        # Generate correlations
        correlations = cls.generate_correlations(health, env)
        
        # Generate recommendations
        recommendations = cls.generate_recommendations(health, env)
        
        # Generate trend indicators
        trend_indicators = cls.generate_trend_indicators(health, env)
        
        # Prepare health metrics dict
        health_metrics = {
            "steps": health.steps,
            "active_calories": health.active_calories,
            "heart_rate": health.heart_rate,
            "resting_heart_rate": health.resting_heart_rate,
        }
        
        # Prepare environmental context dict
        environmental_context = {
            "temperature": env.temperature,
            "humidity": env.humidity,
            "pm25": env.pm25,
            "pm10": env.pm10,
            "air_quality_status": env.air_quality_status,
            "weather_description": env.weather_description,
        }
        
        return HealthInsightsResult(
            health_metrics=health_metrics,
            environmental_context=environmental_context,
            insights=insights,
            correlations=correlations,
            recommendations=recommendations,
            trend_indicators=trend_indicators,
        )




