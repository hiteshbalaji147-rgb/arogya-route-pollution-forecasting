# Backend 

## What is stored where

- **PostgreSQL:** `profile` (unique email and password hash), `language`, `health_condition`, `profile_health`, `profile_completion` (the required true/false completion record), and `refresh_token`.
- **MongoDB:** `route_searches` stores every candidate route for a profile. `recommendations` stores the selected route, its predicted AQI, and travel start/end times. Both include `profile_id`.

## Run

1. Copy `.env.example` to `.env` and populate its values. No Google Maps key or billing account is needed. Set `NOMINATIM_USER_AGENT` to identify your application, and do not commit `.env`.
2. Start PostgreSQL and MongoDB.
3. Activate `venv` and run `uvicorn main:app --reload`.
4. Import `postman_collection.json` into Postman. Use Postman, not Swagger, for the requested workflow.

## Postman order

1. `GET /auth/languages` and `GET /auth/health-conditions`
2. `POST /auth/register`
3. `POST /auth/login` and confirm its test says **Login succeeds**. It saves both JWTs as collection variables; selecting “No environment” in Postman is fine.
4. `GET /auth/me` to confirm the stored access token works.
5. `POST /route/recommend` with `Authorization: Bearer {{accessToken}}`. Its candidate routes include `aqi_category.color`: green (good), orange (moderate), or red (unhealthy). Use that value in Leaflet to draw the polyline.
6. `GET /route/history`
7. After access-token expiry, `POST /auth/refresh`. Refresh tokens rotate: each old token is revoked and only its SHA-256 hash is stored.

If a protected request returns `401 Invalid token`, run **Login** again, then run **My profile (verify access token)** before retrying the route request. This commonly happens when a token was copied from an earlier server run or has expired.

## AQI model note

The supplied CatBoost/scaler artifacts require `city_encoded` and `state_encoded`, but the fitted LabelEncoder mappings were not supplied. The backend now supplies the model's training-median values for unknown locations rather than silently inserting zero, and it uses training-median lag/rolling values until genuine observed AQI history is available. This prevents invalid out-of-distribution inputs and prediction feedback loops.

For exact per-city LabelEncoder values, export the trained encoders (or the cleaned training dataset) and add their mappings to `ml_models/location_encodings.json` in this form:

```json
{"cities": {"hyderabad": 30}, "states": {"telangana": 11}}
```

## Routing, AQI, and language

`/route/recommend` uses OpenStreetMap Nominatim for geocoding and OSRM for driving-route alternatives, so no Maps billing account is needed. It returns both a real-time OpenWeather PM-derived US AQI estimate and the CatBoost prediction. Because OpenWeather does not provide a CPCB station AQI, the conservative `route_aqi_score` uses the higher of the two values for route color. The lowest `health_risk_score` is recommended; for children (age ≤12), older adults (age ≥60), or profiles with health conditions, the score gives additional weight to peak predicted AQI. `station` is labelled as OpenWeather grid data and `observed_at` is populated from OpenWeather's timestamp rather than returning null. The `localized_display` object contains every user-facing route message in the profile's preferred language; keep using the normal numeric fields and stable field names in frontend logic. The geometry uses `[longitude, latitude]` points, so a Leaflet frontend should reverse each pair to `[latitude, longitude]`.

The public Nominatim service is suitable only for low-volume demo use: this backend caches geocoding results, sends an identifying User-Agent, and throttles requests to one per second. If Nominatim blocks a request, the backend automatically falls back to Open-Meteo's no-key place search for named locations. Do not use either public endpoint for autocomplete or production-scale traffic; self-host a geocoder or use a provider if the project grows.

`POST /route/translate` uses Sarvam's `/translate` API and only permits the signed-in user's preferred language. Route advice is also translated automatically when Sarvam is configured; it falls back to English if the provider is unavailable.

If `candidate_routes_count` is `1`, the map provider supplied only one drivable route. In that case `recommended_route` and the one entry in `all_routes` are expected to be the same route.
