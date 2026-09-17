# ArogyaRoute

AQI-aware route recommendations with health-personalized pollution guidance.

## Project Layout

- `Smart_Route_Plan/Frontend`: React + Vite web application with Leaflet maps.
- `Smart_Route_Plan/AQI_Backend`: FastAPI API, CatBoost AQI inference, route scoring, and authentication.
- `BiLSTM_Model`: AQI forecasting notebooks and prediction data.
- `Backend`: earlier backend implementation retained for reference.

## Run Locally

### Frontend

```powershell
cd Smart_Route_Plan/Frontend
Copy-Item .env.example .env
npm install
npm run dev -- --host 127.0.0.1
```

Set `VITE_GOOGLE_CLIENT_ID` in `.env` only if Google Sign-In is required. The map uses Leaflet, OpenStreetMap, and OSRM; it does not require a Google Maps key.

### Backend

Create a local environment file from the template:

```powershell
cd Smart_Route_Plan/AQI_Backend
Copy-Item .env.example .env
```

Install the Python dependencies and start the API:

```powershell
C:/Python314/python.exe -m pip install -r requirements.txt
C:/Python314/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The backend can use SQLite for local demos. MongoDB is optional for route history persistence, and `OPENWEATHER_API_KEY` enables live pollution data.

Open the frontend at `http://127.0.0.1:5174/`. The API health endpoint is `http://127.0.0.1:8000/`.

## Security

Never commit `.env` files, API keys, JWT secrets, databases, or runtime logs. Use the tracked `.env.example` files as templates and rotate any credential that has been exposed.

See the component-specific guides in `Smart_Route_Plan/Frontend/README.md` and `Smart_Route_Plan/AQI_Backend/README.md` for API workflow details.