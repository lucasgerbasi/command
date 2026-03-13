Modules.random = {
  async render(container) {
    container.innerHTML = `${Utils.modHead('16 / Random', 'Random', 'Dice, coins, and number tools')}
      <div class="random-wrap">
        <div class="section-label">Dice</div>
        <div class="dice-grid" id="dice-grid"></div>
        <div class="section-label" style="margin-top:20px">Tools</div>
        <div class="random-tools">
          <div class="random-tool">
            <div class="random-tool-label">Coin Flip</div>
            <div class="random-result-big" id="coin-result">—</div>
            <button class="btn btn-gold" id="flip-coin">Flip</button>
          </div>
          <div class="random-tool">
            <div class="random-tool-label">Random Number</div>
            <div class="random-result-big" id="num-result">—</div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;font-size:11px;color:var(--text-muted)">
              <input class="input" id="num-min" type="number" value="1" style="width:70px;text-align:center" />
              <span>to</span>
              <input class="input" id="num-max" type="number" value="100" style="width:70px;text-align:center" />
            </div>
            <button class="btn btn-gold" id="gen-num">Generate</button>
          </div>
          <div class="random-tool" style="grid-column:span 2">
            <div class="random-tool-label">Pick from List</div>
            <div class="random-result-big" id="pick-result" style="font-size:18px;word-break:break-word">—</div>
            <textarea class="input input-mono" id="pick-list" placeholder="One item per line…" style="height:64px;margin-bottom:6px"></textarea>
            <button class="btn btn-gold" id="pick-btn">Pick Random</button>
          </div>
        </div>
      </div>`;

    const dice = [4, 6, 8, 10, 12, 20, 100];
    document.getElementById('dice-grid').innerHTML = dice.map(d => `
      <div class="dice-card" data-sides="${d}">
        <div class="dice-label">D${d}</div>
        <div class="dice-result" id="die-${d}">—</div>
        <div class="dice-faces">1–${d}</div>
      </div>`).join('');

    document.getElementById('dice-grid').addEventListener('click', e => {
      const card = e.target.closest('.dice-card'); if (!card) return;
      const sides = +card.dataset.sides;
      const el = document.getElementById(`die-${sides}`);
      el.classList.add('rolling');
      let count = 0;
      const shake = setInterval(() => {
        el.textContent = Math.ceil(Math.random() * sides);
        if (++count >= 8) {
          clearInterval(shake);
          const result = Math.ceil(Math.random() * sides);
          el.textContent = result;
          el.classList.remove('rolling');
          if (sides === 20 && result === 20) { App.toast('🎲 NAT 20!', 'success'); }
          if (sides === 20 && result === 1)  { App.toast('💀 Critical fail…', 'error'); }
        }
      }, 60);
    });

    document.getElementById('flip-coin').addEventListener('click', () => {
      const el = document.getElementById('coin-result');
      el.className = 'random-result-big';
      let count = 0;
      const shake = setInterval(() => {
        el.textContent = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        if (++count >= 8) {
          clearInterval(shake);
          const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
          el.textContent = result;
          el.classList.add(result === 'HEADS' ? 'flip-heads' : 'flip-tails');
        }
      }, 60);
    });

    document.getElementById('gen-num').addEventListener('click', () => {
      const min = parseInt(document.getElementById('num-min').value) || 1;
      const max = parseInt(document.getElementById('num-max').value) || 100;
      if (min >= max) return App.toast('Min must be less than max', 'error');
      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      document.getElementById('num-result').textContent = result;
    });

    document.getElementById('pick-btn').addEventListener('click', () => {
      const lines = document.getElementById('pick-list').value.split('\n').map(l=>l.trim()).filter(Boolean);
      if (!lines.length) return App.toast('Add some items first', 'error');
      const pick = lines[Math.floor(Math.random() * lines.length)];
      document.getElementById('pick-result').textContent = `"${pick}"`;
    });
  },
};
