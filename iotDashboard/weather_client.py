"""
Weather and Air Quality API clients.

Weather data: Open-Meteo (https://open-meteo.com)
Air Quality data: Pulse.eco (https://pulse.eco)
"""
import requests
from typing import Optional


def fetch_current_weather(latitude: float, longitude: float) -> dict:
    """
    Fetch current weather data using Open-Meteo API (no API key required).
    
    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate
    
    Returns:
        dict: Current weather data
    """
    base_url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m",
        "timezone": "auto",
    }
    response = requests.get(base_url, params=params, timeout=10)
    response.raise_for_status()
    return response.json()


def parse_weather_data(weather_data: dict, location_name: Optional[str] = None) -> dict:
    """
    Parse relevant weather information from Open-Meteo API response.
    
    Args:
        weather_data: Raw API response from Open-Meteo
        location_name: Optional human-readable location name
    
    Returns:
        dict: Parsed weather data with standardized fields
    """
    current = weather_data.get("current", {})
    
    # Weather code to description mapping (WMO Weather interpretation codes)
    weather_codes = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    }
    
    weather_code = current.get("weather_code", 0)
    
    parsed_data = {
        "location": location_name or f"({weather_data.get('latitude')}, {weather_data.get('longitude')})",
        "temperature": current.get("temperature_2m"),
        "apparent_temperature": current.get("apparent_temperature"),
        "humidity": current.get("relative_humidity_2m"),
        "weather_description": weather_codes.get(weather_code, "Unknown"),
        "weather_code": weather_code,
        "precipitation": current.get("precipitation"),
        "rain": current.get("rain"),
        "cloud_cover": current.get("cloud_cover"),
        "wind_speed": current.get("wind_speed_10m"),
        "wind_direction": current.get("wind_direction_10m"),
        "time": current.get("time"),
        "timezone": weather_data.get("timezone"),
    }
    return parsed_data


def get_air_quality(city: str) -> dict:
    """
    Fetch current air quality data from Pulse.eco API.
    
    Pulse.eco provides air quality data for cities in North Macedonia and other regions.
    No API key required for public data.
    
    Args:
        city: City name (e.g., 'skopje', 'bitola', 'tetovo')
    
    Returns:
        dict: Current air quality measurements
        
    Raises:
        requests.HTTPError: If city not found or API error
    """
    base_url = f"https://{city.lower()}.pulse.eco/rest/current"
    
    response = requests.get(base_url, timeout=10)
    response.raise_for_status()
    return response.json()


def parse_air_quality_data(air_quality_data: list, city: str) -> dict:
    """
    Parse air quality data from Pulse.eco API response.
    
    Args:
        air_quality_data: List of sensor measurements from Pulse.eco
        city: City name
    
    Returns:
        dict: Aggregated air quality data with averages per pollutant
    """
    if not air_quality_data:
        return {
            "city": city,
            "measurements": {},
            "status": "No data available"
        }
    
    # Aggregate measurements by type
    pollutants = {}
    for measurement in air_quality_data:
        pollutant_type = measurement.get("type")
        value = measurement.get("value")
        
        if pollutant_type and value is not None:
            # Convert value to float (API might return string)
            try:
                value_float = float(value)
                if pollutant_type not in pollutants:
                    pollutants[pollutant_type] = []
                pollutants[pollutant_type].append(value_float)
            except (ValueError, TypeError):
                # Skip invalid values
                continue
    
    # Calculate averages
    averages = {}
    for pollutant, values in pollutants.items():
        averages[pollutant] = {
            "average": sum(values) / len(values),
            "min": min(values),
            "max": max(values),
            "count": len(values),
        }
    
    # Determine overall AQI status based on PM10 (most common metric)
    pm10_avg = averages.get("pm10", {}).get("average")
    if pm10_avg is not None:
        if pm10_avg <= 20:
            status = "Good"
        elif pm10_avg <= 40:
            status = "Moderate"
        elif pm10_avg <= 50:
            status = "Unhealthy for Sensitive Groups"
        elif pm10_avg <= 100:
            status = "Unhealthy"
        elif pm10_avg <= 150:
            status = "Very Unhealthy"
        else:
            status = "Hazardous"
    else:
        status = "Unknown"
    
    return {
        "city": city,
        "measurements": averages,
        "status": status,
        "timestamp": air_quality_data[0].get("stamp") if air_quality_data else None,
        "sensor_count": len(air_quality_data),
    }


def get_weather_by_city(city: str) -> dict:
    """
    Fetch weather data by city name (geocodes city first).
    
    Uses Open-Meteo geocoding API to convert city name to coordinates,
    then fetches weather data.
    
    Args:
        city: City name (e.g., "Skopje", "Berlin")
    
    Returns:
        dict: Parsed weather data
    """
    # Geocode city name to coordinates
    geocode_url = "https://geocoding-api.open-meteo.com/v1/search"
    geocode_params = {
        "name": city,
        "count": 1,
        "language": "en",
        "format": "json",
    }
    
    geocode_response = requests.get(geocode_url, params=geocode_params, timeout=10)
    geocode_response.raise_for_status()
    geocode_data = geocode_response.json()
    
    if not geocode_data.get("results"):
        raise ValueError(f"City '{city}' not found")
    
    location = geocode_data["results"][0]
    latitude = location["latitude"]
    longitude = location["longitude"]
    location_name = location.get("name", city)
    
    # Fetch weather data
    weather_data = fetch_current_weather(latitude, longitude)
    return parse_weather_data(weather_data, location_name)