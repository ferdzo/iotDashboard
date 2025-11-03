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

    def analyze_metrics(self, metrics: dict) -> str:
        """Analyze given metrics using GPT model and return insights."""
        prompt = f"Analyze the following metrics and provide insights:\n{metrics}"
        try:
            response = openai.Completion.create(
                engine=self.model_name,
                prompt=prompt,
                max_tokens=150,
                n=1,
                stop=None,
                temperature=0.7,
            )
            insights = response.choices[0].text.strip()
            self.logger.info("Successfully obtained insights from GPT model")
            return insights
        except Exception as e:
            self.logger.error(f"Error during GPT analysis: {e}")
            raise