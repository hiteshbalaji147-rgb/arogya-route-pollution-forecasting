import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const HEALTH_CONDITIONS_LIST = [
  { id: 1, name: 'Asthma' },
  { id: 2, name: 'COPD' },
  { id: 3, name: 'Heart Disease' },
  { id: 6, name: 'Other Respiratory Issues' },
  { id: 4, name: 'Pregnancy' },
  { id: 5, name: 'Senior Citizen' },
];

export const AuthModal = ({ isOpen, onClose, onAuthSuccess, initialRegistering = false }) => {
  const { t, languageCode, supportedLanguages } = useLanguage();
  const [isRegistering, setIsRegistering] = useState(initialRegistering);
  const [email, setEmail]                 = useState('');
  const [password, setPassword]             = useState('');
  const [username, setUsername]             = useState('');
  const [age, setAge]                       = useState(25);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [hasHealthCondition, setHasHealthCondition] = useState(true);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [error, setError]                   = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    setIsRegistering(initialRegistering);
  }, [initialRegistering]);

  useEffect(() => {
    if (!isOpen || !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your_google')) return;
    const timer = setTimeout(() => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: googleBtnRef.current.offsetWidth || 340,
        });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen, isRegistering]);

  const handleGoogleCredential = async (response) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Google sign-in failed');
      }
      const tokenData = await res.json();
      localStorage.setItem('arogya_access_token', tokenData.access_token);
      localStorage.setItem('arogya_refresh_token', tokenData.refresh_token);

      const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (meRes.ok) {
        const user = await meRes.json();
        onAuthSuccess(user);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleCondition = (id) => {
    if (selectedConditions.includes(id)) {
      const next = selectedConditions.filter(c => c !== id);
      setSelectedConditions(next);
      if (next.length === 0) setHasHealthCondition(false);
    } else {
      setSelectedConditions([...selectedConditions, id]);
      setHasHealthCondition(true);
    }
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setHasHealthCondition(checked);
    if (!checked) {
      setSelectedConditions([]);
    } else if (selectedConditions.length === 0) {
      setSelectedConditions([1]); // Default to Asthma
    }
  };

  const mapLangToId = (langName) => {
    return supportedLanguages.find(language => language.name === langName)?.id || 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        const payload = {
          username,
          email,
          password,
          age: parseInt(age, 10) || 25,
          language_id: mapLangToId(selectedLanguage),
          has_health_condition: hasHealthCondition && selectedConditions.length > 0,
          condition_ids: hasHealthCondition ? selectedConditions : [],
        };

        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Registration failed');
        }
      }

      const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        const data = await loginRes.json();
        throw new Error(data.detail || 'Sign in failed');
      }

      const tokenData = await loginRes.json();
      localStorage.setItem('arogya_access_token', tokenData.access_token);
      localStorage.setItem('arogya_refresh_token', tokenData.refresh_token);

      const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (meRes.ok) {
        const user = await meRes.json();
        onAuthSuccess(user);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="arogya-modal-overlay" onClick={onClose}>
      <div className="arogya-modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Close Button */}
        <button className="arogya-modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>

        {/* Logo */}
        <div className="arogya-modal-logo-wrap">
          <img src="/arogya-route-logo.png" alt="ArogyaRoute Logo" className="arogya-modal-logo-img" />
          <span className="arogya-modal-logo-text">ArogyaRoute</span>
        </div>

        {/* Title & Subtitle */}
        <h2 className="arogya-modal-title">
          {isRegistering ? 'Build your health profile' : 'Welcome back'}
        </h2>
        {!isRegistering && (
          <p className="arogya-modal-subtitle">Sign in to plan with cleaner air in mind.</p>
        )}

        {/* Error banner */}
        {error && (
          <div className="arogya-modal-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Google Sign-in (only shown on Sign in mode) */}
        {!isRegistering && (
          <>
            <div className="arogya-google-btn-container">
              {GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('your_google') ? (
                <div ref={googleBtnRef} style={{ width: '100%' }} />
              ) : (
                <button type="button" className="arogya-google-fallback-btn" onClick={() => setError('Google Sign-In requires configuring VITE_GOOGLE_CLIENT_ID in your environment.')}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}
            </div>

            <div className="arogya-modal-divider">
              <span>or continue with email</span>
            </div>
          </>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="arogya-modal-form">
          {/* Registration Extra Fields */}
          {isRegistering && (
            <div className="arogya-modal-field">
              <label className="arogya-modal-label">Name</label>
              <input
                className="arogya-modal-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
          )}

          {/* Email Field */}
          <div className="arogya-modal-field">
            <label className="arogya-modal-label">Email</label>
            <input
              className="arogya-modal-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password Field */}
          <div className="arogya-modal-field">
            <label className="arogya-modal-label">Password</label>
            <input
              className="arogya-modal-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          {/* Registration Age & Language & Conditions */}
          {isRegistering && (
            <>
              <div className="arogya-modal-field">
                <label className="arogya-modal-label">Age</label>
                <input
                  className="arogya-modal-input"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="1"
                  max="120"
                  required
                />
              </div>

              <div className="arogya-modal-field">
                <label className="arogya-modal-label">Language</label>
                <select
                  className="arogya-modal-select"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  {supportedLanguages.map((language) => (
                    <option key={language.id || language.code} value={language.name}>
                      {language.nativeName || language.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Health Condition Checkbox */}
              <div className="arogya-modal-checkbox-row">
                <label className="arogya-checkbox-label">
                  <input
                    type="checkbox"
                    checked={hasHealthCondition}
                    onChange={handleCheckboxChange}
                  />
                  <span>I have a health condition</span>
                </label>
              </div>

              {/* Condition Pills */}
              {hasHealthCondition && (
                <div className="arogya-condition-pills-grid">
                  {HEALTH_CONDITIONS_LIST.map((cond) => {
                    const isSelected = selectedConditions.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        className={`arogya-condition-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleCondition(cond.id)}
                      >
                        {cond.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Action Button */}
          <button type="submit" className="arogya-modal-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <><span className="arogya-btn-spinner" /> Connecting…</>
            ) : isRegistering ? (
              'Create account →'
            ) : (
              'Sign in →'
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="arogya-modal-footer">
          {isRegistering ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                className="arogya-modal-switch-link"
                onClick={() => { setIsRegistering(false); setError(''); }}
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              New here?{' '}
              <button
                type="button"
                className="arogya-modal-switch-link"
                onClick={() => { setIsRegistering(true); setError(''); }}
              >
                Create an account
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
