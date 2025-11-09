"""Client for GPT Service API."""

import httpx
from typing import List, Dict, Any, Optional, Literal
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

GPT_SERVICE_URL = "http://localhost:8001"


@dataclass
class AnalysisResponse:
    """Response from GPT service analysis."""
    analysis: str
    prompt_type: str
    data_points_analyzed: int


class GPTServiceError(Exception):
    """Exception raised for GPT service API errors."""
    
    def __init__(self, message: str, status_code: int = None, details: Any = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


async def analyze_telemetry(
    telemetry_data: List[Dict[str, Any]],
    device_info: Optional[Dict[str, Any]] = None,
    prompt_type: Literal["anomaly_detection", "trend_summary", "custom"] = "trend_summary",
    custom_prompt: Optional[str] = None
) -> AnalysisResponse:
    """
    Analyze telemetry data using GPT service.
    
    Args:
        telemetry_data: List of dicts with device_id, metric, value, timestamp
        device_info: Optional device metadata for context
        prompt_type: Type of analysis (anomaly_detection, trend_summary, custom)
        custom_prompt: Custom prompt for 'custom' type
    
    Returns:
        AnalysisResponse with analysis, prompt_type, and data_points_analyzed
    
    Raises:
        GPTServiceError: If the API request fails
    """
    payload = {
        "telemetry_data": telemetry_data,
        "device_info": device_info or {},
        "prompt_type": prompt_type,
        "custom_prompt": custom_prompt
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{GPT_SERVICE_URL}/analyze",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                return AnalysisResponse(
                    analysis=data['analysis'],
                    prompt_type=data['prompt_type'],
                    data_points_analyzed=data['data_points_analyzed']
                )
            else:
                error_data = response.json() if response.text else {}
                raise GPTServiceError(
                    message=error_data.get('detail', 'GPT service request failed'),
                    status_code=response.status_code,
                    details=error_data
                )
    
    except httpx.TimeoutException:
        raise GPTServiceError(
            message="GPT service request timed out",
            status_code=504
        )
    except httpx.ConnectError:
        raise GPTServiceError(
            message="Could not connect to GPT service. Is it running on port 8001?",
            status_code=503
        )
    except Exception as e:
        if isinstance(e, GPTServiceError):
            raise
        logger.error(f"Unexpected error calling GPT service: {str(e)}")
        raise GPTServiceError(
            message=f"Unexpected error: {str(e)}",
            status_code=500
        )


async def health_check() -> bool:
    """
    Check if GPT service is healthy.
    
    Returns:
        True if service is healthy, False otherwise
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{GPT_SERVICE_URL}/health")
            return response.status_code == 200
    except Exception as e:
        logger.warning(f"GPT service health check failed: {str(e)}")
        return False
