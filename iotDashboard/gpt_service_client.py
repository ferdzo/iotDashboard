"""
Client for GPT Service microservice.

Handles communication between Django and the GPT analysis service.
"""

import httpx
import logging
from typing import List, Dict, Any, Optional, Literal
from django.conf import settings

logger = logging.getLogger(__name__)


class GPTServiceError(Exception):
    """Exception raised when GPT service request fails."""
    
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class GPTServiceClient:
    """Client for interacting with the GPT analysis microservice."""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        """
        Initialize GPT service client.
        
        Args:
            base_url: Base URL of GPT service (default: from settings or http://localhost:8001)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or getattr(settings, 'GPT_SERVICE_URL', 'http://localhost:8001')
        self.timeout = timeout
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=timeout)
        logger.info(f"Initialized GPTServiceClient with base_url={self.base_url}")

    async def health_check(self) -> Dict[str, Any]:
        """
        Check if GPT service is healthy.
        
        Returns:
            Dict with status information
            
        Raises:
            httpx.HTTPError: If service is unreachable
        """
        try:
            response = await self.client.get("/health")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"GPT service health check failed: {e}")
            raise

    async def generate_daily_briefing(
        self,
        briefing_type: Literal["schedule", "environment", "full"],
        current_time: str,
        indoor_data: Optional[Dict[str, Any]] = None,
        outdoor_data: Optional[Dict[str, Any]] = None,
        health_data: Optional[Dict[str, Any]] = None,
        calendar_events: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a daily briefing for office workers.
        
        Args:
            briefing_type: 'schedule', 'environment', or 'full'
            current_time: Current time in ISO format
            indoor_data: Indoor environment readings
            outdoor_data: Weather and air quality data
            health_data: Health/fitness metrics
            calendar_events: List of upcoming calendar events
            
        Returns:
            Dict with status_emoji, status_line, insights, recommendations
            
        Raises:
            GPTServiceError: If request fails
        """
        payload = {
            "briefing_type": briefing_type,
            "current_time": current_time,
        }
        
        if indoor_data:
            payload["indoor_data"] = indoor_data
        if outdoor_data:
            payload["outdoor_data"] = outdoor_data
        if health_data:
            payload["health_data"] = health_data
        if calendar_events:
            payload["calendar_events"] = calendar_events
        
        try:
            logger.info(f"Requesting {briefing_type} daily briefing")
            response = await self.client.post("/daily-briefing", json=payload)
            response.raise_for_status()
            result = response.json()
            logger.info(f"Daily briefing generated successfully")
            return result
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            logger.error(f"GPT service returned error {e.response.status_code}: {error_detail}")
            raise GPTServiceError(
                message=f"GPT service error: {error_detail}",
                status_code=e.response.status_code,
                details={"response": error_detail}
            )
        except httpx.RequestError as e:
            logger.error(f"Failed to connect to GPT service: {e}")
            raise GPTServiceError(
                message=f"GPT service unavailable: {str(e)}",
                status_code=503,
                details={"error": str(e)}
            )
        except Exception as e:
            logger.error(f"Failed to generate daily briefing: {e}")
            raise GPTServiceError(
                message=f"Briefing generation failed: {str(e)}",
                details={"error": str(e)}
            )

    async def analyze_telemetry(
        self,
        telemetry_data: List[Dict[str, Any]],
        device_info: Optional[Dict[str, Any]] = None,
        prompt_type: Literal["anomaly_detection", "trend_summary", "custom"] = "trend_summary",
        custom_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze telemetry data using GPT service.
        
        Args:
            telemetry_data: List of telemetry data points with keys:
                - device_id: str
                - metric: str
                - value: float
                - timestamp: str (ISO format)
            device_info: Optional device metadata (name, location, etc.)
            prompt_type: Type of analysis to perform
            custom_prompt: Custom prompt for 'custom' type
            
        Returns:
            Dict containing:
                - analysis: str (AI-generated analysis)
                - prompt_type: str
                - data_points_analyzed: int
                
        Raises:
            ValueError: If telemetry_data is empty
            httpx.HTTPError: If service request fails
        """
        if not telemetry_data:
            raise ValueError("telemetry_data cannot be empty")

        payload = {
            "telemetry_data": telemetry_data,
            "device_info": device_info or {},
            "prompt_type": prompt_type,
        }

        if custom_prompt:
            payload["custom_prompt"] = custom_prompt

        try:
            logger.info(
                f"Requesting {prompt_type} analysis for {len(telemetry_data)} data points"
            )
            response = await self.client.post("/analyze", json=payload)
            response.raise_for_status()
            result = response.json()
            logger.info(
                f"Analysis completed: {result.get('data_points_analyzed')} points analyzed"
            )
            return result
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            logger.error(
                f"GPT service returned error {e.response.status_code}: {error_detail}"
            )
            raise GPTServiceError(
                message=f"GPT service error: {error_detail}",
                status_code=e.response.status_code,
                details={"response": error_detail}
            )
        except httpx.RequestError as e:
            logger.error(f"Failed to connect to GPT service: {e}")
            raise GPTServiceError(
                message=f"GPT service unavailable: {str(e)}",
                status_code=503,
                details={"error": str(e)}
            )
        except Exception as e:
            logger.error(f"Failed to analyze telemetry: {e}")
            raise GPTServiceError(
                message=f"Analysis failed: {str(e)}",
                details={"error": str(e)}
            )

    async def detect_anomalies(
        self,
        telemetry_data: List[Dict[str, Any]],
        device_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Detect anomalies in telemetry data.
        
        Convenience method for anomaly_detection analysis.
        
        Returns:
            Dict with analysis containing:
                - status: normal|warning|critical
                - summary: Brief overview
                - anomalies: List of detected anomalies
                - impacts: List of potential impacts
                - actions: List of recommended actions
        """
        result = await self.analyze_telemetry(
            telemetry_data=telemetry_data,
            device_info=device_info,
            prompt_type="anomaly_detection"
        )
        return result

    async def summarize_trends(
        self,
        telemetry_data: List[Dict[str, Any]],
        device_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Summarize trends in telemetry data.
        
        Convenience method for trend_summary analysis.
        
        Returns:
            Dict with analysis containing:
                - status: excellent|good|fair|poor
                - summary: Brief overview
                - trends: List of metric trends
                - comfort_score: Overall comfort rating
                - patterns: Identified patterns
                - recommendations: Suggested actions
        """
        result = await self.analyze_telemetry(
            telemetry_data=telemetry_data,
            device_info=device_info,
            prompt_type="trend_summary"
        )
        return result

    async def close(self):
        """Close the HTTP client connection."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()


def format_telemetry_for_gpt(queryset, device_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Format Django Telemetry queryset for GPT service.
    
    Args:
        queryset: Django queryset of Telemetry objects
        device_id: Optional device_id to include in each point
        
    Returns:
        List of dicts formatted for GPT service
    """
    data = []
    for point in queryset:
        data.append({
            "device_id": device_id or point.device_id,
            "metric": point.metric,
            "value": float(point.value),
            "timestamp": point.time.isoformat(),
        })
    return data


_client_instance = None


def get_gpt_client() -> GPTServiceClient:
    """
    Get or create singleton GPT service client instance.
    
    Returns:
        GPTServiceClient instance
    """
    global _client_instance
    if _client_instance is None:
        _client_instance = GPTServiceClient()
    return _client_instance


async def analyze_telemetry(
    telemetry_data: List[Dict[str, Any]],
    device_info: Optional[Dict[str, Any]] = None,
    prompt_type: Literal["anomaly_detection", "trend_summary", "custom"] = "trend_summary",
    custom_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Module-level function to analyze telemetry data.
    
    Uses singleton client instance. Convenience wrapper for Django views.
    
    Args:
        telemetry_data: List of telemetry data points
        device_info: Optional device metadata
        prompt_type: Type of analysis to perform
        custom_prompt: Custom prompt for 'custom' type
        
    Returns:
        Dict containing analysis results
        
    Raises:
        GPTServiceError: If analysis fails
    """
    client = get_gpt_client()
    return await client.analyze_telemetry(
        telemetry_data=telemetry_data,
        device_info=device_info,
        prompt_type=prompt_type,
        custom_prompt=custom_prompt
    )