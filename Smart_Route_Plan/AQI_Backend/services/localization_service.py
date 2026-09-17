from sqlalchemy.orm import Session
from services.website_content_service import get_or_create_cached_translation
from services.sarvam_service import translate_text, normalize_language_code

# Sentence-level translation fallbacks to guarantee 100% Hindi/Kannada/Tamil/Telugu/Malayalam translations
SENTENCE_TRANSLATIONS = {
    "hi-IN": {
        "Air quality is acceptable; unusually sensitive people should reduce outdoor activity.":
            "वायु गुणवत्ता स्वीकार्य है; असामान्य रूप से संवेदनशील लोगों को बाहरी गतिविधियों में कमी करनी चाहिए।",
        "Air quality is acceptable; unusually sensitive people should reduce prolonged outdoor exertion.":
            "वायु गुणवत्ता स्वीकार्य है; असामान्य रूप से संवेदनशील लोगों को बाहर की शारीरिक गतिविधि कम करनी चाहिए।",
        "Because the profile lists Asthma, this route is assessed more cautiously.":
            "क्योंकि आपकी प्रोफ़ाइल में अस्थमा सूचीबद्ध है, इसलिए इस मार्ग का अधिक सावधानीपूर्वक मूल्यांकन किया जाता है।",
        "Because the profile lists COPD, this route is assessed more cautiously.":
            "क्योंकि आपकी प्रोफ़ाइल में सीओपीडी सूचीबद्ध है, इसलिए इस मार्ग का अधिक सावधानीपूर्वक मूल्यांकन किया जाता है।",
        "Because the profile lists Heart Condition, this route is assessed more cautiously.":
            "क्योंकि आपकी प्रोफ़ाइल में हृदय स्थिति सूचीबद्ध है, इसलिए इस मार्ग का अधिक सावधानीपूर्वक मूल्यांकन किया जाता है।",
        "Because the profile lists Senior Citizen (60+), this route is assessed more cautiously.":
            "क्योंकि आपकी प्रोफ़ाइल में वरिष्ठ नागरिक सूचीबद्ध हैं, इसलिए इस मार्ग का अधिक सावधानीपूर्वक मूल्यांकन किया जाता है।",
        "Because the profile lists Child (Below 12), this route is assessed more cautiously.":
            "क्योंकि आपकी प्रोफ़ाइल में बच्चा सूचीबद्ध है, इसलिए इस मार्ग का अधिक सावधानीपूर्वक मूल्यांकन किया जाता है।",
        "This is general air-quality guidance, not medical advice.":
            "यह सामान्य वायु-गुणवत्ता मार्गदर्शन है, चिकित्सीय सलाह नहीं।",
        "Your route guidance will appear here after you plan a journey.":
            "यात्रा की योजना बनाने के बाद आपका मार्ग मार्गदर्शन यहां दिखाई देगा।",
    },
    "kn-IN": {
        "Air quality is acceptable; unusually sensitive people should reduce outdoor activity.":
            "ವಾಯು ಗುಣಮಟ್ಟವು ಸ್ವೀಕಾರಾರ್ಹವಾಗಿದೆ; ಅಸಹಜವಾಗಿ ಸೂಕ್ಷ್ಮವಾಗಿರುವ ಜನರು ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಯನ್ನು ಕಡಿಮೆ ಮಾಡಬೇಕು.",
        "Air quality is acceptable; unusually sensitive people should reduce prolonged outdoor exertion.":
            "ವಾಯು ಗುಣಮಟ್ಟವು ಸ್ವೀಕಾರಾರ್ಹವಾಗಿದೆ; ಅಸಹಜವಾಗಿ ಸೂಕ್ಷ್ಮವಾಗಿರುವ ಜನರು ಹೊರಾಂಗಣದಲ್ಲಿ ದೀರ್ಘಕಾಲದವರೆಗೆ ಶ್ರಮಿಸುವುದನ್ನು ಕಡಿಮೆ ಮಾಡಿಕೊಳ್ಳಬೇಕು.",
        "Because the profile lists Asthma, this route is assessed more cautiously.":
            "ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಉಬ್ಬಸ (ಆಸ್ತಮಾ) ಇರುವುದರಿಂದ, ಈ ಮಾರ್ಗವನ್ನು ಹೆಚ್ಚು ಎಚ್ಚರಿಕೆಯಿಂದ ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗುತ್ತದೆ.",
        "Because the profile lists COPD, this route is assessed more cautiously.":
            "ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಸಿಒಪಿಡಿ ಇರುವುದರಿಂದ, ಈ ಮಾರ್ಗವನ್ನು ಹೆಚ್ಚು ಎಚ್ಚರಿಕೆಯಿಂದ ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗುತ್ತದೆ.",
        "Because the profile lists Heart Condition, this route is assessed more cautiously.":
            "ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಹೃದಯ ಸಂಬಂಧಿ ಸ್ಥಿತಿ ಇರುವುದರಿಂದ, ಈ ಮಾರ್ಗವನ್ನು ಹೆಚ್ಚು ಎಚ್ಚರಿಕೆಯಿಂದ ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗುತ್ತದೆ.",
        "Because the profile lists Senior Citizen (60+), this route is assessed more cautiously.":
            "ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಹಿರಿಯ ನಾಗರಿಕರು ಇರುವುದರಿಂದ, ಈ ಮಾರ್ಗವನ್ನು ಹೆಚ್ಚು ಎಚ್ಚರಿಕೆಯಿಂದ ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗುತ್ತದೆ.",
        "Because the profile lists Child (Below 12), this route is assessed more cautiously.":
            "ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಮಗು ಇರುವುದರಿಂದ, ಈ ಮಾರ್ಗವನ್ನು ಹೆಚ್ಚು ಎಚ್ಚರಿಕೆಯಿಂದ ಮೌಲ್ಯಮಾಪನ ಮಾಡಲಾಗುತ್ತದೆ.",
        "This is general air-quality guidance, not medical advice.":
            "ಇದು ಸಾಮಾನ್ಯ ವಾಯು-ಗುಣಮಟ್ಟದ ಮಾರ್ಗದರ್ಶನ, ವೈದ್ಯಕೀಯ ಸಲಹೆ ಅಲ್ಲ.",
        "Your route guidance will appear here after you plan a journey.":
            "ಪ್ರಯಾಣವನ್ನು ಯೋಜಿಸಿದ ನಂತರ ನಿಮ್ಮ ಮಾರ್ಗದ ಮಾರ್ಗದರ್ಶನ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.",
    },
    "ta-IN": {
        "Air quality is acceptable; unusually sensitive people should reduce outdoor activity.":
            "காற்றின் தரம் ஏற்றுக்கொள்ளத்தக்கது; அசாதாரணமாக உணர்திறன் கொண்டவர்கள் வெளிப்புற நடவடிக்கைகளை குறைக்க வேண்டும்.",
        "Air quality is acceptable; unusually sensitive people should reduce prolonged outdoor exertion.":
            "காற்றின் தரம் ஏற்றுக்கொள்ளத்தக்கது; அசாதாரணமாக உணர்திறன் கொண்டவர்கள் நீண்ட வெளிப்புற முயற்சியை குறைக்க வேண்டும்.",
        "Because the profile lists Asthma, this route is assessed more cautiously.":
            "சுயவிவரத்தில் ஆஸ்துமா குறிப்பிடப்பட்டுள்ளதால், இந்த பாதை கூடுதல் கவனத்துடன் மதிப்பிடப்படுகிறது.",
        "Because the profile lists COPD, this route is assessed more cautiously.":
            "சுயவிவரத்தில் சிஓபிடி குறிப்பிடப்பட்டுள்ளதால், இந்த பாதை கூடுதல் கவனத்துடன் மதிப்பிடப்படுகிறது.",
        "Because the profile lists Heart Condition, this route is assessed more cautiously.":
            "சுயவிவரத்தில் இதய நிலை குறிப்பிடப்பட்டுள்ளதால், இந்த பாதை கூடுதல் கவனத்துடன் மதிப்பிடப்படுகிறது.",
        "Because the profile lists Senior Citizen (60+), this route is assessed more cautiously.":
            "சுயவிவரத்தில் மூத்த குடிமகன் குறிப்பிடப்பட்டுள்ளதால், இந்த பாதை கூடுதல் கவனத்துடன் மதிப்பிடப்படுகிறது.",
        "Because the profile lists Child (Below 12), this route is assessed more cautiously.":
            "சுயவிவரத்தில் குழந்தை குறிப்பிடப்பட்டுள்ளதால், இந்த பாதை கூடுதல் கவனத்துடன் மதிப்பிடப்படுகிறது.",
        "This is general air-quality guidance, not medical advice.":
            "இது பொதுவான காற்று-தர வழிகாட்டுதல், மருத்துவ ஆலோசனையல்ல.",
        "Your route guidance will appear here after you plan a journey.":
            "பயணத்தைத் திட்டமிட்ட பிறகு உங்கள் வழி வழிகாட்டுதல் இங்கே தோன்றும்.",
    },
    "te-IN": {
        "Air quality is acceptable; unusually sensitive people should reduce outdoor activity.":
            "వాయు నాణ్యత ఆమోదయోగ్యమైనది; అసాధారణంగా సున్నితమైన వ్యక్తులు ఆరుబయట కార్యకలాపాలను తగ్గించాలి.",
        "Air quality is acceptable; unusually sensitive people should reduce prolonged outdoor exertion.":
            "వాయు నాణ్యత ఆమోదయోగ్యమైనది; అసాధారణంగా సున్నితమైన వ్యక్తులు ఆరుబయట శ్రమను తగ్గించుకోవాలి.",
        "Because the profile lists Asthma, this route is assessed more cautiously.":
            "ప్రొఫైల్‌లో ఆస్తమా ఉన్నందున, ఈ మార్గం మరింత జాగ్రత్తగా అంచనా వేయబడుతుంది.",
        "Because the profile lists COPD, this route is assessed more cautiously.":
            "ప్రొఫైల్‌లో సీఓపీడీ ఉన్నందున, ఈ మార్గం మరింత జాగ్రత్తగా అంచనా వేయబడుతుంది.",
        "Because the profile lists Heart Condition, this route is assessed more cautiously.":
            "ప్రొఫైల్‌లో గుండె జబ్బు ఉన్నందున, ఈ మార్గం మరింత జాగ్రత్తగా అంచనా వేయబడుతుంది.",
        "Because the profile lists Senior Citizen (60+), this route is assessed more cautiously.":
            "ప్రొఫైల్‌లో సీనియర్ సిటిజన్ ఉన్నందున, ఈ మార్గం మరింత జాగ్రత్తగా అంచనా వేయబడుతుంది.",
        "Because the profile lists Child (Below 12), this route is assessed more cautiously.":
            "ప్రొఫైల్‌లో చిన్నపిల్లలు ఉన్నందున, ఈ మార్గం మరింత జాగ్రత్తగా అంచనా వేయబడుతుంది.",
        "This is general air-quality guidance, not medical advice.":
            "ఇది సాధారణ వాయు-నాణ్యత మార్గదర్శకత్వం, వైద్య సలహా కాదు.",
        "Your route guidance will appear here after you plan a journey.":
            "మీరు ప్రయాణాన్ని ప్రణాళిక చేసిన తర్వాత మీ మార్గ మార్గదర్శకత్వం ఇక్కడ కనిపిస్తుంది.",
    },
    "ml-IN": {
        "Air quality is acceptable; unusually sensitive people should reduce outdoor activity.":
            "വായു ഗുണനിലവാരം സ്വീകാര്യമാണ്; അസാധാരണമാംവിധം സംവേദനക്ഷമതയുള്ള ആളുകൾ പുറത്തെ പ്രവർത്തനങ്ങൾ കുറയ്ക്കണം.",
        "Air quality is acceptable; unusually sensitive people should reduce prolonged outdoor exertion.":
            "വായു ഗുണനിലവാരം സ്വീകാര്യമാണ്; അസാധാരണമാംവിധം സംവേദനക്ഷമതയുള്ള ആളുകൾ പുറത്തെ പ്രവർത്തനങ്ങൾ കുറയ്ക്കണം.",
        "Because the profile lists Asthma, this route is assessed more cautiously.":
            "പ്രൊഫൈലിൽ ആസ്ത്മ ഉള്ളതിനാൽ, ഈ റൂട്ട് കൂടുതൽ ജാഗ്രതയോടെ വിലയിരുത്തപ്പെടുന്നു.",
        "Because the profile lists COPD, this route is assessed more cautiously.":
            "പ്രൊഫൈലിൽ സിഒപിഡി ഉള്ളതിനാൽ, ഈ റൂട്ട് കൂടുതൽ ജാഗ്രതയോടെ വിലയിരുത്തപ്പെടുന്നു.",
        "Because the profile lists Heart Condition, this route is assessed more cautiously.":
            "പ്രൊഫൈലിൽ ഹൃദ്രോഗം ഉള്ളതിനാൽ, ഈ റൂട്ട് കൂടുതൽ ജാഗ്രതയോടെ വിലയിരുത്തപ്പെടുന്നു.",
        "Because the profile lists Senior Citizen (60+), this route is assessed more cautiously.":
            "പ്രൊഫൈലിൽ മുതിർന്ന പൗരൻ ഉള്ളതിനാൽ, ഈ റൂട്ട് കൂടുതൽ ജാഗ്രതയോടെ വിലയിരുത്തപ്പെടുന്നു.",
        "Because the profile lists Child (Below 12), this route is assessed more cautiously.":
            "പ്രൊഫൈലിൽ കുട്ടി ഉള്ളതിനാൽ, ഈ റൂട്ട് കൂടുതൽ ജാഗ്രതയോടെ വിലയിരുത്തപ്പെടുന്നു.",
        "This is general air-quality guidance, not medical advice.":
            "ഇത് പൊതുവായ വായു-ഗുണനിലവാര മാർഗ്ഗനിർദ്ദേശമാണ്, മെഡിക്കൽ ഉപദേശമല്ല.",
        "Your route guidance will appear here after you plan a journey.":
            "യാത്ര പ്ലാൻ ചെയ്ത ശേഷം നിങ്ങളുടെ റൂട്ട് മാർഗ്ഗനിർദ്ദേശം ഇവിടെ കാണിക്കും.",
    },
}

