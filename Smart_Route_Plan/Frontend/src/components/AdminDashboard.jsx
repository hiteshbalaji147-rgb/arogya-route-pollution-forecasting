import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const METRIC_ROWS = [
  { key: 'new_accounts',     icon: '👤', label: 'New Accounts',     desc: 'Accounts created in the window. Click row to view details.' },
  { key: 'active_users',     icon: '🔁', label: 'Active Users',      desc: 'Distinct accounts with at least one journey planned.' },
  { key: 'journeys_planned', icon: '🗺️', label: 'Journeys Planned', desc: 'Total route comparisons run via the planner.' },
  { key: 'feedback',         icon: '💬', label: 'Feedback',          desc: 'Submissions received through the feedback modal.' },
];

const TIME_COLS = [
  { key: 'last_24h', label: 'Last 24h' },
  { key: 'last_7d',  label: 'Last 7d' },
  { key: 'last_30d', label: 'Last 30d' },
  { key: 'all_time', label: 'All Time' },
];

/* ── Sparkline ────────────────────────────────────────────────────────────── */
function Sparkline({ data }) {
  if (!data?.length) return null;
  const W = 680, H = 120, PAD = { t: 12, r: 16, b: 28, l: 36 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const maxJ = Math.max(...data.map(d => d.journeys), 1);
  const maxF = Math.max(...data.map(d => d.feedback), 1);
  const maxV = Math.max(maxJ, maxF, 1);
  const xStep = iW / (data.length - 1 || 1);
  const toX = i => PAD.l + i * xStep;
  const toY = v => PAD.t + iH - (v / maxV) * iH;
  const pts  = arr => arr.map((d, i) => `${toX(i)},${toY(d)}`).join(' ');
  const area = (arr, key) => {
    const p = arr.map((d, i) => `${toX(i)},${toY(d[key])}`).join(' ');
    return `M ${PAD.l},${PAD.t + iH} L ${p} L ${toX(arr.length - 1)},${PAD.t + iH} Z`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="sg-j" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sg-f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.33, 0.66, 1].map(pct => {
        const y = PAD.t + iH - pct * iH;
        return (
          <g key={pct}>
            <line x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD.l - 4} y={y + 4} fontSize="9" textAnchor="end" fill="#64748B">{Math.round(pct * maxV)}</text>
          </g>
        );
      })}
      <path d={area(data, 'journeys')} fill="url(#sg-j)" />
      <path d={area(data, 'feedback')} fill="url(#sg-f)" />
      <polyline points={pts(data.map(d => d.journeys))} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts(data.map(d => d.feedback))} fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        if (i % 5 !== 0 && i !== data.length - 1) return null;
        return <text key={d.date} x={toX(i)} y={H - 4} fontSize="9" textAnchor="middle" fill="#64748B">{d.date?.slice(5)}</text>;
      })}
    </svg>
  );
}

