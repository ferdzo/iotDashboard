import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY")
PROVIDER_NAME = os.getenv("PROVIDER_NAME", "openai")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4")
HOST_URL = os.getenv("HOST_URL")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")