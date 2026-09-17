import { useEffect, useState } from 'react';
import { DashboardView } from './components/DashboardView';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const headers = () => {
  const token = localStorage.getItem('arogya_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function AccountWorkspace({ user, onUserChange, onLogout, coords, dark, toggleTheme }) {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [history, setHistory] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load user saved journey history
  const loadHistory = () => {
    fetch(`${API}/route/history`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : []))
      .then(setHistory)
      .catch(() => setHistory([]));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Handle Route Planner Submission
  const handleRouteSubmit = async (searchData) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/route/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({
          source: searchData.source,
          destination: searchData.destination,
          start_time: searchData.start_time || new Date().toISOString(),
          language: localStorage.getItem('arogya_lang_code') || 'en-IN',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Could not compute clean route options');
      }

      const result = await res.json();
      setRouteData(result);
      setSelectedRouteIndex(0);
      loadHistory();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardView
      currentUser={user}
      setCurrentUser={onUserChange}
      routeData={routeData}
      selectedRouteIndex={selectedRouteIndex}
      onSelectRoute={setSelectedRouteIndex}
      onRouteSubmit={handleRouteSubmit}
      isLoading={isLoading}
      errorMsg={errorMsg}
      history={history}
      activeNav={activeNav}
      setActiveNav={setActiveNav}
      onLogout={onLogout}
      userCity={user?.location?.city || 'Delhi'}
      userCountry={user?.location?.country || 'India'}
      userCoords={coords}
    />
  );
}