/* ── Users Modal ──────────────────────────────────────────────────────────── */
function UsersModal({ adminKey, onClose }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/feedback/admin/users`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => { if (!r.ok) throw new Error('Failed to load user list'); return r.json(); })
      .then(d => { setUsers(d.users || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [adminKey]);

  return (
    <div className="users-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="users-modal">
        <div className="users-modal-header">
          <div>
            <div className="users-modal-title">👥 Registered Users Directory</div>
            <div className="users-modal-sub">Live data from PostgreSQL · {users.length} total accounts</div>
          </div>
          <button className="users-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="users-modal-body">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Loading users…</div>
          ) : error ? (
            <div className="admin-error-banner" style={{ margin: '1rem' }}>⚠️ {error}</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>USER</th>
                    <th>EMAIL</th>
                    <th>LOCATION</th>
                    <th>AUTH</th>
                    <th>JOINED</th>
                    <th>TRIPS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.profile_id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>#{u.profile_id}</td>
                      <td className="font-bold">{u.username}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ color: 'var(--text-muted)' }}>📍 {u.location}</td>
                      <td>
                        <span className={`table-aqi-pill ${u.is_google ? 'aqi-good' : 'aqi-moderate'}`}>
                          {u.is_google ? '🔑 Google' : '✉️ Email'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="font-bold">{u.journey_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Admin Gate ───────────────────────────────────────────────────────────── */
function AdminGate({ onUnlock, onBack }) {
  const [key, setKey]     = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!key.trim()) { setError('Please enter the admin key.'); return; }
    onUnlock(key.trim());
  };

  return (
    <div className="admin-gate-wrap">
      <div className="admin-gate-card">
        <div className="admin-gate-logo">🛡️</div>
        <h1 className="admin-gate-title">Admin Portal</h1>
        <p className="admin-gate-sub">Enter your secret key to access real-time database analytics.</p>
        <form className="admin-gate-form" onSubmit={handleSubmit}>
          <input
            type="password"
            className="admin-key-input"
            placeholder="Admin secret key…"
            value={key}
            onChange={e => setKey(e.target.value)}
            autoFocus
          />
          {error && <div className="admin-gate-error">⚠️ {error}</div>}
          <button className="admin-unlock-btn" type="submit">Unlock Portal →</button>
        </form>
        {onBack && <button className="admin-back-link" onClick={onBack}>← Back to app</button>}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export const AdminDashboard = ({ onBack }) => {
  const [adminKey, setAdminKey]       = useState(() => sessionStorage.getItem('arogya_admin_key') || '');
  const [stats, setStats]             = useState(null);
  const [extStats, setExtStats]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showUsers, setShowUsers]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStats = useCallback(async (key) => {
    setLoading(true); setError('');
    try {
      const h = { 'X-Admin-Key': key };
      const [r, er] = await Promise.all([
        fetch(`${API_BASE_URL}/feedback/admin/stats`, { headers: h }),
        fetch(`${API_BASE_URL}/feedback/admin/stats/extended`, { headers: h }),
      ]);
      if (r.status === 403) throw new Error('Invalid admin key.');
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      setStats(await r.json());
      if (er.ok) setExtStats(await er.json());
      setLastRefresh(new Date());
    } catch (err) { setError(err.message); setStats(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (adminKey) fetchStats(adminKey); }, [adminKey, fetchStats]);

  const handleUnlock = (key) => { sessionStorage.setItem('arogya_admin_key', key); setAdminKey(key); };
  const handleLogout = () => { sessionStorage.removeItem('arogya_admin_key'); setAdminKey(''); setStats(null); setError(''); };

  if (!adminKey || error === 'Invalid admin key.') {
    return <AdminGate onUnlock={handleUnlock} onBack={onBack} />;
  }

  return (
    <div className="admin-root">
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          {onBack && <button className="admin-back-link" onClick={onBack} style={{ marginBottom: '0.25rem' }}>← Back</button>}
          <div className="admin-page-title">Admin Portal <span className="admin-badge">Live DB</span></div>
          <div className="admin-page-sub">Metrics loaded from PostgreSQL &amp; MongoDB in real time.</div>
        </div>
        <div className="admin-topbar-right">
          <button className="admin-view-users-btn" onClick={() => setShowUsers(true)}>
            👥 View Users ({stats?.total_accounts ?? '—'})
          </button>
          <button className="admin-reload-btn" onClick={() => fetchStats(adminKey)} disabled={loading}>
            {loading ? '⏳ Loading…' : '↻ Refresh'}
          </button>
          <button className="admin-logout-btn" onClick={handleLogout}>🚪 Log out</button>
        </div>
      </div>

      {error && <div className="admin-error-banner">⚠️ {error}</div>}

      {stats && (
        <>
          {/* Metrics table */}
          <div className="admin-card">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>Measure</th>
                    {TIME_COLS.map(c => <th key={c.key} style={{ textAlign: 'right' }}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {METRIC_ROWS.map(m => (
                    <tr key={m.key}
                      className={m.key === 'new_accounts' ? 'clickable-row' : ''}
                      onClick={() => m.key === 'new_accounts' && setShowUsers(true)}
                      title={m.key === 'new_accounts' ? 'Click to view detailed user list' : ''}
                    >
                      <td>
                        <div className="admin-metric-name">
                          <span className="admin-metric-icon">{m.icon}</span>
                          {m.label}
                          {m.key === 'new_accounts' && (
                            <span className="table-aqi-pill aqi-good" style={{ marginLeft: '0.5rem', fontSize: '0.68rem' }}>Click for details</span>
                          )}
                        </div>
                        <div className="admin-metric-desc">{m.desc}</div>
                      </td>
                      {TIME_COLS.map(c => (
                        <td key={c.key} className="admin-num-cell">{stats[m.key]?.[c.key] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {stats.never_planned} of {stats.total_accounts} accounts have never planned a journey. Click the New Accounts row or "View Users" above to inspect profiles.
            </div>
          </div>

          {/* KPI cards row 1 */}
          <div className="admin-kpi-row">
            {[
              { label: '🗺️ Total Journeys',  val: stats.journeys_planned.all_time },
              { label: '💬 Total Feedback',   val: stats.feedback.all_time },
              { label: '👤 Total Accounts',   val: stats.total_accounts, click: true },
              { label: '📭 Never Planned',    val: stats.never_planned },
            ].map(k => (
              <div key={k.label} className="admin-kpi-card"
                onClick={() => k.click && setShowUsers(true)}
                style={{ cursor: k.click ? 'pointer' : 'default' }}
              >
                <div className="admin-kpi-val">{k.val}</div>
                <div className="admin-kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* KPI cards row 2 — extended */}
          {extStats && (
            <div className="admin-kpi-row">
              {[
                { label: '🔑 Google OAuth Users',  val: extStats.google_oauth_users,      col: '#6366F1' },
                { label: '📍 Users with GPS',       val: extStats.users_with_location,    col: '#0D9488' },
                { label: '🔍 MongoDB Searches',     val: extStats.mongodb?.route_searches ?? '—', col: '#06B6D4' },
                { label: '🤖 AI Recommendations',  val: extStats.mongodb?.recommendations ?? '—', col: '#06B6D4' },
              ].map(k => (
                <div key={k.label} className="admin-kpi-card">
                  <div className="admin-kpi-val" style={{ color: k.col }}>{k.val}</div>
                  <div className="admin-kpi-label">{k.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Sparkline */}
          <div className="admin-card">
            <div className="admin-chart-header">
              <div>
                <div className="admin-chart-title">↗ Last 30 days Activity</div>
                <div className="admin-chart-subtitle">Daily journeys planned and feedback submissions</div>
              </div>
              <div className="admin-chart-legend">
                <span className="legend-dot" style={{ background: '#059669' }} /> <span>Journeys</span>
                <span className="legend-dot" style={{ background: '#06B6D4', marginLeft: '1rem' }} /> <span>Feedback</span>
                {lastRefresh && <span style={{ marginLeft: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Refreshed {lastRefresh.toLocaleTimeString()}</span>}
              </div>
            </div>
            <div className="admin-chart-body">
              <Sparkline data={stats.daily_last_30} />
            </div>
          </div>

          {/* Recent feedback */}
          {extStats?.recent_feedback?.length > 0 && (
            <div className="admin-card">
              <div className="admin-chart-header">
                <div>
                  <div className="admin-chart-title">💬 Recent Feedback</div>
                  <div className="admin-chart-subtitle">Latest submissions from the feedback modal</div>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>Message</th>
                      <th style={{ textAlign: 'center' }}>Rating</th>
                      <th style={{ textAlign: 'right' }}>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extStats.recent_feedback.map(fb => (
                      <tr key={fb.id}>
                        <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fb.email || 'Guest (no email)'}</td>
                        <td style={{ maxWidth: 400 }}>{fb.text}</td>
                        <td style={{ textAlign: 'center', color: '#F59E0B', fontSize: '1.1rem' }}>
                          {'★'.repeat(fb.rating || 0)}{'☆'.repeat(5 - (fb.rating || 0))}
                        </td>
                        <td className="text-muted text-right" style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {fb.created_at ? new Date(fb.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showUsers && <UsersModal adminKey={adminKey} onClose={() => setShowUsers(false)} />}
    </div>
  );
};
