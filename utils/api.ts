// ─── External API Utilities ───────────────────────────────────────────────────
// Pure fetch functions — no state, no side effects.
// Both throw on failure so callers own error handling and UI feedback.

// ── ZenQuotes ─────────────────────────────────────────────────────────────────

export type DailyQuote = {
  quote:  string;
  author: string;
};

/**
 * Fetches a random motivational quote from ZenQuotes.
 * Uses /api/random so every call (including "New quote" refreshes) returns
 * a different quote. No API key required.
 */
export async function fetchDailyQuote(): Promise<DailyQuote> {
  // Cache-bust with a timestamp so the fetch isn't served from any local cache
  const res = await fetch(`https://zenquotes.io/api/random?t=${Date.now()}`);
  if (!res.ok) throw new Error(`ZenQuotes error: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || !data[0]?.q) {
    throw new Error('Unexpected ZenQuotes response format');
  }

  return { quote: data[0].q, author: data[0].a };
}

// ── OpenWeatherMap ────────────────────────────────────────────────────────────

export type WeatherData = {
  temp:        number;   // Celsius
  condition:   string;   // e.g. "Clear", "Rain", "Clouds"
  description: string;   // e.g. "clear sky", "light rain"
  city:        string;
};

/**
 * Fetches current weather for the given coordinates from OpenWeatherMap.
 * Requires EXPO_PUBLIC_OPENWEATHER_API_KEY in .env
 */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const key = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
  if (!key || key === 'your_key_here') {
    throw new Error('OpenWeatherMap API key not set. Add it to .env');
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeatherMap error: ${res.status}`);

  const data = await res.json();
  return {
    temp:        Math.round(data.main.temp),
    condition:   data.weather[0].main,
    description: data.weather[0].description,
    city:        data.name,
  };
}
