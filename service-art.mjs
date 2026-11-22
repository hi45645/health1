// Decorative line drawings for treatments that do not have a published clinic photograph.
const tooth = '<path d="M49 29c-8-7-22-4-23 8-1 11 5 18 7 31 1 8 6 10 9 2l4-13c1-4 5-4 6 0l5 14c2 7 7 5 8-3 1-12 8-22 7-32-1-11-14-13-23-7z"/>';
const sparkle = '<path d="m72 17 2 7 6 2-6 2-2 7-2-7-6-2 6-2z"/>';
const art = {
  consultation: tooth + '<g transform="rotate(38 76 53)"><ellipse cx="76" cy="43" rx="10" ry="13" fill="#d2eee6"/><path d="M76 56v27m-2-20h4"/></g>',
  cleaning: tooth + sparkle + '<path d="m79 70-9-9c-4-4-4-8 0-11l6-5m3 25 7 7m-7-32 4-4"/>',
  fillings: tooth + '<path d="M40 31q5 4 10 3t11-3m-21 1 4 9 6-2 5 2 5-9" fill="#8dd2bc"/><path d="m72 22 8-8m-5 11 8-8"/>',
  'root-canal': tooth + '<path d="M44 32q1 10 4 13l-9 22m11-23 11 23M50 45l5-15" stroke="#388a77"/><path d="m53 32 4-20 4 1-5 20" fill="#c7e9dd"/>',
  crowns: '<path d="M27 53q7-9 14-7l8 3 9-3q8-2 14 7l-6 19q-2 6-5 0l-8-14q-3-6-6 0l-8 14q-3 8-5 0z"/><path d="M27 36q-2-16 12-16 6 0 11 4 8-5 15-3 10 3 9 15l-3 7q-9-6-17-1l-4 2-5-2q-9-5-16 0z" fill="#afdfcd"/><path d="M26 47h49" stroke-dasharray="2 5"/>',
  extraction: tooth + '<g transform="rotate(20 64 49)"><path d="M73 19q-9 9-3 20l10 20q3 7 0 18m-13-57q-9 18 4 26l9 6q7 5 9 16"/><circle cx="73" cy="43" r="2.5" fill="#81c2ad"/></g>'
};

export function serviceArt(slug) {
  const drawing = Object.hasOwn(art,slug) ? art[slug] : tooth + sparkle;
  return `<svg class="service-illustration" viewBox="0 0 108 92" width="130" height="110" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="55" cy="78" rx="28" ry="3" fill="#397f6f" opacity=".12"/>
    <g stroke="#236b5e" fill="#f8fffc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${drawing}</g>
  </svg>`;
}
