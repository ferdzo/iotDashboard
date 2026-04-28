"""
Comfort Index Calculation Module

Combines temperature, humidity, CO₂, noise, and air quality into a weighted comfort score.
Score range: 0-100 (100 = optimal comfort)
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ComfortMetrics:
    """Raw environmental metrics for comfort calculation."""
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    co2: Optional[float] = None
    noise: Optional[float] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    light: Optional[float] = None
    timestamp: Optional[datetime] = None


@dataclass
class ComfortScore:
    """Comfort index results with component scores."""
    overall_score: float  # 0-100
    temperature_score: float
    humidity_score: float
    air_quality_score: float
    acoustic_score: float
    light_score: float
    rating: str  # "Excellent", "Good", "Fair", "Poor", "Very Poor"
    suggestions: List[str]

class ComfortIndexCalculator:
    """Calculate multi-factor comfort index from environmental sensors."""
    
    # Optimal ranges (comfort score = 100 at these values)
    OPTIMAL_TEMP_RANGE = (20.0, 24.0)      # °C
    OPTIMAL_HUMIDITY_RANGE = (40.0, 60.0)  # %
    OPTIMAL_CO2_MAX = 800                   # ppm (< 1000 is good)
    OPTIMAL_NOISE_MAX = 40                  # dB (office environment)
    OPTIMAL_PM25_MAX = 12                   # μg/m³ (WHO guideline)
    OPTIMAL_PM10_MAX = 20                   # μg/m³
    OPTIMAL_LIGHT_RANGE = (300, 500)       # Lux (office work)
    
    # Weights for overall score (must sum to 1.0)
    WEIGHTS = {
        'temperature': 0.25,
        'humidity': 0.15,
        'air_quality': 0.30,
        'acoustic': 0.15,
        'light': 0.15,
    }
    
    @staticmethod
    def calculate_temperature_score(temp: float) -> Tuple[float, List[str]]:
        """Score temperature comfort (0-100)."""
        suggestions = []
        optimal_min, optimal_max = ComfortIndexCalculator.OPTIMAL_TEMP_RANGE
        
        if optimal_min <= temp <= optimal_max:
            score = 100.0
        elif temp < optimal_min:
            deviation = optimal_min - temp
            score = max(0, 100 - (deviation * 10))  # -10 points per degree below
            if deviation > 2:
                suggestions.append(f"Temperature too cold ({temp:.1f}°C). Increase heating to {optimal_min}-{optimal_max}°C")
        else:
            deviation = temp - optimal_max
            score = max(0, 100 - (deviation * 10))  # -10 points per degree above
            if deviation > 2:
                suggestions.append(f"Temperature too warm ({temp:.1f}°C). Increase cooling to {optimal_min}-{optimal_max}°C")
        
        return score, suggestions
    
    @staticmethod
    def calculate_humidity_score(humidity: float) -> Tuple[float, List[str]]:
        """Score humidity comfort (0-100)."""
        suggestions = []
        optimal_min, optimal_max = ComfortIndexCalculator.OPTIMAL_HUMIDITY_RANGE
        
        if optimal_min <= humidity <= optimal_max:
            score = 100.0
        elif humidity < optimal_min:
            # Too dry
            deviation = optimal_min - humidity
            score = max(0, 100 - (deviation * 2))  # -2 points per % below
            if deviation > 10:
                suggestions.append(f"Air too dry ({humidity:.1f}%). Use humidifier to reach {optimal_min}-{optimal_max}%")
        else:
            # Too humid
            deviation = humidity - optimal_max
            score = max(0, 100 - (deviation * 2))  # -2 points per % above
            if deviation > 10:
                suggestions.append(f"Air too humid ({humidity:.1f}%). Use dehumidifier to reach {optimal_min}-{optimal_max}%")
        
        return score, suggestions
    
    @staticmethod
    def calculate_air_quality_score(co2: Optional[float], pm25: Optional[float], pm10: Optional[float]) -> Tuple[float, List[str]]:
        """Score air quality based on CO₂ and particulate matter (0-100)."""
        suggestions = []
        scores = []
        
        # CO₂ score
        if co2 is not None:
            if co2 <= ComfortIndexCalculator.OPTIMAL_CO2_MAX:
                co2_score = 100.0
            elif co2 <= 1000:
                # Acceptable range (800-1000 ppm)
                co2_score = 100 - ((co2 - 800) / 2)  # -0.5 points per ppm
            else:
                # Poor air quality
                co2_score = max(0, 50 - ((co2 - 1000) / 20))  # Drops to 0 at 2000 ppm
                if co2 > 1500:
                    suggestions.append(f"CO₂ level very high ({co2:.0f} ppm). Increase ventilation immediately")
                else:
                    suggestions.append(f"CO₂ level elevated ({co2:.0f} ppm). Improve ventilation")
            scores.append(co2_score)
        
        # PM2.5 score
        if pm25 is not None:
            if pm25 <= ComfortIndexCalculator.OPTIMAL_PM25_MAX:
                pm25_score = 100.0
            elif pm25 <= 35.4:
                pm25_score = 100 - ((pm25 - 12) / 0.234)
            else:
                pm25_score = 0
                suggestions.append(f"PM2.5 unhealthy ({pm25:.1f} μg/m³). Use air purifier and avoid outdoor air")
            scores.append(pm25_score)
        
        # PM10 score
        if pm10 is not None:
            if pm10 <= ComfortIndexCalculator.OPTIMAL_PM10_MAX:
                pm10_score = 100.0
            elif pm10 <= 50:  # Acceptable
                pm10_score = 100 - ((pm10 - 20) / 0.3)
            else:
                pm10_score = max(0, 50 - (pm10 - 50))
                if pm10 > 100:
                    suggestions.append(f"PM10 very high ({pm10:.1f} μg/m³). Close windows and use filtration")
            scores.append(pm10_score)
        
        score = sum(scores) / len(scores) if scores else 50.0
        return score, suggestions
    
    @staticmethod
    def calculate_acoustic_score(noise: float) -> Tuple[float, List[str]]:
        """Score acoustic comfort based on noise level (0-100)."""
        suggestions = []
        
        if noise <= ComfortIndexCalculator.OPTIMAL_NOISE_MAX:
            score = 100.0
        elif noise <= 55:
            score = 100 - ((noise - 40) * 3)
        elif noise <= 70:  # Noisy
            score = max(0, 55 - ((noise - 55) * 2))
            suggestions.append(f"Noise level high ({noise:.1f} dB). Consider noise-canceling or quieter environment")
        else:  # Very noisy
            score = 0
            suggestions.append(f"Noise level very high ({noise:.1f} dB). Immediate action needed for hearing protection")
        
        return score, suggestions
    
    @staticmethod
    def calculate_light_score(light: float) -> Tuple[float, List[str]]:
        """Score lighting comfort (0-100)."""
        suggestions = []
        optimal_min, optimal_max = ComfortIndexCalculator.OPTIMAL_LIGHT_RANGE
        
        if optimal_min <= light <= optimal_max:
            score = 100.0
        elif light < optimal_min:
            # Too dark
            if light < 100:
                score = 0
                suggestions.append(f"Lighting very dim ({light:.0f} lux). Increase to {optimal_min}-{optimal_max} lux")
            else:
                score = (light / optimal_min) * 100
                suggestions.append(f"Lighting insufficient ({light:.0f} lux). Increase to {optimal_min}-{optimal_max} lux")
        else:
            # Too bright
            if light > 1000:
                score = max(0, 100 - ((light - 1000) / 10))
                suggestions.append(f"Lighting very bright ({light:.0f} lux). May cause glare. Reduce to {optimal_min}-{optimal_max} lux")
            else:
                score = 100 - ((light - optimal_max) / 5)
        
        return score, suggestions
    
    @staticmethod
    def get_rating(score: float) -> str:
        """Convert numeric score to rating."""
        if score >= 90:
            return "Excellent"
        elif score >= 75:
            return "Good"
        elif score >= 60:
            return "Fair"
        elif score >= 40:
            return "Poor"
        else:
            return "Very Poor"
    
    @classmethod
    def calculate(cls, metrics: ComfortMetrics) -> ComfortScore:
        """
        Calculate overall comfort index from environmental metrics.
        
        Args:
            metrics: ComfortMetrics with sensor readings
            
        Returns:
            ComfortScore with overall score and component breakdowns
        """
        all_suggestions = []
        component_scores = {}
        
        # Temperature
        if metrics.temperature is not None:
            temp_score, temp_suggestions = cls.calculate_temperature_score(metrics.temperature)
            component_scores['temperature'] = temp_score
            all_suggestions.extend(temp_suggestions)
        else:
            component_scores['temperature'] = 50.0  # 
        
        # Humidity
        if metrics.humidity is not None:
            humidity_score, humidity_suggestions = cls.calculate_humidity_score(metrics.humidity)
            component_scores['humidity'] = humidity_score
            all_suggestions.extend(humidity_suggestions)
        else:
            component_scores['humidity'] = 50.0
        
        # Air Quality (CO₂ + PM)
        air_score, air_suggestions = cls.calculate_air_quality_score(
            metrics.co2, metrics.pm25, metrics.pm10
        )
        component_scores['air_quality'] = air_score
        all_suggestions.extend(air_suggestions)
        
        # Acoustic
        if metrics.noise is not None:
            acoustic_score, acoustic_suggestions = cls.calculate_acoustic_score(metrics.noise)
            component_scores['acoustic'] = acoustic_score
            all_suggestions.extend(acoustic_suggestions)
        else:
            component_scores['acoustic'] = 50.0
        
        # Light
        if metrics.light is not None:
            light_score, light_suggestions = cls.calculate_light_score(metrics.light)
            component_scores['light'] = light_score
            all_suggestions.extend(light_suggestions)
        else:
            component_scores['light'] = 50.0
        
        # Calculate weighted overall score
        overall = sum(
            component_scores[key] * cls.WEIGHTS[key]
            for key in cls.WEIGHTS.keys()
        )
        
        return ComfortScore(
            overall_score=round(overall, 1),
            temperature_score=round(component_scores['temperature'], 1),
            humidity_score=round(component_scores['humidity'], 1),
            air_quality_score=round(component_scores['air_quality'], 1),
            acoustic_score=round(component_scores['acoustic'], 1),
            light_score=round(component_scores['light'], 1),
            rating=cls.get_rating(overall),
            suggestions=all_suggestions,
        )


def calculate_comfort_index_from_telemetry(telemetry_data: Dict[str, float]) -> ComfortScore:
    """
    Convenience function to calculate comfort index from telemetry dictionary.
    
    Args:
        telemetry_data: Dict with metric names as keys, e.g. {"temperature": 22.5, "humidity": 45}
        
    Returns:
        ComfortScore
    """
    metrics = ComfortMetrics(
        temperature=telemetry_data.get('temperature'),
        humidity=telemetry_data.get('humidity'),
        co2=telemetry_data.get('co2') or telemetry_data.get('CO2'),
        noise=telemetry_data.get('noise') or telemetry_data.get('sound'),
        pm25=telemetry_data.get('pm2.5') or telemetry_data.get('PM2.5'),
        pm10=telemetry_data.get('pm10') or telemetry_data.get('PM10'),
        light=telemetry_data.get('light') or telemetry_data.get('lux'),
    )
    
    return ComfortIndexCalculator.calculate(metrics)