ADVICE_FALLBACKS = SENTENCE_TRANSLATIONS

SUMMARY_TEMPLATES = {
    "hi-IN": "मार्ग {index}: AQI स्कोर {aqi}; दूरी {dist} किलोमीटर; अनुमानित यात्रा समय {time} मिनट।",
    "kn-IN": "ಮಾರ್ಗ {index}: AQI ಅಂಕ {aqi}; ದೂರ {dist} ಕಿಲೋಮೀಟರ್; ಅಂದಾಜು ಪ್ರಯಾಣದ ಸಮಯ {time} ನಿಮಿಷಗಳು.",
    "ta-IN": "வழி {index}: AQI மதிப்பெண் {aqi}; தூரம் {dist} கிலோமீட்டர்; மதிப்பிடப்பட்ட பயண நேரம் {time} நிமிடங்கள்.",
    "te-IN": "మార్గం {index}: AQI స్కోర్ {aqi}; దూరం {dist} కిలోమీటర్లు; అంచనా వేసిన ప్రయాణ సమయం {time} నిమిషాలు.",
    "ml-IN": "റൂട്ട് {index}: AQI സ്കോർ {aqi}; ദൂരം {dist} കിലോമീറ്റർ; കണക്കാക്കിയ യാത്രാ സമയം {time} മിനിറ്റ്.",
    "en-IN": "Route {index}: AQI score {aqi}; distance {dist} kilometres; estimated travel time {time} minutes.",
}

