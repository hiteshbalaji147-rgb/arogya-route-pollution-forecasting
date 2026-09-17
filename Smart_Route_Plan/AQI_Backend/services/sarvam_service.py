import logging

import requests

from config import SARVAM_API_KEY

logger = logging.getLogger(__name__)

# A failed provider should not be retried for every static string during the
# same application run.  The next restart will try the provider again.
_translation_api_available: bool | None = None

LANGUAGE_CODES = {
    "English": "en-IN",
    "Hindi": "hi-IN",
    "Kannada": "kn-IN",
    "Tamil": "ta-IN",
    "Telugu": "te-IN",
    "Malayalam": "ml-IN",
    "Marathi": "mr-IN",
    "Bengali": "bn-IN",
    "Gujarati": "gu-IN",
    "Punjabi": "pa-IN",
    "Odia": "od-IN",
    "Assamese": "as-IN",
    "en-IN": "en-IN",
    "hi-IN": "hi-IN",
    "kn-IN": "kn-IN",
    "ta-IN": "ta-IN",
    "te-IN": "te-IN",
    "ml-IN": "ml-IN",
    "mr-IN": "mr-IN",
    "bn-IN": "bn-IN",
    "gu-IN": "gu-IN",
    "pa-IN": "pa-IN",
    "od-IN": "od-IN",
    "as-IN": "as-IN",
}

LANGUAGE_NAMES = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "kn-IN": "Kannada",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "ml-IN": "Malayalam",
    "English": "English",
    "Hindi": "Hindi",
    "Kannada": "Kannada",
    "Tamil": "Tamil",
    "Telugu": "Telugu",
    "Malayalam": "Malayalam",
    "mr-IN": "Marathi", "bn-IN": "Bengali", "gu-IN": "Gujarati",
    "pa-IN": "Punjabi", "od-IN": "Odia", "as-IN": "Assamese",
    "Marathi": "Marathi", "Bengali": "Bengali", "Gujarati": "Gujarati",
    "Punjabi": "Punjabi", "Odia": "Odia", "Assamese": "Assamese",
}


def normalize_language_code(target: str) -> str:
    value = (target or "").strip()
    if value in LANGUAGE_CODES:
        return LANGUAGE_CODES[value]
    # An administrator can supply an explicit provider language code.
    if len(value) in (2, 3) and value.isalpha():
        short_code = value.lower()
        return {
            "en": "en-IN", "hi": "hi-IN", "kn": "kn-IN", "ta": "ta-IN",
            "te": "te-IN", "ml": "ml-IN", "mr": "mr-IN", "bn": "bn-IN",
            "gu": "gu-IN", "pa": "pa-IN", "od": "od-IN", "as": "as-IN",
        }.get(short_code, short_code)
    if len(value) == 5 and value[2] == "-" and value[:2].isalpha() and value[3:].isalpha():
        return f"{value[:2].lower()}-{value[3:].upper()}"
    return "en-IN"


def normalize_language_name(target: str) -> str:
    value = (target or "").strip()
    if value in LANGUAGE_NAMES:
        return LANGUAGE_NAMES[value]
    # Preserve a new language name instead of silently converting it to English.
    return value.title() if value else "English"


def translate_text(text: str, target_language: str) -> str:
    """Translate text with Sarvam AI; English does not need a network call."""
    if not text or not text.strip():
        return text

    target_code = normalize_language_code(target_language)
    if target_code == "en-IN":
        return text

    global _translation_api_available

    if not SARVAM_API_KEY:
        logger.warning("SARVAM_API_KEY is not configured; returning source text")
        return text

    if _translation_api_available is False:
        return text

    try:
        response = requests.post(
            "https://api.sarvam.ai/translate",
            headers={
                "api-subscription-key": SARVAM_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "input": text,
                "source_language_code": "en-IN",
                "target_language_code": target_code
            },
            timeout=15,
        )
        if response.status_code == 429:
            _translation_api_available = False
            logger.warning("Sarvam translation rate limit reached; returning source text")
            return text
        response.raise_for_status()
    except requests.RequestException as exc:
        # Translation is an optional enhancement.  Never prevent API startup or
        # a user request from succeeding when the upstream provider is offline.
        _translation_api_available = False
        logger.warning("Sarvam translation request failed; returning source text: %s", exc)
        return text

    translated = response.json().get("translated_text")
    if not translated:
        logger.warning("Sarvam returned an empty translation; returning source text")
        return text

    _translation_api_available = True
    return translated
