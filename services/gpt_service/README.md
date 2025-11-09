# GPT Service

FastAPI microservice for AI-powered environmental telemetry analysis using OpenAI GPT models.

## Purpose

Provides intelligent analysis of IoT environmental sensor data to ensure optimal working conditions. The service specializes in monitoring indoor environmental quality metrics (temperature, humidity, CO2, etc.) with context-aware insights based on industry standards (ASHRAE, WHO, OSHA).

**Goal**: Smart IoT dashboard that maintains healthy, comfortable, and productive work environments through AI-driven insights.

## Architecture

- **Input**: Telemetry data + device context from Django
- **Processing**: OpenAI GPT API with specialized prompts
- **Output**: Actionable insights and analysis
- **State**: Stateless - no database, pure text processing

## Setup

1. **Install dependencies**:
```bash
uv sync
```

2. **Configure environment**:
```bash
cp .env.sample .env
# Edit .env with your OpenAI API key
```

3. **Run the service**:
```bash
uv run uvicorn main:app --reload --port 8001
```

## API Endpoints

### POST /analyze

Analyze telemetry data with AI.

**Request**:
```json
{
  "telemetry_data": [
    {
      "device_id": "abc123",
      "metric": "temperature",
      "value": 23.5,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "device_info": {
    "name": "Sensor-01",
    "location": "Lab A"
  },
  "prompt_type": "trend_summary",
  "custom_prompt": null
}
```

**Prompt Types**:
- `trend_summary`: Environmental quality trends with comfort assessment
- `anomaly_detection`: Identify deviations from optimal ranges with severity
- `custom`: Use custom_prompt field

**Supported Metrics** (with industry-standard optimal ranges):
- `temperature`: Indoor temperature (18-24°C optimal)
- `humidity`: Relative humidity (30-60% optimal)
- `co2`: Carbon dioxide concentration (400-1000ppm optimal)
- `pressure`: Atmospheric pressure (1013-1023hPa optimal)
- `light`: Illuminance level (300-500 lux optimal)
- `noise`: Sound level (30-50dB optimal)
- `pm25`: Fine particulate matter (0-12 µg/m³ optimal)
- `voc`: Volatile organic compounds (0-220ppb optimal)

Each metric includes:
- Optimal and comfort ranges
- Critical thresholds
- Health/productivity impact assessment
- Specific concerns (e.g., mold growth for humidity, cognitive impact for CO2)

**Response**:
```json
{
  "analysis": "The temperature data shows...",
  "prompt_type": "trend_summary",
  "data_points_analyzed": 100
}
```

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "service": "gpt_service"
}
```

## Environment Variables

- `API_KEY`: OpenAI API key (required)
- `PROVIDER_NAME`: AI provider (default: "openai")
- `MODEL_NAME`: OpenAI model (default: "gpt-4o-mini")
- `HOST_URL`: Service URL (default: "http://localhost:8001")
- `LOG_LEVEL`: Logging level (default: "INFO")

## Integration with Django

Django backend should:
1. Query telemetry from PostgreSQL/TimescaleDB
2. Format data as array of `{device_id, metric, value, timestamp}`
3. Add device context in `device_info`
4. POST to `/analyze` endpoint
5. Return analysis to frontend

Example Django integration:
```python
import httpx

async def get_telemetry_insights(device_id: str, metric: str = None):
    # Query telemetry
    telemetry = Telemetry.objects.filter(device_id=device_id)
    if metric:
        telemetry = telemetry.filter(metric=metric)
    
    # Format data
    data = [
        {
            "device_id": t.device_id,
            "metric": t.metric,
            "value": t.value,
            "timestamp": t.timestamp.isoformat()
        }
        for t in telemetry[:100]  # Limit to last 100 points
    ]
    
    # Get device info
    device = Device.objects.get(device_id=device_id)
    device_info = {
        "name": device.name,
        "location": device.location
    }
    
    # Call GPT service
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8001/analyze",
            json={
                "telemetry_data": data,
                "device_info": device_info,
                "prompt_type": "trend_summary"
            }
        )
        return response.json()
```

## Testing

```bash
# Health check
curl http://localhost:8001/health

# Test analysis
curl -X POST http://localhost:8001/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "telemetry_data": [
      {"device_id": "test", "metric": "temperature", "value": 23.5, "timestamp": "2024-01-15T10:30:00Z"}
    ],
    "prompt_type": "trend_summary"
  }'
```

## Development

- **Stateless design** - No database required
- **Metric-aware** - Specialized prompts for 8 environmental metrics
- **Standards-based** - Uses ASHRAE, WHO, OSHA guidelines
- **Context-rich** - Includes optimal ranges, thresholds, and impact assessments
- **Async/await** - Non-blocking OpenAI API calls
- **Error handling** - Proper HTTP exceptions with logging
- **Type safety** - Pydantic models and type hints throughout

## Analysis Features

### Metric-Specific Intelligence

The service automatically detects which metrics are in your telemetry data and provides specialized analysis:

**Temperature Analysis**:
- Optimal range: 18-24°C (comfort zone: 20-22°C)
- Assesses impact on worker productivity and equipment
- Identifies HVAC performance issues
- Recommends energy efficiency improvements

**Humidity Analysis**:
- Optimal range: 30-60% (comfort zone: 40-50%)
- Warns about mold risk (>60%) and static electricity (<30%)
- Evaluates respiratory health impact
- Suggests ventilation adjustments

**CO2 Analysis**:
- Optimal range: 400-1000ppm (comfort zone: 400-800ppm)
- Links high CO2 to cognitive performance decline
- Assesses ventilation effectiveness
- Recommends occupancy adjustments

**And more** for pressure, light, noise, PM2.5, and VOC metrics.

### Analysis Types

1. **Trend Summary** (`prompt_type: "trend_summary"`):
   - Overall environmental quality rating
   - Time spent in optimal vs suboptimal ranges
   - Daily patterns and correlations
   - Predictive insights and optimization opportunities

2. **Anomaly Detection** (`prompt_type: "anomaly_detection"`):
   - Identifies deviations from optimal ranges
   - Severity assessment (low/medium/high/critical)
   - Root cause analysis (HVAC, occupancy, external factors)
   - Prioritized action items

3. **Custom Analysis** (`prompt_type: "custom"`):
   - Use your own prompt
   - Still includes metric context and standards
   - Flexible for specific use cases

## Notes

- Service is stateless by design
- Django provides all data context
- No direct database access
- Focuses on text transformation only
- Aligns with microservices architecture pattern
