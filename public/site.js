const form = document.querySelector('[data-appointment]');
form?.querySelector('[role=alert]')?.focus();
const storageKey = 'sumukha-appointment-draft';
try {
  const submissionKey = storageKey + '-submitting';
  if (document.querySelector('[data-confirmation]') && sessionStorage.getItem(submissionKey)) {
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(submissionKey);
  }
  if (form) {
    sessionStorage.removeItem(submissionKey);
    const fields = [...form.querySelectorAll('input[name],select[name]')];
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
    if (!form.hasAttribute('data-server-values')) {
      for (const input of fields) {
        if (input.type === 'checkbox') input.checked = saved[input.name] === true;
        else if (typeof saved[input.name] === 'string') {
          if (input.name === 'time') input.dataset.current = saved.time;
          else input.value = saved[input.name];
        }
      }
    }
    const save = () => sessionStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(
      fields.map(input => [input.name, input.type === 'checkbox' ? input.checked : input.value])
    )));
    form.addEventListener('input', save);
    form.addEventListener('submit', () => {
      save();
      sessionStorage.setItem(submissionKey, '1');
    });
    for (const link of document.querySelectorAll('.language a')) link.addEventListener('click', save);
  }
} catch {
  // The form remains usable when the browser blocks session storage.
}

document.addEventListener('click', event => {
  if (!document.documentElement.hasAttribute('data-analytics')) return;
  const href = event.target.closest('a')?.href;
  if (!href) return;
  const url = new URL(href);
  const kind = url.protocol === 'tel:' ? 'phone' : url.hostname === 'wa.me' ? 'whatsapp' : /^(www\.google\.com|maps\.app\.goo\.gl|maps\.google\.com)$/.test(url.hostname) ? 'directions' : '';
  if (kind) navigator.sendBeacon('/activity', new URLSearchParams({ event: kind, locale: document.documentElement.lang }));
});

if (form) {
  const date = form.elements.date;
  const time = form.elements.time;
  let serial = 0;
  async function loadSlots(desired = '') {
    const request = ++serial;
    time.replaceChildren(new Option(time.dataset.empty, ''));
    if (!date.value) return;
    try {
      const response = await fetch('./slots?date=' + encodeURIComponent(date.value));
      if (!response.ok) throw new Error('Availability unavailable');
      const { slots } = await response.json();
      if (request !== serial) return;
      time.replaceChildren(new Option(slots.length ? time.dataset.empty : time.dataset.none, ''), ...slots.map(slot => new Option(slot, slot)));
      if (slots.includes(desired)) time.value = desired;
    } catch {
      if (request === serial) time.replaceChildren(new Option(time.dataset.none, ''));
    }
  }
  date.addEventListener('change', () => loadSlots());
  if (date.value) loadSlots(time.dataset.current);
}
