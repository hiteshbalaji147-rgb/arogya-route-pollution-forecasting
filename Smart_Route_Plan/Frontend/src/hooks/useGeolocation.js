import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Reverse-geocodes lat/lon using OpenStreetMap Nominatim (free, no API key).
 * Returns { city, country } or null on failure.
 */
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      addr.state_district ||
      null;
    const country = addr.country || null;
    return { city, country };
  } catch {
    return null;
  }
}

/**
 * Saves the user's GPS coordinates to the backend.
 * Silently fails — never blocks the UI.
 */
async function saveLocationToBackend(lat, lon, city, country) {
  try {
    const token = localStorage.getItem('arogya_access_token');
    if (!token) return;
    await fetch(`${API_BASE_URL}/auth/me/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ latitude: lat, longitude: lon, city, country }),
    });
  } catch {
    /* silent */
  }
}

/**
 * useGeolocation — request browser GPS on demand, reverse geocode, and sync to backend.
 *
 * @param {boolean} enabled  - Set true after the user is authenticated
 * @returns {{ coords, city, country, loading, error, refetch }}
 */
export function useGeolocation(enabled) {
  const [coords, setCoords] = useState(null);   // { latitude, longitude }
  const [city, setCity] = useState(null);
  const [country, setCountry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });

        // Reverse geocode in background
        const geo = await reverseGeocode(latitude, longitude);
        const resolvedCity = geo?.city || null;
        const resolvedCountry = geo?.country || null;
        setCity(resolvedCity);
        setCountry(resolvedCountry);

        // Sync to backend (fire-and-forget)
        await saveLocationToBackend(latitude, longitude, resolvedCity, resolvedCountry);

        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 5 * 60 * 1000, // cache for 5 min
      }
    );
  }, []);

  // Auto-trigger once when enabled (i.e. after login)
  useEffect(() => {
    if (enabled) fetchLocation();
  }, [enabled]);

  return { coords, city, country, loading, error, refetch: fetchLocation };
}
