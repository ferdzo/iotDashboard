from openai import OpenAI
from typing import List, Dict, Any
from datetime import datetime

from config import API_KEY, MODEL_NAME, PROVIDER_NAME, HOST_URL, LOG_LEVEL
import logging

class GPTService:
    def __init__(self):
        self.api_key = API_KEY
        self.model_name = MODEL_NAME
        self.provider_name = PROVIDER_NAME
        self.host_url = HOST_URL

        logging.basicConfig(level=getattr(logging, LOG_LEVEL.upper(), logging.INFO))
        self.logger = logging.getLogger(__name__)

        if self.provider_name == "openai":
            self.client = OpenAI(api_key=self.api_key)
            self.logger.info(f"Initialized OpenAI GPTService with model {self.model_name}")
        else:
            self.logger.error(f"Unsupported provider: {self.provider_name}")
            raise ValueError(f"Unsupported provider: {self.provider_name}")

    def _get_metric_specific_context(self, metric: str) -> Dict[str, Any]:
        """Get metric-specific optimal ranges and context for environmental monitoring."""
        
        metric_contexts = {
            "temperature": {
                "unit": "°C",
                "optimal_range": (18, 24),
                "comfort_range": (20, 22),
                "critical_low": 15,
                "critical_high": 28,
                "context": "indoor environment temperature",
                "concerns": [
                    "Worker comfort and productivity",
                    "Equipment operating conditions",
                    "Energy efficiency",
                    "HVAC system performance"
                ]
            },
            "humidity": {
                "unit": "%",
                "optimal_range": (30, 60),
                "comfort_range": (40, 50),
                "critical_low": 20,
                "critical_high": 70,
                "context": "relative humidity",
                "concerns": [
                    "Mold and mildew growth (>60%)",
                    "Static electricity and equipment damage (<30%)",
                    "Respiratory health and comfort",
                    "Material degradation"
                ]
            },
            "co2": {
                "unit": "ppm",
                "optimal_range": (400, 1000),
                "comfort_range": (400, 800),
                "critical_low": 350,
                "critical_high": 1500,
                "context": "carbon dioxide concentration",
                "concerns": [
                    "Air quality and ventilation effectiveness",
                    "Cognitive performance (>1000ppm affects decision-making)",
                    "Occupant health and alertness",
                    "HVAC system efficiency"
                ]
            },
            "pressure": {
                "unit": "hPa",
                "optimal_range": (1013, 1023),
                "comfort_range": (1013, 1020),
                "critical_low": 980,
                "critical_high": 1050,
                "context": "atmospheric pressure",
                "concerns": [
                    "Weather changes and ventilation",
                    "Building pressurization",
                    "Equipment calibration",
                    "Occupant comfort"
                ]
            },
            "light": {
                "unit": "lux",
                "optimal_range": (300, 500),
                "comfort_range": (400, 500),
                "critical_low": 200,
                "critical_high": 1000,
                "context": "illuminance level",
                "concerns": [
                    "Visual comfort and eye strain",
                    "Productivity and task performance",
                    "Energy consumption",
                    "Circadian rhythm regulation"
                ]
            },
            "noise": {
                "unit": "dB",
                "optimal_range": (30, 50),
                "comfort_range": (35, 45),
                "critical_low": 20,
                "critical_high": 70,
                "context": "noise level",
                "concerns": [
                    "Acoustic comfort and concentration",
                    "Speech intelligibility",
                    "Stress and productivity impact",
                    "Hearing protection requirements (>85dB)"
                ]
            },
            "pm25": {
                "unit": "µg/m³",
                "optimal_range": (0, 12),
                "comfort_range": (0, 10),
                "critical_low": 0,
                "critical_high": 35,
                "context": "fine particulate matter (PM2.5)",
                "concerns": [
                    "Air quality and health risk",
                    "Respiratory system impact",
                    "Filter maintenance requirements",
                    "Outdoor air quality correlation"
                ]
            },
            "voc": {
                "unit": "ppb",
                "optimal_range": (0, 220),
                "comfort_range": (0, 150),
                "critical_low": 0,
                "critical_high": 500,
                "context": "volatile organic compounds",
                "concerns": [
                    "Indoor air quality",
                    "Off-gassing from materials",
                    "Ventilation effectiveness",
                    "Occupant health symptoms"
                ]
            }
        }
        
        # Default for unknown metrics
        default = {
            "unit": "",
            "optimal_range": None,
            "comfort_range": None,
            "critical_low": None,
            "critical_high": None,
            "context": f"{metric} measurement",
            "concerns": ["Monitor for unexpected changes", "Verify sensor accuracy"]
        }
        
        return metric_contexts.get(metric.lower(), default)

    def _build_prompt(
        self,
        telemetry_data: List[Dict[str, Any]],
        device_info: Dict[str, Any],
        prompt_type: str,
        custom_prompt: str | None = None
    ) -> str:
        """Build analysis prompt based on type with metric-specific context."""
        
        # Format telemetry data for prompt
        data_summary = self._format_telemetry_summary(telemetry_data)
        device_context = self._format_device_info(device_info)
        
        # Get metrics present in data
        metrics_in_data = set(point.get("metric", "").lower() for point in telemetry_data)
        
        # Build metric-specific context
        metric_context_lines = []
        for metric in metrics_in_data:
            if metric:
                ctx = self._get_metric_specific_context(metric)
                metric_context_lines.append(f"\n**{metric.upper()}** ({ctx['context']}):")
                if ctx['optimal_range']:
                    metric_context_lines.append(f"  - Optimal Range: {ctx['optimal_range'][0]}-{ctx['optimal_range'][1]} {ctx['unit']}")
                if ctx['comfort_range']:
                    metric_context_lines.append(f"  - Comfort Zone: {ctx['comfort_range'][0]}-{ctx['comfort_range'][1]} {ctx['unit']}")
                if ctx['critical_high']:
                    metric_context_lines.append(f"  - Critical Thresholds: <{ctx['critical_low']} or >{ctx['critical_high']} {ctx['unit']}")
                metric_context_lines.append("  - Key Concerns:")
                for concern in ctx['concerns']:
                    metric_context_lines.append(f"    • {concern}")
        
        metric_context = "\n".join(metric_context_lines) if metric_context_lines else ""
        
        prompts = {
            "anomaly_detection": f"""You are an IoT environmental monitoring specialist. Analyze the telemetry data to detect anomalies and issues.

{device_context}

Environmental Standards:
{metric_context}

Recent Measurements:
{data_summary}

Respond in this EXACT JSON format (no markdown, just valid JSON):
{{
  "status": "normal|warning|critical",
  "summary": "Brief 1-2 sentence overview",
  "anomalies": [
    {{
      "metric": "metric name",
      "severity": "low|medium|high|critical",
      "description": "What's wrong",
      "value": "current value",
      "expected": "expected range"
    }}
  ],
  "impacts": ["Impact 1", "Impact 2"],
  "actions": ["Action 1", "Action 2"],
  "root_causes": ["Cause 1", "Cause 2"]
}}

Keep summary under 50 words, each item under 20 words.""",
            
            "trend_summary": f"""You are an IoT environmental monitoring specialist. Analyze the measurement trends and patterns.

{device_context}

Environmental Standards:
{metric_context}

Measurement History:
{data_summary}

Respond in this EXACT JSON format (no markdown, just valid JSON):
{{
  "status": "excellent|good|fair|poor",
  "summary": "Brief 1-2 sentence overview of conditions",
  "trends": [
    {{
      "metric": "metric name",
      "direction": "improving|stable|degrading",
      "description": "What's happening"
    }}
  ],
  "comfort_score": {{
    "rating": 85,
    "description": "Brief assessment"
  }},
  "patterns": ["Pattern 1", "Pattern 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "forecast": "Brief prediction based on trends"
}}

Keep all text concise: summary under 50 words, each item under 20 words.""",
            
            "custom": custom_prompt or "Analyze the provided telemetry data."
        }
        
        base_prompt = prompts.get(prompt_type, prompts["trend_summary"])
        
        if prompt_type == "custom" and custom_prompt:
            base_prompt = f"{custom_prompt}\n\n{device_context}\n\n{metric_context}\n\nTelemetry Data:\n{data_summary}"
        
        return base_prompt

    def _format_telemetry_summary(self, telemetry_data: List[Dict[str, Any]]) -> str:
        """Format telemetry data into readable summary with full data points."""
        if not telemetry_data:
            return "No data available"
        
        # Group by metric
        metrics = {}
        for point in telemetry_data:
            metric = point.get("metric", "unknown")
            if metric not in metrics:
                metrics[metric] = []
            metrics[metric].append({
                "value": point.get("value"),
                "timestamp": point.get("timestamp"),
                "device_id": point.get("device_id")
            })
        
        # Build summary with full data
        lines = []
        for metric, points in metrics.items():
            values = [p["value"] for p in points if p["value"] is not None]
            if values:
                lines.append(f"\n{metric}:")
                lines.append(f"  Summary Statistics:")
                lines.append(f"    - Data points: {len(values)}")
                lines.append(f"    - Min: {min(values):.2f}")
                lines.append(f"    - Max: {max(values):.2f}")
                lines.append(f"    - Average: {sum(values)/len(values):.2f}")
                lines.append(f"    - Latest: {points[-1]['value']:.2f} at {points[-1]['timestamp']}")
                
                # Include all individual readings for AI analysis
                lines.append(f"  Full Time Series Data:")
                for point in points:
                    lines.append(f"    - {point['timestamp']}: {point['value']:.2f}")
        
        return "\n".join(lines)

    def _format_device_info(self, device_info: Dict[str, Any]) -> str:
        """Format device information for prompt."""
        if not device_info:
            return "Device Context: Not provided"
        
        lines = ["Device Context:"]
        for key, value in device_info.items():
            lines.append(f"  - {key}: {value}")
        
        return "\n".join(lines)

    async def analyze(
        self,
        telemetry_data: List[Dict[str, Any]],
        device_info: Dict[str, Any] = None,
        prompt_type: str = "trend_summary",
        custom_prompt: str | None = None
    ) -> str:
        """
        Analyze telemetry data using OpenAI GPT model.
        
        Args:
            telemetry_data: List of telemetry data points with device_id, metric, value, timestamp
            device_info: Optional device metadata for context
            prompt_type: Type of analysis (anomaly_detection, trend_summary, custom)
            custom_prompt: Custom prompt for 'custom' type
        
        Returns:
            Analysis result as string
        """
        try:
            device_info = device_info or {}
            
            # Build prompt
            prompt = self._build_prompt(telemetry_data, device_info, prompt_type, custom_prompt)
            
            system_prompt = "You are an expert IoT environmental monitoring specialist with deep knowledge of indoor environmental quality standards (ASHRAE, WHO, OSHA guidelines). Your goal is to help maintain optimal working conditions for occupant health, comfort, and productivity. Provide clear, actionable insights with specific metric values and recommendations. Focus on environmental factors that impact human performance and wellbeing."
            
            # Log the complete prompt for debugging/review
            self.logger.info("="*80)
            self.logger.info(f"PROMPT LOGGING - Analysis Type: {prompt_type}")
            self.logger.info("="*80)
            self.logger.info("\n[SYSTEM PROMPT]")
            self.logger.info(system_prompt)
            self.logger.info("\n" + "-"*80)
            self.logger.info("[USER PROMPT]")
            self.logger.info(prompt)
            self.logger.info("="*80)
            
            self.logger.info(f"Sending analysis request to {self.model_name}")
            
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            analysis = response.choices[0].message.content
            self.logger.info(f"Analysis completed successfully. Tokens used: {response.usage.total_tokens}")
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Analysis failed: {str(e)}")
            raise

    async def generate_daily_briefing(
        self,
        briefing_type: str,
        current_time: str,
        indoor_data: Dict[str, Any] | None = None,
        outdoor_data: Dict[str, Any] | None = None,
        health_data: Dict[str, Any] | None = None,
        calendar_events: List[Dict[str, Any]] | None = None,
    ) -> Dict[str, Any]:
        """
        Generate a daily briefing for office workers.
        
        Args:
            briefing_type: 'schedule', 'environment', or 'full'
            current_time: Current time in ISO format
            indoor_data: Indoor environment readings (temp, humidity, co2, etc.)
            outdoor_data: Weather and air quality data
            health_data: Health/fitness metrics (steps, heart rate, etc.)
            calendar_events: List of upcoming calendar events
            
        Returns:
            Dict with status_line, status_emoji, insights, recommendations, context
        """
        try:
            # Build context sections
            context_sections = []
            
            # Current time context
            try:
                dt = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
                time_str = dt.strftime("%A, %B %d at %I:%M %p")
            except:
                time_str = current_time
            context_sections.append(f"Current Time: {time_str}")
            
            # Indoor environment
            if indoor_data:
                indoor_lines = ["Indoor Environment:"]
                for key, value in indoor_data.items():
                    if value is not None:
                        indoor_lines.append(f"  - {key}: {value}")
                context_sections.append("\n".join(indoor_lines))
            
            # Outdoor conditions
            if outdoor_data:
                outdoor_lines = ["Outdoor Conditions:"]
                for key, value in outdoor_data.items():
                    if value is not None:
                        outdoor_lines.append(f"  - {key}: {value}")
                context_sections.append("\n".join(outdoor_lines))
            
            # Health metrics
            if health_data:
                health_lines = ["Health & Activity:"]
                for key, value in health_data.items():
                    if value is not None:
                        health_lines.append(f"  - {key}: {value}")
                context_sections.append("\n".join(health_lines))
            
            # Calendar events
            if calendar_events:
                cal_lines = ["Upcoming Schedule:"]
                for event in calendar_events[:10]:  # Limit to 10 events
                    start = event.get('start', 'TBD')
                    summary = event.get('summary', 'Untitled')
                    location = event.get('location', '')
                    loc_str = f" at {location}" if location else ""
                    cal_lines.append(f"  - {start}: {summary}{loc_str}")
                context_sections.append("\n".join(cal_lines))
            
            context = "\n\n".join(context_sections)
            
            prompts = {
                "schedule": f"""You are a smart wellness coach for office workers (software engineers, tech/finance professionals).
Generate a Schedule Briefing focused on calendar and activity optimization.

{context}

Environmental thresholds for reference:
- CO2 > 1000ppm: cognitive performance drops, ventilate before focused work
- PM2.5 > 35: poor outdoor air, avoid outdoor activities
- Temperature 20-24°C: optimal for focus work
- Steps goal: 10,000/day, take breaks every 2 hours

Respond in this EXACT JSON format (no markdown, just valid JSON):
{{
  "status_emoji": "🟢|🟡|🔴",
  "status_line": "One sentence summary of schedule/activity outlook",
  "insights": [
    "Actionable insight tied to specific time or event",
    "Another insight about activity or scheduling",
    "Insight about outdoor activity timing based on conditions"
  ],
  "recommendations": [
    "Primary recommendation with specific timing",
    "Secondary recommendation"
  ]
}}

Guidelines:
- Tie insights to SPECIFIC upcoming events or time slots
- Suggest activity breaks during schedule gaps
- Recommend outdoor activity timing based on air quality
- Keep each insight under 25 words
- Be specific about times (e.g., "before your 2pm meeting" not "later today")
- Focus on productivity, movement, and work-life balance""",

                "environment": f"""You are a smart wellness coach for office workers (software engineers, tech/finance professionals).
Generate an Environment Briefing focused on indoor workspace conditions.

{context}

Environmental thresholds and their impacts:
- CO2 400-800ppm: optimal | 800-1000ppm: acceptable | >1000ppm: ventilate (affects cognition)
- Temperature 20-22°C: optimal | 18-24°C: acceptable | outside: adjust
- Humidity 40-60%: optimal | <30%: too dry | >70%: too humid
- PM2.5 0-12: good | 12-35: moderate | >35: unhealthy
- Light 400-500 lux: optimal for desk work

Respond in this EXACT JSON format (no markdown, just valid JSON):
{{
  "status_emoji": "🟢|🟡|🔴",
  "status_line": "One sentence summary of workspace conditions",
  "insights": [
    "Insight about most important environmental factor with action",
    "Insight about another condition affecting work",
    "Insight about ventilation or air quality"
  ],
  "recommendations": [
    "Primary action to improve workspace",
    "Secondary recommendation"
  ]
}}

Guidelines:
- If CO2 is high, mention opening windows BEFORE the next meeting/focused work
- Tie environmental actions to upcoming activities when possible
- Be specific about what to do (e.g., "open window" not "improve ventilation")
- Mention how conditions affect cognitive performance
- Keep each insight under 25 words""",

                "full": f"""You are a smart wellness coach for office workers (software engineers, tech/finance professionals).
Generate a comprehensive Daily Briefing combining schedule, environment, and health.

{context}

Environmental thresholds:
- CO2 > 1000ppm: cognitive performance drops
- PM2.5 > 35: poor outdoor air quality
- Temperature 20-24°C: optimal for focus

Health targets:
- 10,000 steps/day
- Movement break every 2 hours
- Heart rate zones for activity planning

Respond in this EXACT JSON format (no markdown, just valid JSON):
{{
  "status_emoji": "🟢|🟡|🔴",
  "status_line": "One sentence overall summary",
  "insights": [
    "Most important cross-domain insight (environment + schedule)",
    "Health/activity insight tied to schedule",
    "Environmental condition affecting upcoming work",
    "Outdoor activity timing recommendation"
  ],
  "recommendations": [
    "Primary recommendation combining multiple factors",
    "Secondary recommendation"
  ]
}}

Guidelines:
- Connect environment to schedule (e.g., "ventilate before your debugging session")
- Suggest activity timing based on air quality AND schedule gaps
- Prioritize actionable insights over status reports
- Be specific about times and actions
- Keep each insight under 25 words"""
            }
            
            prompt = prompts.get(briefing_type, prompts["full"])
            
            system_prompt = """You are an expert wellness coach for knowledge workers. You help office workers (especially software engineers and tech/finance professionals) maintain optimal productivity and health by providing actionable, timing-specific advice.

Your insights should:
1. Be tied to specific times or upcoming events
2. Explain WHY something matters (e.g., "CO2 affects focus")
3. Give specific actions (e.g., "open the window now" not "improve air")
4. Consider work patterns (deep work, meetings, breaks)

Always respond with valid JSON only, no markdown formatting."""

            self.logger.info(f"Generating {briefing_type} briefing")
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            result_text = response.choices[0].message.content
            self.logger.info(f"Briefing generated. Tokens used: {response.usage.total_tokens}")
            
            # Parse JSON response
            import json
            # Clean potential markdown wrapping
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
            result_text = result_text.strip()
            
            result = json.loads(result_text)
            
            return {
                "status_emoji": result.get("status_emoji", "🟢"),
                "status_line": result.get("status_line", "Briefing generated"),
                "insights": result.get("insights", []),
                "recommendations": result.get("recommendations", []),
                "briefing_type": briefing_type,
                "generated_at": current_time,
            }
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse briefing JSON: {e}")
            self.logger.error(f"Raw response: {result_text}")
            return {
                "status_emoji": "⚠️",
                "status_line": "Briefing generated with formatting issues",
                "insights": [result_text[:200] if result_text else "Unable to generate insights"],
                "recommendations": [],
                "briefing_type": briefing_type,
                "generated_at": current_time,
            }
        except Exception as e:
            self.logger.error(f"Briefing generation failed: {str(e)}")
            raise
