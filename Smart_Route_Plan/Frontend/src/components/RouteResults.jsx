import React from 'react';
import { useLanguage } from '../context/LanguageContext';

function aqiBand(aqi) {
  if (!aqi || aqi <= 50)  return { label: 'Good',           color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)'  };
  if (aqi <= 100)          return { label: 'Moderate',       color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  };
  if (aqi <= 150)          return { label: 'Unhealthy (SG)', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.3)'  };
  return                          { label: 'Unhealthy',      color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   };
}

/* ── Empty state ── */
function EmptyState({ t }) {
  return (
    <div className="rr-empty">
      <div className="rr-empty-orb">🌿</div>
      <div className="rr-empty-title">{t('planner.eyebrow', 'Smart Route Comparison')}</div>
      <p className="rr-empty-sub">
        {t('route.no_result', 'Enter a starting point and destination to see AI-powered clean-air routes.')}
      </p>
    </div>
  );
}

/* ── Personal Guidance Card ── */
function GuidanceCard({ advice, langName }) {
  return (
    <div className="rr-guidance-card">
      <div className="rr-guidance-header">
        <div className="rr-guidance-icon">🩺</div>
        <div>
          <div className="rr-guidance-eyebrow">Personalised Health Guidance</div>
          <div className="rr-guidance-lang">· {langName}</div>
        </div>
      </div>
      <p className="rr-guidance-text">{advice}</p>
    </div>
  );
}

/* ── Single Route Card ── */
function RouteCard({ route, idx, isSelected, isRecommended, onSelect, localized }) {
  const aqiVal    = Math.round(route.route_aqi_score ?? 0);
  const distKm    = ((route.distance_meters ?? 0) / 1000).toFixed(1);
  const travelMin = Math.round((route.duration_seconds ?? 0) / 60);
  const riskScore = Math.round(route.health_risk_score ?? 0);
  const band      = aqiBand(aqiVal);
  const summary   = localized?.summary || '';
  const riskColor = riskScore < 40 ? '#10B981' : riskScore < 70 ? '#F59E0B' : '#EF4444';

  return (
    <div
      className={`rr-route-card ${isSelected ? 'rr-selected' : ''}`}
      onClick={() => onSelect?.(idx)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect?.(idx)}
    >
      {/* Card Header */}
      <div className="rr-card-header">
        <div className="rr-card-header-left">
          <div className="rr-route-num-badge" style={{ background: isRecommended ? '#10b981' : '#6366f1' }}>
            {isRecommended ? '★' : `#${idx + 1}`}
          </div>
          <div>
            <div className="rr-card-title">
              Route #{idx + 1}
              {isRecommended && <span className="rr-best-tag">Best</span>}
              {isSelected && <span className="rr-viewing-tag">Viewing</span>}
            </div>
            {summary && <div className="rr-card-summary">{summary}</div>}
          </div>
        </div>
        <div className="rr-aqi-pill" style={{ background: band.bg, color: band.color, border: `1px solid ${band.border}` }}>
          AQI {aqiVal} · {band.label}
        </div>
      </div>

      {/* Metric Row */}
      <div className="rr-metrics-row">
        <div className="rr-metric">
          <span className="rr-metric-icon">📏</span>
          <div>
            <div className="rr-metric-label">Distance</div>
            <div className="rr-metric-val">{distKm} km</div>
          </div>
        </div>
        <div className="rr-metric-divider" />
        <div className="rr-metric">
          <span className="rr-metric-icon">⏱</span>
          <div>
            <div className="rr-metric-label">Duration</div>
            <div className="rr-metric-val">{travelMin} min</div>
          </div>
        </div>
        <div className="rr-metric-divider" />
        <div className="rr-metric">
          <span className="rr-metric-icon">💨</span>
          <div>
            <div className="rr-metric-label">Avg AQI</div>
            <div className="rr-metric-val" style={{ color: band.color }}>{aqiVal}</div>
          </div>
        </div>
        <div className="rr-metric-divider" />
        <div className="rr-metric">
          <span className="rr-metric-icon">🛡</span>
          <div>
            <div className="rr-metric-label">Health Risk</div>
            <div className="rr-metric-val" style={{ color: riskColor }}>{riskScore}/100</div>
          </div>
        </div>
      </div>

      {/* Risk Progress Bar */}
      <div className="rr-risk-bar-wrap">
        <div className="rr-risk-bar-row">
          <span className="rr-risk-label">Health Risk Score</span>
          <span className="rr-risk-val" style={{ color: riskColor }}>{riskScore}/100</span>
        </div>
        <div className="rr-risk-track">
          <div
            className="rr-risk-fill"
            style={{ width: `${Math.min(riskScore, 100)}%`, background: riskColor }}
          />
        </div>
      </div>

      {/* Select CTA */}
      {!isSelected && (
        <div className="rr-card-cta">
          <span>Click to view on map →</span>
        </div>
      )}
    </div>
  );
}

/* ── Main Export ── */
export const RouteResults = ({ routeData, selectedRouteIndex, onSelectRoute }) => {
  const { t, languageCode, supportedLanguages } = useLanguage();

  if (!routeData) return <EmptyState t={t} />;

  const { all_routes, localized_display, health_recommendation } = routeData;
  const activeLang = supportedLanguages.find(l => l.code === languageCode) || supportedLanguages[0];
  const advice     = localized_display?.health_advice || health_recommendation?.advice || '';

  return (
    <div className="rr-container">
      {/* Route Count Header */}
      <div className="rr-header">
        <span className="rr-header-count">✨ {all_routes?.length || 0} Route Options Found</span>
        <span className="rr-header-hint">Click a card to view on map</span>
      </div>

      {/* 1. Personal Guidance Card */}
      {advice && (
        <GuidanceCard advice={advice} langName={activeLang?.nativeName} />
      )}

      {/* 2. Individual Route Cards */}
      <div className="rr-routes-list">
        {all_routes?.map((route, idx) => (
          <RouteCard
            key={idx}
            route={route}
            idx={idx}
            isSelected={idx === selectedRouteIndex}
            isRecommended={idx === 0}
            onSelect={onSelectRoute}
            localized={localized_display?.all_routes?.[idx]}
          />
        ))}
      </div>
    </div>
  );
};
