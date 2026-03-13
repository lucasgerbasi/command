Modules.weather = {
  async render(container) {
    const config = await window.api.getData('weather-config').catch(()=>null) || {};
    
    container.innerHTML = `
      ${Utils.modHead('10 / Weather', 'Weather Status', 'Powered by Open-Meteo', `<button class="btn" id="weather-config-btn">⚙ Configure Location</button>`)}
      <div class="weather-wrap" id="weather-content">
        <div class="empty-state"><div class="empty-icon">◌</div><div class="empty-text">Loading weather...</div></div>
      </div>`;

    const wmo = {
      0: {i:'☀️', t:'Clear sky'},
      1: {i:'🌤️', t:'Mainly clear'}, 2: {i:'⛅', t:'Partly cloudy'}, 3: {i:'☁️', t:'Overcast'},
      45: {i:'🌫️', t:'Fog'}, 48: {i:'🌫️', t:'Depositing rime fog'},
      51: {i:'🌧️', t:'Light drizzle'}, 53: {i:'🌧️', t:'Moderate drizzle'}, 55: {i:'🌧️', t:'Dense drizzle'},
      61: {i:'🌧️', t:'Slight rain'}, 63: {i:'🌧️', t:'Moderate rain'}, 65: {i:'🌧️', t:'Heavy rain'},
      71: {i:'❄️', t:'Slight snow'}, 73: {i:'❄️', t:'Moderate snow'}, 75: {i:'❄️', t:'Heavy snow'},
      77: {i:'❄️', t:'Snow grains'},
      80: {i:'🌧️', t:'Slight rain showers'}, 81: {i:'🌧️', t:'Moderate rain showers'}, 82: {i:'🌧️', t:'Violent rain showers'},
      85: {i:'❄️', t:'Slight snow showers'}, 86: {i:'❄️', t:'Heavy snow showers'},
      95: {i:'⛈️', t:'Thunderstorm'}, 96: {i:'⛈️', t:'Thunderstorm with slight hail'}, 99: {i:'⛈️', t:'Thunderstorm with heavy hail'}
    };

    const renderWeather = (data) => {
      if (!data || !config.lat) {
        document.getElementById('weather-content').innerHTML = `<div class="empty-state"><div class="empty-icon">◌</div><div class="empty-text">No location set</div><div class="empty-hint">Click configure to search for your city</div></div>`;
        return;
      }
      
      const current = data.current_weather;
      const code = current.weathercode;
      const info = wmo[code] || {i:'🌈', t:'Unknown'};
      const daily = data.daily;
      
      document.getElementById('weather-content').innerHTML = `
        <div class="weather-hero">
          <div class="weather-info">
            <div class="weather-condition">${info.t}</div>
            <div class="weather-location">${config.city}</div>
          </div>
          <div class="weather-temp">${Math.round(current.temperature)}<span class="weather-temp-unit">°</span></div>
          <div class="weather-icon">${info.i}</div>
        </div>
        <div class="weather-details">
          <div class="weather-detail"><div class="weather-detail-label">Wind</div><div class="weather-detail-value">${current.windspeed} <span style="font-size:10px;color:var(--text-muted)">km/h</span></div></div>
          <div class="weather-detail"><div class="weather-detail-label">Today High</div><div class="weather-detail-value">${Math.round(daily.temperature_2m_max[0])}°</div></div>
          <div class="weather-detail"><div class="weather-detail-label">Today Low</div><div class="weather-detail-value">${Math.round(daily.temperature_2m_min[0])}°</div></div>
          <div class="weather-detail"><div class="weather-detail-label">Precip</div><div class="weather-detail-value">${daily.precipitation_sum[0]} <span style="font-size:10px;color:var(--text-muted)">mm</span></div></div>
        </div>
        <div class="section-label">7-Day Forecast</div>
        <div class="weather-forecast">
          ${daily.time.map((time, i) => {
            const d = new Date(time);
            const dayName = i===0 ? 'TODAY' : d.toLocaleDateString('en-US', {weekday:'short'});
            const dInfo = wmo[daily.weathercode[i]] || {i:'🌈'};
            return `
              <div class="forecast-day">
                <div class="forecast-day-name">${dayName}</div>
                <div class="forecast-icon">${dInfo.i}</div>
                <div class="forecast-hi">${Math.round(daily.temperature_2m_max[i])}°</div>
                <div class="forecast-lo">${Math.round(daily.temperature_2m_min[i])}°</div>
              </div>`;
          }).join('')}
        </div>`;
    };

    if (config.lat && config.lon) {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${config.lat}&longitude=${config.lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
        const data = await res.json();
        renderWeather(data);
      } catch (e) {
        document.getElementById('weather-content').innerHTML = `<div class="empty-state"><div class="empty-text">Failed to load weather data</div></div>`;
      }
    } else {
      renderWeather(null);
    }

    container.addEventListener('click', e => {
      if (e.target.closest('#weather-config-btn')) {
        App.openModal('Configure Location', `
          <div class="form-row">
            <label class="form-label">Search City</label>
            <div style="display:flex;gap:10px">
              <input class="input" id="weather-search-input" placeholder="e.g. Melbourne" style="flex:1" />
              <button class="btn btn-gold" id="weather-search-btn">Search</button>
            </div>
          </div>
          <div id="weather-search-results" style="display:flex;flex-direction:column;gap:6px;margin-top:12px"></div>
        `);

        document.getElementById('weather-search-btn').addEventListener('click', async () => {
          const q = document.getElementById('weather-search-input').value.trim();
          if (!q) return;
          
          const resContainer = document.getElementById('weather-search-results');
          resContainer.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Searching...</div>';
          
          try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6`);
            const data = await res.json();
            
            if (!data.results || data.results.length === 0) {
              resContainer.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">No results found. Please check spelling.</div>';
              return;
            }

            // Using geocoding API to parse distinct names + regions
            resContainer.innerHTML = data.results.map((r, i) => {
              const locationStr = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
              return `
                <div class="card weather-loc-option" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${r.name}" style="padding:12px 16px;cursor:pointer;transition:background 0.1s">
                  <div style="font-size:14px;font-weight:600;color:var(--text)">${r.name}</div>
                  <div style="font-family:var(--mono);font-size:11px;color:var(--text-muted);margin-top:4px">${locationStr}</div>
                </div>`;
            }).join('');

            resContainer.querySelectorAll('.weather-loc-option').forEach(el => {
              el.addEventListener('click', async () => {
                config.lat = el.dataset.lat;
                config.lon = el.dataset.lon;
                config.city = el.dataset.name;
                await window.api.setData('weather-config', config);
                App.closeModal();
                App.navigate('weather'); // Reload module 
                App.toast('Location updated successfully');
              });
              el.addEventListener('mouseenter', () => el.style.background = 'var(--bg-hover)');
              el.addEventListener('mouseleave', () => el.style.background = 'var(--bg-2)');
            });

          } catch (err) {
            resContainer.innerHTML = '<div style="font-size:12px;color:var(--red)">Search failed. Check your connection.</div>';
          }
        });
      }
    });
  }
};