import { useMemo, useState } from 'react';

export function LanguagePicker({ isOpen, onClose, languages, languageCode, onChange }) {
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState(languageCode);

  const visibleLanguages = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return languages;
    return languages.filter((language) => `${language.name} ${language.nativeName}`.toLowerCase().includes(value));
  }, [languages, query]);

  if (!isOpen) return null;

  const continueWithLanguage = () => {
    onChange(selectedCode);
    onClose();
  };

  return (
    <div className="language-picker-overlay" onClick={onClose}>
      <div className="language-picker-shell" onClick={(event) => event.stopPropagation()}>
        <aside className="language-picker-brand">
          <button className="language-picker-close mobile-only" onClick={onClose} aria-label="Close language picker">×</button>
          <div className="language-picker-logo"><img src="/arogya-route-logo.png" alt="ArogyaRoute" /></div>
          <h2>ArogyaRoute</h2>
          <strong>Clean air route planner</strong>
          <p>See the air on every route before you set out, and travel the one that is easiest to breathe.</p>
          <ul>
            <li><span>⌁</span> Three routes, compared by the air on each one</li>
            <li><span>◇</span> Advice shaped by your own health conditions</li>
            <li><span>♧</span> Live readings from monitoring stations across India</li>
          </ul>
          <small>◉ {languages.length || 6} languages available</small>
        </aside>

        <section className="language-picker-card">
          <button className="language-picker-close" onClick={onClose} aria-label="Close language picker">×</button>
          <span className="language-picker-kicker">文&nbsp; CURRENT LANGUAGE</span>
          <h1>Choose your language / भाषा चुनें</h1>
          <p>The whole app will be shown in the language you pick. You can change it later from your profile.</p>
          <label className="language-search">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a language" autoFocus />
          </label>
          <div className="language-grid">
            {visibleLanguages.map((language) => (
              <button key={language.code} className={`language-option ${selectedCode === language.code ? 'selected' : ''}`} onClick={() => setSelectedCode(language.code)}>
                <strong>{language.nativeName || language.name}</strong>
                <small>{language.name}</small>
                {selectedCode === language.code && <span className="language-check">✓</span>}
              </button>
            ))}
            {!visibleLanguages.length && <p className="language-empty">No matching language found.</p>}
          </div>
          <button className="language-continue" onClick={continueWithLanguage}>Continue in this language <span>›</span></button>
        </section>
      </div>
    </div>
  );
}