import requests

from config import SARVAM_API_KEY

LANGUAGE_CODES = {
    "English": "en-IN", "Hindi": "hi-IN", "Kannada": "kn-IN", "Tamil": "ta-IN",
    "Telugu": "te-IN", "Malayalam": "ml-IN",
}


def translate_text(text: str, target_language: str) -> str:
    """Translate user-facing advice with Sarvam; English does not need a network call."""
    target_code = LANGUAGE_CODES.get(target_language)
    if not target_code:
        raise ValueError("Unsupported target language")
    if target_code == "en-IN":
        return text
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY is not configured")
    response = requests.post(
        "https://api.sarvam.ai/translate",
        headers={"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"},
        json={"input": text, "source_language_code": "en-IN", "target_language_code": target_code},
        timeout=30,
    )
    response.raise_for_status()
    translated = response.json().get("translated_text")
    if not translated:
        raise RuntimeError("Sarvam returned no translated text")
    return translated
