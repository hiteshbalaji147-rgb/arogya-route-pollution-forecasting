import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const COPY = {
  'en-IN': { kicker: 'AI POLLUTION ASSISTANT', title: 'Ask about the air around you', intro: 'Live AQI, forecasts, weather and cleaner routes', online: 'Online', empty: 'Ask whether pollution is high, when to travel, or which route has less exposure.', routeStart: 'Route start (for route questions)', destination: 'Route destination', placeholder: 'Ask about AQI, weather, activity or routes...', thinking: 'Checking project data...', send: 'Send question', you: 'You', assistant: 'ArogyaRoute', suggestions: [["What's the AQI right now?", 'What is the AQI right now?'], ['AQI forecast', 'What will the AQI be later today?'], ['Can I exercise now?', 'Can I go for a run now?'], ['Current weather', 'What is the weather like?']] },
  'hi-IN': { kicker: 'AI प्रदूषण सहायक', title: 'अपने आसपास की हवा के बारे में पूछें', intro: 'लाइव AQI, पूर्वानुमान, मौसम और बेहतर मार्ग', online: 'ऑनलाइन', empty: 'पूछें कि प्रदूषण कितना है, कब यात्रा करनी चाहिए या किस मार्ग में कम जोखिम है।', routeStart: 'मार्ग की शुरुआत', destination: 'मार्ग का गंतव्य', placeholder: 'AQI, मौसम, गतिविधि या मार्ग के बारे में पूछें...', thinking: 'प्रोजेक्ट डेटा देख रहे हैं...', send: 'प्रश्न भेजें', you: 'आप', assistant: 'ArogyaRoute', suggestions: [['अभी AQI कितना है?', 'What is the AQI right now?'], ['AQI पूर्वानुमान', 'What will the AQI be later today?'], ['क्या मैं अभी दौड़ सकता हूँ?', 'Can I go for a run now?'], ['मौसम कैसा है?', 'What is the weather like?']] },
  'kn-IN': { kicker: 'AI ಮಾಲಿನ್ಯ ಸಹಾಯಕ', title: 'ನಿಮ್ಮ ಸುತ್ತಲಿನ ಗಾಳಿಯ ಬಗ್ಗೆ ಕೇಳಿ', intro: 'ಲೈವ್ AQI, ಮುನ್ಸೂಚನೆ, ಹವಾಮಾನ ಮತ್ತು ಉತ್ತಮ ಮಾರ್ಗಗಳು', online: 'ಆನ್‌ಲೈನ್', empty: 'ಮಾಲಿನ್ಯ ಹೆಚ್ಚಿದೆಯೇ, ಯಾವಾಗ ಪ್ರಯಾಣಿಸಬೇಕು ಅಥವಾ ಯಾವ ಮಾರ್ಗ ಉತ್ತಮ ಎಂದು ಕೇಳಿ.', routeStart: 'ಮಾರ್ಗದ ಆರಂಭ', destination: 'ಮಾರ್ಗದ ಗಮ್ಯಸ್ಥಾನ', placeholder: 'AQI, ಹವಾಮಾನ, ಚಟುವಟಿಕೆ ಅಥವಾ ಮಾರ್ಗದ ಬಗ್ಗೆ ಕೇಳಿ...', thinking: 'ಪ್ರಾಜೆಕ್ಟ್ ಡೇಟಾ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...', send: 'ಪ್ರಶ್ನೆ ಕಳುಹಿಸಿ', you: 'ನೀವು', assistant: 'ArogyaRoute', suggestions: [['ಈಗ AQI ಎಷ್ಟು?', 'What is the AQI right now?'], ['AQI ಮುನ್ಸೂಚನೆ', 'What will the AQI be later today?'], ['ಈಗ ಓಡಬಹುದೇ?', 'Can I go for a run now?'], ['ಹವಾಮಾನ ಹೇಗಿದೆ?', 'What is the weather like?']] },
  'ta-IN': { kicker: 'AI மாசு உதவியாளர்', title: 'உங்களைச் சுற்றியுள்ள காற்றைப் பற்றி கேளுங்கள்', intro: 'நேரலை AQI, முன்னறிவிப்பு, வானிலை மற்றும் சிறந்த வழிகள்', online: 'ஆன்லைன்', empty: 'மாசு அதிகமா, எப்போது பயணம் செய்யலாம் அல்லது எந்த வழி சிறந்தது என்று கேளுங்கள்.', routeStart: 'பாதை தொடக்கம்', destination: 'பாதை இலக்கு', placeholder: 'AQI, வானிலை, செயல்பாடு அல்லது பாதையைப் பற்றி கேளுங்கள்...', thinking: 'திட்டத் தரவைச் சரிபார்க்கிறது...', send: 'கேள்வியை அனுப்புக', you: 'நீங்கள்', assistant: 'ArogyaRoute', suggestions: [['இப்போது AQI என்ன?', 'What is the AQI right now?'], ['AQI முன்னறிவிப்பு', 'What will the AQI be later today?'], ['இப்போது ஓடலாமா?', 'Can I go for a run now?'], ['வானிலை எப்படி உள்ளது?', 'What is the weather like?']] },
  'te-IN': { kicker: 'AI కాలుష్య సహాయకుడు', title: 'మీ చుట్టూ ఉన్న గాలి గురించి అడగండి', intro: 'లైవ్ AQI, అంచనాలు, వాతావరణం మరియు మెరుగైన మార్గాలు', online: 'ఆన్‌లైన్', empty: 'కాలుష్యం ఎక్కువగా ఉందా, ఎప్పుడు ప్రయాణించాలి లేదా ఏ మార్గం మంచిదో అడగండి.', routeStart: 'మార్గం ప్రారంభం', destination: 'మార్గం గమ్యం', placeholder: 'AQI, వాతావరణం, కార్యకలాపం లేదా మార్గం గురించి అడగండి...', thinking: 'ప్రాజెక్ట్ డేటాను తనిఖీ చేస్తోంది...', send: 'ప్రశ్న పంపండి', you: 'మీరు', assistant: 'ArogyaRoute', suggestions: [['ఇప్పుడు AQI ఎంత?', 'What is the AQI right now?'], ['AQI అంచనా', 'What will the AQI be later today?'], ['ఇప్పుడు పరుగెత్తవచ్చా?', 'Can I go for a run now?'], ['వాతావరణం ఎలా ఉంది?', 'What is the weather like?']] },
  'ml-IN': { kicker: 'AI മലിനീകരണ സഹായി', title: 'നിങ്ങളുടെ ചുറ്റുമുള്ള വായുവിനെക്കുറിച്ച് ചോദിക്കൂ', intro: 'തത്സമയ AQI, പ്രവചനം, കാലാവസ്ഥ, മികച്ച റൂട്ടുകൾ', online: 'ഓൺലൈൻ', empty: 'മലിനീകരണം കൂടുതലാണോ, എപ്പോൾ യാത്ര ചെയ്യണം, ഏത് റൂട്ട് മികച്ചതാണെന്ന് ചോദിക്കൂ.', routeStart: 'റൂട്ട് ആരംഭം', destination: 'റൂട്ട് ലക്ഷ്യം', placeholder: 'AQI, കാലാവസ്ഥ, പ്രവർത്തനം അല്ലെങ്കിൽ റൂട്ടിനെക്കുറിച്ച് ചോദിക്കൂ...', thinking: 'പ്രോജക്റ്റ് ഡാറ്റ പരിശോധിക്കുന്നു...', send: 'ചോദ്യം അയയ്ക്കുക', you: 'നിങ്ങൾ', assistant: 'ArogyaRoute', suggestions: [['ഇപ്പോൾ AQI എത്ര?', 'What is the AQI right now?'], ['AQI പ്രവചനം', 'What will the AQI be later today?'], ['ഇപ്പോൾ ഓടാമോ?', 'Can I go for a run now?'], ['കാലാവസ്ഥ എങ്ങനെയാണ്?', 'What is the weather like?']] },
};

