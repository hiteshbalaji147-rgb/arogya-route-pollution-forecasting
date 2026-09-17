import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const LanguageProvider = ({ children }) => {
  const [languageCode, setLanguageCodeState] = useState(() => {
    return localStorage.getItem('arogya_lang_code') || 'en-IN';
  });

  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('arogya_theme') || 'dark';
  });

  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCached, setIsCached] = useState(true);
  const [supportedLanguages, setSupportedLanguages] = useState(SUPPORTED_LANGUAGES);

  const fetchDynamicLanguages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/content/languages`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.languages && data.languages.length > 0) {
          const list = data.languages.map(l => ({
            id: l.id,
            code: l.code || l.name.toLowerCase().slice(0, 2),
            name: l.name,
            nativeName: l.name
          }));
          setSupportedLanguages(list);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch languages list:", e);
    }
  }, []);

  useEffect(() => {
    fetchDynamicLanguages();
  }, [fetchDynamicLanguages]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('arogya_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchTranslations = useCallback(async (code) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('arogya_access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/content/static?lang=${encodeURIComponent(code)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const incoming = data.content || {};
        // Keep local language fallback text when the server has only persisted
        // the English source due to a temporary translation-provider outage.
        const filtered = Object.fromEntries(
          Object.entries(incoming).filter(([key, value]) =>
            code === 'en-IN' || value !== DICTIONARIES['en-IN']?.[key]
          )
        );
        setTranslations(filtered);
        setIsCached(data.cached ?? true);
      }
    } catch (err) {
      console.warn('Failed to fetch static translations from backend:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTranslations(languageCode);
  }, [languageCode, fetchTranslations]);

const DICTIONARIES = {
  'en-IN': {
    'nav.dashboard': 'Dashboard',
    'nav.router': 'Smart Router',
    'nav.alerts': 'Air Alerts',
    'nav.history': 'Route History',
    'nav.settings': 'Settings',
    'nav.feedback': 'Feedback',
    'nav.sign_out': 'Sign Out',
    'dashboard.greeting': 'Good to see you',
    'dashboard.subtext': "Here's your environmental summary for today.",
    'dashboard.safe_route': '✈️ Safe Route',
    'dashboard.health_advice': '❤️ Health Advice',
    'dashboard.temp': 'Temperature',
    'dashboard.humidity': 'Humidity',
    'dashboard.wind': 'Wind',
    'dashboard.visibility': 'Visibility',
    'dashboard.peak_time': 'Peak AQI Time',
    'dashboard.forecast': '24-Hour AQI Forecast',
    'dashboard.ai_confidence': '⚡ AI prediction • 94% confidence',
    'history.title': 'Route History',
    'history.subtext': 'Review your past routes and pollution exposure',
    'history.total_routes': 'Total Routes',
    'history.avg_aqi': 'Avg AQI Exposure',
    'history.avg_health': 'Avg Health Score',
    'history.days_tracked': 'Days Tracked',
    'history.search_placeholder': '🔍 Search by source or destination...',
    'history.col_route': 'SOURCE → DESTINATION',
    'history.col_date': 'DATE & TIME',
    'history.col_distance': 'DISTANCE',
    'history.col_aqi': 'AQI',
    'history.col_health': 'HEALTH SCORE',
    'history.col_actions': 'ACTIONS',
    'settings.title': '⚙️ Profile & Personalisation Settings',
    'settings.subtext': 'Manage your display name, language localization, and health profile stored in PostgreSQL database.',
    'settings.name': 'Display Name',
    'settings.email': 'Email Address',
    'settings.lang': 'App Language',
    'settings.conditions': 'Health Profile Conditions',
    'settings.save': '💾 Save Settings',
    'feedback.title': '💬 Send Us Your Feedback',
    'feedback.subtext': 'We value your input to continuously improve air quality route accuracy and guidance.',
    'feedback.voice': 'Your Voice Matters',
    'feedback.page_title': 'How are we doing?',
    'feedback.subtitle': "Help us improve ArogyaRoute's air quality routing, health guidance, and overall experience.",
    'feedback.rate': 'Rate your overall experience',
    'feedback.topic': "What's your feedback about?",
    'feedback.optional': 'optional', 'feedback.more': 'Tell us more',
    'feedback.placeholder': 'What did you love? What can we improve? Any bugs or suggestions?',
    'feedback.email': 'Email address', 'feedback.email_hint': "We'll only use this to follow up on your feedback.",
    'feedback.reset': 'Reset', 'feedback.submit': 'Submit Feedback', 'feedback.sending': 'Sending?',
    'feedback.route_accuracy': 'Route Accuracy', 'feedback.aqi_data': 'AQI Data Quality',
    'feedback.design': 'Design & Usability', 'feedback.performance': 'Performance',
    'feedback.health': 'Health Guidance', 'feedback.other': 'Other',
    'feedback.thank_you': 'Thank you, your feedback matters!',
    'feedback.success': 'Your input helps us make ArogyaRoute smarter and healthier for everyone.',
    'feedback.another': 'Submit Another',
  },
  'hi-IN': {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.router': 'स्मार्ट रूटर',
    'nav.alerts': 'वायु अलर्ट',
    'nav.history': 'मार्ग इतिहास',
    'nav.settings': 'सेटिंग्स',
    'nav.feedback': 'प्रतिक्रिया',
    'nav.sign_out': 'साइन आउट',
    'dashboard.greeting': 'शुभ प्रभात',
    'dashboard.subtext': 'यहाँ आज का आपका पर्यावरण सारांश है।',
    'dashboard.safe_route': '✈️ सुरक्षित मार्ग',
    'dashboard.health_advice': '❤️ स्वास्थ्य सलाह',
    'dashboard.temp': 'तापमान',
    'dashboard.humidity': 'नमी',
    'dashboard.wind': 'हवा',
    'dashboard.visibility': 'दृश्यता',
    'dashboard.peak_time': 'पीक एक्यूआई समय',
    'dashboard.forecast': '24-घंटे AQI पूर्वानुमान',
    'dashboard.ai_confidence': '⚡ AI भविष्यवाणी • 94% विश्वास',
    'history.title': 'मार्ग इतिहास',
    'history.subtext': 'अपने पिछले मार्गों और प्रदूषण जोखिम की समीक्षा करें',
    'history.total_routes': 'कुल मार्ग',
    'history.avg_aqi': 'औसत AQI एक्सपोजर',
    'history.avg_health': 'औसत स्वास्थ्य स्कोर',
    'history.days_tracked': 'ट्रैक किए गए दिन',
    'history.search_placeholder': '🔍 स्रोत या गंतव्य द्वारा खोजें...',
    'history.col_route': 'स्रोत → गंतव्य',
    'history.col_date': 'दिनांक और समय',
    'history.col_distance': 'दूरी',
    'history.col_aqi': 'AQI',
    'history.col_health': 'स्वास्थ्य स्कोर',
    'history.col_actions': 'कार्रवाइयां',
    'settings.title': '⚙️ प्रोफ़ाइल और वैयक्तिकरण सेटिंग्स',
    'settings.subtext': 'PostgreSQL डेटाबेस में संग्रहीत अपना नाम, भाषा और स्वास्थ्य प्रोफ़ाइल प्रबंधित करें।',
    'settings.name': 'प्रदर्शित नाम',
    'settings.email': 'ईमेल पता',
    'settings.lang': 'ऐप की भाषा',
    'settings.conditions': 'स्वास्थ्य स्थितियाँ',
    'settings.save': '💾 सेटिंग्स सहेजें',
    'feedback.title': '💬 हमें अपनी प्रतिक्रिया भेजें',
    'feedback.subtext': 'हम वायु गुणवत्ता सटीकता को बेहतर बनाने के लिए आपके इनपुट का सम्मान करते हैं।',
  },
  'kn-IN': {
    'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'nav.router': 'ಸ್ಮಾರ್ಟ್ ರೂಟರ್',
    'nav.alerts': 'ವಾಯು ಎಚ್ಚರಿಕೆಗಳು',
    'nav.history': 'ಮಾರ್ಗ ಇತಿಹಾಸ',
    'nav.settings': 'ಸೇಟಿಂಗ್ಸ್',
    'nav.feedback': 'ಅಭಿಪ್ರಾಯ',
    'nav.sign_out': 'ಸೈನ್ ಔಟ್',
    'dashboard.greeting': 'ಶುಭೋದಯ',
    'dashboard.subtext': 'ಇಂದಿನ ನಿಮ್ಮ ಪರಿಸರ ಸಾರಾಂಶ ಇಲ್ಲಿದೆ.',
    'dashboard.safe_route': '✈️ ಸುರಕ್ಷಿತ ಮಾರ್ಗ',
    'dashboard.health_advice': '❤️ ಆರೋಗ್ಯ ಸಲಹೆ',
    'dashboard.temp': 'ತಾಪಮಾನ',
    'dashboard.humidity': 'ತೇವಾಂಶ',
    'dashboard.wind': 'ಗಾಳಿ',
    'dashboard.visibility': 'ಗೋಚರತೆ',
    'dashboard.peak_time': 'ಗರಿಷ್ಠ AQI ಸಮಯ',
    'dashboard.forecast': '24-ಗಂಟೆಗಳ AQI ಮುನ್ಸೂಚನೆ',
    'dashboard.ai_confidence': '⚡ AI ಮುನ್ಸೂಚನೆ • 94% ನಿಖರತೆ',
    'history.title': 'ಮಾರ್ಗ ಇತಿಹಾಸ',
    'history.subtext': 'ನಿಮ್ಮ ಹಿಂದಿನ ಮಾರ್ಗಗಳು ಮತ್ತು ಮಾಲಿನ್ಯವನ್ನು ಪರಿಶೀಲಿಸಿ',
    'history.total_routes': 'ಒಟ್ಟು ಮಾರ್ಗಗಳು',
    'history.avg_aqi': 'ಸರಾಸರಿ AQI ಪ್ರಭಾವ',
    'history.avg_health': 'ಸರಾಸರಿ ಆರೋಗ್ಯ ಸ್ಕೋರ್',
    'history.days_tracked': 'ಟ್ರ್ಯಾಕ್ ಮಾಡಿದ ದಿನಗಳು',
    'history.search_placeholder': '🔍 ಪ್ರಾರಂಭ ಅಥವಾ ತಲುಪುವ ಸ್ಥಳದಿಂದ ಹುಡುಕಿ...',
    'history.col_route': 'ಪ್ರಾರಂಭ → ತಲುಪುವ ಸ್ಥಳ',
    'history.col_date': 'ದಿನಾಂಕ ಮತ್ತು ಸಮಯ',
    'history.col_distance': 'ದೂರ',
    'history.col_aqi': 'AQI',
    'history.col_health': 'ಆರೋಗ್ಯ ಸ್ಕೋರ್',
    'history.col_actions': 'ಕ್ರಿಯೆಗಳು',
    'settings.title': '⚙️ ಪ್ರೊಫೈಲ್ ಮತ್ತು ವೈಯಕ್ತೀಕರಣ ಸಂಯೋಜನೆಗಳು',
    'settings.subtext': 'PostgreSQL ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಹೆಸರು ಮತ್ತು ಆರೋಗ್ಯ ಪ್ರೊಫೈಲ್ ನಿರ್ವಹಿಸಿ.',
    'settings.name': 'ಪ್ರದರ್ಶನ ಹೆಸರು',
    'settings.email': 'ಇಮೇಲ್ ವಿಳಾಸ',
    'settings.lang': 'ಅಪ್ಲಿಕೇಶನ್ ಭಾಷೆ',
    'settings.conditions': 'ಆರೋಗ್ಯ ಸ್ಥಿತಿಗಳು',
    'settings.save': '💾 ಸಂಯೋಜನೆಗಳನ್ನು ಉಳಿಸಿ',
    'feedback.title': '💬 ನಿಮ್ಮ ಅಭಿಪ್ರಾಯವನ್ನು ನಮಗೆ ಕಳುಹಿಸಿ',
    'feedback.subtext': 'ಗಾಳಿಯ ಗುಣಮಟ್ಟದ ನಿಖರತೆಯನ್ನು ಸುಧಾರಿಸಲು ನಿಮ್ಮ ಸಲಹೆಗಳು ಪ್ರಮುಖವಾಗಿವೆ.',
  },
  'ta-IN': {
    'nav.dashboard': 'டாஷ்போர்டு',
    'nav.router': 'ஸ்மார்ட் ரூட்டர்',
    'nav.alerts': 'காற்று எச்சரிக்கைகள்',
    'nav.history': 'பயண வரலாறு',
    'nav.settings': 'அமைப்புகள்',
    'nav.feedback': 'கருத்துகள்',
    'nav.sign_out': 'வெளியேறு',
    'dashboard.greeting': 'காலை வணக்கம்',
    'dashboard.subtext': 'இன்றைய உங்கள் சுற்றுச்சூழல் சுருக்கம் இதோ.',
    'dashboard.safe_route': '✈️ பாதுகாப்பான பாதை',
    'dashboard.health_advice': '❤️ சுகாதார ஆலோசனை',
    'dashboard.temp': 'வெப்பநிலை',
    'dashboard.humidity': 'ஈரப்பதம்',
    'dashboard.wind': 'காற்று',
    'dashboard.visibility': 'பார்வை திறன்',
    'dashboard.peak_time': 'உச்ச AQI நேரம்',
    'dashboard.forecast': '24-மணி நேர AQI கணிப்பு',
    'dashboard.ai_confidence': '⚡ AI கணிப்பு • 94% நம்பகத்தன்மை',
    'history.title': 'பயண வரலாறு',
    'history.subtext': 'உங்கள் முந்தைய பாதைகளையும் மாசு வெளிப்பாட்டையும் மதிப்பாய்வு செய்யவும்',
    'history.total_routes': 'மொத்த பாதைகள்',
    'history.avg_aqi': 'சராசரி AQI வெளிப்பாடு',
    'history.avg_health': 'சராசரி சுகாதார மதிப்பெண்',
    'history.days_tracked': 'கண்காணிக்கப்பட்ட நாட்கள்',
    'history.search_placeholder': '🔍 தொடக்கம் அல்லது இலக்கு மூலம் தேடவும்...',
    'history.col_route': 'தொடக்கம் → இலக்கு',
    'history.col_date': 'தேதி & நேரம்',
    'history.col_distance': 'தூரம்',
    'history.col_aqi': 'AQI',
    'history.col_health': 'சுகாதார மதிப்பெண்',
    'history.col_actions': 'செயல்கள்',
    'settings.title': '⚙️ சுயவிவரம் & அமைப்புகள்',
    'settings.subtext': 'PostgreSQL தரவுத்தளத்தில் உங்கள் பெயர் மற்றும் சுகாதார சுயவிவரத்தை நிர்வகிக்கவும்.',
    'settings.name': 'காட்சி பெயர்',
    'settings.email': 'மின்னஞ்சல் முகவரி',
    'settings.lang': 'செயலி மொழி',
    'settings.conditions': 'சுகாதார நிலைமைகள்',
    'settings.save': '💾 அமைப்புகளைச் சேமிக்க',
    'feedback.title': '💬 உங்கள் கருத்தை எங்களுக்கு அனுப்பவும்',
    'feedback.subtext': 'காற்றின் தரத்தின் துல்லியத்தை மேம்படுத்த உங்கள் கருத்துக்களை வரவேற்கிறோம்.',
  },
  'te-IN': {
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.router': 'స్మార్ట్ రూటర్',
    'nav.alerts': 'వాయు అలర్ట్లు',
    'nav.history': 'రూట్ హిస్టరీ',
    'nav.settings': 'సెట్టింగ్‌లు',
    'nav.feedback': 'ఫీడ్‌బ్యాక్',
    'nav.sign_out': 'సైన్ అవుట్',
    'dashboard.greeting': 'శుభోదయం',
    'dashboard.subtext': 'నేటి మీ పర్యావరణ సారాంశం ఇక్కడ ఉంది.',
    'dashboard.safe_route': '✈️ సురక్షితమైన మార్గం',
    'dashboard.health_advice': '❤️ ఆరోగ్య సలహా',
    'dashboard.temp': 'ఉష్ణోగ్రత',
    'dashboard.humidity': 'తేమ',
    'dashboard.wind': 'గాలి',
    'dashboard.visibility': 'దృశ్యమానత',
    'dashboard.peak_time': 'గరిష్ట AQI సమయం',
    'dashboard.forecast': '24-గంటల AQI అంచనా',
    'dashboard.ai_confidence': '⚡ AI అంచనా • 94% ఖచ్చితత్వం',
    'history.title': 'రూట్ హిస్టరీ',
    'history.subtext': 'మీ పూర్వ మార్గాలు మరియు కాలుష్య వివరాలను సమీక్షించండి',
    'history.total_routes': 'మొత్తం మార్గాలు',
    'history.avg_aqi': 'సగటు AQI ప్రభావం',
    'history.avg_health': 'సగటు ఆరోగ్య స్కోర్',
    'history.days_tracked': 'ట్రాక్ చేసిన రోజులు',
    'history.search_placeholder': '🔍 ప్రారంభం లేదా గమ్యం ద్వారా శోధించండి...',
    'history.col_route': 'ప్రారంభం → గమ్యం',
    'history.col_date': 'తేదీ & సమయం',
    'history.col_distance': 'దూరం',
    'history.col_aqi': 'AQI',
    'history.col_health': 'ఆరోగ్య స్కోర్',
    'history.col_actions': 'చర్యలు',
    'settings.title': '⚙️ ప్రొఫైల్ & వ్యక్తిగతీకరణ సెట్టింగ్‌లు',
    'settings.subtext': 'PostgreSQL డేటాబేస్‌లో మీ పేరు మరియు ఆరోగ్య ప్రొఫైల్‌ను నిర్వహించండి.',
    'settings.name': 'ప్రదర్శన పేరు',
    'settings.email': 'ఈమెయిల్ చిరునామా',
    'settings.lang': 'యాప్ భాష',
    'settings.conditions': 'ఆరోగ్య సమస్యలు',
    'settings.save': '💾 సెట్టింగ్‌లను సేవ్ చేయండి',
    'feedback.title': '💬 మీ ఫీడ్‌బ్యాక్‌ను మాకు పంపండి',
    'feedback.subtext': 'గాలి నాణ్యత ఖచ్చితత్వాన్ని మెరుగుపరచడానికి మీ సూచనలు అమూల్యమైనవి.',
    'feedback.voice': '?? ????????? ??????',
    'feedback.page_title': '???? ??? ????????????',
    'feedback.subtitle': 'ArogyaRoute ???? ?????? ???????????, ?????? ?????? ????? ?????? ?????????? ????????????? ???? ????? ??????.',
    'feedback.rate': '?? ?????? ?????????? ???? ??????',
    'feedback.topic': '?? ????????? ? ????? ????????',
    'feedback.optional': '???????', 'feedback.more': '????? ????????',
    'feedback.placeholder': '???? ??? ????????? ???? ??? ????????????? ????? ?????? ???? ???????',
    'feedback.email': '??????? ????????', 'feedback.email_hint': '?? ??????????? ?????????????? ??????? ?????? ????????????.',
    'feedback.reset': '?????? ??????', 'feedback.submit': '????????????? ??????', 'feedback.sending': '??????????',
    'feedback.route_accuracy': '????? ??????????', 'feedback.aqi_data': 'AQI ???? ??????',
    'feedback.design': '???????? ????? ??????? ???????', 'feedback.performance': '???????',
    'feedback.health': '?????? ??????', 'feedback.other': '???',
    'feedback.thank_you': '??????????, ?? ????????? ??????!',
    'feedback.success': '?? ?????? ArogyaRoute ?? ??????? ????? ?????????? ????? ??????????? ????????.',
    'feedback.another': '???? ????????????? ??????',
  },
  'ml-IN': {
    'nav.dashboard': 'ഡാഷ്‌ബോർഡ്',
    'nav.router': 'സ്മാർട്ട് റൂട്ടർ',
    'nav.alerts': 'വായു മുന്നറിയിപ്പുകൾ',
    'nav.history': 'യാത്ര ചരിത്രം',
    'nav.settings': 'ക്രമീകരണങ്ങൾ',
    'nav.feedback': 'അഭിപ്രായം',
    'nav.sign_out': 'സൈൻ ഔട്ട്',
    'dashboard.greeting': 'സുപ്രഭാതം',
    'dashboard.subtext': 'ഇന്നത്തെ നിങ്ങളുടെ പരിസ്ഥിതി സംഗ്രഹം ഇതാ.',
    'dashboard.safe_route': '✈️ സുരക്ഷിത പാത',
    'dashboard.health_advice': '❤️ ആരോഗ്യ ഉപദേശം',
    'dashboard.temp': 'താപനില',
    'dashboard.humidity': 'ആർദ്രത',
    'dashboard.wind': 'കാറ്റ്',
    'dashboard.visibility': 'കാഴ്ച പരിധി',
    'dashboard.peak_time': 'ഉയർന്ന AQI സമയം',
    'dashboard.forecast': '24-മണിക്കൂർ AQI പ്രവചനം',
    'dashboard.ai_confidence': '⚡ AI പ്രവചനം • 94% കൃത്യത',
    'history.title': 'യാത്ര ചരിത്രം',
    'history.subtext': 'നിങ്ങളുടെ മുൻകാല പാതകളും മലിനീകരണ വിവരങ്ങളും അവലോകനം ചെയ്യുക',
    'history.total_routes': 'ആകെ പാതകൾ',
    'history.avg_aqi': 'ശരാശരി AQI സ്വാധീനം',
    'history.avg_health': 'ശരാശരി ആരോഗ്യ സ്കോർ',
    'history.days_tracked': 'ട്രാക്ക് ചെയ്ത ദിവസങ്ങൾ',
    'history.search_placeholder': '🔍 തുടക്കം അല്ലെങ്കിൽ ലക്ഷ്യസ്ഥാനം തിരയുക...',
    'history.col_route': 'തുടക്കം → ലക്ഷ്യസ്ഥാനം',
    'history.col_date': 'തീയതിയും സമയവും',
    'history.col_distance': 'ദൂരം',
    'history.col_aqi': 'AQI',
    'history.col_health': 'ആരോഗ്യ സ്കോർ',
    'history.col_actions': 'നടപടികൾ',
    'settings.title': '⚙️ പ്രൊഫൈൽ & ക്രമീകരണങ്ങൾ',
    'settings.subtext': 'PostgreSQL ഡാറ്റാബേസിൽ നിങ്ങളുടെ പേരും ആരോഗ്യ വിവരങ്ങളും നിയന്ത്രിക്കുക.',
    'settings.name': 'പേര്',
    'settings.email': 'ഇമെയിൽ വിലാസം',
    'settings.lang': 'ആപ്പ് ഭാഷ',
    'settings.conditions': 'ആരോഗ്യ സ്ഥിതിവിവരങ്ങൾ',
    'settings.save': '💾 ക്രമീകരണങ്ങൾ സേവ് ചെയ്യുക',
    'feedback.title': '💬 നിങ്ങളുടെ അഭിപ്രായം അറിയിക്കുക',
    'feedback.subtext': 'വായു ഗുണനിലവാരം കൂടുതൽ കൃത്യമാക്കാൻ നിങ്ങളുടെ നിർദ്ദേശങ്ങൾ സഹായിക്കും.',
  }
};

  const changeLanguage = (code) => {
    setLanguageCodeState(code);
    localStorage.setItem('arogya_lang_code', code);
  };

  const t = (key, defaultText = '') => {
    if (translations[key]) return translations[key];
    if (DICTIONARIES[languageCode]?.[key]) return DICTIONARIES[languageCode][key];
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        languageCode,
        changeLanguage,
        t,
        translations,
        isLoading,
        isCached,
        supportedLanguages,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};


const defaultContextValue = {
  languageCode: 'en-IN',
  changeLanguage: () => {},
  t: (key, defaultText = '') => defaultText || key,
  translations: {},
  isLoading: false,
  isCached: true,
  supportedLanguages: SUPPORTED_LANGUAGES,
  theme: 'light',
  toggleTheme: () => {},
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  return ctx || defaultContextValue;
};

