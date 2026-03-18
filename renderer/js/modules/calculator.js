Modules.calculator = {
  render(container) {
    container.innerHTML = `
      ${Utils.modHead('Calc', 'Quick Calculator', 'Type math expressions and hit Enter')}
      <div style="max-width:600px;">
        <div class="form-row" style="margin-bottom:24px;">
          <input class="input input-mono" id="calc-input" placeholder="e.g. (150 * 20) / 4.5  or  2^8  or  17 % 5" style="font-size:24px; padding:20px;" autocomplete="off" />
        </div>
        <div id="calc-result" style="font-family:var(--mono); font-size:48px; color:var(--gold); font-weight:300; min-height:60px; transition: opacity 0.15s;"></div>
        <div id="calc-history" style="margin-top:24px; display:flex; flex-direction:column; gap:8px;"></div>
      </div>
    `;

    const input = container.querySelector('#calc-input');
    const resultEl = container.querySelector('#calc-result');
    const historyEl = container.querySelector('#calc-history');
    let history = [];

    // Live preview as you type
    let previewTimer = null;
    input.addEventListener('input', () => {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => this.preview(input.value.trim(), resultEl), 120);
    });

    input.addEventListener('keydown', async e => {
      if (e.key === 'Enter') {
        clearTimeout(previewTimer);
        await this.evaluate(input, resultEl, historyEl, history);
      }
    });
  },

  async preview(val, resultEl) {
    if (!val) { resultEl.textContent = ''; return; }
    const res = await window.api.calcEval(val).catch(() => null);
    if (res && res.result !== undefined) {
      resultEl.style.opacity = '0.4';
      resultEl.textContent = `= ${Number.isInteger(res.result) ? res.result : parseFloat(res.result.toFixed(8))}`;
    } else {
      resultEl.style.opacity = '0.2';
      resultEl.textContent = res?.error || '';
    }
  },

  async evaluate(input, resultEl, historyEl, history) {
    const val = input.value.trim();
    if (!val) return;
    const res = await window.api.calcEval(val).catch(() => ({ error: 'IPC error' }));
    if (res.error) {
      resultEl.style.opacity = '1';
      resultEl.style.color = 'var(--red)';
      resultEl.textContent = res.error;
      setTimeout(() => { resultEl.style.color = 'var(--gold)'; }, 900);
      return;
    }
    const display = Number.isInteger(res.result) ? res.result : parseFloat(res.result.toFixed(8));
    resultEl.style.opacity = '1';
    resultEl.style.color = 'var(--gold)';
    resultEl.textContent = `= ${display}`;
    history.unshift(`${val} = ${display}`);
    if (history.length > 8) history.pop();
    historyEl.innerHTML = history.map((h, i) => `
      <div style="font-family:var(--mono); color:var(--text-muted); font-size:13px; padding:4px 0;
                  border-bottom:1px solid var(--border); cursor:pointer; opacity:${1 - i*0.1}"
           data-expr="${h.split(' = ')[0]}">${h}</div>
    `).join('');
    // Click history to re-use expression
    historyEl.querySelectorAll('[data-expr]').forEach(el => {
      el.addEventListener('click', () => { input.value = el.dataset.expr; input.focus(); });
    });
    // Copy result to clipboard
    await window.api.writeClipboard(String(display));
    input.value = '';
  }
};