export function AssistantWidget({ latitude, longitude, locationName }) {
  const { languageCode } = useLanguage();
  const copy = COPY[languageCode] || COPY['en-IN'];
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = async (event) => {
    event?.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setMessages((items) => [...items, { role: 'user', text }]);
    setQuestion('');
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('arogya_access_token');
      const response = await fetch(`${API}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          question: text,
          latitude,
          longitude,
          source: source.trim() || undefined,
          destination: destination.trim() || undefined,
          language: languageCode,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'Assistant is unavailable.');
      setMessages((items) => [...items, { role: 'assistant', text: payload.answer, tools: payload.tools_used }]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className={`assistant-launcher ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? 'Close pollution assistant' : 'Open pollution assistant'}>
        <span className="assistant-launcher-icon">✦</span>
        <span className="assistant-launcher-label">{copy.assistant}</span>
        {!open && <i />}
      </button>
      {open && <section className="assistant-panel">
      <div className="assistant-header">
        <div>
          <span className="eyebrow">{copy.kicker}</span>
          <h2>{copy.title}</h2>
          <p>{copy.intro}{locationName ? ` · ${locationName}` : ''}</p>
        </div>
        <span className="assistant-status"><i /> {copy.online}</span>
      </div>

      <div className="assistant-suggestions">
        {copy.suggestions.map(([label, prompt]) => <button key={label} type="button" onClick={() => setQuestion(prompt)}>{label}</button>)}
      </div>

      <div className="assistant-route-fields">
        <input value={source} onChange={(event) => setSource(event.target.value)} placeholder={copy.routeStart} />
        <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder={copy.destination} />
      </div>

      <div className="assistant-thread" aria-live="polite">
        {messages.length === 0 && <div className="assistant-empty"><span>✦</span><p>{copy.empty}</p></div>}
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}><span>{message.role === 'user' ? copy.you : copy.assistant}</span><p>{message.text}</p></div>)}
        {busy && <div className="assistant-message assistant"><span>{copy.assistant}</span><p className="assistant-thinking">{copy.thinking}</p></div>}
      </div>

      {error && <p className="assistant-error">{error}</p>}
      <form className="assistant-form" onSubmit={ask}>
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={copy.placeholder} maxLength={1200} />
        <button type="submit" disabled={busy || !question.trim()} aria-label={copy.send}>➜</button>
      </form>
      </section>}
    </>
  );
}