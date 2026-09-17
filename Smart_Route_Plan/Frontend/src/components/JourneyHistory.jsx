import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const JourneyHistory = ({ history }) => {
  const { t } = useLanguage();

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📜 {t('history.title', 'Recent journeys')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {history.slice(0, 5).map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.95rem',
            }}
          >
            <div>
              <strong>{item.source}</strong> ➔ <strong>{item.destination}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
              </span>
            </div>
            <span className="badge badge-good" style={{ fontSize: '0.75rem' }}>
              {item.all_routes?.length || 0} {t('recommendations.options', 'routes')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
