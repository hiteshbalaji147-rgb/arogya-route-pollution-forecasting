import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const STAR_LABELS = ['Terrible 😞', 'Poor 😕', 'Okay 😐', 'Good 🙂', 'Excellent 🤩'];

const CATEGORIES = [
  { id: 'route_accuracy', label: '🗺️ Route Accuracy' },
  { id: 'aqi_data',       label: '💨 AQI Data Quality' },
  { id: 'ui_ux',          label: '🎨 Design & Usability' },
  { id: 'performance',    label: '⚡ Performance' },
  { id: 'health_advice',  label: '🩺 Health Guidance' },
  { id: 'other',          label: '💡 Other' },
];

export const FeedbackWidget = () => {
  const { t } = useLanguage();
  const starLabels = ['Terrible ??', 'Poor ??', 'Okay ??', t('aqi.good', 'Good') + ' ??', 'Excellent ??'];
  const categories = [
    { id: 'route_accuracy', label: `??? ${t('feedback.route_accuracy', 'Route Accuracy')}` }, { id: 'aqi_data', label: `?? ${t('feedback.aqi_data', 'AQI Data Quality')}` },
    { id: 'ui_ux', label: `?? ${t('feedback.design', 'Design & Usability')}` }, { id: 'performance', label: `? ${t('feedback.performance', 'Performance')}` },
    { id: 'health_advice', label: `?? ${t('feedback.health', 'Health Guidance')}` }, { id: 'other', label: `?? ${t('feedback.other', 'Other')}` },
  ];
  const [rating, setRating]             = useState(0);
  const [hovered, setHovered]           = useState(0);
  const [category, setCategory]         = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail]               = useState('');
  const [status, setStatus]             = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg]         = useState('');

  const isLoggedIn = !!localStorage.getItem('arogya_access_token');
  const displayed  = hovered || rating;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating)              { setErrorMsg('Please give a star rating.'); return; }
    if (!feedbackText.trim()) { setErrorMsg('Please write a short message.'); return; }
    if (!isLoggedIn && !email.trim()) { setErrorMsg('Please add your email so we can follow up.'); return; }

    setStatus('submitting'); setErrorMsg('');
    try {
      const token = localStorage.getItem('arogya_access_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/feedback/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rating,
          feedback_text: feedbackText.trim(),
          email: email.trim() || undefined,
          page_url: window.location.pathname,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Submission failed'); }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  const handleReset = () => {
    setRating(0); setHovered(0); setCategory(''); setFeedbackText('');
    setEmail(''); setStatus('idle'); setErrorMsg('');
  };

  /* ── Success Screen ── */
  if (status === 'success') {
    return (
      <div className="fb-success-wrap">
        <div className="fb-success-orb">🎉</div>
        <h2 className="fb-success-title">{t('feedback.thank_you', 'Thank you, your feedback matters!')}</h2>
        <p className="fb-success-msg">{t('feedback.success', 'Your input helps us make ArogyaRoute smarter and healthier for everyone.')}</p>
        <button className="fb-submit-btn" onClick={handleReset}>✏️ Submit Another</button>
      </div>
    );
  }

  return (
    <form className="fb-page" onSubmit={handleSubmit} noValidate>

      {/* ── Hero Header ── */}
      <div className="fb-hero">
        <div className="fb-hero-left">
          <div className="fb-hero-eyebrow">
            <span className="fb-hero-dot" />
            {t('feedback.voice', 'Your Voice Matters')}
          </div>
          <h2 className="fb-hero-title">{t('feedback.page_title', 'How are we doing?')}</h2>
          <p className="fb-hero-sub">
            {t('feedback.subtitle', "Help us improve ArogyaRoute's air quality routing, health guidance, and overall experience.")}
          </p>
        </div>
        <div className="fb-hero-graphic">
          <div className="fb-hero-emoji-stack">
            <span>💗</span><span>🌸</span><span>✨</span>
          </div>
        </div>
      </div>

      {/* ── Step 1: Star Rating ── */}
      <div className="fb-section-card">
        <div className="fb-section-num">01</div>
        <div className="fb-section-body">
          <div className="fb-section-label">{t('feedback.rate', 'Rate your overall experience')}</div>
          <div className="fb-star-row">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                className={`fb-star ${displayed >= star ? 'fb-star-active' : ''}`}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => { setRating(star); setErrorMsg(''); }}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          {displayed > 0 && (
            <div className="fb-star-label" style={{
              color: displayed >= 4 ? '#10b981' : displayed >= 3 ? '#f59e0b' : '#ef4444'
            }}>
              {starLabels[displayed - 1]}
            </div>
          )}
        </div>
      </div>

      {/* ── Step 2: Category ── */}
      <div className="fb-section-card">
        <div className="fb-section-num">02</div>
        <div className="fb-section-body">
          <div className="fb-section-label">{t('feedback.topic', "What's your feedback about?")} <span className="fb-optional">({t('feedback.optional', 'optional')})</span></div>
          <div className="fb-category-grid">
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                className={`fb-category-pill ${category === c.id ? 'fb-category-active' : ''}`}
                onClick={() => setCategory(prev => prev === c.id ? '' : c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step 3: Message ── */}
      <div className="fb-section-card">
        <div className="fb-section-num">03</div>
        <div className="fb-section-body">
          <div className="fb-section-label">{t('feedback.more', 'Tell us more')} <span className="fb-required">*</span></div>
          <textarea
            className="fb-textarea"
            rows={5}
            maxLength={2000}
            placeholder={t('feedback.placeholder', 'What did you love? What can we improve? Any bugs or suggestions?')}
            value={feedbackText}
            onChange={e => { setFeedbackText(e.target.value); setErrorMsg(''); }}
            required
          />
          <div className="fb-char-count">{feedbackText.length} / 2000</div>
        </div>
      </div>

      {/* ── Step 4: Email (guest only) ── */}
      {!isLoggedIn && (
        <div className="fb-section-card">
          <div className="fb-section-num">04</div>
          <div className="fb-section-body">
            <div className="fb-section-label">{t('feedback.email', 'Email address')} <span className="fb-required">*</span></div>
            <input
              className="fb-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
            />
            <div className="fb-input-hint">{t('feedback.email_hint', "We'll only use this to follow up on your feedback.")}</div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {errorMsg && (
        <div className="fb-error-banner">
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {/* ── Submit ── */}
      <div className="fb-actions">
        <button type="button" className="fb-reset-btn" onClick={handleReset}>{t('feedback.reset', 'Reset')}</button>
        <button type="submit" className="fb-submit-btn" disabled={status === 'submitting'}>
          {status === 'submitting'
            ? <><span className="fb-spinner" /> Sending…</>
            : '🚀 Submit Feedback'}
        </button>
      </div>

    </form>
  );
};
