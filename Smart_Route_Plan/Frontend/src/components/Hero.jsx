import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export const Hero = () => {
  const { t } = useLanguage();

  return (
    <section style={{ padding: '3rem 0 1.5rem 0', textDecoration: 'none' }}>
      <div className="container" style={{ textAlign: 'center', maxWidth: '800px' }}>
        <div 
          className="badge badge-good" 
          style={{ marginBottom: '1rem', fontSize: '0.85rem', padding: '0.35rem 1rem' }}
        >
          ✨ {t('hero.eyebrow', 'Air quality intelligence')}
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: '1.2', marginBottom: '1rem' }}>
          {t('hero.title', 'Plan a healthier way to get there.')}
        </h1>
        <p style={{ fontSize: '1.15rem', color: '#9ca3af', lineHeight: '1.6' }}>
          {t('hero.description', 'Compare route-level air quality forecasts before you travel and choose a journey that fits your health needs.')}
        </p>
      </div>
    </section>
  );
};
