Modules.calendar = {
  currentDate: new Date(), selectedDate: null,
  async render(container) {
    const events = await window.api.getData('calendar');
    this.selectedDate = this.selectedDate || new Date().toDateString();
    container.innerHTML = `${Utils.modHead('Calendar', 'Calendar', '')}<div class="cal-layout"><div class="cal-grid" id="cal-grid"></div><div class="cal-sidebar"><div class="cal-day-events" id="cal-day"></div><div class="add-event-form" id="cal-add"></div></div></div>`;

    const renderCal = () => {
      const year=this.currentDate.getFullYear(), month=this.currentDate.getMonth();
      const today=new Date();
      const firstDay=new Date(year,month,1), daysInMonth=new Date(year,month+1,0).getDate();
      const startDow=firstDay.getDay(), prevDays=new Date(year,month,0).getDate();
      const monthName=firstDay.toLocaleDateString('en-US',{month:'long',year:'numeric'});

      let cells='';
      for(let i=startDow-1;i>=0;i--) cells+=`<div class="cal-cell other-month"><span class="cal-date">${prevDays-i}</span></div>`;
      for(let d=1;d<=daysInMonth;d++){
        const dateStr=new Date(year,month,d).toDateString();
        const isToday=new Date(year,month,d).toDateString()===today.toDateString();
        const evts=events.filter(e=>e.date===dateStr);
        cells+=`<div class="cal-cell ${isToday?'today':''} ${dateStr===this.selectedDate?'selected':''}" data-date="${dateStr}">
          <span class="cal-date">${d}</span>
          <div class="cal-events">${evts.slice(0,3).map(e=>`<div class="cal-evt-dot">${Utils.truncate(e.title,12)}</div>`).join('')}${evts.length>3?`<div class="cal-evt-dot">+${evts.length-3}</div>`:''}</div>
        </div>`;
      }
      const rem=42-startDow-daysInMonth; for(let d=1;d<=rem;d++) cells+=`<div class="cal-cell other-month"><span class="cal-date">${d}</span></div>`;

      document.getElementById('cal-grid').innerHTML=`
        <div class="cal-nav">
          <button class="btn-icon" id="cal-prev">‹</button>
          <span class="cal-month-label">${monthName}</span>
          <button class="btn-icon" id="cal-next">›</button>
        </div>
        <div class="cal-days-hdr">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="cal-day-name">${d}</div>`).join('')}</div>
        <div class="cal-cells">${cells}</div>`;

      document.getElementById('cal-prev').addEventListener('click',()=>{ this.currentDate=new Date(year,month-1,1); renderCal(); });
      document.getElementById('cal-next').addEventListener('click',()=>{ this.currentDate=new Date(year,month+1,1); renderCal(); });
      document.querySelectorAll('.cal-cell[data-date]').forEach(c=>c.addEventListener('click',()=>{ this.selectedDate=c.dataset.date; renderCal(); renderDay(); }));
    };

    const renderDay = () => {
      const dateObj=new Date(this.selectedDate);
      const label=dateObj.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
      const dayEvts=events.filter(e=>e.date===this.selectedDate);
      document.getElementById('cal-day').innerHTML=`
        <div class="cal-day-label">${label}</div>
        ${dayEvts.length?dayEvts.map(e=>`
          <div class="cal-event-item" data-id="${e.id}">
            <div class="cal-event-dot"></div>
            <span style="flex:1">${e.title}</span>
            <button class="btn-icon danger" data-action="del" data-id="${e.id}">✕</button>
          </div>`).join(''):`<div style="color:var(--text-muted);font-size:11px;padding:6px 0">No events</div>`}`;
      document.getElementById('cal-add').innerHTML=`
        <div class="section-label" style="margin-top:0">Add Event</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <input class="input" id="evt-title" placeholder="Event title…" />
          <button class="btn btn-gold" id="add-evt">Add to ${dateObj.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</button>
        </div>`;
      document.getElementById('add-evt').addEventListener('click', async ()=>{
        const title=document.getElementById('evt-title').value.trim(); if(!title) return;
        events.push({id:Utils.uid(),date:this.selectedDate,title});
        await window.api.setData('calendar',events); renderCal(); renderDay(); App.toast('Event added');
      });
      document.getElementById('evt-title').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('add-evt').click(); });
      document.getElementById('cal-day').addEventListener('click', async e=>{
        const btn=e.target.closest('[data-action="del"]'); if(!btn) return;
        const idx=events.findIndex(e=>e.id===btn.dataset.id); events.splice(idx,1);
        await window.api.setData('calendar',events); renderCal(); renderDay();
      });
    };

    renderCal(); renderDay();
  },
};
