import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def get_gemini_model(model_name: str = "gemini-pro"):
    """Get a Gemini model instance"""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set in environment variables")
    return genai.GenerativeModel(model_name)


def generate_text(prompt: str, model_name: str = "gemini-pro") -> str:
    """Generate text using Gemini"""
    model = get_gemini_model(model_name)
    response = model.generate_content(prompt)
    return response.text

