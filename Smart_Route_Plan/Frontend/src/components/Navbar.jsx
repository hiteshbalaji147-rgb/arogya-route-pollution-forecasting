import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const Navbar = ({ currentUser, activeTab, setActiveTab, onOpenAuth, onLogout }) => {
  const { languageCode, changeLanguage, supportedLanguages, t, theme, toggleTheme } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navTabs = currentUser
    ? [
        { id: 'routes', icon: '🚀', label: t('nav.smart_routes', 'Smart Routes') },
        { id: 'history', icon: '📜', label: t('nav.route_history', 'Route History') },
        { id: 'settings', icon: '⚙️', label: t('nav.settings', 'Settings') },
      ]
    : [];

  return (
    <nav className="navbar" style={{ top: 0, zIndex: 1000 }}>
      <div className="container navbar-content">
        {/* Brand Logo */}
        <a
          href="#"
          className="logo-container"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab(currentUser ? 'routes' : 'landing');
            setMobileMenuOpen(false);
          }}
        >
          <img
            src="/logo.png"
            alt="ArogyaRoute Logo"
            className="logo-img"
          />
          <div className="logo-title-group">
            <span className="logo-title">{t('app.name', 'ArogyaRoute')}</span>
            <span className="logo-subtitle">{t('app.tagline', 'Healthier choices for every journey')}</span>
          </div>
        </a>

        {/* Center Navigation Links – desktop only */}
        {currentUser && (
          <div className="top-nav-links navbar-desktop-tabs">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--accent-teal)' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : 'var(--text-main)',
                  fontWeight: activeTab === tab.id ? '800' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Right Tools – desktop */}
        <div className="nav-right navbar-desktop-right">
          <button className="theme-pill-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? `🌙 ${t('theme.dark', 'Dark')}` : `☀️ ${t('theme.light', 'Light')}`}
          </button>

          <select
            className="lang-dropdown"
            value={languageCode}
            onChange={(e) => changeLanguage(e.target.value)}
            aria-label="Select Language"
          >
            {supportedLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'var(--input-bg)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                  {currentUser.username}
                </span>
              </div>
              <button
                className="btn-outlined"
                onClick={onLogout}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                {t('nav.sign_out', 'Sign out')}
              </button>
            </div>
          ) : (
            <button className="nav-btn-teal" onClick={onOpenAuth}>
              {t('nav.sign_in', 'Sign in')}
            </button>
          )}
        </div>

        {/* Hamburger button – mobile only */}
        <button
          className="navbar-hamburger"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open-1' : ''}`} />
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open-2' : ''}`} />
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open-3' : ''}`} />
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-menu">
          <div className="navbar-mobile-inner">
            {/* Nav tabs if logged in */}
            {currentUser && (
              <div className="mobile-tabs-row">
                {navTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                    className={`mobile-tab-btn ${activeTab === tab.id ? 'mobile-tab-active' : ''}`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Theme + Language */}
            <div className="mobile-controls-row">
              <button className="theme-pill-btn" onClick={toggleTheme}>
                {theme === 'dark' ? `🌙 Dark` : `☀️ Light`}
              </button>
              <select
                className="lang-dropdown"
                value={languageCode}
                onChange={(e) => { changeLanguage(e.target.value); }}
                style={{ flex: 1 }}
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Auth */}
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>{currentUser.username}</span>
                </div>
                <button className="btn-outlined" onClick={() => { onLogout(); setMobileMenuOpen(false); }} style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
                  Sign out
                </button>
              </div>
            ) : (
              <button className="nav-btn-teal" style={{ width: '100%' }} onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}>
                {t('nav.sign_in', 'Sign in')}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
