import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const RoutePlannerForm = ({ onSubmit, isLoading, defaultSource }) => {
  const { t, languageCode } = useLanguage();
  const [source, setSource]           = useState(defaultSource || 'Koramangala, Bengaluru');
  const [destination, setDestination] = useState('MG Road, Bengaluru');
  const [startTime, setStartTime]     = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  useEffect(() => {
    if (defaultSource?.trim()) setSource(defaultSource);
  }, [defaultSource]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!source || !destination) return;
    onSubmit({ source, destination, start_time: new Date(startTime).toISOString(), language: languageCode });
  };

  return (
    <form onSubmit={handleSubmit} className="planner-form-premium">
      <div className="planner-fields-row">
        {/* Source */}
        <div className="planner-field-wrap">
          <div className="planner-field-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            📍
          </div>
          <div className="planner-field-content">
            <label className="planner-field-label">{t('planner.source', 'From')}</label>
            <input
              className="planner-field-input"
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Koramangala, Bengaluru"
              required
            />
          </div>
        </div>

        {/* Arrow divider */}
        <div className="planner-arrow-divider">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>

        {/* Destination */}
        <div className="planner-field-wrap">
          <div className="planner-field-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            🎯
          </div>
          <div className="planner-field-content">
            <label className="planner-field-label">{t('planner.dest', 'To')}</label>
            <input
              className="planner-field-input"
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="MG Road, Bengaluru"
              required
            />
          </div>
        </div>

        {/* Depart At */}
        <div className="planner-field-wrap" style={{ maxWidth: '220px' }}>
          <div className="planner-field-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            🕒
          </div>
          <div className="planner-field-content">
            <label className="planner-field-label">{t('planner.time', 'Depart at')}</label>
            <input
              className="planner-field-input"
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </div>
        </div>

        {/* Find Routes Button */}
        <button className="planner-find-btn" type="submit" disabled={isLoading}>
          {isLoading ? (
            <><span className="planner-spinner" /> {t('planner.searching', 'Searching…')}</>
          ) : (
            <>{t('planner.find', 'Find Routes')} →</>
          )}
        </button>
      </div>
    </form>
  );
};
