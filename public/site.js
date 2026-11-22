document.addEventListener('click', event => {
  if (!document.documentElement.hasAttribute('data-analytics')) return;
  const href = event.target.closest('a')?.href;
  if (!href) return;
  const url = new URL(href);
  const kind = url.protocol === 'tel:' ? 'phone' : url.hostname === 'wa.me' ? 'whatsapp' : /^(www\.google\.com|maps\.app\.goo\.gl|maps\.google\.com)$/.test(url.hostname) ? 'directions' : '';
  if (kind) navigator.sendBeacon('/activity', new URLSearchParams({ event: kind, locale: document.documentElement.lang }));
});
const bookingForm = document.querySelector('[data-appointment]');
const draftKey = 'sumukha-appointment-draft';
if (document.querySelector('[data-confirmation]')) {
  try {
    if (sessionStorage.getItem(draftKey + '-submitting')) {
      sessionStorage.removeItem(draftKey);
      sessionStorage.removeItem(draftKey + '-submitting');
    }
  } catch { /* Browsers may disable session storage. */ }
}
if (bookingForm) startWizard(bookingForm);

function startWizard(form) {
  const find = selector => form.querySelector(selector);
  const all = selector => [...form.querySelectorAll(selector)];
  const input = name => form.elements.namedItem(name);
  const labels = JSON.parse(form.dataset.text);
  const locale = document.documentElement.lang === 'kn' ? 'kn-IN' : 'en-IN';
  const dayName = date => new Intl.DateTimeFormat(locale, {dateStyle:'full', timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
  const timeText = value => new Intl.DateTimeFormat(locale,{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(new Date('2000-01-01T'+value+':00Z'));
  let step = Number(form.dataset.start);
  const fields = all('input[name]');
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey)||'{}');
    if (!form.hasAttribute('data-server-values')) {
      for (const field of fields) {
        if (field.type==='checkbox') field.checked=draft[field.name]===true;
        else if(typeof draft[field.name]==='string') field.value=draft[field.name];
      }
      step = Math.max(1,Math.min(5,Number(draft.step)||1));
      if(form.dataset.preselect && draft.service!==form.dataset.preselect){input('service').value=form.dataset.preselect;step=1;}
    }
    sessionStorage.removeItem(draftKey+'-submitting');
  } catch { /* Continue with the current form values. */ }

  function save() {
    const draft=Object.fromEntries(fields.map(f=>[f.name,f.type==='checkbox'?f.checked:f.value]));
    try {sessionStorage.setItem(draftKey,JSON.stringify({...draft,step}));} catch {}
  }
  let month = (input('date').value || form.dataset.today).slice(0,7);
  let calendarRun=0, slotRun=0, knownTimes=[];
  function chooseService() {
    const buttons=all('[data-service]');
    if(!buttons.some(b=>b.dataset.service===input('service').value)) input('service').value='general';
    for(const b of buttons) b.setAttribute('aria-pressed',String(b.dataset.service===input('service').value));
  }
  function navigate(next, focus=true) {
    step=next;
    for(const panel of all('[data-step]')) panel.hidden=Number(panel.dataset.step)!==step;
    const progress=form.parentElement.querySelectorAll('.bw-progress li');
    progress.forEach((item,index)=>{
      if(index+1===step) item.setAttribute('aria-current','step');
      else item.removeAttribute('aria-current');
      item.classList.toggle('is-complete',index+1<step);
    });
    find('[data-next]').hidden=step===5;
    find('[data-back]').hidden=step===1;
    find('button[type=submit]').hidden=step!==5;
    find('[data-problem]').textContent='';
    if(step===2) renderCalendar();
    if(step===3) loadTimes();
    if(step===5) for(const el of all('[data-review]')) {
      const name=el.dataset.review, val=input(name).value;
      el.textContent=name==='service'?all('[data-service]').find(b=>b.dataset.service===val)?.dataset.title : name==='date'&&val?dayName(val) : name==='time'&&val?timeText(val):val || '—';
    }
    if(focus) find('[data-step="'+step+'"] h2').focus();
    save();
  }
  function neighboringMonth(delta) {
    const [year,num]=month.split('-').map(Number);
    return new Date(Date.UTC(year,num-1+delta,1)).toISOString().slice(0,7);
  }
  async function renderCalendar() {
    const id=++calendarRun, grid=find('[data-days]'), msg=find('[data-calendar-message]');
    const [year,num]=month.split('-').map(Number);
    const first=new Date(Date.UTC(year,num-1,1));
    find('[data-month-title]').textContent=new Intl.DateTimeFormat(locale,{month:'long',year:'numeric',timeZone:'UTC'}).format(first);
    find('[data-month="-1"]').disabled=month<=form.dataset.today.slice(0,7);
    find('[data-month="1"]').disabled=month>=form.dataset.last.slice(0,7);
    find('[data-retry-calendar]').hidden=true;
    grid.replaceChildren();
    msg.textContent=labels.loading;
    try {
      const r=await fetch('./calendar?month='+month);
      if(!r.ok) throw new Error();
      const {days}=await r.json();
      if(id!==calendarRun) return;
      const available=new Set(days);
      for(let i=0;i<7;i++) {
        const header=document.createElement('span');
        header.className='bw-weekday';
        header.textContent=new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2023,0,1+i)));
        grid.append(header);
      }
      for(let i=0;i<first.getUTCDay();i++) grid.append(document.createElement('span'));
      const length=new Date(Date.UTC(year,num,0)).getUTCDate();
      for(let d=1;d<=length;d++){
        const date=month+'-'+String(d).padStart(2,'0');
        const b=document.createElement('button');
        b.type='button'; b.dataset.date=date; b.textContent=String(d);
        b.disabled=!available.has(date);
        b.setAttribute('aria-label',dayName(date)+(b.disabled?' · '+labels.unavailable:''));
        b.setAttribute('aria-pressed',String(!b.disabled&&date===input('date').value));
        grid.append(b);
      }
      if(input('date').value.startsWith(month)&&!available.has(input('date').value)) {
        input('date').value='';input('time').value='';save();
      }
      msg.textContent=days.length?'':labels.noDates;
    } catch {
      if(id===calendarRun){msg.textContent=labels.retry;find('[data-retry-calendar]').hidden=false;}
    }
  }
  async function loadTimes() {
    const id=++slotRun,date=input('date').value,holder=find('[data-times]'),msg=find('[data-slot-message]');
    holder.replaceChildren();knownTimes=[];
    find('[data-retry-time]').hidden=true;
    if(!date) {msg.textContent=labels.selectDate;return;}
    find('[data-chosen-date]').textContent=dayName(date);
    msg.textContent=labels.loading;
    try {
      const r=await fetch('./slots?date='+date);
      if(!r.ok) throw new Error();
      const {slots}=await r.json();
      if(id!==slotRun) return;
      knownTimes=slots;
      if(!slots.includes(input('time').value)) input('time').value='';
      for(const value of slots){
        const b=document.createElement('button');
        b.type='button';b.dataset.slot=value;b.textContent=timeText(value);
        b.setAttribute('aria-pressed',String(input('time').value===value));holder.append(b);
      }
      msg.textContent=slots.length?'':labels.noTimes;save();
    } catch {
      if(id===slotRun){msg.textContent=labels.retry;find('[data-retry-time]').hidden=false;}
    }
  }
  function validStep() {
    const msg=find('[data-problem]');
    msg.textContent='';
    if(step===2&&!input('date').value) {msg.textContent=labels.selectDate;return false;}
    if(step===3&&!knownTimes.includes(input('time').value)){msg.textContent=labels.selectTime;return false;}
    if(step===4) {
      const checks=[
        ['name',input('name').value.trim().length>0,labels.required],
        ['phone',/^(?:\+91)?[6-9]\d{9}$/.test(input('phone').value.replace(/[\s()-]/g,'')),labels.invalidPhone],
        ['email',input('email').validity.valid,labels.invalidEmail],
        ['consent',input('consent').checked,labels.needConsent]
      ];
      let first;
      for(const [name,ok,message] of checks){
        const field=input(name);let err=find('#'+name+'-error');
        if(!err){err=document.createElement('span');err.id=name+'-error';err.className='field-error';field.closest('label').after(err);}
        err.textContent=ok?'':message;
        if(ok){field.removeAttribute('aria-invalid');field.removeAttribute('aria-describedby');}
        else{field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',err.id);first ||= field;}
      }
      if(first){first.focus();return false;}
    }
    return true;
  }
  form.addEventListener('click',event=>{
    const b=event.target.closest('button');
    if(!b)return;
    if(b.hasAttribute('data-service')){input('service').value=b.dataset.service;chooseService();}
    if(b.hasAttribute('data-month')){month=neighboringMonth(Number(b.dataset.month));renderCalendar();}
    if(b.hasAttribute('data-retry-calendar'))renderCalendar();
    if(b.hasAttribute('data-retry-time'))loadTimes();
    if(b.dataset.date){
      if(input('date').value!==b.dataset.date) input('time').value='';
      input('date').value=b.dataset.date;
      for(const day of all('[data-date]'))day.setAttribute('aria-pressed',String(day===b));
    }
    if(b.dataset.slot){
      input('time').value=b.dataset.slot;
      for(const slot of all('[data-slot]'))slot.setAttribute('aria-pressed',String(slot===b));
    }
    if(b.hasAttribute('data-next')&&validStep())navigate(step+1);
    if(b.hasAttribute('data-back'))navigate(step-1);
    save();
  });
  find('[data-days]').addEventListener('keydown',event=>{
    const button=event.target.closest('[data-date]');
    if(!button)return;
    const dates=all('[data-date]');
    const index=dates.indexOf(button);
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
    if(event.key==='Home'||event.key==='End'){
      event.preventDefault();
      const enabled=dates.filter(item=>!item.disabled);
      (event.key==='Home'?enabled[0]:enabled.at(-1))?.focus();
    }else if(delta){
      event.preventDefault();
      for(let i=index+delta;i>=0&&i<dates.length;i+=delta){
        if(!dates[i].disabled){dates[i].focus();break;}
      }
    }
  });
  form.addEventListener('input',save);
  form.addEventListener('submit',e=>{
    if(step!==5){e.preventDefault();if(validStep())navigate(step+1);return;}
    save();
    try{sessionStorage.setItem(draftKey+'-submitting','1');}catch{}
  });
  document.querySelectorAll('.language a').forEach(link=>link.addEventListener('click',save));
  chooseService();
  navigate(step,false);
}
