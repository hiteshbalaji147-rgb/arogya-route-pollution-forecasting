import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { AuthModal } from './AuthModal';

export const LandingPage = ({ onAuthSuccess }) => {
  const { languageCode, changeLanguage, supportedLanguages } = useLanguage();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true); // Open by default as in screenshot
  const [initialRegistering, setInitialRegistering] = useState(false);

  const openSignIn = () => {
    setInitialRegistering(false);
    setIsAuthModalOpen(true);
  };

  const openSignUp = () => {
    setInitialRegistering(true);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="landing-wrapper">

      {/* Top Navbar */}
      <header className="landing-nav-bar">
        <div className="landing-brand-logo">
          <img src="/arogya-route-logo.png" alt="ArogyaRoute Logo" className="landing-brand-img" />
          <span className="landing-brand-title">ArogyaRoute</span>
        </div>

        <div className="landing-nav-right">
          <select
            className="lang-pill-select"
            value={languageCode}
            onChange={(e) => changeLanguage(e.target.value)}
          >
            {supportedLanguages.map((l) => (
              <option key={l.code} value={l.code}>{l.nativeName}</option>
            ))}
          </select>

          <button className="landing-nav-btn" onClick={openSignIn}>
            User sign in
          </button>
        </div>
      </header>

      {/* Hero Body */}
      <main className="landing-hero-container">

        {/* Hero Left Content */}
        <div className="landing-hero-content">
          <div className="landing-eyebrow-pill">
            AIR PREDICTION • SMART ROUTE PLANNING
          </div>

          <h1 className="landing-hero-headline">
            Your healthier route starts here.
          </h1>

          <p className="landing-hero-subtext">
            ArogyaRoute forecasts air quality along your journeys so you choose a route that is kinder to your health.
          </p>

          <div className="landing-cta-row">
            <button className="landing-cta-primary" onClick={openSignUp}>
              Plan a healthier trip →
            </button>
            <button
              className="landing-cta-secondary"
              onClick={() => document.getElementById('landing-how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              How it works
            </button>
          </div>

          <div className="landing-features-footer">
            <span>● Live AQI signals</span>
            <span>• Personal health advice</span>
            <span>• Smart alternatives</span>
          </div>
        </div>

        {/* Hero Right Graphic Pane */}
        <div className="landing-hero-graphic-wrap">
          <div className="landing-green-blob" />
          <div className="landing-preview-card">
            <div className="preview-card-header">
              <span className="preview-card-icon">📍</span>
              <div>
                <div className="preview-card-title">Find a cleaner way</div>
                <div className="preview-card-sub">Personalised for your journey</div>
              </div>
            </div>
            <div className="preview-aqi-bars">
              <div className="bar-row">
                <span className="bar-label">Route #1 (Recommended)</span>
                <span className="bar-val good">AQI 38</span>
              </div>
              <div className="bar-row">
                <span className="bar-label">Route #2</span>
                <span className="bar-val mod">AQI 87</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      <section className="landing-info-section" aria-labelledby="landing-features-title">
        <div className="landing-section-intro">
          <span className="landing-section-kicker">BUILT FOR HEALTHIER EVERYDAY TRAVEL</span>
          <h2 id="landing-features-title">More than directions. A clearer view of the air around your journey.</h2>
          <p>Compare routes by air-quality exposure, understand what the numbers mean, and make a more informed travel choice before you leave.</p>
        </div>
        <div className="landing-feature-grid">
          <article className="landing-feature-card">
            <span className="landing-feature-icon">📍</span>
            <h3>Route-by-route AQI comparison</h3>
            <p>See alternative routes together, including estimated distance, travel time, average AQI, and health-risk score.</p>
          </article>
          <article className="landing-feature-card">
            <span className="landing-feature-icon">🩺</span>
            <h3>Personalised health guidance</h3>
            <p>Receive practical, general air-quality guidance based on your selected health profile and route conditions.</p>
          </article>
          <article className="landing-feature-card">
            <span className="landing-feature-icon">📈</span>
            <h3>Live context and history</h3>
            <p>Track current air conditions, review recent journeys, and recognise patterns in your exposure over time.</p>
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

    </div>
  );
};
