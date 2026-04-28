# Environmental Monitoring Standards Reference

This document provides the industry-standard optimal ranges used by the GPT service for environmental analysis.

## Supported Metrics

### Temperature (°C)
- **Optimal Range**: 18-24°C
- **Comfort Zone**: 20-22°C
- **Critical Low**: <15°C
- **Critical High**: >28°C
- **Standards**: ASHRAE 55, ISO 7730
- **Key Concerns**:
  - Worker comfort and productivity
  - Equipment operating conditions
  - Energy efficiency
  - HVAC system performance

### Humidity (%)
- **Optimal Range**: 30-60%
- **Comfort Zone**: 40-50%
- **Critical Low**: <20%
- **Critical High**: >70%
- **Standards**: ASHRAE 55, WHO guidelines
- **Key Concerns**:
  - Mold and mildew growth (>60%)
  - Static electricity and equipment damage (<30%)
  - Respiratory health and comfort
  - Material degradation

### CO2 (ppm)
- **Optimal Range**: 400-1000ppm
- **Comfort Zone**: 400-800ppm
- **Critical Low**: <350ppm (unusual indoors)
- **Critical High**: >1500ppm
- **Standards**: ASHRAE 62.1, WHO Air Quality Guidelines
- **Key Concerns**:
  - Air quality and ventilation effectiveness
  - Cognitive performance (>1000ppm affects decision-making)
  - Occupant health and alertness
  - HVAC system efficiency
- **Impact**: Studies show 15% decline in cognitive function at 1400ppm

### Atmospheric Pressure (hPa)
- **Optimal Range**: 1013-1023hPa
- **Comfort Zone**: 1013-1020hPa
- **Critical Low**: <980hPa
- **Critical High**: >1050hPa
- **Key Concerns**:
  - Weather changes and ventilation
  - Building pressurization
  - Equipment calibration
  - Occupant comfort

### Light / Illuminance (lux)
- **Optimal Range**: 300-500 lux
- **Comfort Zone**: 400-500 lux
- **Critical Low**: <200 lux
- **Critical High**: >1000 lux
- **Standards**: EN 12464-1, IESNA recommendations
- **Key Concerns**:
  - Visual comfort and eye strain
  - Productivity and task performance
  - Energy consumption
  - Circadian rhythm regulation
- **Note**: Higher levels (750-1000 lux) for detailed work

### Noise (dB)
- **Optimal Range**: 30-50dB
- **Comfort Zone**: 35-45dB
- **Critical Low**: <20dB (unusual indoors)
- **Critical High**: >70dB
- **Standards**: WHO Noise Guidelines, OSHA
- **Key Concerns**:
  - Acoustic comfort and concentration
  - Speech intelligibility
  - Stress and productivity impact
  - Hearing protection requirements (>85dB)
- **Impact**: 40-45dB ideal for office work, <35dB for focused tasks

### PM2.5 - Fine Particulate Matter (µg/m³)
- **Optimal Range**: 0-12 µg/m³
- **Comfort Zone**: 0-10 µg/m³
- **Critical Low**: 0 µg/m³ (best)
- **Critical High**: >35 µg/m³
- **Standards**: EPA Air Quality Index, WHO guidelines
- **Key Concerns**:
  - Air quality and health risk
  - Respiratory system impact
  - Filter maintenance requirements
  - Outdoor air quality correlation
- **Impact**: >35 µg/m³ = Unhealthy for sensitive groups

### VOC - Volatile Organic Compounds (ppb)
- **Optimal Range**: 0-220ppb
- **Comfort Zone**: 0-150ppb
- **Critical Low**: 0ppb (best)
- **Critical High**: >500ppb
- **Standards**: Various indoor air quality standards
- **Key Concerns**:
  - Indoor air quality
  - Off-gassing from materials
  - Ventilation effectiveness
  - Occupant health symptoms (headaches, irritation)

## Analysis Approach

The GPT service uses these standards to:

1. **Assess Current Conditions**: Compare measurements against optimal ranges
2. **Identify Issues**: Flag deviations with severity levels
3. **Provide Context**: Explain health/productivity impacts
4. **Recommend Actions**: Suggest specific interventions (HVAC, ventilation, etc.)
5. **Predict Trends**: Forecast potential issues based on patterns

## Multi-Metric Correlation

When analyzing multiple metrics together, the service looks for:
- **HVAC Performance**: Temperature + Humidity + CO2 trends
- **Ventilation Effectiveness**: CO2 + PM2.5 + VOC levels
- **Occupancy Impact**: CO2 rise + Temperature increase + Humidity changes
- **Seasonal Patterns**: Pressure + Temperature + Humidity correlations

## References

- ASHRAE Standard 55: Thermal Environmental Conditions for Human Occupancy
- ASHRAE Standard 62.1: Ventilation for Acceptable Indoor Air Quality
- WHO Air Quality Guidelines
- ISO 7730: Ergonomics of the thermal environment
- EN 12464-1: Light and lighting of work places
- EPA Air Quality Index
- OSHA Occupational Noise Exposure Standards

## Usage in Prompts

The service automatically includes relevant standards in analysis prompts based on detected metrics. No manual configuration needed - just send your telemetry data!
