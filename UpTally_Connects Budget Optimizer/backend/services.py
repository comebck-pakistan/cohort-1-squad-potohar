import os
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv
from utils import parse_json

# Force Python to find the .env file in this exact same folder
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

# Initialize Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("CRITICAL: GEMINI_API_KEY is missing from environment variables or .env file.")

genai.configure(api_key=GEMINI_API_KEY)


async def call_gemini_stage(stage_name: str, system_instruction: str, prompt: str, temperature: float, max_tokens: int) -> dict:
    stage_model = genai.GenerativeModel(
        model_name="gemini-3.1-flash-lite",
        system_instruction=system_instruction,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_tokens,
            "response_mime_type": "application/json"
        }
    )
    # Non-blocking async generation
    response = await stage_model.generate_content_async(prompt)
    if not response.text:
        raise ValueError(f"Google AI returned no usable text during {stage_name}.")
    return parse_json(response.text, stage_name)