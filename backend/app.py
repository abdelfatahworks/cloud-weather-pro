import os, time
from datetime import datetime, timezone
import requests, psycopg
from flask import Flask, jsonify, request
from psycopg.rows import dict_row

app = Flask(__name__)
DB_URL = os.environ.get("DATABASE_URL", "")
TIMEOUT = float(os.environ.get("WEATHER_TIMEOUT_SECONDS", "8"))

def connect():
    if not DB_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(DB_URL, connect_timeout=4, row_factory=dict_row)

def init_db():
    for attempt in range(20):
        try:
            with connect() as conn:
                conn.execute("""CREATE TABLE IF NOT EXISTS search_history (
                    id BIGSERIAL PRIMARY KEY, city TEXT NOT NULL, country TEXT,
                    temperature_c DOUBLE PRECISION, searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW())""")
            return True
        except Exception as exc:
            app.logger.warning("Database init attempt %s failed: %s", attempt + 1, exc)
            time.sleep(min(1 + attempt * .25, 3))
    return False

@app.before_request
def initialize_once():
    if not getattr(app, "_init_attempted", False):
        app._init_attempted = True
        app._db_ready = init_db()

@app.get("/api/health")
def health():
    try:
        with connect() as conn:
            conn.execute("SELECT 1")
        return jsonify(status="ok", database="connected")
    except Exception:
        return jsonify(status="degraded", database="unavailable"), 503

@app.get("/api/weather")
def weather():
    city = (request.args.get("city") or "").strip()
    if not city or len(city) > 100:
        return jsonify(error="اكتب اسم مدينة صحيحًا (حتى 100 حرف)."), 400
    try:
        geo = requests.get("https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 1, "language": "ar", "format": "json"}, timeout=TIMEOUT)
        geo.raise_for_status()
        places = geo.json().get("results") or []
        if not places:
            return jsonify(error="لم نعثر على المدينة. جرّب الاسم بالإنجليزية."), 404
        place = places[0]
        response = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude": place["latitude"], "longitude": place["longitude"],
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min",
            "timezone": "auto", "forecast_days": 3}, timeout=TIMEOUT)
        response.raise_for_status()
        payload = response.json()
        current = payload.get("current", {})
        result = {"city": place.get("name", city), "country": place.get("country", ""),
            "admin1": place.get("admin1", ""), "latitude": place["latitude"],
            "longitude": place["longitude"], "timezone": payload.get("timezone", ""),
            "current": current, "daily": payload.get("daily", {}),
            "fetched_at": datetime.now(timezone.utc).isoformat()}
        try:
            with connect() as conn:
                conn.execute("INSERT INTO search_history (city,country,temperature_c) VALUES (%s,%s,%s)",
                    (result["city"], result["country"], current.get("temperature_2m")))
        except Exception:
            app.logger.exception("Could not save search history")
        return jsonify(result)
    except requests.Timeout:
        return jsonify(error="انتهت مهلة الاتصال بخدمة الطقس. حاول مرة أخرى."), 504
    except requests.RequestException:
        app.logger.exception("Weather provider request failed")
        return jsonify(error="تعذر الاتصال بخدمة الطقس. تحقق من الإنترنت وحاول لاحقًا."), 502
    except (KeyError, ValueError, TypeError):
        app.logger.exception("Unexpected provider response")
        return jsonify(error="وصلت استجابة غير متوقعة من خدمة الطقس."), 502

@app.get("/api/history")
def history():
    try:
        with connect() as conn:
            rows = conn.execute("SELECT id,city,country,temperature_c,searched_at FROM search_history ORDER BY searched_at DESC LIMIT 10").fetchall()
        for row in rows:
            if row.get("searched_at"):
                row["searched_at"] = row["searched_at"].isoformat()
        return jsonify(items=rows)
    except Exception:
        app.logger.exception("Could not load history")
        return jsonify(error="سجل البحث غير متاح مؤقتًا."), 503

@app.get("/api")
def api_root():
    return jsonify(name="Cloud Weather Pro API", endpoints=["/api/health", "/api/weather?city=Cairo", "/api/history"])
