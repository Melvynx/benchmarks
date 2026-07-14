const cityData = [
  { id: 'london', name: 'London', country: 'United Kingdom', zone: 'Europe/London', initials: 'LO', avatar: 'avatar-london', workingStart: 8, workingEnd: 18, selected: true },
  { id: 'newyork', name: 'New York', country: 'United States', zone: 'America/New_York', initials: 'NY', avatar: 'avatar-newyork', workingStart: 8, workingEnd: 18, selected: true },
  { id: 'sf', name: 'San Francisco', country: 'United States', zone: 'America/Los_Angeles', initials: 'SF', avatar: 'avatar-sf', workingStart: 8, workingEnd: 17, selected: true },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', zone: 'Asia/Tokyo', initials: 'TK', avatar: 'avatar-tokyo', workingStart: 9, workingEnd: 18, selected: false },
];

let selectedDate = new Date('2026-06-16T12:00:00Z');
let showAllWindows = false;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function getTimeZoneOffset(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(date);
  const offsetPart = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT';
  if (offsetPart === 'GMT') return 0;
  const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
  return match[1] === '+' ? minutes : -minutes;
}

function formatTime(date, timeZone, options = {}) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', ...options }).format(date);
}

function formatZoneOffset(date, timeZone) {
  const minutes = getTimeZoneOffset(date, timeZone);
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  return `UTC${sign}${Math.floor(absolute / 60)}${absolute % 60 ? `:${String(absolute % 60).padStart(2, '0')}` : ''}`;
}

function getUtcHourForLocal(date, zone, localHour) {
  const offset = getTimeZoneOffset(date, zone);
  return localHour - offset / 60;
}

function normalizeHour(hour) { return ((hour % 24) + 24) % 24; }
function getSelectedCities() { return cityData.filter((city) => city.selected); }

function renderCityList() {
  $('#city-list').innerHTML = cityData.map((city) => `<button class="city-item ${city.selected ? 'is-selected' : 'is-off'}" data-city-id="${city.id}" type="button" aria-pressed="${city.selected}"><span class="city-toggle" aria-hidden="true"></span><span class="city-status" aria-hidden="true"></span><span class="city-data"><strong>${city.name}</strong><span>${formatZoneOffset(selectedDate, city.zone)} · ${city.country}</span></span><span class="city-local-time">${formatTime(selectedDate, city.zone)}</span></button>`).join('');
  $('#city-count').textContent = `${getSelectedCities().length}/${cityData.length}`;
  $$('.city-item').forEach((item) => item.addEventListener('click', () => {
    const city = cityData.find((entry) => entry.id === item.dataset.cityId);
    city.selected = !city.selected;
    if (!getSelectedCities().length) city.selected = true;
    renderCityList(); renderTimeline(); renderAvailability();
  }));
}

function getOverlap() {
  const cities = getSelectedCities();
  if (!cities.length) return null;
  const starts = cities.map((city) => getUtcHourForLocal(selectedDate, city.zone, city.workingStart));
  const ends = cities.map((city) => getUtcHourForLocal(selectedDate, city.zone, city.workingEnd));
  const rawStart = Math.max(...starts);
  const rawEnd = Math.min(...ends);
  return { start: normalizeHour(rawStart), end: normalizeHour(rawEnd), rawStart, rawEnd, cities };
}

function formatHour(hour) {
  const normalized = normalizeHour(hour);
  const whole = Math.floor(normalized);
  const minutes = Math.round((normalized - whole) * 60);
  return `${whole % 12 || 12}:${String(minutes).padStart(2, '0')} ${whole >= 12 ? 'PM' : 'AM'}`;
}

function formatHourShort(hour) {
  const whole = Math.floor(normalizeHour(hour));
  return `${whole % 12 || 12} ${whole >= 12 ? 'PM' : 'AM'}`;
}

function updateInsight() {
  const overlap = getOverlap();
  if (overlap && overlap.rawEnd > overlap.rawStart) {
    $('#best-window').textContent = `${formatHour(overlap.rawStart)} – ${formatHour(overlap.rawEnd)} UTC`;
    $('#best-window-copy').textContent = `A clean ${Math.round(overlap.rawEnd - overlap.rawStart)}-hour window for ${overlap.cities.length} ${overlap.cities.length === 1 ? 'city' : 'cities'}`;
  } else {
    $('#best-window').textContent = 'No full-team overlap';
    $('#best-window-copy').textContent = 'Try removing a city or expanding working hours';
  }
  $('#local-time').textContent = formatTime(new Date(), 'Europe/Kiev');
}

