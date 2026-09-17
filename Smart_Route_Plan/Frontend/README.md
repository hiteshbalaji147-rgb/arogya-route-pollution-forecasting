# ArogyaRoute frontend

React + Vite interface for the AQI Route Recommendation API. It uses Leaflet with OpenStreetMap tiles and renders every route geometry returned by `POST /route/recommend`.

## Run

1. Copy `.env.example` to `.env`, set `VITE_API_URL` if the API is not on `http://localhost:8000`, and replace `VITE_GOOGLE_CLIENT_ID` with the OAuth 2.0 client ID from Google Cloud Console. Add the frontend origin (for example `http://localhost:5174`) to the client's authorized JavaScript origins.
2. Run `npm install` and `npm run dev`.
3. Register through the backend/Postman, then sign in in the top-right dialog and plan a route.

The backend permits `http://localhost:5173` by default. For a deployed frontend, set `FRONTEND_ORIGINS` in the backend `.env` to its comma-separated public origins.

After login, `GET /content/static` retrieves interface copy from PostgreSQL. English is seeded at backend startup; non-English copy is translated through Sarvam only once per key and language, then re-used from the `website_content` table.
