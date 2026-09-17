"""No-key routing for a Leaflet + OpenStreetMap classroom/demo deployment."""

from functools import lru_cache
from threading import Lock
from time import monotonic, sleep

import requests

from config import NOMINATIM_USER_AGENT

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Free fallback for classroom demos when the shared Nominatim service blocks
# an IP address. It is only used for named places, not reverse geocoding.
OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
NOMINATIM_MINIMUM_INTERVAL_SECONDS = 1.0
_nominatim_lock = Lock()
_last_nominatim_request = 0.0


def _throttle_nominatim() -> None:
    """Comply with Nominatim's public-service limit of at most one request/sec."""
    global _last_nominatim_request
    with _nominatim_lock:
        wait_time = NOMINATIM_MINIMUM_INTERVAL_SECONDS - (monotonic() - _last_nominatim_request)
        if wait_time > 0:
            sleep(wait_time)
        _last_nominatim_request = monotonic()


@lru_cache(maxsize=256)
def get_coordinates(place: str) -> tuple[float, float]:
    """Resolve one place through OSM Nominatim, caching repeat searches."""
    _throttle_nominatim()
    response = requests.get(
        NOMINATIM_URL,
        params={"q": place, "format": "jsonv2", "limit": 1},
        headers={"User-Agent": NOMINATIM_USER_AGENT},
        timeout=20,
    )
    if response.status_code == 403:
        return _get_open_meteo_coordinates(place)
    response.raise_for_status()
    results = response.json()
    if not results:
        return _get_open_meteo_coordinates(place)
    return float(results[0]["lat"]), float(results[0]["lon"])


def _get_open_meteo_coordinates(place: str) -> tuple[float, float]:
    """Fallback geocoder for city/locality input when Nominatim is unavailable."""
    response = requests.get(
        OPEN_METEO_GEOCODING_URL,
        params={"name": place.split(",")[0].strip(), "count": 1, "language": "en", "format": "json"},
        timeout=20,
    )
    response.raise_for_status()
    results = response.json().get("results") or []
    if not results:
        raise ValueError(f"Location not found: {place}")
    return float(results[0]["latitude"]), float(results[0]["longitude"])


def get_routes(source: str, destination: str) -> list[dict]:
    """Fetch driving alternatives from OSRM in GeoJSON [longitude, latitude] form."""
    source_lat, source_lon = get_coordinates(source)
    destination_lat, destination_lon = get_coordinates(destination)
    response = requests.get(
        f"{OSRM_URL}/{source_lon},{source_lat};{destination_lon},{destination_lat}",
        params={"alternatives": "true", "overview": "full", "geometries": "geojson"},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") != "Ok" or not payload.get("routes"):
        raise RuntimeError(f"OSRM could not calculate a driving route: {payload.get('message', 'no routes returned')}")
    return [
        {
            "distance": route["distance"],
            "duration": route["duration"],
            "geometry": route["geometry"]["coordinates"],
        }
        for route in payload["routes"]
    ]