function renderTimeline() {
  updateInsight();
  const grid = $('#timeline-grid');
  const overlap = getOverlap();
  const labels = Array.from({ length: 12 }, (_, index) => index * 2);
  const labelMarkup = '<div class="time-corner"></div>' + labels.map((hour) => `<div class="time-label">${formatHourShort(hour)}</div>`).join('');
  const rowsMarkup = cityData.map((city) => {
    const start = getUtcHourForLocal(selectedDate, city.zone, city.workingStart);
    const end = getUtcHourForLocal(selectedDate, city.zone, city.workingEnd);
    const width = Math.max(end - start, .5) / 24 * 100;
    const left = start / 24 * 100;
    return `<div class="grid-row"><div class="city-label-cell"><span class="city-avatar ${city.avatar}">${city.initials}</span><div><strong>${city.name}</strong><span>${formatZoneOffset(selectedDate, city.zone)} · ${city.workingStart}:00–${city.workingEnd}:00</span></div></div><div class="grid-track" style="grid-column:2 / span 12"><div class="work-block ${city.id}" style="left:${left}%;width:${width}%"><span class="block-label">${city.workingStart}:00–${city.workingEnd}:00 local</span></div></div></div>`;
  }).join('');
  const overlapMarkup = overlap && overlap.rawEnd > overlap.rawStart ? `<div class="grid-row"><div class="overlap-label"><strong>Shared</strong>&nbsp; · ${Math.round(overlap.rawEnd - overlap.rawStart)}h of overlap</div><div class="grid-track" style="grid-column:2 / span 12"><div class="overlap-block" style="left:${overlap.rawStart / 24 * 100}%;width:${(overlap.rawEnd - overlap.rawStart) / 24 * 100}%">${formatHour(overlap.rawStart)}–${formatHour(overlap.rawEnd)}</div></div></div>` : '';
  const now = new Date();
  const nowHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  grid.innerHTML = labelMarkup + rowsMarkup + overlapMarkup + `<div class="current-line" style="left:calc(166px + (100% - 166px) * ${nowHour / 24})"><span>now</span></div>`;
}

function renderAvailability() {
  const overlap = getOverlap();
  const list = $('#availability-list');
  if (!overlap || overlap.rawEnd <= overlap.rawStart) { list.innerHTML = '<div class="empty-state">No shared window yet. Select fewer cities or adjust a workday.</div>'; return; }
  const windows = [
    { start: overlap.rawStart, end: overlap.rawEnd, tag: 'Best fit', meta: 'Everyone online · 3 cities' },
    { start: overlap.rawStart + .5, end: Math.min(overlap.rawStart + 1.25, overlap.rawEnd), tag: 'Quick sync', meta: 'Leaves breathing room on both sides' },
    { start: Math.max(overlap.rawStart, overlap.rawEnd - .75), end: overlap.rawEnd, tag: 'Late option', meta: 'Works if the day runs long' },
  ];
  list.innerHTML = (showAllWindows ? windows : windows.slice(0, 2)).map((window) => `<button class="availability-row" type="button" data-start="${window.start}" data-end="${window.end}"><span class="availability-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg></span><span><strong class="availability-time">${formatHour(window.start)} – ${formatHour(window.end)}</strong><span class="availability-meta">${window.meta}</span></span><span class="row-tag">${window.tag}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>`).join('');
  $$('.availability-row').forEach((row) => row.addEventListener('click', () => showToast(`Window selected · ${formatHour(Number(row.dataset.start))} UTC`)));
}

function updateDateDisplay() {
  $('#date-display span').textContent = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric', timeZone:'UTC' }).format(selectedDate);
  renderCityList(); renderTimeline(); renderAvailability();
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timeout); showToast.timeout = window.setTimeout(() => toast.classList.remove('show'), 2500); }
function openModal() { $('#modal-backdrop').hidden = false; window.setTimeout(() => $('#member-name').focus(), 0); }
function closeModal() { $('#modal-backdrop').hidden = true; }

$('#previous-day').addEventListener('click', () => { selectedDate.setUTCDate(selectedDate.getUTCDate() - 1); updateDateDisplay(); });
$('#next-day').addEventListener('click', () => { selectedDate.setUTCDate(selectedDate.getUTCDate() + 1); updateDateDisplay(); });
$('#today-button').addEventListener('click', () => { selectedDate = new Date(); selectedDate.setUTCHours(12, 0, 0, 0); updateDateDisplay(); showToast('Jumped to today'); });
$('#use-window').addEventListener('click', () => showToast('Best overlap copied to your clipboard'));
$('#share-button').addEventListener('click', () => showToast('Share link copied to clipboard'));
$('#show-more').addEventListener('click', (event) => { showAllWindows = !showAllWindows; event.currentTarget.firstChild.textContent = showAllWindows ? 'Show fewer windows ' : 'Show more windows '; renderAvailability(); });
$('#add-city').addEventListener('click', () => showToast('City search is ready for your next teammate'));
$('#add-member').addEventListener('click', openModal); $('#modal-close').addEventListener('click', closeModal); $('#modal-backdrop').addEventListener('click', (event) => { if (event.target === $('#modal-backdrop')) closeModal(); });
$('#save-member').addEventListener('click', () => { const name = $('#member-name').value.trim() || 'New teammate'; closeModal(); showToast(`${name} added to your planner`); });
$$('.duration-row button').forEach((button) => button.addEventListener('click', () => { $$('.duration-row button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); showToast(`${button.textContent} windows updated`); }));
$$('.toggle-button').forEach((button) => button.addEventListener('click', () => { $$('.toggle-button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); showToast(`${button.textContent} view selected`); }));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });

renderCityList(); renderTimeline(); renderAvailability();
setInterval(() => { $('#local-time').textContent = formatTime(new Date(), 'Europe/Kiev'); }, 30000);
