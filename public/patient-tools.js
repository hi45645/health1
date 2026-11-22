// @ts-check
(() => {
  const field = document.querySelector('[data-treatment-search]');
  if (field instanceof HTMLInputElement) {
    field.closest('[data-treatment-search-shell]')?.removeAttribute('hidden');
    const cards = Array.from(document.querySelectorAll('[data-treatment-card]'));
    const empty = document.querySelector('[data-search-empty]');
    const normalize = (/** @type {string} */ value) => value.normalize('NFC').trim().toLocaleLowerCase(document.documentElement.lang);
    field.addEventListener('input', () => {
      const query = normalize(field.value);
      let visible = 0;
      for (const card of cards) {
        const match = normalize(card.textContent || '').includes(query);
        card.toggleAttribute('hidden', !match);
        if (match) visible++;
      }
      empty?.toggleAttribute('hidden', visible > 0);
    });
  }

  const photos = [...document.querySelectorAll('a[data-gallery-view]')].filter(
    (link) => link instanceof HTMLAnchorElement && link.querySelector('img')
  );
  if (!photos.length || typeof HTMLDialogElement === 'undefined') return;
  const kn = document.documentElement.lang === 'kn';
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-dialog';
  dialog.setAttribute('aria-label', kn ? 'ಕ್ಲಿನಿಕ್ ಚಿತ್ರಗಳು' : 'Clinic photographs');
  const nav = document.createElement('div');
  nav.className = 'photo-controls';
  const photo = document.createElement('img');
  const caption = document.createElement('p');
  caption.setAttribute('aria-live', 'polite');
  let current = 0;
  function show(/** @type {number} */ index) {
    current = (index + photos.length) % photos.length;
    const link = photos[current];
    if (!(link instanceof HTMLAnchorElement)) return;
    photo.src = link.href;
    photo.alt = link.querySelector('img')?.alt || '';
    caption.textContent = photo.alt;
  }
  function control(/** @type {string} */ label, /** @type {() => void} */ action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    nav.append(button);
  }
  control(kn ? 'ಮುಚ್ಚಿ' : 'Close', () => dialog.close());
  if (photos.length > 1) {
    control(kn ? 'ಹಿಂದಿನ ಚಿತ್ರ' : 'Previous photo', () => show(current - 1));
    control(kn ? 'ಮುಂದಿನ ಚಿತ್ರ' : 'Next photo', () => show(current + 1));
  }
  dialog.append(nav, photo, caption);
  document.body.append(dialog);
  photos.forEach((link, index) => link.addEventListener('click', event => {
    if (!(event instanceof MouseEvent) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    show(index);
    dialog.showModal();
  }));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });
})();
