from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal
from contextlib import asynccontextmanager
from gpt_service import GPTService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

gpt_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown."""
    global gpt_service
    logger.info("Initializing GPT Service...")
    gpt_service = GPTService()
    logger.info("GPT Service initialized successfully")
    yield
    logger.info("Shutting down GPT Service...")


app = FastAPI(lifespan=lifespan)


class TelemetryDataPoint(BaseModel):
    device_id: str
    metric: str
    value: float
    timestamp: str

class AnalyzeRequest(BaseModel):
    telemetry_data: List[TelemetryDataPoint] = Field(..., description="Array of telemetry data points")
    device_info: Dict[str, Any] = Field(default_factory=dict, description="Device metadata")
    prompt_type: Literal["anomaly_detection", "trend_summary", "custom"] = Field(
        default="trend_summary",
        description="Type of analysis to perform"
    )
    custom_prompt: str | None = Field(None, description="Custom prompt for 'custom' type")

class AnalyzeResponse(BaseModel):
    analysis: str
    prompt_type: str
    data_points_analyzed: int


class CalendarEvent(BaseModel):
    summary: str
    start: str
    end: str | None = None
    location: str | None = None


class DailyBriefingRequest(BaseModel):
    briefing_type: Literal["schedule", "environment", "full"] = Field(
        default="full",
        description="Type of briefing to generate"
    )
    current_time: str = Field(..., description="Current time in ISO format")
    indoor_data: Dict[str, Any] | None = Field(None, description="Indoor environment readings")
    outdoor_data: Dict[str, Any] | None = Field(None, description="Weather and air quality data")
    health_data: Dict[str, Any] | None = Field(None, description="Health/fitness metrics")
    calendar_events: List[CalendarEvent] | None = Field(None, description="Upcoming calendar events")


class DailyBriefingResponse(BaseModel):
    status_emoji: str
    status_line: str
    insights: List[str]
    recommendations: List[str]
    briefing_type: str
    generated_at: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "gpt_service"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_telemetry(request: AnalyzeRequest):
    """
    Analyze telemetry data using GPT model.
    Receives formatted telemetry data from Django and returns AI insights.
    """
    try:
        if not gpt_service:
            raise HTTPException(status_code=503, detail="GPT service not initialized")
        
        if not request.telemetry_data:
            raise HTTPException(status_code=400, detail="No telemetry data provided")
        
        logger.info(f"Analyzing {len(request.telemetry_data)} telemetry points with prompt_type={request.prompt_type}")
        
        telemetry_dicts = [point.model_dump() for point in request.telemetry_data]
        
        analysis_result = await gpt_service.analyze(
            telemetry_data=telemetry_dicts,
            device_info=request.device_info,
            prompt_type=request.prompt_type,
            custom_prompt=request.custom_prompt
        )
        
        return AnalyzeResponse(
            analysis=analysis_result,
            prompt_type=request.prompt_type,
            data_points_analyzed=len(request.telemetry_data)
        )
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/daily-briefing", response_model=DailyBriefingResponse)
async def generate_daily_briefing(request: DailyBriefingRequest):
    """
    Generate a daily briefing for office workers.
    Combines environment, schedule, and health data into actionable insights.
    """
    try:
        if not gpt_service:
            raise HTTPException(status_code=503, detail="GPT service not initialized")
        
        logger.info(f"Generating {request.briefing_type} briefing")
        
        calendar_events = None
        if request.calendar_events:
            calendar_events = [event.model_dump() for event in request.calendar_events]
        
        result = await gpt_service.generate_daily_briefing(
            briefing_type=request.briefing_type,
            current_time=request.current_time,
            indoor_data=request.indoor_data,
            outdoor_data=request.outdoor_data,
            health_data=request.health_data,
            calendar_events=calendar_events,
        )
        
        return DailyBriefingResponse(**result)
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Briefing generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Briefing generation failed: {str(e)}")