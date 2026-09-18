import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { RoutePlannerForm } from './RoutePlannerForm';
import { MapContainer }    from './MapContainer';
import { RouteResults }    from './RouteResults';
import { FeedbackWidget }  from './FeedbackWidget';
import { AssistantWidget } from './AssistantWidget';
import '../user_portal.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function aqiClass(aqi) {
  if (aqi <= 50)  return 'badge-good';
  if (aqi <= 100) return 'badge-moderate';
  return 'badge-unhealthy';
}

/* ── 24-Hour Forecast Area Chart ─────────────────────────────────────────── */
function ForecastAreaChart({ data, t }) {
  const pointsData = data && data.length > 0 ? data : [
    { time: '12a', aqi: 42 },
    { time: '3a', aqi: 38 },
    { time: '6a', aqi: 52 },
    { time: '9a', aqi: 85 },
    { time: '12p', aqi: 110 },
    { time: '3p', aqi: 135 },
    { time: '6p', aqi: 95 },
    { time: '9p', aqi: 70 },
    { time: 'Now', aqi: 87 }
  ];

  const W = 620, H = 200, P = 36;
  const maxVal = Math.max(...pointsData.map(d => d.aqi), 160);

  const coords = pointsData.map((d, i) => {
    const x = P + (i / (pointsData.length - 1)) * (W - P * 2);
    const y = H - P - (d.aqi / maxVal) * (H - P * 2);
    return [x, y];
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const areaPath = linePath + ` L ${coords[coords.length - 1][0]} ${H - P} L ${coords[0][0]} ${H - P} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="forecastFillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {[0, 40, 80, 120, 160].map((val, i) => {
        const y = H - P - (val / maxVal) * (H - P * 2);
        return (
          <g key={i}>
            <line x1={P} y1={y} x2={W - P} y2={y} stroke="var(--user-border)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={P - 8} y={y + 4} fontSize="10" textAnchor="end" fill="var(--user-text-sub)">{val}</text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#forecastFillGrad)" />
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
      ))}

      {pointsData.map((d, i) => {
        const x = P + (i / (pointsData.length - 1)) * (W - P * 2);
        return (
          <text key={i} x={x} y={H - 8} fontSize="10" textAnchor="middle" fill="var(--user-text-sub)">{d.time}</text>
        );
      })}
    </svg>
  );
}

/* ── Radial AQI Arch Gauge ───────────────────────────────────────────────── */
function RadialAqiGauge({ aqi, status }) {
  const percentage = Math.min(100, Math.max(0, (aqi / 300) * 100));
  const strokeDashoffset = 251 - (251 * percentage) / 100;
  const color = aqi <= 50 ? '#10b981' : aqi <= 100 ? '#f59e0b' : '#ef4444';

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" viewBox="0 0 200 120">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--user-border)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeDasharray="251"
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div style={{ marginTop: '-45px', textAlign: 'center' }}>
        <div className="gauge-val-text" style={{ color: color }}>{aqi}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--user-text-sub)', fontWeight: '700', letterSpacing: '1px' }}>AQI SCORE</div>
        <span className={`gauge-badge ${aqi <= 50 ? 'badge-good' : aqi <= 100 ? 'badge-moderate' : 'badge-unhealthy'}`}>
          ● {status}
        </span>
      </div>
    </div>
  );
}

/* ── TAB 1: DASHBOARD ────────────────────────────────────────────────────── */
function DashboardTab({ summaryData, userName, onPlanRouteClick, onHealthAdviceClick, userCoords, t }) {
  const name = userName || summaryData?.user?.username || 'Harshini';
  const locationName = summaryData?.location?.city || 'Koramangala, Bengaluru';
  const mini = summaryData?.mini_metrics || { temp: '28°C', humidity: '65%', wind: '12 km/h', visibility: '8.2 km', peak_time: '3 PM' };
  const gauge = summaryData?.gauge || { aqi: 87, status: 'Moderate' };
  const pollutants = summaryData?.pollutants || { pm25: '45 µg/m³', pm10: '82 µg/m³', no2: '38 ppb', o3: '62 ppb' };

  return (
    <div>
      {/* 1. Header Banner Card */}
      <div className="dashboard-banner-card" style={{ background: 'linear-gradient(135deg, #023e2b 0%, #046c4e 50%, #065f46 100%)' }}>
        <div>
          <div className="banner-tag">
            <span style={{ color: '#4ade80' }}>●</span> Live • {locationName}
          </div>
          <h2 className="banner-headline">{t('dashboard.greeting', 'Good to see you')}, {name} 👋</h2>
          <p className="banner-subtext">
            {summaryData?.banner?.summary_text || `AQI is ${gauge.status} (${gauge.aqi}) — mask optional. Peak exposure expected 3–6 PM. Best travel window: before 8:30 AM.`}
          </p>
        </div>
        <div className="banner-actions">
          <button className="banner-btn banner-btn-primary" onClick={onPlanRouteClick} style={{ color: '#046c4e' }}>
            {t('dashboard.safe_route', '✈️ Safe Route')}
          </button>
          <button className="banner-btn banner-btn-glass" onClick={onHealthAdviceClick}>
            {t('dashboard.health_advice', '❤️ Health Advice')}
          </button>
        </div>
      </div>

      {/* 2. Row of 5 Mini Metric Cards */}
      <div className="mini-metrics-row">
        <div className="mini-metric-card">
          <div className="mini-icon-circle" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>🌡️</div>
          <div className="mini-metric-info">
            <span className="mini-metric-label">{t('dashboard.temp', 'Temperature')}</span>
            <span className="mini-metric-val">{mini.temp}</span>
          </div>
        </div>

        <div className="mini-metric-card">
          <div className="mini-icon-circle" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>💧</div>
          <div className="mini-metric-info">
            <span className="mini-metric-label">{t('dashboard.humidity', 'Humidity')}</span>
            <span className="mini-metric-val">{mini.humidity}</span>
          </div>
        </div>

        <div className="mini-metric-card">
          <div className="mini-icon-circle" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>💨</div>
          <div className="mini-metric-info">
            <span className="mini-metric-label">{t('dashboard.wind', 'Wind')}</span>
            <span className="mini-metric-val">{mini.wind}</span>
          </div>
        </div>

        <div className="mini-metric-card">
          <div className="mini-icon-circle" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>👁️</div>
          <div className="mini-metric-info">
            <span className="mini-metric-label">{t('dashboard.visibility', 'Visibility')}</span>
            <span className="mini-metric-val">{mini.visibility}</span>
          </div>
        </div>

        <div className="mini-metric-card">
          <div className="mini-icon-circle" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>⏰</div>
          <div className="mini-metric-info">
            <span className="mini-metric-label">{t('dashboard.peak_time', 'Peak AQI Time')}</span>
            <span className="mini-metric-val">{mini.peak_time}</span>
          </div>
        </div>
      </div>

      {/* 3. Lower Section Grid */}
      <div className="dashboard-lower-grid">
        <div className="widget-card">
          <div className="widget-card-header">
            <div>
              <h3>{t('dashboard.forecast', '24-Hour AQI Forecast')}</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--user-text-sub)', marginTop: '0.2rem' }}>
                {t('dashboard.ai_confidence', '⚡ AI prediction • 94% confidence')}
              </div>
            </div>
            <span style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.78rem', fontWeight: '700' }}>
              ↘ Improving tonight
            </span>
          </div>
          <ForecastAreaChart data={summaryData?.forecast} t={t} />
        </div>

        <div className="widget-card">
          <div className="widget-card-header">
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--user-text-sub)' }}>
                📍 {locationName} • Live
              </span>
            </div>
          </div>

          <RadialAqiGauge aqi={gauge.aqi} status={gauge.status} />

          <div className="pollutants-grid">
            <div className="pollutant-box">
              <span className="pollutant-label">PM2.5</span>
              <span className="pollutant-val">{pollutants.pm25}</span>
            </div>
            <div className="pollutant-box">
              <span className="pollutant-label">PM10</span>
              <span className="pollutant-val">{pollutants.pm10}</span>
            </div>
            <div className="pollutant-box">
              <span className="pollutant-label">NO₂</span>
              <span className="pollutant-val">{pollutants.no2}</span>
            </div>
            <div className="pollutant-box">
              <span className="pollutant-label">O₃</span>
              <span className="pollutant-val">{pollutants.o3}</span>
            </div>
          </div>
        </div>
      </div>

      <AssistantWidget
        latitude={userCoords?.latitude || summaryData?.location?.latitude}
        longitude={userCoords?.longitude || summaryData?.location?.longitude}
        locationName={locationName}
      />
    </div>
  );
}

function AirNowDashboard({ summaryData, userName, onPlanRouteClick, userCoords, t }) {
  const locationName = summaryData?.location?.city || 'Bengaluru';
  const gauge = summaryData?.gauge || { aqi: 53, status: 'Satisfactory' };
  const mini = summaryData?.mini_metrics || { temp: '28°C', humidity: '65%', wind: '12 km/h', visibility: '8.2 km' };
  const aqi = Math.round(gauge.aqi || 0);
  const status = gauge.status || (aqi <= 50 ? 'Good' : 'Moderate');
  const isRainy = /rain/i.test(summaryData?.weather?.condition || '');
  const condition = summaryData?.user?.primary_condition || 'your health profile';
  const tips = aqi > 100
    ? ['Limit strenuous outdoor activity while AQI is elevated.', `Keep your ${condition.toLowerCase()} medication within reach.`, 'Prefer closed windows and recirculated air near busy roads.']
    : ['Air quality is satisfactory. Sensitive people may feel minor discomfort.', `Keep your ${condition.toLowerCase()} medication within reach.`, 'Choose quieter roads and take short breaks during outdoor activity.'];

  return (
    <div className="air-now-view">
      <div className="air-now-heading">
        <div>
          <span className="air-now-kicker">◉&nbsp; RIGHT NOW</span>
          <h1>{userName || 'Harshini'} <em>— The air where you are</em></h1>
          <p>Live readings, alerts and safety tips for your health profile — before you decide whether to go out.</p>
        </div>
        <div className="aqi-scale" aria-label="AQI scale"><i /><i /><i /><i /><i /><i /></div>
      </div>

      <section className="air-now-card">
        <header className="air-now-card-header">
          <h2>◉&nbsp; Right now</h2>
          <div className="air-now-location">⌖ <b>{locationName}</b><span>{locationName}, India</span><button aria-label="Edit location">⌕</button><button aria-label="Refresh reading">↻</button></div>
        </header>

        <div className="air-now-metrics">
          <div className={`air-aqi-badge ${aqi > 100 ? 'elevated' : ''}`}><strong>{aqi}</strong><span>{status.toUpperCase()}</span></div>
          <div className="air-metric"><b>♨&nbsp; {mini.temp}</b><span>Light conditions</span></div>
          <div className="air-metric"><b>♧&nbsp; Humidity <strong>{mini.humidity}</strong></b><span>Humid</span></div>
          <div className="air-metric"><b>≋&nbsp; Wind <strong>{mini.wind}</strong></b></div>
          <div className="air-metric"><b>♢&nbsp; Rainfall <strong>{isRainy ? '1 mm' : '0 mm'}</strong></b></div>
          <div className="air-metric"><b>▧&nbsp; Visibility <strong>{mini.visibility}</strong></b></div>
        </div>

        <div className="air-section">
          <h3>▌ ALERTS FOR YOU</h3>
          <div className="air-alert"><span>ⓘ</span><div><b>{isRainy ? 'It is raining' : 'Conditions are being monitored'}</b><p>{isRainy ? 'Carry an umbrella. Rain often clears particles from the air after a shower.' : 'Your live environmental readings are ready. Check the safety tips before heading out.'}</p></div></div>
        </div>

        <div className="air-section">
          <h3>▌ SAFETY TIPS</h3>
          <div className="air-tip-list">{tips.map((tip) => <div className="air-tip" key={tip}><span>✓</span>{tip}</div>)}</div>
        </div>

        <div className="air-section carry-section">
          <h3>▌ WHAT TO CARRY</h3>
          <div className="carry-grid">
            <article><span>▱</span><div><b>Face mask</b><p>A mask can reduce exposure on busy routes.</p></div></article>
            <article><span>▣</span><div><b>Medication</b><p>Keep your usual relief medication nearby.</p></div></article>
            <article><span>⌂</span><div><b>Water bottle</b><p>Stay comfortable during outdoor travel.</p></div></article>
          </div>
        </div>

        <div className="air-now-actions">
          <button className="air-route-button" onClick={onPlanRouteClick}>⌁&nbsp; Plan a cleaner route</button>
          <span>Location updated just now</span>
        </div>
      </section>

      <AssistantWidget latitude={userCoords?.latitude || summaryData?.location?.latitude} longitude={userCoords?.longitude || summaryData?.location?.longitude} locationName={locationName} />
    </div>
  );
}

/* ── TAB 2: SMART ROUTER ─────────────────────────────────────────────────── */
function SmartRouterTab({ routeData, selectedRouteIndex, onSelectRoute, onRouteSubmit, isLoading, errorMsg, locationText, userCoords, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Premium Route Planner Search Card ── */}
      <div className="smart-router-header-card">
        <div className="smart-router-header-inner">
          <div className="smart-router-eyebrow">
            <span className="smart-router-live-dot" />
            {t('router.title', 'AI-Powered Smart Router')}
          </div>
          <h2 className="smart-router-headline">{t('router.subtitle', 'Find the healthiest route for you')}</h2>
          <p className="smart-router-desc">{t('router.desc', 'Our AI compares air quality across every route option and recommends the cleanest path for your health conditions.')}</p>
        </div>
        <div className="smart-router-search-card">
          <RoutePlannerForm
            onSubmit={onRouteSubmit}
            isLoading={isLoading}
            defaultSource={locationText?.split(',')[0] || 'Bengaluru'}
          />
          {errorMsg && (
            <div className="smart-router-error">
              <span>⚠️</span> {errorMsg}
            </div>
          )}
        </div>
      </div>

      {/* ── Map + Results split ── */}
      <div className="router-split">
        <div className="router-map-pane widget-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div className="router-map-label">
            <span style={{ color: '#10b981' }}>●</span>
            &nbsp;{t('router.map_label', 'Route Air Quality Map')}
            <span className="router-map-legend">
              <span style={{ color: '#10b981' }}>● Good</span>
              <span style={{ color: '#f59e0b' }}>● Moderate</span>
              <span style={{ color: '#ef4444' }}>● Unhealthy</span>
            </span>
          </div>
          <MapContainer
            routeData={routeData}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={onSelectRoute}
            userCoords={userCoords}
          />
        </div>

        <div className="router-results-pane widget-card" style={{ maxHeight: '540px', overflowY: 'auto' }}>
          <RouteResults
            routeData={routeData}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={onSelectRoute}
          />
        </div>
      </div>
    </div>
  );
}


/* ── TAB 4: ROUTE HISTORY (DYNAMIC DB FETCHING) ────────────────────────────── */
function HistoryTab({ history: initialHistory, summaryData, t }) {
  const [dbHistory, setDbHistory] = useState(initialHistory || []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const token = localStorage.getItem('arogya_access_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_BASE_URL}/route/history`, { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setDbHistory(data);
        }
      })
      .catch(() => {});
  }, []);

  const count = dbHistory.length;
  const avgAqi = count > 0 ? Math.round(dbHistory.reduce((acc, curr) => acc + (curr.avg_aqi || 45), 0) / count) : 88;
  const avgHealth = count > 0 ? (dbHistory.reduce((acc, curr) => acc + (curr.health_score || 7.0), 0) / count).toFixed(1) : '7.2';
  const daysTracked = count > 0 ? count : 1;

  const stats = {
    total_routes: count,
    avg_aqi_exposure: avgAqi,
    avg_health_score: avgHealth,
    days_tracked: daysTracked
  };

  const filteredRows = dbHistory.filter(r => {
    const q = search.toLowerCase();
    const source = (r.source || '').toLowerCase();
    const dest = (r.destination || '').toLowerCase();
    const matchSearch = source.includes(q) || dest.includes(q);
    if (filter === 'All') return matchSearch;
    if (filter === 'Good') return matchSearch && (r.avg_aqi || 87) <= 50;
    if (filter === 'Moderate') return matchSearch && (r.avg_aqi || 87) > 50 && (r.avg_aqi || 87) <= 100;
    if (filter === 'Unhealthy') return matchSearch && (r.avg_aqi || 87) > 100;
    return matchSearch;
  });


  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0 }}>{t('history.title', 'Route History')}</h2>
        <p style={{ color: 'var(--user-text-sub)', margin: '0.2rem 0 0 0' }}>{t('history.subtext', 'Review your past routes and pollution exposure')}</p>
      </div>

      <div className="history-kpi-row">
        <div className="history-kpi-card">
          <div className="history-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>✈️</div>
          <span className="history-kpi-val" style={{ color: '#3b82f6' }}>{stats.total_routes}</span>
          <span className="history-kpi-label">{t('history.total_routes', 'Total Routes')}</span>
        </div>

        <div className="history-kpi-card">
          <div className="history-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>📈</div>
          <span className="history-kpi-val" style={{ color: '#f59e0b' }}>{stats.avg_aqi_exposure}</span>
          <span className="history-kpi-label">{t('history.avg_aqi', 'Avg AQI Exposure')}</span>
        </div>

        <div className="history-kpi-card">
          <div className="history-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>🌿</div>
          <span className="history-kpi-val" style={{ color: '#10b981' }}>{stats.avg_health_score}</span>
          <span className="history-kpi-label">{t('history.avg_health', 'Avg Health Score')}</span>
        </div>

        <div className="history-kpi-card">
          <div className="history-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>📅</div>
          <span className="history-kpi-val" style={{ color: '#8b5cf6' }}>{stats.days_tracked}</span>
          <span className="history-kpi-label">{t('history.days_tracked', 'Days Tracked')}</span>
        </div>
      </div>

      <div className="history-filter-bar">
        <input
          type="text"
          className="history-search-input"
          placeholder={t('history.search_placeholder', '🔍 Search by source or destination...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="history-filter-pills">
          {['All', 'Good', 'Moderate', 'Unhealthy'].map(f => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="history-table-card">
        <table className="history-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('history.col_route', 'SOURCE → DESTINATION')}</th>
              <th>{t('history.col_date', 'DATE & TIME')}</th>
              <th>{t('history.col_distance', 'DISTANCE')}</th>
              <th>{t('history.col_aqi', 'AQI')}</th>
              <th>{t('history.col_health', 'HEALTH SCORE')}</th>
              <th>{t('history.col_actions', 'ACTIONS')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, i) => {
              const aqiVal = Math.round(r.avg_aqi || 87);
              const score = r.health_score || 7.2;
              const barColor = score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444';
              return (
                <tr key={r.id || i}>
                  <td style={{ color: 'var(--user-text-sub)', fontWeight: '600' }}>{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: '700' }}>● {r.source} ➔ {r.destination}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--user-text-sub)' }}>{r.duration || '12 min'}</div>
                  </td>
                  <td style={{ color: 'var(--user-text-sub)' }}>{r.date_time || r.created_at || '2026-08-05'}</td>
                  <td style={{ fontWeight: '600' }}>{r.distance || '5.2 km'}</td>
                  <td>
                    <span className={`gauge-badge ${aqiVal <= 50 ? 'badge-good' : aqiVal <= 100 ? 'badge-moderate' : 'badge-unhealthy'}`}>
                      {aqiVal} {r.status || 'Moderate'}
                    </span>
                  </td>
                  <td>
                    <div className="health-score-bar-bg">
                      <div className="health-score-bar-fill" style={{ width: `${score * 10}%`, background: barColor }} />
                    </div>
                    <strong style={{ color: barColor }}>{score}</strong>
                  </td>
                  <td>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', marginRight: '0.5rem' }} title="View details">👁️</button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }} title="Delete log">🗑️</button>
                  </td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--user-text-sub)' }}>
                  No route history logs match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── TAB 5: SETTINGS ───────────────────────────────────────────────────────── */
function SettingsTab({ currentUser, setCurrentUser, t, languageCode, changeLanguage, supportedLanguages }) {
  const [username, setUsername] = useState(currentUser?.username || 'Harshini');
  const [conditions, setConditions] = useState(currentUser?.health_conditions || ['Asthma']);
  const [conditionOptions, setConditionOptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/health-conditions`)
      .then(res => res.ok ? res.json() : [])
      .then(setConditionOptions)
      .catch(() => setConditionOptions([]));
  }, []);

  const toggleCondition = (name) => {
    setConditions(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMsg('');
    try {
      const token = localStorage.getItem('arogya_access_token');
      const langObj = supportedLanguages.find(l => l.code === languageCode);
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, language: langObj?.name || 'English', health_conditions: conditions }),
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setCurrentUser(prev => ({ ...prev, username: updated.username || username, health_conditions: updated.health_conditions || conditions }));
      setMsg('✓ Profile & Health settings saved to database!');
    } catch (e) {
      setMsg('⚠️ ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="widget-card" style={{ maxWidth: '680px' }}>
      <h3>{t('settings.title', '⚙️ Profile & Personalisation Settings')}</h3>
      <p style={{ color: 'var(--user-text-sub)', marginBottom: '1.5rem' }}>
        {t('settings.subtext', 'Manage your display name, language localization, and health profile stored in PostgreSQL database.')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>{t('settings.name', 'Display Name')}</label>
          <input
            type="text"
            className="topbar-search-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>{t('settings.email', 'Email Address')}</label>
          <input
            type="email"
            value={currentUser?.email || 'harshini919@gmail.com'}
            disabled
            style={{ width: '100%', padding: '0.65rem 1.15rem', borderRadius: '12px', border: '1px solid var(--user-border)', opacity: 0.6 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>{t('settings.lang', 'App Language')}</label>
          <select
            className="lang-pill-select"
            value={languageCode}
            onChange={e => changeLanguage(e.target.value)}
            style={{ width: '100%' }}
          >
            {supportedLanguages.map(l => (
              <option key={l.code} value={l.code}>{l.nativeName} — {l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>{t('settings.conditions', 'Health Profile Conditions')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
            {(conditionOptions.length > 0 ? conditionOptions : [
              { condition_id: 1, condition_name: 'Asthma' },
              { condition_id: 2, condition_name: 'COPD' },
              { condition_id: 3, condition_name: 'Heart Disease' },
              { condition_id: 4, condition_name: 'Pregnancy' },
              { condition_id: 5, condition_name: 'Senior Citizen' },
              { condition_id: 6, condition_name: 'Other Respiratory Issues' }
            ]).map(c => {
              const isSel = conditions.includes(c.condition_name);
              return (
                <button
                  type="button"
                  key={c.condition_id}
                  onClick={() => toggleCondition(c.condition_name)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '20px',
                    border: `1px solid ${isSel ? '#bd65a4' : 'var(--user-border)'}`,
                    background: isSel ? 'rgba(204, 93, 164, 0.15)' : 'var(--user-bg)',
                    color: isSel ? '#a74c91' : 'var(--user-text-main)',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {c.condition_name}
                </button>
              );
            })}
          </div>
        </div>

        {msg && <div style={{ color: '#b14e94', fontWeight: '700' }}>{msg}</div>}

        <button
          className="banner-btn banner-btn-primary"
          onClick={handleSave}
          disabled={isSaving}
          style={{ width: '100%', padding: '0.85rem', background: '#7540b4', color: '#ffffff', fontSize: '1rem', marginTop: '0.5rem' }}
        >
          {isSaving ? 'Saving...' : t('settings.save', '💾 Save Settings')}
        </button>
      </div>
    </div>
  );
}

/* ── MAIN WORKSPACE COMPONENT ──────────────────────────────────────────────── */
export const DashboardView = ({
  currentUser,
  setCurrentUser,
  routeData,
  selectedRouteIndex,
  onSelectRoute,
  onRouteSubmit,
  isLoading,
  errorMsg,
  history = [],
  activeNav = 'dashboard',
  setActiveNav,
  onLogout,
  userCity,
  userCountry,
  userCoords,
}) => {
  const { t, theme, toggleTheme, languageCode, changeLanguage, supportedLanguages } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    const loadDashboard = (lat, lon) => {
      const token = localStorage.getItem('arogya_access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const queryParams = new URLSearchParams({ lang: languageCode });
      if (lat && lon) {
        queryParams.append('latitude', lat);
        queryParams.append('longitude', lon);
      }

      fetch(`${API_BASE_URL}/route/dashboard-summary?${queryParams.toString()}`, { headers })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setSummaryData(data);
        })
        .catch(() => {});
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          loadDashboard(lat, lon);
          const token = localStorage.getItem('arogya_access_token');
          if (token) {
            fetch(`${API_BASE_URL}/auth/me/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ latitude: lat, longitude: lon }),
            }).catch(() => {});
          }
        },
        () => loadDashboard(),
        { maximumAge: 300000, timeout: 8000 }
      );
    } else {
      loadDashboard();
    }
  }, [languageCode]);

  const rawName = currentUser?.username || summaryData?.user?.username || 'Harshini';
  const name = rawName.split(' ')[0]; // First name only
  const initials = name.substring(0, 1).toUpperCase();
  const primaryCondition = currentUser?.health_conditions?.[0] || summaryData?.user?.primary_condition || 'Asthma';

  const NAV = [
    { id: 'dashboard', icon: '◉', label: t('nav.dashboard', 'Air now') },
    { id: 'routes',    icon: '⌁', label: t('nav.router', 'Plan a route') },
    { id: 'history',   icon: '↶', label: t('nav.history', 'My journeys') },
    { id: 'settings',  icon: '♙', label: t('nav.settings', 'Profile') },
    { id: 'feedback',  icon: '💬', label: t('nav.feedback', 'Feedback') },
  ];

  return (
    <div className="app-shell">

      {/* Mobile Sticky Top Header */}
      <div className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <img src="/arogya-route-logo.png" alt="Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <strong style={{ fontSize: '1.1rem' }}>ArogyaRoute</strong>
        </div>
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar Navigation (Green Theme) */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img className="brand-logo-mark" src="/arogya-route-logo.png" alt="ArogyaRoute" />
          <span className="sidebar-brand-name">ArogyaRoute</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveNav(item.id);
                setMobileOpen(false);
              }}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user-section">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar" style={{ background: '#10b981' }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name">{name}</div>
              <div className="sidebar-user-email">{primaryCondition}</div>
            </div>
          </div>
          <button className="sidebar-signout-btn" onClick={onLogout}>
            <span>🚪</span> {t('nav.sign_out', 'Sign Out')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <div className="topbar">
          <input
            type="text"
            className="topbar-search-input"
            placeholder="🔍 Search locations, routes, pollutants..."
          />

          <div className="topbar-right">

            <select
              className="lang-pill-select"
              value={languageCode}
              onChange={e => changeLanguage(e.target.value)}
            >
              {supportedLanguages.map(l => (
                <option key={l.code} value={l.code}>{l.nativeName}</option>
              ))}
            </select>

            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <div className="page-content">
          {activeNav === 'dashboard' && (
            <AirNowDashboard
              summaryData={summaryData}
              userName={name}
              onPlanRouteClick={() => setActiveNav('routes')}
              onHealthAdviceClick={() => setActiveNav('routes')}
              userCoords={userCoords}
              t={t}
            />
          )}

          {activeNav === 'routes' && (
            <SmartRouterTab
              routeData={routeData}
              selectedRouteIndex={selectedRouteIndex}
              onSelectRoute={onSelectRoute}
              onRouteSubmit={onRouteSubmit}
              isLoading={isLoading}
              errorMsg={errorMsg}
              locationText={summaryData?.location?.city || 'Bengaluru'}
              userCoords={userCoords}
              t={t}
            />
          )}

          {activeNav === 'history' && <HistoryTab history={history} summaryData={summaryData} t={t} />}

          {activeNav === 'settings' && (
            <SettingsTab
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              t={t}
              languageCode={languageCode}
              changeLanguage={changeLanguage}
              supportedLanguages={supportedLanguages}
            />
          )}

          {activeNav === 'feedback' && (
            <FeedbackWidget />
          )}

        </div>
      </div>
    </div>
  );
};
