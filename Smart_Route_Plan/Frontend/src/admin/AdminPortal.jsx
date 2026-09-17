import React, { useState, useEffect } from 'react';
import './admin.css';
import { translations } from './admin_i18n.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AdminPortal() {
  const [token, setToken] = useState(localStorage.getItem('arogya_admin_token') || '');
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminLang, setAdminLang] = useState('English');
  const [darkTheme, setDarkTheme] = useState(localStorage.getItem('admin_theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sign-in form state
  const [loginEmail, setLoginEmail] = useState('admin@arogyaroute.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // DB Data states
  const [overview, setOverview] = useState(null);
  const [usersData, setUsersData] = useState({ users: [], total: 0 });
  const [predictions, setPredictions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [langStats, setLangStats] = useState([]);
  const [platformLanguages, setPlatformLanguages] = useState([]);
  const [adminContent, setAdminContent] = useState({});

  // Add Language state
  const [newLangName, setNewLangName] = useState('');
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangNotice, setNewLangNotice] = useState('');
  const [newLangBusy, setNewLangBusy] = useState(false);

  // User table search & filter states
  const [userSearch, setUserSearch] = useState('');
  const [selectedLangFilter, setSelectedLangFilter] = useState('All');
  const [selectedHealthFilter, setSelectedHealthFilter] = useState('All');

  // Settings forms & Invitations state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ADMIN');
  const [inviteNotice, setInviteNotice] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [invitationsList, setInvitationsList] = useState([]);
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '' });
  const [pwdNotice, setPwdNotice] = useState('');

  // Recipient invitation acceptance state
  const inviteTokenParam = new URLSearchParams(window.location.search).get('invite');
  const [inviteVerifyData, setInviteVerifyData] = useState(null);
  const [inviteVerifyError, setInviteVerifyError] = useState('');
  const [inviteVerifyLoading, setInviteVerifyLoading] = useState(false);
  const [acceptForm, setAcceptForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [acceptNotice, setAcceptNotice] = useState('');
  const [acceptBusy, setAcceptBusy] = useState(false);

  // Individual user detail view state
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetailData, setUserDetailData] = useState(null);

  const [lastInviteLink, setLastInviteLink] = useState('');
  const [copyToast, setCopyToast] = useState('');

  // ── Helper: always has the latest token ─────────────────────────────────
  const getAuthHeaders = () => {
    const tok = token || localStorage.getItem('arogya_admin_token') || '';
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` };
  };

  const copyInviteLink = (tok) => {
    const link = `${window.location.origin}/admin?invite=${tok}`;
    navigator.clipboard.writeText(link);
    setCopyToast('✅ Invite link copied to clipboard!');
    setTimeout(() => setCopyToast(''), 4000);
  };

  const loadInvitations = async () => {
    try {
      const res = await fetch(`${API}/admin/settings/invitations`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInvitationsList(data.invitations || []);
      }
    } catch (e) {
      console.error("Error loading invitations", e);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteNotice('');
    setLastInviteLink('');
    setInviteBusy(true);
    try {
      const res = await fetch(`${API}/admin/settings/send-invite`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not send invitation');

      if (data.invitation?.token) {
        const link = `${window.location.origin}/admin?invite=${data.invitation.token}`;
        setLastInviteLink(link);
      }

      if (data.smtp_sent) {
        setInviteNotice(`✅ Email successfully dispatched via SMTP to ${inviteEmail}!`);
      } else {
        setInviteNotice(`⚠️ Invitation token created & saved in DB for ${inviteEmail}. (Note: SMTP credentials are unconfigured in backend .env). You can copy the invite link below!`);
      }
      setInviteEmail('');
      loadInvitations();
    } catch (e) {
      setInviteNotice(`⚠️ ${e.message}`);
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      const res = await fetch(`${API}/admin/settings/invitations/${inviteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        loadInvitations();
      }
    } catch (e) {
      console.error("Error revoking invitation", e);
    }
  };

  const handleResendInvite = async (inviteId) => {
    try {
      const res = await fetch(`${API}/admin/settings/invitations/${inviteId}/resend`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not resend invitation');
      alert(data.smtp_sent
        ? `✅ Invitation resent to ${data.invitation.email} via email!`
        : `⚠️ Token refreshed. Copy the link manually (SMTP not configured).`);
      loadInvitations();
    } catch (e) {
      alert(`⚠️ ${e.message}`);
    }
  };

  const handleDeleteUser = async (profileId, userName) => {
    if (!window.confirm(`⚠️ Permanently delete user "${userName}" and ALL their data?\n\nThis cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/admin/users/${profileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not delete user');
      loadUsers();
    } catch (e) {
      alert(`⚠️ ${e.message}`);
    }
  };

  // Verify invitation token on mount if ?invite= query param present
  useEffect(() => {
    if (inviteTokenParam) {
      setInviteVerifyLoading(true);
      setInviteVerifyError('');
      fetch(`${API}/admin/invitations/verify/${inviteTokenParam}`)
        .then(res => {
          if (!res.ok) return res.json().then(err => { throw new Error(err.detail || 'Invalid or expired invitation token'); });
          return res.json();
        })
        .then(data => {
          setInviteVerifyData(data);
        })
        .catch(err => {
          setInviteVerifyError(err.message);
        })
        .finally(() => {
          setInviteVerifyLoading(false);
        });
    }
  }, [inviteTokenParam]);

  const handleAcceptInvite = async (e) => {
    e.preventDefault();
    setAcceptNotice('');
    if (acceptForm.password !== acceptForm.confirmPassword) {
      setAcceptNotice('⚠️ Passwords do not match');
      return;
    }
    setAcceptBusy(true);
    try {
      const res = await fetch(`${API}/admin/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteTokenParam,
          username: acceptForm.username,
          password: acceptForm.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Account registration failed');
      localStorage.setItem('arogya_admin_token', data.access_token);
      setToken(data.access_token);
      setAdminUser(data.admin);
      // Pre-fetch overview so dashboard isn't blank
      fetch(`${API}/admin/dashboard/overview`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.access_token}` }
      }).then(r => r.ok ? r.json() : null).then(d => { if (d) setOverview(d); }).catch(() => {});
      window.history.replaceState({}, document.title, window.location.pathname);
      setInviteVerifyData(null);
    } catch (err) {
      setAcceptNotice(`⚠️ ${err.message}`);
    } finally {
      setAcceptBusy(false);
    }
  };

  const loadUserDetail = async (profile_id) => {
    setSelectedUserId(profile_id);
    setUserDetailData(null);
    try {
      const res = await fetch(`${API}/admin/users/${profile_id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        setUserDetailData(await res.json());
      }
    } catch (e) {
      console.error("Error loading user detail", e);
    }
  };

  const loadPlatformLanguages = async () => {
    try {
      const res = await fetch(`${API}/content/languages`);
      if (res.ok) {
        const data = await res.json();
        setPlatformLanguages(data.languages || []);
      }
    } catch (e) {
      console.error("Error loading platform languages", e);
    }
  };

  useEffect(() => {
    loadPlatformLanguages();
  }, []);

  useEffect(() => {
    fetch(`${API}/content/admin?lang=${encodeURIComponent(adminLang)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.content) {
          setAdminContent(data.content);
        }
      })
      .catch(() => {});
  }, [adminLang]);

  const handleAddNewLanguage = async (e) => {
    e.preventDefault();
    if (!newLangName.trim()) return;
    setNewLangNotice('');
    setNewLangBusy(true);
    try {
      const res = await fetch(`${API}/admin/languages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ language_name: newLangName.trim(), code: newLangCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to add language');
      setNewLangNotice(`✅ ${data.message}`);
      setNewLangName('');
      setNewLangCode('');
      loadPlatformLanguages();
      const statsRes = await fetch(`${API}/admin/languages`, { headers: getAuthHeaders() });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setLangStats(statsData.languages || []);
      }
    } catch (err) {
      setNewLangNotice(`⚠️ ${err.message}`);
    } finally {
      setNewLangBusy(false);
    }
  };

  const fallbackT = translations[adminLang] || translations['English'];
  // Database rows saved during a provider outage contain the English source.
  // Never let those rows overwrite a bundled translation while they await refresh.
  const translatedAdminContent = Object.fromEntries(
    Object.entries(adminContent).filter(([key, value]) =>
      adminLang === 'English' || value !== translations['English']?.[key]
    )
  );
  const t = { ...fallbackT, ...translatedAdminContent };

  // Alias so all existing callers below still work
  const getHeaders = getAuthHeaders;

  // Toggle Theme
  useEffect(() => {
    document.documentElement.dataset.theme = darkTheme ? 'dark' : 'light';
    localStorage.setItem('admin_theme', darkTheme ? 'dark' : 'light');
  }, [darkTheme]);

  // Load Admin profile on mount if token exists
  useEffect(() => {
    const currentToken = token || localStorage.getItem('arogya_admin_token');
    if (currentToken) {
      fetch(`${API}/admin/auth/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Session expired');
          return res.json();
        })
        .then(setAdminUser)
        .catch(() => {
          localStorage.removeItem('arogya_admin_token');
          setToken('');
          setAdminUser(null);
        });
    }
  }, [token]);

  // Fetch data when activeTab or token changes
  const fetchAllData = async () => {
    const currentToken = token || localStorage.getItem('arogya_admin_token');
    if (!currentToken) return;
    try {
      if (activeTab === 'dashboard') {
        const res = await fetch(`${API}/admin/dashboard/overview`, { headers: getHeaders() });
        if (res.ok) setOverview(await res.json());
      } else if (activeTab === 'users') {
        loadUsers();
      } else if (activeTab === 'predictions') {
        const res = await fetch(`${API}/admin/predictions`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setPredictions(data.predictions || []);
        }
      } else if (activeTab === 'analytics') {
        const res = await fetch(`${API}/admin/analytics`, { headers: getHeaders() });
        if (res.ok) setAnalytics(await res.json());
      } else if (activeTab === 'feedback') {
        const res = await fetch(`${API}/admin/feedback`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setFeedbackList(data.feedback || []);
        }
      } else if (activeTab === 'languages') {
        const res = await fetch(`${API}/admin/languages`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setLangStats(data.languages || []);
        }
      } else if (activeTab === 'settings') {
        loadInvitations();
      }
    } catch (e) {
      console.error("Error loading admin data", e);
    }
  };

  const loadUsers = async () => {
    try {
      let url = `${API}/admin/users?page=1&limit=50`;
      if (userSearch) url += `&search=${encodeURIComponent(userSearch)}`;
      if (selectedLangFilter !== 'All') url += `&language=${encodeURIComponent(selectedLangFilter)}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        setUsersData(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activeTab, token]);

  // Handle Admin Sign In
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      const res = await fetch(`${API}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Authentication failed');
      }
      const data = await res.json();
      localStorage.setItem('arogya_admin_token', data.access_token);
      setToken(data.access_token);
      setAdminUser(data.admin);

      // Pre-fetch overview data immediately
      fetch(`${API}/admin/dashboard/overview`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.access_token}`
        }
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setOverview(d); })
        .catch(() => {});
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginBusy(false);
    }
  };

  // Export Users CSV
  const handleExportCsv = () => {
    window.open(`${API}/admin/users/export?token=${token}`, '_blank');
  };

  // Create Admin User in DB
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminNotice('');
    try {
      const res = await fetch(`${API}/admin/settings/create-admin`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newAdminForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not create admin');
      setAdminNotice('✅ Admin account created successfully in DB!');
      setNewAdminForm({ username: '', email: '', password: '', role: 'ADMIN' });
    } catch (e) {
      setAdminNotice(`⚠️ ${e.message}`);
    }
  };

  // Change Password in DB
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdNotice('');
    try {
      const res = await fetch(`${API}/admin/settings/password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(pwdForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Password update failed');
      setPwdNotice('✅ Password updated successfully!');
      setPwdForm({ old_password: '', new_password: '' });
    } catch (e) {
      setPwdNotice(`⚠️ ${e.message}`);
    }
  };

  // Sign out
  const handleSignOut = () => {
    localStorage.removeItem('arogya_admin_token');
    setToken('');
    setAdminUser(null);
    setOverview(null);
  };

  // Render Invitation Acceptance / Create Account page if ?invite= parameter exists in URL
  if (inviteTokenParam) {
    return (
      <div className="admin-login-overlay">
        <div className="admin-login-card" style={{ maxWidth: '480px' }}>
          <div className="admin-brand-header">
            <img src="/arogya-route-logo.png" alt="ArogyaRoute Logo" className="admin-logo-img" />
            <span className="admin-brand-title">{t.appTitle}</span>
          </div>

          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>Create Admin Account</h2>
          <p style={{ color: 'var(--admin-text-sub)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Set up your name and password to accept your portal invitation.
          </p>

          {inviteVerifyLoading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-sub)' }}>
              ⌛ Validating invitation token from database...
            </div>
          )}

          {inviteVerifyError && (
            <div style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p style={{ color: '#ef4444', fontWeight: '700', fontSize: '0.95rem', marginBottom: '1rem' }}>
                ⚠️ {inviteVerifyError}
              </p>
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  window.history.replaceState({}, document.title, window.location.pathname);
                  window.location.reload();
                }}
              >
                Go to Admin Sign In →
              </button>
            </div>
          )}

          {inviteVerifyData && (
            <form onSubmit={handleAcceptInvite}>
              <div className="invite-info-box" style={{ marginBottom: '1.25rem' }}>
                <div><strong>Target Email:</strong> <span style={{ color: '#10b981', fontWeight: '700' }}>{inviteVerifyData.email}</span></div>
                <div><strong>Assigned Role:</strong> <span className="badge-role">{inviteVerifyData.role}</span></div>
                <div><strong>Invited By:</strong> {inviteVerifyData.invited_by}</div>
              </div>

              <div className="admin-form-group">
                <label>Invited Email ID</label>
                <input
                  disabled
                  type="email"
                  className="admin-input"
                  value={inviteVerifyData.email}
                  style={{ opacity: 0.85, background: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
                />
              </div>

              <div className="admin-form-group">
                <label>Your Full Name</label>
                <input
                  required
                  type="text"
                  className="admin-input"
                  value={acceptForm.username}
                  onChange={(e) => setAcceptForm({ ...acceptForm, username: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div className="admin-form-group">
                <label>Create Password</label>
                <input
                  required
                  type="password"
                  className="admin-input"
                  value={acceptForm.password}
                  onChange={(e) => setAcceptForm({ ...acceptForm, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="admin-form-group">
                <label>Confirm Password</label>
                <input
                  required
                  type="password"
                  className="admin-input"
                  value={acceptForm.confirmPassword}
                  onChange={(e) => setAcceptForm({ ...acceptForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              {acceptNotice && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{acceptNotice}</p>}

              <button className="btn-primary-gradient" style={{ width: '100%', padding: '0.75rem' }} disabled={acceptBusy}>
                {acceptBusy ? 'Creating Account…' : '✅ Create Account & Access Admin Portal'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Render Sign In page if unauthenticated
  if (!token || !adminUser) {
    return (
      <div className="admin-login-overlay">
        <div className="admin-login-card">
          <div className="admin-brand-header">
            <img src="/arogya-route-logo.png" alt="ArogyaRoute Logo" className="admin-logo-img" />
            <span className="admin-brand-title">{t.appTitle}</span>
          </div>
          <h2>{t.signInTitle}</h2>
          <p>{t.signInDesc}</p>
          <form onSubmit={handleLogin}>
            <div className="admin-form-group">
              <label>{t.emailLabel}</label>
              <input
                required
                type="email"
                className="admin-input"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@arogyaroute.com"
              />
            </div>
            <div className="admin-form-group">
              <label>{t.passwordLabel}</label>
              <input
                required
                type="password"
                className="admin-input"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {loginError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{loginError}</p>}
            <button className="btn-primary-gradient" disabled={loginBusy}>
              {loginBusy ? t.signingIn : t.signInBtn}
            </button>
          </form>
          <button
            className="demo-fill-btn"
            onClick={() => {
              setLoginEmail('admin@arogyaroute.com');
              setLoginPassword('admin123');
            }}
          >
            ✦ Auto-fill Super Admin Credentials
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal-wrapper">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <img src="/arogya-route-logo.png" alt="ArogyaRoute Logo" className="sidebar-logo" />
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
          <div className="sidebar-title">
            <h2>{t.appTitle}</h2>
            <span>{t.subTitle}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}>
            <span className="nav-icon">📊</span> {t.dashboardTab}
          </button>
          <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}>
            <span className="nav-icon">👥</span> {t.usersTab}
          </button>
          <button className={`nav-item ${activeTab === 'predictions' ? 'active' : ''}`} onClick={() => { setActiveTab('predictions'); setSidebarOpen(false); }}>
            <span className="nav-icon">🧭</span> {t.predictionsTab}
          </button>
          <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}>
            <span className="nav-icon">📈</span> {t.analyticsTab}
          </button>
          <button className={`nav-item ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => { setActiveTab('feedback'); setSidebarOpen(false); }}>
            <span className="nav-icon">💬</span> {t.feedbackTab}
          </button>
          <button className={`nav-item ${activeTab === 'languages' ? 'active' : ''}`} onClick={() => { setActiveTab('languages'); setSidebarOpen(false); }}>
            <span className="nav-icon">🌐</span> {t.languagesTab}
          </button>
          <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}>
            <span className="nav-icon">⚙️</span> {t.settingsTab}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle-btn" onClick={() => setDarkTheme(!darkTheme)}>
            <span>{darkTheme ? '☀️ ' + t.lightToggle : '🌙 ' + t.darkToggle}</span>
          </button>
          <div className="admin-user-pill">
            <div className="admin-user-info">
              <strong>{adminUser.email}</strong>
              <span className="badge-super-admin">{adminUser.role || 'SUPER ADMIN'}</span>
            </div>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>
            <span>🚪</span> {t.signOut}
          </button>
        </div>
      </aside>

      {/* Main Content View Area */}
      <main className="admin-main-content">
        <header className="topbar-header">
          {/* Hamburger for mobile */}
          <button className="admin-hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>

          <div className="topbar-title">
            <h1>{t[`${activeTab}Tab`] || 'Dashboard'}</h1>
            <p>{t.realtimeData}</p>
          </div>
          <div className="topbar-actions">
            <select className="lang-select" value={adminLang} onChange={(e) => setAdminLang(e.target.value)}>
              {platformLanguages.length > 0 ? (
                platformLanguages.map((l) => (
                  <option key={l.id || l.name} value={l.name}>
                    🌐 {l.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="English">🌐 English</option>
                  <option value="Hindi">🌐 हिंदी (Hindi)</option>
                  <option value="Tamil">🌐 தமிழ் (Tamil)</option>
                  <option value="Telugu">🌐 తెలుగు (Telugu)</option>
                  <option value="Kannada">🌐 ಕನ್ನಡ (Kannada)</option>
                </>
              )}
            </select>
            <button className="btn-secondary" onClick={fetchAllData}>
              ↻ {t.refreshBtn}
            </button>
          </div>
        </header>

        {/* TAB 1: DASHBOARD LOADING STATE */}
        {activeTab === 'dashboard' && !overview && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
            <div className="admin-spinner" />
            <p style={{ color: 'var(--admin-text-sub)', fontSize: '1rem' }}>Loading dashboard data...</p>
          </div>
        )}

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && overview && (
          <div>

            <div className="kpi-cards-grid">
              <div className="kpi-card c-emerald">
                <div className="kpi-info">
                  <h4>{t.totalUsers}</h4>
                  <div className="kpi-value">{overview.total_users}</div>
                  <div className="kpi-subtext">{t.registeredProfiles}</div>
                </div>
                <div className="kpi-icon-circle emerald">👥</div>
              </div>

              <div className="kpi-card c-violet">
                <div className="kpi-info">
                  <h4>{t.activeUsers}</h4>
                  <div className="kpi-value">{overview.active_users}</div>
                  <div className="kpi-subtext">{t.activeSubtext}</div>
                </div>
                <div className="kpi-icon-circle violet">📈</div>
              </div>

              <div className="kpi-card c-amber">
                <div className="kpi-info">
                  <h4>{t.googleSignins}</h4>
                  <div className="kpi-value">{overview.google_signins}</div>
                  <div className="kpi-subtext">{t.whitelistedAdmins}</div>
                </div>
                <div className="kpi-icon-circle amber">✦</div>
              </div>

              <div className="kpi-card c-cyan">
                <div className="kpi-info">
                  <h4>{t.totalPredictions}</h4>
                  <div className="kpi-value">{overview.total_predictions}</div>
                  <div className="kpi-subtext">{t.calculatedPaths}</div>
                </div>
                <div className="kpi-icon-circle cyan">🧭</div>
              </div>

              <div className="kpi-card c-emerald">
                <div className="kpi-info">
                  <h4>{t.predictionsToday}</h4>
                  <div className="kpi-value">{overview.predictions_today}</div>
                  <div className="kpi-subtext">{t.generatedToday}</div>
                </div>
                <div className="kpi-icon-circle emerald">🌐</div>
              </div>

              <div className="kpi-card c-violet">
                <div className="kpi-info">
                  <h4>{t.feedbackCount}</h4>
                  <div className="kpi-value">{overview.feedback_count}</div>
                  <div className="kpi-subtext">{t.commentsReceived}</div>
                </div>
                <div className="kpi-icon-circle violet">💬</div>
              </div>

              <div className="kpi-card c-amber">
                <div className="kpi-info">
                  <h4>{t.avgRating}</h4>
                  <div className="kpi-value">{overview.avg_rating} / 5.0</div>
                  <div className="kpi-subtext">{t.userSatisfaction}</div>
                </div>
                <div className="kpi-icon-circle amber">★</div>
              </div>

              <div className="kpi-card c-cyan">
                <div className="kpi-info">
                  <h4>{t.mostUsedLang}</h4>
                  <div className="kpi-value">{overview.most_used_language}</div>
                  <div className="kpi-subtext">{t.preferredLocalization}</div>
                </div>
                <div className="kpi-icon-circle cyan">🗣️</div>
              </div>
            </div>

            <div className="widgets-grid">
              <div className="widget-card">
                <h3>📍 {t.topActiveCities}</h3>
                <div className="city-rank-list">
                  {overview.top_active_cities.map((item, idx) => (
                    <div key={idx} className="city-rank-item">
                      <span className="city-rank-name">#{idx + 1} {item.city}</span>
                      <span className="badge-count">{item.predictions} predictions</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="widget-card">
                <h3>◷ {t.peakUsageHours}</h3>
                <div className="peak-bars-container">
                  {overview.peak_usage_hours.map((h, i) => (
                    <div key={i} className="peak-bar-col" title={`${h.hour}: ${h.requests} requests`}>
                      <div
                        className="peak-bar-fill"
                        style={{ height: `${Math.max(10, Math.min(100, (h.requests + 1) * 20))}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--admin-text-sub)' }}>
                  <span>00:00</span>
                  <span>12:00 (UTC)</span>
                  <span>23:00</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE USERS */}
        {activeTab === 'users' && selectedUserId && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setSelectedUserId(null)}>
                ← Back to Manage Users
              </button>
            </div>

            {userDetailData ? (
              <div>
                <div className="user-detail-card">
                  <div className="user-detail-header">
                    <div className="user-detail-title">
                      <div className="user-avatar-circle">
                        {userDetailData.user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>
                          {userDetailData.user.name} {userDetailData.user.is_google && <span title="Google Auth">✦ (Google Sign-In)</span>}
                        </h2>
                        <p style={{ color: 'var(--admin-text-sub)', margin: 0 }}>{userDetailData.user.email}</p>
                      </div>
                    </div>
                    <span className="badge-count" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                      Profile ID: #{userDetailData.user.profile_id}
                    </span>
                  </div>

                  <div className="user-detail-grid">
                    <div className="detail-item">
                      <label>Age</label>
                      <strong>{userDetailData.user.age} years</strong>
                    </div>

                    <div className="detail-item">
                      <label>Primary Condition</label>
                      <strong style={{ color: '#10b981' }}>{userDetailData.user.health_condition}</strong>
                    </div>

                    <div className="detail-item">
                      <label>All Health Conditions</label>
                      <strong>{userDetailData.user.all_conditions.join(', ') || 'None (Healthy)'}</strong>
                    </div>

                    <div className="detail-item">
                      <label>Preferred Language</label>
                      <strong>{userDetailData.user.language}</strong>
                    </div>

                    <div className="detail-item">
                      <label>GPS Location</label>
                      <strong>
                        {userDetailData.user.location.city}, {userDetailData.user.location.country} ({userDetailData.user.location.latitude.toFixed(4)}, {userDetailData.user.location.longitude.toFixed(4)})
                      </strong>
                    </div>

                    <div className="detail-item">
                      <label>Registered Date</label>
                      <strong>{userDetailData.user.registered_on}</strong>
                    </div>

                    <div className="detail-item">
                      <label>Last Active Timestamp</label>
                      <strong>{userDetailData.user.last_active}</strong>
                    </div>

                    <div className="detail-item">
                      <label>Total Journeys Planned</label>
                      <strong style={{ color: '#3b82f6' }}>{userDetailData.user.journey_count} journeys</strong>
                    </div>
                  </div>
                </div>

                <div className="widget-card" style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>🧭 Journey History Log for {userDetailData.user.name}</h3>
                  <div className="admin-table-card">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>JOURNEY ID</th>
                          <th>SOURCE</th>
                          <th>DESTINATION</th>
                          <th>AVG AQI SCORE</th>
                          <th>ROUTE ALTERNATIVES</th>
                          <th>TIMESTAMP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetailData.journeys.map((j) => (
                          <tr key={j.id}>
                            <td>#{j.id}</td>
                            <td style={{ fontWeight: '700' }}>{j.source}</td>
                            <td style={{ fontWeight: '700' }}>{j.destination}</td>
                            <td><span className="badge-aqi">{j.avg_aqi} AQI</span></td>
                            <td>{j.route_count} routes</td>
                            <td>{j.created_at}</td>
                          </tr>
                        ))}
                        {userDetailData.journeys.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                              No journey history records logged for this user yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', fontSize: '1.1rem', color: 'var(--admin-text-sub)' }}>
                Loading user profile & backend records...
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && !selectedUserId && (
          <div>
            <div className="table-controls">
              <div className="filter-group">
                <input
                  type="text"
                  className="admin-input search-input"
                  placeholder={t.searchUsersPlaceholder}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <select className="lang-select" value={selectedLangFilter} onChange={(e) => setSelectedLangFilter(e.target.value)}>
                  <option value="All">{t.allLanguages}</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                </select>
                <button className="btn-primary-gradient" onClick={loadUsers} style={{ width: 'auto', padding: '0.6rem 1.2rem' }}>
                  {t.applySearch}
                </button>
              </div>

              <button className="btn-secondary" onClick={handleExportCsv}>
                📥 {t.exportCsv}
              </button>
            </div>

            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t.colName}</th>
                    <th>{t.colEmail}</th>
                    <th>{t.colLang}</th>
                    <th>{t.colRegOn}</th>
                    <th>{t.colLastActive}</th>
                    <th>{t.colJourneys}</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.users.map((u) => (
                    <tr key={u.profile_id}>
                      <td style={{ fontWeight: '700', color: '#10b981' }}>
                        {u.name} {u.is_google && <span title="Google Auth">✦</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className="badge-lang">{u.language}</span>
                      </td>
                      <td>{u.registered_on}</td>
                      <td>{u.last_active}</td>
                      <td><strong>{u.journey_count}</strong> routes</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-danger-sm"
                          title="Permanently delete this user"
                          onClick={() => handleDeleteUser(u.profile_id, u.name)}
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {usersData.users.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                        No user records match the query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* TAB 3: ROUTE PREDICTIONS LOG */}
        {activeTab === 'predictions' && (
          <div>
            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t.reqTime}</th>
                    <th>{t.user}</th>
                    <th>{t.source}</th>
                    <th>{t.destination}</th>
                    <th>{t.predictedAqi}</th>
                    <th>{t.distDuration}</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.id}>
                      <td>{p.request_time}</td>
                      <td style={{ fontWeight: '700' }}>{p.user}</td>
                      <td>{p.source}</td>
                      <td>{p.destination}</td>
                      <td>
                        <span className="badge-aqi">{p.predicted_aqi} AQI</span>
                      </td>
                      <td>{p.distance_duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM ANALYTICS */}
        {activeTab === 'analytics' && analytics && (() => {
          const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

          // ─── Area / Line chart helpers ───────────────────────────────────
          const buildAreaPath = (data, key, W, H, pad) => {
            const vals = data.map(d => d[key]);
            const max = Math.max(...vals, 1);
            const pts = vals.map((v, i) => {
              const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
              const y = H - pad - (v / max) * (H - pad * 2);
              return [x, y];
            });
            const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
            const area = line + ` L ${pts[pts.length-1][0]} ${H - pad} L ${pts[0][0]} ${H - pad} Z`;
            return { line, area, pts, max };
          };

          const W = 420, H = 220, P = 36;
          const signupPaths = buildAreaPath(analytics.new_signups_14d, 'count', W, H, P);
          const predPaths   = buildAreaPath(analytics.route_predictions_14d, 'count', W, H, P);

          // ─── Donut chart helpers ─────────────────────────────────────────
          const total = analytics.preferred_language_share.reduce((s, l) => s + l.count, 0) || 1;
          let cumAngle = -Math.PI / 2;
          const donutSlices = analytics.preferred_language_share.map((l, i) => {
            const frac = l.count / total;
            const sweep = frac * 2 * Math.PI;
            const r = 70, cx = 90, cy = 90;
            const x1 = cx + r * Math.cos(cumAngle);
            const y1 = cy + r * Math.sin(cumAngle);
            const x2 = cx + r * Math.cos(cumAngle + sweep);
            const y2 = cy + r * Math.sin(cumAngle + sweep);
            const large = sweep > Math.PI ? 1 : 0;
            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
            cumAngle += sweep;
            return { path, color: COLORS[i % COLORS.length], label: l.language, pct: l.percentage };
          });

          // ─── Region bar max ──────────────────────────────────────────────
          const maxRegion = Math.max(...analytics.predictions_by_region.map(r => r.count), 1);

          const gridLines = [0, 25, 50, 75, 100];

          return (
            <div>
              {/* KPI mini row */}
              <div className="analytics-kpi-row">
                <div className="analytics-kpi-mini">
                  <label>Total Signups (14d)</label>
                  <strong style={{ color: '#10b981' }}>
                    {analytics.new_signups_14d.reduce((s, d) => s + d.count, 0)}
                  </strong>
                  <span>New registrations</span>
                </div>
                <div className="analytics-kpi-mini">
                  <label>Total Predictions (14d)</label>
                  <strong style={{ color: '#3b82f6' }}>
                    {analytics.route_predictions_14d.reduce((s, d) => s + d.count, 0)}
                  </strong>
                  <span>Route calculations</span>
                </div>
                <div className="analytics-kpi-mini">
                  <label>Top Region</label>
                  <strong style={{ color: '#8b5cf6' }}>
                    {analytics.predictions_by_region[0]?.region || '—'}
                  </strong>
                  <span>{analytics.predictions_by_region[0]?.count || 0} predictions</span>
                </div>
                <div className="analytics-kpi-mini">
                  <label>Most Used Language</label>
                  <strong style={{ color: '#f59e0b' }}>
                    {analytics.preferred_language_share[0]?.language || '—'}
                  </strong>
                  <span>{analytics.preferred_language_share[0]?.percentage || 0}% of users</span>
                </div>
              </div>

              <div className="charts-grid">

                {/* ── Chart 1: New Signups Area Chart ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>📈 New User Signups — Last 14 Days</h3>
                    <div className="chart-legend">
                      <span><span className="chart-legend-dot" style={{ background: '#10b981' }}></span>Signups</span>
                    </div>
                  </div>
                  <div className="svg-chart-container">
                    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[0.25, 0.5, 0.75, 1].map((frac, i) => {
                        const y = H - P - frac * (H - P * 2);
                        const val = Math.round(frac * signupPaths.max);
                        return (
                          <g key={i}>
                            <line x1={P} y1={y} x2={W - P} y2={y} stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={P - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--admin-text-sub)">{val}</text>
                          </g>
                        );
                      })}
                      {/* Baseline */}
                      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--admin-border)" strokeWidth="1" />
                      {/* Area fill */}
                      <path d={signupPaths.area} fill="url(#signupGrad)" />
                      {/* Line */}
                      <path d={signupPaths.line} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                      {/* Data points */}
                      {signupPaths.pts.map(([x, y], i) => (
                        <g key={i}>
                          <circle cx={x} cy={y} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
                        </g>
                      ))}
                      {/* X-axis labels every 2 days */}
                      {analytics.new_signups_14d.map((d, i) => {
                        if (i % 2 !== 0) return null;
                        const x = P + (i / (analytics.new_signups_14d.length - 1)) * (W - P * 2);
                        return (
                          <text key={i} x={x} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--admin-text-sub)">{d.date}</text>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* ── Chart 2: Route Predictions Area Chart ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>🧭 Route Predictions — Last 14 Days</h3>
                    <div className="chart-legend">
                      <span><span className="chart-legend-dot" style={{ background: '#3b82f6' }}></span>Predictions</span>
                    </div>
                  </div>
                  <div className="svg-chart-container">
                    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {[0.25, 0.5, 0.75, 1].map((frac, i) => {
                        const y = H - P - frac * (H - P * 2);
                        const val = Math.round(frac * predPaths.max);
                        return (
                          <g key={i}>
                            <line x1={P} y1={y} x2={W - P} y2={y} stroke="var(--admin-border)" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={P - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--admin-text-sub)">{val}</text>
                          </g>
                        );
                      })}
                      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--admin-border)" strokeWidth="1" />
                      <path d={predPaths.area} fill="url(#predGrad)" />
                      <path d={predPaths.line} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                      {predPaths.pts.map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                      ))}
                      {analytics.route_predictions_14d.map((d, i) => {
                        if (i % 2 !== 0) return null;
                        const x = P + (i / (analytics.route_predictions_14d.length - 1)) * (W - P * 2);
                        return (
                          <text key={i} x={x} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--admin-text-sub)">{d.date}</text>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* ── Chart 3: Predictions by Region (Horizontal Bar) ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>📍 Predictions by Region</h3>
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--admin-text-sub)' }}>
                      Top {analytics.predictions_by_region.length} regions
                    </span>
                  </div>
                  <div className="hbar-list">
                    {analytics.predictions_by_region.map((r, i) => {
                      const widthPct = Math.round((r.count / maxRegion) * 100);
                      const gradients = [
                        'linear-gradient(90deg, #10b981, #06d6a0)',
                        'linear-gradient(90deg, #3b82f6, #38bdf8)',
                        'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                        'linear-gradient(90deg, #f59e0b, #fcd34d)',
                        'linear-gradient(90deg, #ef4444, #fb7185)',
                        'linear-gradient(90deg, #06b6d4, #67e8f9)',
                      ];
                      return (
                        <div key={i} className="hbar-row">
                          <div className="hbar-meta">
                            <span style={{ color: COLORS[i % COLORS.length], fontWeight: '700' }}>
                              #{i + 1} {r.region}
                            </span>
                            <span style={{ color: 'var(--admin-text-sub)' }}>
                              {r.count} prediction{r.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="hbar-track">
                            <div className="hbar-fill" style={{ width: `${widthPct}%`, background: gradients[i % gradients.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Chart 4: Language Share (Donut Chart) ── */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>🗣️ Language Share</h3>
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--admin-text-sub)' }}>
                      {total} registered profiles
                    </span>
                  </div>
                  <div className="donut-chart-wrap" style={{ marginTop: '0.5rem' }}>
                    <svg width="180" height="180" className="donut-svg" viewBox="0 0 180 180">
                      {donutSlices.map((s, i) => (
                        <path
                          key={i}
                          d={s.path}
                          fill={s.color}
                          opacity="0.9"
                          stroke="var(--admin-card-bg)"
                          strokeWidth="3"
                        />
                      ))}
                      {/* Center hole */}
                      <circle cx="90" cy="90" r="42" fill="var(--admin-card-bg)" />
                      <text x="90" y="86" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--admin-text-main)">{total}</text>
                      <text x="90" y="100" textAnchor="middle" fontSize="10" fill="var(--admin-text-sub)">users</text>
                    </svg>
                    <div className="donut-legend">
                      {donutSlices.map((s, i) => (
                        <div key={i} className="donut-legend-item">
                          <div className="donut-legend-swatch" style={{ background: s.color }} />
                          <span className="donut-legend-label">{s.label}</span>
                          <span className="donut-legend-pct">{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}


        {/* TAB 5: FEEDBACK */}
        {activeTab === 'feedback' && (
          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>USER / EMAIL</th>
                  <th>RATING</th>
                  <th>FEEDBACK COMMENT</th>
                  <th>SUBMITTED AT</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.map((f) => (
                  <tr key={f.id}>
                    <td>#{f.id}</td>
                    <td style={{ fontWeight: '700' }}>{f.email}</td>
                    <td style={{ color: '#f59e0b', fontWeight: '800' }}>{'★'.repeat(f.rating)}</td>
                    <td>{f.text}</td>
                    <td>{f.created_at}</td>
                  </tr>
                ))}
                {feedbackList.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No feedback submissions recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: LANGUAGES */}
        {activeTab === 'languages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Add Language Form Card */}
            <div className="widget-card">
              <h3 style={{ margin: '0 0 0.5rem 0' }}>➕ {t.addLanguageTitle}</h3>
              <p style={{ color: 'var(--admin-text-sub)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                {t.addLanguageDescription}
              </p>

              <form onSubmit={handleAddNewLanguage} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label>{t.languageNameLabel}</label>
                  <input
                    required
                    type="text"
                    className="admin-input"
                    value={newLangName}
                    onChange={(e) => setNewLangName(e.target.value)}
                    placeholder={t.languageNamePlaceholder}
                  />
                </div>

                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label>{t.languageCodeLabel}</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={newLangCode}
                    onChange={(e) => setNewLangCode(e.target.value)}
                    placeholder={t.languageCodePlaceholder}
                  />
                </div>

                <button className="btn-primary-gradient" style={{ height: '42px', padding: '0 1.25rem' }} disabled={newLangBusy}>
                  {newLangBusy ? 'Generating Translations in DB…' : '🌐 Add Language & Translate'}
                </button>
              </form>

              {newLangNotice && <p style={{ color: newLangNotice.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: '0.85rem', marginTop: '1rem', marginBottom: 0, fontWeight: '700' }}>{newLangNotice}</p>}
            </div>

            {/* Platform Languages Table */}
            <div className="admin-table-card">
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--admin-border)' }}>
                <h4 style={{ margin: 0 }}>🌐 {t.registeredLanguages} ({platformLanguages.length || langStats.length})</h4>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t.languageId}</th>
                    <th>{t.languageName}</th>
                    <th>{t.statusInDb}</th>
                    <th>{t.activeProfiles}</th>
                  </tr>
                </thead>
                <tbody>
                  {(langStats.length > 0 ? langStats : platformLanguages).map((l) => (
                    <tr key={l.language_id || l.id || l.language_name || l.name}>
                      <td>#{l.language_id || l.id || 1}</td>
                      <td style={{ fontWeight: '700', color: '#10b981' }}>{l.language_name || l.name}</td>
                      <td><span className="badge-status accepted">✅ Active</span></td>
                      <td><span className="badge-count">{l.active_users || 0} {t.profiles}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              
              {/* Send SMTP Invitation Card */}
              <div className="widget-card">
                <h3>✉️ {t.sendInvitationTitle}</h3>
                <p style={{ color: 'var(--admin-text-sub)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {t.sendInvitationDescription}
                </p>
                <form onSubmit={handleSendInvite}>
                  <div className="admin-form-group">
                    <label>{t.targetEmail}</label>
                    <input
                      required
                      type="email"
                      className="admin-input"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@gmail.com"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>{t.assignedRole}</label>
                    <select
                      className="lang-select"
                      style={{ width: '100%' }}
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="ADMIN">{t.adminRole}</option>
                      <option value="USER">{t.userRole}</option>
                    </select>
                  </div>

                  {inviteNotice && <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: '1.4' }}>{inviteNotice}</p>}

                  {lastInviteLink && (
                    <div style={{ background: 'var(--admin-bg)', border: '1px solid #10b981', padding: '0.75rem', borderRadius: '10px', marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#10b981', display: 'block', marginBottom: '0.25rem' }}>🔗 INVITATION LINK</label>
                      <input readOnly className="admin-input" value={lastInviteLink} style={{ fontSize: '0.8rem', padding: '0.4rem', marginBottom: '0.5rem' }} />
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.4rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(lastInviteLink);
                          setCopyToast('✅ Invite link copied to clipboard!');
                          setTimeout(() => setCopyToast(''), 4000);
                        }}
                      >
                        📋 Copy Invitation Link
                      </button>
                    </div>
                  )}

                  {copyToast && <p style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700', marginBottom: '0.75rem' }}>{copyToast}</p>}

                  <button className="btn-primary-gradient" style={{ width: '100%' }} disabled={inviteBusy}>
                    {inviteBusy ? 'Sending SMTP Invitation…' : '📨 Send Role-Based Invite Link'}
                  </button>
                </form>
              </div>

              {/* Change Password Card */}
              <div className="widget-card">
                <h3>🔒 {t.changePassword}</h3>
                <form onSubmit={handleChangePassword}>
                  <div className="admin-form-group">
                    <label>{t.oldPasswordLabel}</label>
                    <input required type="password" className="admin-input" value={pwdForm.old_password} onChange={(e) => setPwdForm({ ...pwdForm, old_password: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label>{t.newPasswordLabel}</label>
                    <input required type="password" className="admin-input" value={pwdForm.new_password} onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })} />
                  </div>
                  {pwdNotice && <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{pwdNotice}</p>}
                  <button className="btn-primary-gradient" style={{ width: '100%' }}>{t.updatePasswordBtn}</button>
                </form>
              </div>

              {/* System Status Card */}
              <div className="widget-card">
                <h3>💻 {t.systemStatus}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div><strong>{t.postgresStatus}:</strong> <span style={{ color: '#10b981' }}>{t.connected}</span></div>
                  <div><strong>{t.mongoStatus}:</strong> <span style={{ color: '#10b981' }}>{t.connected}</span></div>
                  <div><strong>{t.smtpStatus}:</strong> <span style={{ color: '#10b981' }}>{t.statusActive}</span></div>
                  <div><strong>{t.jwtStatus}:</strong> {t.statusActive}</div>
                  <div><strong>{t.backendApi}:</strong> {API}</div>
                </div>
              </div>
            </div>

            {/* Sent Invitations Status Table Card */}
            <div className="widget-card" style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>📋 {t.sentInvitationsTitle}</h3>
                  <p style={{ color: 'var(--admin-text-sub)', fontSize: '0.85rem', margin: 0 }}>
                    {t.sentInvitationsDescription}
                  </p>
                </div>
                <button className="btn-secondary" onClick={loadInvitations}>
                  ↻ Refresh Status
                </button>
              </div>

              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t.recipientEmail}</th>
                      <th>{t.role}</th>
                      <th>{t.status}</th>
                      <th>{t.sentDate}</th>
                      <th>{t.acceptedDate}</th>
                      <th>{t.invitedBy}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitationsList.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: '700', color: '#10b981' }}>{inv.email}</td>
                        <td>
                          <span className="badge-lang">{inv.role}</span>
                        </td>
                        <td>
                          <span className={`badge-status ${inv.status.toLowerCase()}`}>
                            {inv.status === 'PENDING' ? '⏳ Pending' : inv.status === 'ACCEPTED' ? '✅ Accepted' : inv.status}
                          </span>
                        </td>
                        <td>{inv.created_at}</td>
                        <td>{inv.accepted_at}</td>
                        <td>{inv.invited_by}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {inv.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                                  onClick={() => copyInviteLink(inv.token)}
                                  title="Copy invitation URL to clipboard"
                                >
                                  📋 Copy Link
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', color: '#f59e0b', borderColor: '#f59e0b' }}
                                  onClick={() => handleResendInvite(inv.id)}
                                  title="Resend invitation email with a fresh token"
                                >
                                  🔄 Resend
                                </button>
                                <button
                                  className="btn-danger-sm"
                                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                                  onClick={() => handleRevokeInvite(inv.id)}
                                >
                                  Revoke
                                </button>
                              </>
                            )}
                            {inv.status === 'ACCEPTED' && (
                              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>✅ Accepted</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {invitationsList.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                          {t.noInvitations}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


