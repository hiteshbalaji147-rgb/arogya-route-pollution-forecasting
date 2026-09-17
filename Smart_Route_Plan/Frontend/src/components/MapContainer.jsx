import React, { useMemo } from 'react';
import { MapContainer as LeafletMap, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';

/* ── Icons ─────────────────────────────────────────────────────────────────── */
const mkIcon = (color, size = [25, 41]) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: size, iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [1, -34], shadowSize: [41, 41],
  });

const startIcon      = mkIcon('green');
const endIcon        = mkIcon('red');
const checkpointIcon = mkIcon('gold', [18, 29]);

/* ── AQI color ─────────────────────────────────────────────────────────────── */
function aqiColor(aqi) {
  if (!aqi || aqi <= 50)  return '#10B981';
  if (aqi <= 100)          return '#F59E0B';
  if (aqi <= 150)          return '#F97316';
  return                          '#EF4444';
}

/* ── Auto-fit bounds ───────────────────────────────────────────────────────── */
function FitBounds({ coords }) {
  const map = useMap();
  React.useEffect(() => {
    if (coords?.length > 1) {
      try { map.fitBounds(coords, { padding: [48, 48], maxZoom: 13 }); } catch (_) {}
    }
  }, [coords, map]);
  return null;
}

function FocusUserLocation({ coords, hasRoute }) {
  const map = useMap();
  React.useEffect(() => {
    if (coords && !hasRoute) map.setView([coords.latitude, coords.longitude], 13);
  }, [coords, hasRoute, map]);
  return null;
}

/* ── Main ──────────────────────────────────────────────────────────────────── */
export const MapContainer = ({ routeData, selectedRouteIndex, onSelectRoute, userCoords }) => {
  const { t, theme } = useLanguage();

  const allRoutes     = routeData?.all_routes || [];
  const selectedRoute = allRoutes[selectedRouteIndex] ?? allRoutes[0];

  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const polylineCoords = useMemo(() => {
    if (!selectedRoute) return [];
    if (selectedRoute.waypoints?.length) return selectedRoute.waypoints.map(wp => [wp.lat, wp.lon]);
    if (Array.isArray(selectedRoute.geometry)) return selectedRoute.geometry.map(pt => [pt[1], pt[0]]);
    return [];
  }, [selectedRoute]);

  const startCoord = polylineCoords.length > 0 ? polylineCoords[0] : null;
  const endCoord   = polylineCoords.length > 1 ? polylineCoords[polylineCoords.length - 1] : null;

  const checkpoints = useMemo(() => {
    if (polylineCoords.length < 3) return [];
    const step = Math.max(1, Math.floor(polylineCoords.length / 5));
    return polylineCoords
      .map((pt, i) => ({ pt, i }))
      .filter(({ i }) => i > 0 && i < polylineCoords.length - 1 && i % step === 0);
  }, [polylineCoords]);

  const routeAqi  = Math.round(selectedRoute?.route_aqi_score ?? 0);
  const lineColor = aqiColor(routeAqi);
  const noData    = allRoutes.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '420px', background: 'var(--bg-card)' }}>

      {/* Map header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          🗺️ {t('map.title', 'Route Air Quality Map')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {[['#10B981','Good'], ['#F59E0B','Moderate'], ['#EF4444','Unhealthy']].map(([c, l]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Route tabs */}
      {allRoutes.length > 1 && (
        <div style={{
          display: 'flex', gap: '0.35rem', padding: '0.6rem 1rem',
          borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0,
        }}>
          {allRoutes.map((_, idx) => (
            <button key={idx}
              onClick={() => onSelectRoute?.(idx)}
              style={{
                padding: '0.3rem 0.75rem', borderRadius: '6px', border: 'none',
                background: selectedRouteIndex === idx ? 'var(--emerald)' : 'var(--bg-card2)',
                color: selectedRouteIndex === idx ? '#fff' : 'var(--text-muted)',
                fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {idx === 0 ? '⭐ ' : ''}Route #{idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* Leaflet tile */}
      <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
        <LeafletMap
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          key={`map-${selectedRouteIndex}-${theme}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={tileUrl}
          />
          <FocusUserLocation coords={userCoords} hasRoute={polylineCoords.length > 1} />
          {userCoords && !startCoord && (
            <Marker position={[userCoords.latitude, userCoords.longitude]}>
              <Popup><strong>Your current location</strong></Popup>
            </Marker>
          )}
          {polylineCoords.length > 1 && (
            <>
              <Polyline positions={polylineCoords} color={lineColor} weight={12} opacity={0.15} />
              <Polyline positions={polylineCoords} color={lineColor} weight={5}  opacity={0.95} />
              <FitBounds coords={polylineCoords} />
            </>
          )}
          {startCoord && (
            <Marker position={startCoord} icon={startIcon}>
              <Popup><strong>📍 Start</strong><br />{routeData?.source || 'Origin'}</Popup>
            </Marker>
          )}
          {endCoord && (
            <Marker position={endCoord} icon={endIcon}>
              <Popup><strong>🏁 Destination</strong><br />{routeData?.destination || 'Destination'}</Popup>
            </Marker>
          )}
          {checkpoints.map(({ pt, i }) => (
            <Marker key={i} position={pt} icon={checkpointIcon}>
              <Popup>
                <strong>📍 Checkpoint</strong><br />
                Est. AQI: <strong style={{ color: lineColor }}>{routeAqi}</strong>
              </Popup>
            </Marker>
          ))}
        </LeafletMap>

        {noData && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            color: 'var(--text-muted)', gap: '0.5rem', zIndex: 400,
          }}>
            <span style={{ fontSize: '2.5rem' }}>🗺️</span>
            <p style={{ fontSize: '0.88rem', fontWeight: '600' }}>Plan a route to see it here</p>
          </div>
        )}
      </div>

      {/* AQI footer */}
      {routeAqi > 0 && (
        <div style={{
          padding: '0.6rem 1rem', borderTop: '1px solid var(--border)',
          borderLeft: `3px solid ${lineColor}`, background: 'var(--bg-card)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.8rem', flexShrink: 0,
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Selected route AQI</span>
          <span style={{ color: lineColor, fontWeight: '800' }}>
            {routeAqi} — {routeAqi <= 50 ? 'Good' : routeAqi <= 100 ? 'Moderate' : routeAqi <= 150 ? 'Unhealthy (SG)' : 'Unhealthy'}
          </span>
        </div>
      )}
    </div>
  );
};
