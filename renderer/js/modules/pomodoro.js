Modules.pomodoro = {
  timer: null,
  timeLeft: 0,
  mode: 'work',
  isRunning: false,
  config: { work: 25, break: 5 },

  async render(container) {
    this.config = await window.api.getData('pomo-config') || { work: 25, break: 5 };
    if (this.timeLeft === 0 && !this.isRunning) {
      this.timeLeft = this.config.work * 60;
    }

    container.innerHTML = `
      ${Utils.modHead('Pomodoro', 'Focus Timer', 'Stay productive with timed sessions', `<button class="btn" id="pomo-settings">⚙ Settings</button>`)}
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 0;">
        <div style="display:flex; gap:12px; margin-bottom:32px;">
          <button class="btn ${this.mode==='work'?'btn-gold':''}" id="pomo-work">Work (${this.config.work}m)</button>
          <button class="btn ${this.mode==='break'?'btn-gold':''}" id="pomo-break">Break (${this.config.break}m)</button>
        </div>
        <div id="pomo-display" style="font-family:var(--mono); font-size:96px; font-weight:200; line-height:1; color:var(--text); margin-bottom:40px;">
          ${this.formatTime(this.timeLeft)}
        </div>
        <div style="display:flex; gap:16px;">
          <button class="btn btn-gold" id="pomo-toggle" style="width:120px; font-size:16px;">${this.isRunning ? 'Pause' : 'Start'}</button>
          <button class="btn" id="pomo-reset" style="width:120px; font-size:16px;">Reset</button>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },

  updateDisplay() {
    const el = document.getElementById('pomo-display');
    if (el) el.textContent = this.formatTime(this.timeLeft);
  },

  setMode(mode) {
    this.mode = mode;
    this.timeLeft = (mode === 'work' ? this.config.work : this.config.break) * 60;
    this.isRunning = false;
    clearInterval(this.timer);
    // Only re-render if we're already on the pomodoro page
    if (App.currentModule === 'pomodoro') App.navigate('pomodoro');
  },

  toggle() {
    this.isRunning = !this.isRunning;
    const btn = document.getElementById('pomo-toggle');
    if (btn) btn.textContent = this.isRunning ? 'Pause' : 'Start';

    if (this.isRunning) {
      this.timer = setInterval(() => {
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          clearInterval(this.timer);
          this.isRunning = false;
          App.toast(`Time's up! ${this.mode === 'work' ? 'Take a break.' : 'Back to work.'}`, 'success');
          try { new Notification('Pomodoro', { body: "Time's up!" }); } catch {}
          this.setMode(this.mode === 'work' ? 'break' : 'work');
        } else {
          this.updateDisplay();
        }
      }, 1000);
    } else {
      clearInterval(this.timer);
    }
  },

  bindEvents(container) {
    container.querySelector('#pomo-work').addEventListener('click', () => this.setMode('work'));
    container.querySelector('#pomo-break').addEventListener('click', () => this.setMode('break'));
    container.querySelector('#pomo-toggle').addEventListener('click', () => this.toggle());
    container.querySelector('#pomo-reset').addEventListener('click', () => this.setMode(this.mode));
    
    container.querySelector('#pomo-settings').addEventListener('click', () => {
      App.openModal('Pomodoro Settings', `
        <div class="form-row">
          <label class="form-label">Work Duration (Minutes)</label>
          <input class="input input-mono" type="number" id="cfg-work" value="${this.config.work}" />
        </div>
        <div class="form-row" style="margin-top:12px;">
          <label class="form-label">Break Duration (Minutes)</label>
          <input class="input input-mono" type="number" id="cfg-break" value="${this.config.break}" />
        </div>
        <button class="btn btn-gold" id="save-pomo-cfg" style="width:100%;margin-top:16px">Save Configuration</button>
      `);

      document.getElementById('save-pomo-cfg').addEventListener('click', async () => {
        const w = parseInt(document.getElementById('cfg-work').value) || 25;
        const b = parseInt(document.getElementById('cfg-break').value) || 5;
        this.config = { work: w, break: b };
        await window.api.setData('pomo-config', this.config);
        App.closeModal();
        this.setMode('work');
        App.toast('Settings Saved');
      });
    });
  }
};