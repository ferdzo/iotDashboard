"""
Run Suitability Calculator

Combines weather, air quality, and health data to determine if conditions are suitable for running.
Provides time-based recommendations and personalized insights.
"""

from typing import List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, time


@dataclass
class WeatherData:
    """Weather data for run suitability analysis."""
    temperature: float
    apparent_temperature: float
    wind_speed: float  # km/h
    precipitation: float  # mm
    rain: float  # mm
    weather_code: int
    humidity: float  # %
    cloud_cover: float  # %


@dataclass
class AirQualityData:
    """Air quality data for run suitability analysis."""
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    status: str = "Unknown"


@dataclass
class HealthData:
    """Health data for run suitability analysis."""
    steps_today: int = 0
    active_calories: int = 0
    heart_rate: Optional[float] = None
    resting_heart_rate: Optional[float] = None
    daily_goal_steps: int = 10000  # Default goal


@dataclass
class RunSuitabilityScore:
    """Run suitability results with breakdown."""
    status: str  # "GO", "MODERATE", "NO"
    overall_score: float  # 0-100
    weather_score: float
    air_quality_score: float
    health_score: float
    primary_reason: str
    detailed_insights: List[str]
    time_recommendations: List[str]
    suggestions: List[str]


class RunSuitabilityCalculator:
    """Calculate run suitability from weather, air quality, and health data."""
    
    # Optimal ranges for running
    OPTIMAL_TEMP_RANGE = (10.0, 20.0)  # °C - ideal for running
    ACCEPTABLE_TEMP_RANGE = (5.0, 25.0)  # °C - acceptable but not ideal
    MAX_WIND_SPEED = 25.0  # km/h - above this is too windy
    MAX_PRECIPITATION = 0.5  # mm - light drizzle OK, more is not
    MAX_PM25 = 35.0  # μg/m³ - WHO unhealthy threshold
    MAX_PM10 = 50.0  # μg/m³ - WHO unhealthy threshold
    MODERATE_PM25 = 15.0  # μg/m³ - moderate threshold
    MODERATE_PM10 = 20.0  # μg/m³ - moderate threshold
    
    # Time-based recommendations
    BEST_TIMES = [
        (time(6, 0), time(8, 0), "Early morning - cool temperatures, low pollution"),
        (time(18, 0), time(20, 0), "Evening - comfortable temperatures, good visibility"),
    ]
    
    @staticmethod
    def calculate_weather_score(weather: WeatherData) -> Tuple[float, List[str]]:
        """Calculate weather suitability score (0-100)."""
        score = 100.0
        issues = []
        
        # Temperature scoring
        temp = weather.temperature
        if RunSuitabilityCalculator.OPTIMAL_TEMP_RANGE[0] <= temp <= RunSuitabilityCalculator.OPTIMAL_TEMP_RANGE[1]:
            # Perfect temperature
            pass
        elif RunSuitabilityCalculator.ACCEPTABLE_TEMP_RANGE[0] <= temp <= RunSuitabilityCalculator.ACCEPTABLE_TEMP_RANGE[1]:
            # Acceptable but not ideal
            if temp < RunSuitabilityCalculator.OPTIMAL_TEMP_RANGE[0]:
                deviation = RunSuitabilityCalculator.OPTIMAL_TEMP_RANGE[0] - temp
                score -= deviation * 5  # -5 points per degree below optimal
                issues.append(f"Cool ({temp:.1f}°C) - dress warmly")
            else:
                deviation = temp - RunSuitabilityCalculator.OPTIMAL_TEMP_RANGE[1]
                score -= deviation * 3  # -3 points per degree above optimal
                issues.append(f"Warm ({temp:.1f}°C) - stay hydrated")
        else:
            # Too cold or too hot
            if temp < RunSuitabilityCalculator.ACCEPTABLE_TEMP_RANGE[0]:
                score -= 50
                issues.append(f"Too cold ({temp:.1f}°C) - not suitable for running")
            else:
                score -= 50
                issues.append(f"Too hot ({temp:.1f}°C) - risk of heat exhaustion")
        
        # Wind scoring
        if weather.wind_speed > RunSuitabilityCalculator.MAX_WIND_SPEED:
            score -= 30
            issues.append(f"High wind ({weather.wind_speed:.1f} km/h) - difficult conditions")
        elif weather.wind_speed > 15.0:
            score -= 10
            issues.append(f"Moderate wind ({weather.wind_speed:.1f} km/h) - may affect pace")
        
        # Precipitation scoring
        if weather.precipitation > RunSuitabilityCalculator.MAX_PRECIPITATION:
            score -= 40
            if weather.rain > 0:
                issues.append(f"Rain ({weather.rain:.1f} mm) - slippery conditions")
            else:
                issues.append(f"Precipitation ({weather.precipitation:.1f} mm) - wet conditions")
        
        # Weather code (snow, thunderstorms, etc.)
        if weather.weather_code >= 71:  # Snow
            score -= 50
            issues.append("Snow - unsafe for running")
        elif weather.weather_code >= 95:  # Thunderstorm
            score -= 60
            issues.append("Thunderstorm - dangerous conditions")
        
        score = max(0, min(100, score))
        return score, issues
    
    @staticmethod
    def calculate_air_quality_score(air_quality: AirQualityData) -> Tuple[float, List[str]]:
        """Calculate air quality suitability score (0-100)."""
        score = 100.0
        issues = []
        
        # PM2.5 scoring
        if air_quality.pm25 is not None:
            if air_quality.pm25 > RunSuitabilityCalculator.MAX_PM25:
                score -= 50
                issues.append(f"Poor air quality (PM2.5: {air_quality.pm25:.1f} μg/m³) - unhealthy for exercise")
            elif air_quality.pm25 > RunSuitabilityCalculator.MODERATE_PM25:
                score -= 20
                issues.append(f"Moderate air quality (PM2.5: {air_quality.pm25:.1f} μg/m³) - sensitive individuals should avoid")
        
        # PM10 scoring
        if air_quality.pm10 is not None:
            if air_quality.pm10 > RunSuitabilityCalculator.MAX_PM10:
                score -= 50
                issues.append(f"Poor air quality (PM10: {air_quality.pm10:.1f} μg/m³) - unhealthy for exercise")
            elif air_quality.pm10 > RunSuitabilityCalculator.MODERATE_PM10:
                score -= 20
                issues.append(f"Moderate air quality (PM10: {air_quality.pm10:.1f} μg/m³) - may affect breathing")
        
        # Status-based scoring
        status_lower = air_quality.status.lower()
        if "unhealthy" in status_lower or "hazardous" in status_lower:
            score = min(score, 30)
        elif "moderate" in status_lower or "sensitive" in status_lower:
            score = min(score, 70)
        
        score = max(0, min(100, score))
        return score, issues
    
    @staticmethod
    def calculate_health_score(health: HealthData) -> Tuple[float, List[str]]:
        """Calculate health context score (0-100)."""
        score = 100.0
        insights = []
        
        # Check if user is already very active today
        if health.steps_today > 15000:
            score -= 10
            insights.append("High activity today - consider rest or light activity")
        elif health.steps_today > 10000:
            insights.append(f"Good activity level ({health.steps_today:,} steps) - ready for a run")
        
        # Check daily goal progress
        goal_progress = (health.steps_today / health.daily_goal_steps) * 100 if health.daily_goal_steps > 0 else 0
        if goal_progress < 50:
            insights.append(f"Daily goal: {goal_progress:.0f}% complete - good time for a run")
        elif goal_progress > 100:
            insights.append("Daily goal exceeded - great job!")
        
        # Heart rate context
        if health.heart_rate is not None:
            if health.heart_rate > 100:
                score -= 15
                insights.append(f"Elevated heart rate ({health.heart_rate:.0f} bpm) - may need rest")
            elif health.heart_rate > 85:
                score -= 5
                insights.append(f"Slightly elevated HR ({health.heart_rate:.0f} bpm) - consider lighter activity")
        
        if health.resting_heart_rate is not None and health.heart_rate is not None:
            hr_elevation = health.heart_rate - health.resting_heart_rate
            if hr_elevation > 20:
                insights.append("Heart rate significantly elevated - may indicate stress or fatigue")
        
        score = max(0, min(100, score))
        return score, insights
    
    @staticmethod
    def get_time_recommendations(current_time: Optional[datetime] = None) -> List[str]:
        """Get time-based recommendations for running."""
        if current_time is None:
            current_time = datetime.now()
        
        current_hour = current_time.hour
        recommendations = []
        
        # Check if current time is in an optimal range
        in_optimal_time = False
        for start_time, end_time, description in RunSuitabilityCalculator.BEST_TIMES:
            if start_time.hour <= current_hour < end_time.hour:
                recommendations.append(f"Current time is ideal: {description}")
                in_optimal_time = True
                break
        
        if not in_optimal_time:
            # Find next optimal time window
            next_window = None
            for start_time, end_time, description in RunSuitabilityCalculator.BEST_TIMES:
                if current_hour < start_time.hour:
                    # This window is later today
                    hours_until = start_time.hour - current_hour
                    next_window = (hours_until, start_time, description, "today")
                    break
            
            # If no window found later today, next window is tomorrow morning
            if next_window is None:
                first_start, _, first_desc = RunSuitabilityCalculator.BEST_TIMES[0]
                hours_until = (24 - current_hour) + first_start.hour
                next_window = (hours_until, first_start, first_desc, "tomorrow")
            
            if next_window:
                hours_until, next_start, description, when = next_window
                recommendations.append(
                    f"Next optimal time: {next_start.strftime('%I:%M %p')} {when} "
                    f"(in {hours_until} hours) - {description}"
                )
        
        return recommendations
    
    @classmethod
    def calculate(
        cls,
        weather: WeatherData,
        air_quality: AirQualityData,
        health: HealthData,
        current_time: Optional[datetime] = None
    ) -> RunSuitabilityScore:
        """
        Calculate overall run suitability.
        
        Args:
            weather: Weather data
            air_quality: Air quality data
            health: Health data
            current_time: Current time for recommendations (default: now)
        
        Returns:
            RunSuitabilityScore with status, scores, and insights
        """
        if current_time is None:
            current_time = datetime.now()
        
        # Calculate component scores
        weather_score, weather_issues = cls.calculate_weather_score(weather)
        air_quality_score, air_quality_issues = cls.calculate_air_quality_score(air_quality)
        health_score, health_insights = cls.calculate_health_score(health)
        
        # Weighted overall score
        overall_score = (
            weather_score * 0.40 +
            air_quality_score * 0.35 +
            health_score * 0.25
        )
        
        # Determine status
        if overall_score >= 75:
            status = "GO"
        elif overall_score >= 50:
            status = "MODERATE"
        else:
            status = "NO"
        
        # Primary reason
        primary_reason = "Conditions are perfect for running!"
        if status == "NO":
            if weather_score < 50:
                primary_reason = weather_issues[0] if weather_issues else "Weather conditions are poor"
            elif air_quality_score < 50:
                primary_reason = air_quality_issues[0] if air_quality_issues else "Air quality is poor"
            else:
                primary_reason = "Conditions are not suitable for running"
        elif status == "MODERATE":
            if weather_score < 70:
                primary_reason = weather_issues[0] if weather_issues else "Weather conditions are moderate"
            elif air_quality_score < 70:
                primary_reason = air_quality_issues[0] if air_quality_issues else "Air quality is moderate"
            else:
                primary_reason = "Conditions are okay, but not ideal"
        
        # Combine all insights
        detailed_insights = []
        detailed_insights.extend(weather_issues)
        detailed_insights.extend(air_quality_issues)
        detailed_insights.extend(health_insights)
        
        # Time recommendations
        time_recommendations = cls.get_time_recommendations(current_time)
        
        # Suggestions
        suggestions = []
        if status == "GO":
            suggestions.append("Perfect conditions - enjoy your run!")
            if health.steps_today < health.daily_goal_steps * 0.5:
                suggestions.append("Great time to work toward your daily step goal")
        elif status == "MODERATE":
            suggestions.append("Conditions are acceptable - consider shorter or easier route")
            if weather_score < 70:
                suggestions.append("Dress appropriately for weather conditions")
            if air_quality_score < 70:
                suggestions.append("Sensitive individuals should consider indoor alternatives")
        else:
            suggestions.append("Consider indoor workout or wait for better conditions")
            if weather_score < 50:
                suggestions.append("Check weather forecast for better times")
            if air_quality_score < 50:
                suggestions.append("Air quality should improve later - check back in a few hours")
        
        return RunSuitabilityScore(
            status=status,
            overall_score=round(overall_score, 1),
            weather_score=round(weather_score, 1),
            air_quality_score=round(air_quality_score, 1),
            health_score=round(health_score, 1),
            primary_reason=primary_reason,
            detailed_insights=detailed_insights,
            time_recommendations=time_recommendations,
            suggestions=suggestions,
        )




