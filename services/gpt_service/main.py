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
    # Startup
    logger.info("Initializing GPT Service...")
    gpt_service = GPTService()
    logger.info("GPT Service initialized successfully")
    yield
    # Shutdown (cleanup if needed)
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
        
        # Convert Pydantic models to dicts for GPTService
        telemetry_dicts = [point.model_dump() for point in request.telemetry_data]
        
        # Call GPT service analysis
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