CATEGORY_MAP = {
    "hi-IN": {"Good": "अच्छा", "Moderate": "मध्यम", "Unhealthy": "अस्वास्थ्यकर"},
    "kn-IN": {"Good": "ಉತ್ತಮ", "Moderate": "ಮಧ್ಯಮ", "Unhealthy": "ಅನಾರೋಗ್ಯಕರ"},
    "ta-IN": {"Good": "நல்லது", "Moderate": "மிதமான", "Unhealthy": "ஆரோக்கியமற்றது"},
    "te-IN": {"Good": "మంచిది", "Moderate": "మోస్తరు", "Unhealthy": "అనారోగ్యకరమైనది"},
    "ml-IN": {"Good": "നല്ലത്", "Moderate": "മിതമായത്", "Unhealthy": "അനാരോഗ്യകരം"},
}


def translate_sentence_by_sentence(text: str, lang_code: str, db: Session = None) -> str:
    """Split paragraph into sentences and translate each sentence via Sarvam AI or fallback dict."""
    if not text or lang_code == "en-IN":
        return text

    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
    translated_sentences = []

    fallback_map = SENTENCE_TRANSLATIONS.get(lang_code, {})

    for sentence in sentences:
        s_with_dot = sentence + "."
        
        # 1. Try DB / Sarvam AI translation
        if db is not None:
            res = get_or_create_cached_translation(db, s_with_dot, lang_code)
            if res and res != s_with_dot:
                translated_sentences.append(res)
                continue

        try:
            res = translate_text(s_with_dot, lang_code)
            if res and res != s_with_dot:
                translated_sentences.append(res)
                continue
        except Exception:
            pass

        # 2. Try Fallback dictionary
        if s_with_dot in fallback_map:
            translated_sentences.append(fallback_map[s_with_dot])
        elif sentence in fallback_map:
            translated_sentences.append(fallback_map[sentence])
        else:
            translated_sentences.append(s_with_dot)

    return " ".join(translated_sentences)


