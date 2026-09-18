import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { AuthModal } from './AuthModal';
import { LanguagePicker } from './LanguagePicker';

export const LandingPage = ({ onAuthSuccess }) => {
  const { languageCode, changeLanguage, supportedLanguages } = useLanguage();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true); // Open by default as in screenshot
  const [initialRegistering, setInitialRegistering] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

  const openSignIn = () => {
    setInitialRegistering(false);
    setIsAuthModalOpen(true);
  };

  const openSignUp = () => {
    setInitialRegistering(true);
    setIsAuthModalOpen(true);
  };

  return (
    <div className={`landing-wrapper vayu-landing ${nightMode ? 'night-mode' : ''}`}>

      {/* Top Navbar */}
      <header className="landing-nav-bar">
        <div className="landing-brand-logo">
          <img src="/arogya-route-logo.png" alt="ArogyaRoute Logo" className="landing-brand-img" />
          <span className="landing-brand-lockup"><b>ArogyaRoute</b><small>Clean air route planner</small></span>
        </div>

        <div className="landing-nav-right">
          <button className="landing-language-btn" onClick={() => setLanguagePickerOpen(true)} aria-label="Choose language">文&nbsp; {languageCode.split('-')[0].toUpperCase()}</button>
          <button className="landing-theme-btn" onClick={() => setNightMode(!nightMode)} aria-label="Toggle night mode">{nightMode ? '☀' : '☾'}</button>

          <button className="landing-nav-btn" onClick={openSignIn}>
            ♙&nbsp; Sign in
          </button>
        </div>
      </header>

      {/* Hero Body */}
      <main className="landing-hero-container">

        {/* Hero Left Content */}
        <div className="landing-hero-content">
          <div className="landing-eyebrow-pill">
            ✦&nbsp; Clean air route planner
          </div>

          <h1 className="landing-hero-headline">
            Know the air before you travel
          </h1>

          <p className="landing-hero-subtext">
            ArogyaRoute compares the routes between where you are and where you are going, and tells you which one is easiest to breathe — with advice for your own health.
          </p>

          <div className="landing-cta-row">
            <button className="landing-cta-primary" onClick={openSignUp}>
              ⌁&nbsp; Get started
            </button>
            <button className="landing-cta-secondary" onClick={openSignIn}>
              ♙&nbsp; I already have an account
            </button>
          </div>

          <div className="landing-features-footer">
            <span>✓&nbsp; Free to use. No app to install.</span>
          </div>
        </div>

        {/* Hero Right Graphic Pane */}
        <div className="landing-hero-graphic-wrap">
          <div className="vayu-route-art" aria-label="Illustration showing a cleaner route through a city">
            <span className="vayu-sun" />
            <span className="vayu-cloud cloud-one" />
            <span className="vayu-cloud cloud-two" />
            <div className="vayu-buildings"><i /><i /><i /><i /><i /><i /></div>
            <div className="vayu-road road-muted" />
            <div className="vayu-road road-clean"><b className="vayu-pin start-pin" /><b className="vayu-pin end-pin" /></div>
          </div>
        </div>

      </main>

      <section className="landing-info-section" aria-labelledby="landing-features-title">
        <div className="landing-section-intro">
          <span className="landing-section-kicker">WHAT AROGYAROUTE DOES</span>
          <h2 id="landing-features-title">Six things, all of them working right now.</h2>
          <p>Everything you need to make a calmer, clearer decision before you set out.</p>
        </div>
        <div className="landing-feature-grid">
          <article className="landing-feature-card">
            <span className="landing-feature-icon">⌁</span>
            <h3>Cleaner route options</h3>
            <p>See alternative routes ranked by predicted pollution, time, and distance.</p>
          </article>
          <article className="landing-feature-card">
            <span className="landing-feature-icon">◌</span>
            <h3>Live AQI context</h3>
            <p>Understand what the air is doing around your current location right now.</p>
          </article>
          <article className="landing-feature-card">
            <span className="landing-feature-icon">△</span>
            <h3>Health-aware advice</h3>
            <p>Get practical, general guidance shaped around your profile and route conditions.</p>
          </article>
          <article className="landing-feature-card">
            <span className="landing-feature-icon">↗</span>
            <h3>AQI forecasts</h3>
            <p>Look ahead so you can choose a better time for travel or outdoor activity.</p>
          </article>
          <article className="landing-feature-card">
            <span className="landing-feature-icon">◫</span>
            <h3>Journey history</h3>
            <p>Review previous routes and spot patterns in your pollution exposure over time.</p>
          </article>
          <article className="landing-feature-card">
            <span className="landing-feature-icon">✦</span>
            <h3>AI pollution assistant</h3>
            <p>Ask plain-language questions about AQI, weather, activity, and cleaner routes.</p>
          </article>
        </div>
      </section>

      <section id="landing-how-it-works" className="landing-how-section" aria-labelledby="landing-how-title">
        <div className="landing-section-intro">
          <span className="landing-section-kicker">SIMPLE FROM START TO FINISH</span>
          <h2 id="landing-how-title">Plan with confidence in three steps.</h2>
        </div>
        <div className="landing-steps">
          <div className="landing-step"><span>01</span><div><h3>Add your journey</h3><p>Enter your starting point, destination, and travel time.</p></div></div>
          <div className="landing-step"><span>02</span><div><h3>Compare healthier options</h3><p>Review AQI, duration, distance, and predicted health impact.</p></div></div>
          <div className="landing-step"><span>03</span><div><h3>Travel better informed</h3><p>Choose the route that best balances your time and air-quality needs.</p></div></div>
        </div>
        <div className="landing-trust-note">
          <strong>Designed with privacy in mind.</strong> Your profile preferences help tailor the experience; health guidance is informational and not a substitute for professional medical advice.
        </div>
      </section>

      {/* Auth Modal Popup */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={onAuthSuccess}
        initialRegistering={initialRegistering}
      />

      <LanguagePicker
        isOpen={languagePickerOpen}
        onClose={() => setLanguagePickerOpen(false)}
        languages={supportedLanguages}
        languageCode={languageCode}
        onChange={changeLanguage}
      />

    </div>
  );
};
