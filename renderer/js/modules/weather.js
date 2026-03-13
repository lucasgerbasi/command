// Weather via Open-Meteo (free, no API key)
Modules.weather = {
  ICONS: {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',71:'❄️',73:'❄️',75:'❄️',80:'🌦',81:'🌧',82:'🌧',95:'⛈',96:'⛈',99:'⛈'},
  CONDITIONS: {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Foggy',51:'Drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',81:'Heavy showers',82:'Violent showers',95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm'},
  DAYS: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],

  async render(container) {
    const saved = await window.api.getData('weather-config').catch(()=>null) || {city:'', lat:null, lon:null};
    container.innerHTML = `${Utils.modHead('09 / Weather', 'Weather', '')}
      <div class="weather-wrap">
        <div class="weather-loc-row">
          <input class="input" id="weather-city" placeholder="City name (e.g. London, Tokyo)…" style="flex:1" value="${saved.city||''}" />
          <button class="btn btn-gold" id="weather-go">Fetch</button>
        </div>
        <div id="weather-content"><div class="empty-state"><div class="empty-icon">◌</div><div class="empty-text">Enter a city to get started</div></div></div>
      </div>`;

    if (saved.lat && saved.lon) this.fetchAndRender(saved.lat, saved.lon, saved.city);

    document.getElementById('weather-go').addEventListener('click', async () => {
      const city = document.getElementById('weather-city').value.trim();
      if (!city) return App.toast('Enter a city', 'error');
      document.getElementById('weather-content').innerHTML = `<div class="empty-state"><div class="empty-text">Fetching…</div></div>`;
      try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`).then(r=>r.json());
        if (!geo.results?.length) return App.toast('City not found', 'error');
        const {latitude:lat, longitude:lon, name} = geo.results[0];
        await window.api.setData('weather-config', {city:name, lat, lon});
        this.fetchAndRender(lat, lon, name);
      } catch { App.toast('Error fetching location', 'error'); }
    });
    document.getElementById('weather-city').addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('weather-go').click(); });
  },

  async fetchAndRender(lat, lon, city) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode,apparent_temperature&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;
      const d = await fetch(url).then(r=>r.json());
      const c = d.current, daily = d.daily;
      const icon = this.ICONS[c.weathercode] || '🌡';
      const cond = this.CONDITIONS[c.weathercode] || 'Unknown';

      document.getElementById('weather-content').innerHTML = `
        <div class="weather-hero">
          <div>
            <div class="weather-temp">${Math.round(c.temperature_2m)}<span class="weather-temp-unit">°C</span></div>
          </div>
          <div class="weather-info">
            <div class="weather-condition">${cond}</div>
            <div class="weather-location">${city}</div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-top:4px">Feels like ${Math.round(c.apparent_temperature)}°C</div>
          </div>
          <div class="weather-icon">${icon}</div>
        </div>
        <div class="weather-details">
          <div class="weather-detail"><div class="weather-detail-label">Humidity</div><div class="weather-detail-value">${c.relative_humidity_2m}<span style="font-size:12px;color:var(--text-muted)">%</span></div></div>
          <div class="weather-detail"><div class="weather-detail-label">Wind</div><div class="weather-detail-value">${Math.round(c.wind_speed_10m)}<span style="font-size:12px;color:var(--text-muted)"> km/h</span></div></div>
          <div class="weather-detail"><div class="weather-detail-label">High</div><div class="weather-detail-value">${Math.round(daily.temperature_2m_max[0])}<span style="font-size:12px;color:var(--text-muted)">°</span></div></div>
          <div class="weather-detail"><div class="weather-detail-label">Low</div><div class="weather-detail-value">${Math.round(daily.temperature_2m_min[0])}<span style="font-size:12px;color:var(--text-muted)">°</span></div></div>
        </div>
        <div class="weather-forecast">
          ${daily.time.map((_,i) => `
            <div class="forecast-day">
              <div class="forecast-day-name">${i===0?'Today':this.DAYS[new Date(daily.time[i]).getDay()]}</div>
              <div class="forecast-icon">${this.ICONS[daily.weathercode[i]]||'🌡'}</div>
              <div class="forecast-hi">${Math.round(daily.temperature_2m_max[i])}°</div>
              <div class="forecast-lo">${Math.round(daily.temperature_2m_min[i])}°</div>
            </div>`).join('')}
        </div>`;
    } catch { App.toast('Failed to load weather', 'error'); }
  },
};