def localize_recommendation(result: dict, language: str, conditions: list[str], health_advice: str, db: Session = None) -> dict:
    """Return user-facing route strings in preferred language, cached in PostgreSQL."""
    lang_code = normalize_language_code(language)

    all_routes = []
    template = SUMMARY_TEMPLATES.get(lang_code, SUMMARY_TEMPLATES["en-IN"])
    cat_translations = CATEGORY_MAP.get(lang_code, {})

    for index, route in enumerate(result.get("all_routes", []), start=1):
        raw_cat = route["aqi_category"]["label"]
        cat_label = cat_translations.get(raw_cat, raw_cat)
        aqi_val = round(route["route_aqi_score"])
        dist_val = round(route["distance_meters"] / 1000, 1)
        time_val = round(route["duration_seconds"] / 60)

        # A route summary is generated from live values, so translate it only
        # while a route is being planned.  The translation helper first checks
        # PostgreSQL and calls Sarvam only for a cache miss; changing the site
        # language never reaches this code path.
        english_summary = SUMMARY_TEMPLATES["en-IN"].format(
            index=index,
            aqi=aqi_val,
            dist=dist_val,
            time=time_val
        )
        formatted_summary = get_or_create_cached_translation(db, english_summary, lang_code) if db else english_summary
        # Keep the already-provided language templates as an offline fallback
        # when Sarvam is temporarily unavailable.
        if formatted_summary == english_summary and lang_code != "en-IN":
            formatted_summary = template.format(
                index=index,
                aqi=aqi_val,
                dist=dist_val,
                time=time_val
            )

        all_routes.append({
            "route_number": index,
            "aqi_category": cat_label,
            "summary": formatted_summary,
        })

    recommended = result.get("recommended_route", {})
    rec_cat = recommended.get("aqi_category", {}).get("label", "Moderate")
    translated_rec_cat = cat_translations.get(rec_cat, rec_cat)

    # Translate health advice sentence by sentence
    localized_health_advice = translate_sentence_by_sentence(health_advice, lang_code, db)

    return {
        "language": lang_code,
        "source": result.get("source", ""),
        "destination": result.get("destination", ""),
        "recommendation_basis": result.get("recommendation_basis", ""),
        "recommended_route": {
            "aqi_category": translated_rec_cat,
            "summary": formatted_summary if all_routes else "",
        },
        "all_routes": all_routes,
        "health_conditions": conditions,
        "health_advice": localized_health_advice,
    }
