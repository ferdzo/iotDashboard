import openai

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
            openai.api_key = self.api_key
            if self.host_url:
                openai.api_base = self.host_url
            self.logger.info(f"Initialized OpenAI GPTService with model {self.model_name}")
        else:
            self.logger.error(f"Unsupported provider: {self.provider_name}")
            raise ValueError(f"Unsupported provider: {self.provider_name}")

        