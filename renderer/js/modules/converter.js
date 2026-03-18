Modules.converter = {
  rates: null,
  base: 'USD',

  async render(container) {
    container.innerHTML = `
      ${Utils.modHead('Converter', 'Unit Converter', 'Length · Weight · Temperature · Live Currency')}
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:24px;">
        
        <div class="card">
          <div class="section-label" style="margin-top:0;">Currency <span id="curr-status" style="font-size:10px;color:var(--text-muted);font-weight:400;margin-left:8px;">Loading…</span></div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <input class="input" type="number" id="curr-val" value="1" style="width:90px;" />
            <select class="input" id="curr-from" style="min-width:80px;">
              <option value="USD" selected>USD</option>
            </select>
            <span style="color:var(--text-muted);">→</span>
            <select class="input" id="curr-to" style="min-width:80px;">
              <option value="BRL" selected>BRL</option>
            </select>
          </div>
          <div id="curr-res" style="margin-top:16px; font-family:var(--mono); font-size:28px; color:var(--gold);">—</div>
          <div id="curr-rate" style="font-family:var(--mono); font-size:10px; color:var(--text-muted); margin-top:4px;"></div>
        </div>

        <div class="card">
          <div class="section-label" style="margin-top:0;">Length</div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <input class="input" type="number" id="len-val" value="1" style="width:90px;" />
            <select class="input" id="len-from">
              <option value="km">km</option>
              <option value="m">m</option>
              <option value="cm">cm</option>
              <option value="mm">mm</option>
              <option value="mi" selected>mi</option>
              <option value="ft">ft</option>
              <option value="in">in</option>
              <option value="yd">yd</option>
            </select>
            <span style="color:var(--text-muted);">→</span>
            <select class="input" id="len-to">
              <option value="km" selected>km</option>
              <option value="m">m</option>
              <option value="cm">cm</option>
              <option value="mm">mm</option>
              <option value="mi">mi</option>
              <option value="ft">ft</option>
              <option value="in">in</option>
              <option value="yd">yd</option>
            </select>
          </div>
          <div id="len-res" style="margin-top:16px; font-family:var(--mono); font-size:28px; color:var(--gold);"></div>
        </div>

        <div class="card">
          <div class="section-label" style="margin-top:0;">Weight</div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <input class="input" type="number" id="wt-val" value="1" style="width:90px;" />
            <select class="input" id="wt-from">
              <option value="kg" selected>kg</option>
              <option value="g">g</option>
              <option value="mg">mg</option>
              <option value="lb">lb</option>
              <option value="oz">oz</option>
              <option value="t">tonne</option>
            </select>
            <span style="color:var(--text-muted);">→</span>
            <select class="input" id="wt-to">
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="mg">mg</option>
              <option value="lb" selected>lb</option>
              <option value="oz">oz</option>
              <option value="t">tonne</option>
            </select>
          </div>
          <div id="wt-res" style="margin-top:16px; font-family:var(--mono); font-size:28px; color:var(--gold);"></div>
        </div>

        <div class="card">
          <div class="section-label" style="margin-top:0;">Temperature</div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <input class="input" type="number" id="temp-val" value="0" style="width:90px;" />
            <select class="input" id="temp-from">
              <option value="c" selected>°C</option>
              <option value="f">°F</option>
              <option value="k">K</option>
            </select>
            <span style="color:var(--text-muted);">→</span>
            <select class="input" id="temp-to">
              <option value="c">°C</option>
              <option value="f" selected>°F</option>
              <option value="k">K</option>
            </select>
          </div>
          <div id="temp-res" style="margin-top:16px; font-family:var(--mono); font-size:28px; color:var(--gold);"></div>
        </div>
      </div>
    `;

    // Load currency rates from frankfurter.app (free, no key, ECB data)
    this.loadCurrencyRates(container);

    ['curr-val','curr-from','curr-to'].forEach(id =>
      container.querySelector(`#${id}`).addEventListener('input', () => this.calcCurrency(container)));
    ['len-val','len-from','len-to'].forEach(id =>
      container.querySelector(`#${id}`).addEventListener('input', () => this.calcLength(container)));
    ['wt-val','wt-from','wt-to'].forEach(id =>
      container.querySelector(`#${id}`).addEventListener('input', () => this.calcWeight(container)));
    ['temp-val','temp-from','temp-to'].forEach(id =>
      container.querySelector(`#${id}`).addEventListener('input', () => this.calcTemp(container)));

    this.calcLength(container);
    this.calcWeight(container);
    this.calcTemp(container);
  },

  async loadCurrencyRates(container) {
    const statusEl = container.querySelector('#curr-status');
    const resEl = container.querySelector('#curr-res');
    try {
      // frankfurter.app — free, no key, backed by ECB reference rates
      const res = await fetch('https://api.frankfurter.app/latest?from=USD');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // frankfurter returns rates relative to base, base itself not in rates — add it
      this.rates = { ...data.rates, [data.base]: 1 };
      this.base = data.base;

      // Populate currency selects with all available currencies
      const COMMON = ['USD','EUR','GBP','BRL','JPY','CAD','AUD','CHF','CNY','INR','MXN','SEK','NOK','DKK','PLN','CZK','HUF','RON','TRY','RUB'];
      const allCurrencies = Object.keys(this.rates).sort();
      const ordered = [...COMMON.filter(c => allCurrencies.includes(c)), ...allCurrencies.filter(c => !COMMON.includes(c))];

      ['curr-from','curr-to'].forEach((id, idx) => {
        const sel = container.querySelector(`#${id}`);
        const current = idx === 0 ? 'USD' : 'BRL';
        sel.innerHTML = ordered.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');
      });

      statusEl.textContent = `ECB · ${data.date}`;
      statusEl.style.color = 'var(--green)';
      this.calcCurrency(container);
    } catch (e) {
      statusEl.textContent = 'Offline';
      statusEl.style.color = 'var(--red)';
      resEl.textContent = 'No connection';
    }
  },

  calcCurrency(container) {
    if (!this.rates) return;
    const val = parseFloat(container.querySelector('#curr-val').value) || 0;
    const from = container.querySelector('#curr-from').value;
    const to = container.querySelector('#curr-to').value;
    // Convert via USD base
    const inUSD = val / (this.rates[from] || 1);
    const result = inUSD * (this.rates[to] || 1);
    const rate = (this.rates[to] || 1) / (this.rates[from] || 1);
    container.querySelector('#curr-res').textContent = `${result.toFixed(4)} ${to}`;
    container.querySelector('#curr-rate').textContent = `1 ${from} = ${rate.toFixed(6)} ${to}`;
  },

  calcLength(container) {
    const val = parseFloat(container.querySelector('#len-val').value) || 0;
    const from = container.querySelector('#len-from').value;
    const to = container.querySelector('#len-to').value;
    const toM = { km:1000, m:1, cm:0.01, mm:0.001, mi:1609.344, ft:0.3048, in:0.0254, yd:0.9144 };
    const result = (val * toM[from]) / toM[to];
    container.querySelector('#len-res').textContent = `${this.fmt(result)} ${to}`;
  },

  calcWeight(container) {
    const val = parseFloat(container.querySelector('#wt-val').value) || 0;
    const from = container.querySelector('#wt-from').value;
    const to = container.querySelector('#wt-to').value;
    const toKg = { kg:1, g:0.001, mg:0.000001, lb:0.453592, oz:0.0283495, t:1000 };
    const result = (val * toKg[from]) / toKg[to];
    container.querySelector('#wt-res').textContent = `${this.fmt(result)} ${to}`;
  },

  calcTemp(container) {
    const val = parseFloat(container.querySelector('#temp-val').value) || 0;
    const from = container.querySelector('#temp-from').value;
    const to = container.querySelector('#temp-to').value;
    let c = from === 'c' ? val : from === 'f' ? (val-32)*5/9 : val-273.15;
    const result = to === 'c' ? c : to === 'f' ? (c*9/5)+32 : c+273.15;
    container.querySelector('#temp-res').textContent = `${this.fmt(result)} ${to === 'k' ? 'K' : '°'+to.toUpperCase()}`;
  },

  fmt(n) {
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (Math.abs(n) >= 0.01) return parseFloat(n.toFixed(6)).toString();
    return n.toExponential(4);
  }
};
