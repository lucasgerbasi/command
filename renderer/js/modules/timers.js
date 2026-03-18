Modules.timers = {
  stopwatchTimer: null,
  stopwatchTime: 0,
  countdownTimer: null,
  countdownTime: 0,

  render(container) {
    container.innerHTML = `
      <style>
        /* CSS Fix: Hides the ugly up/down arrows natively injected into number inputs */
        #cd-m::-webkit-inner-spin-button, #cd-m::-webkit-outer-spin-button,
        #cd-s::-webkit-inner-spin-button, #cd-s::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
      </style>
      ${Utils.modHead('Timers', 'Clocks & Timers', 'Stopwatch and Countdown')}
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
        
        <div class="card" style="display:flex; flex-direction:column; align-items:center; padding:32px;">
          <div class="section-label" style="margin-top:0;">Stopwatch</div>
          <div id="sw-display" style="font-family:var(--mono); font-size:48px; font-weight:200; margin:24px 0;">00:00:00</div>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-gold" id="sw-start">Start / Stop</button>
            <button class="btn" id="sw-reset">Reset</button>
          </div>
        </div>

        <div class="card" style="display:flex; flex-direction:column; align-items:center; padding:32px;">
          <div class="section-label" style="margin-top:0;">Countdown</div>
          <div style="display:flex; gap:10px; margin:24px 0; align-items:center;">
            <input class="input input-mono" id="cd-m" type="number" placeholder="MM" style="width:70px; font-size:24px; text-align:center; padding: 10px 0;" />
            <span style="font-size:24px;">:</span>
            <input class="input input-mono" id="cd-s" type="number" placeholder="SS" style="width:70px; font-size:24px; text-align:center; padding: 10px 0;" />
          </div>
          <div id="cd-display" style="font-family:var(--mono); font-size:48px; font-weight:200; margin-bottom:24px; display:none;">00:00</div>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-gold" id="cd-start">Start</button>
            <button class="btn" id="cd-reset">Clear</button>
          </div>
        </div>
      </div>
    `;

    // Stopwatch Logic
    const formatSW = (ms) => new Date(ms).toISOString().slice(11, 19);
    const swDisplay = container.querySelector('#sw-display');
    
    container.querySelector('#sw-start').addEventListener('click', () => {
      if (this.stopwatchTimer) {
        clearInterval(this.stopwatchTimer);
        this.stopwatchTimer = null;
      } else {
        const start = Date.now() - this.stopwatchTime;
        this.stopwatchTimer = setInterval(() => {
          this.stopwatchTime = Date.now() - start;
          swDisplay.textContent = formatSW(this.stopwatchTime);
        }, 100);
      }
    });
    
    container.querySelector('#sw-reset').addEventListener('click', () => {
      clearInterval(this.stopwatchTimer);
      this.stopwatchTimer = null;
      this.stopwatchTime = 0;
      swDisplay.textContent = "00:00:00";
    });

    // Countdown Logic
    const cdM = container.querySelector('#cd-m');
    const cdS = container.querySelector('#cd-s');
    const cdDisp = container.querySelector('#cd-display');

    container.querySelector('#cd-start').addEventListener('click', () => {
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        return;
      }
      const m = parseInt(cdM.value) || 0;
      const s = parseInt(cdS.value) || 0;
      this.countdownTime = (m * 60) + s;
      if (this.countdownTime <= 0) return;

      cdM.style.display = 'none'; cdS.style.display = 'none';
      cdDisp.style.display = 'block';

      this.countdownTimer = setInterval(() => {
        this.countdownTime--;
        const rm = Math.floor(this.countdownTime / 60).toString().padStart(2, '0');
        const rs = (this.countdownTime % 60).toString().padStart(2, '0');
        cdDisp.textContent = `${rm}:${rs}`;

        if (this.countdownTime <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          App.toast('Countdown finished!', 'success');
          try { new Notification('Timer', { body: "Countdown finished!" }); } catch {}
          cdM.style.display = ''; cdS.style.display = '';
          cdDisp.style.display = 'none';
        }
      }, 1000);
    });

    container.querySelector('#cd-reset').addEventListener('click', () => {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
      cdM.style.display = ''; cdS.style.display = '';
      cdDisp.style.display = 'none';
      cdM.value = ''; cdS.value = '';
    });
  }
};