// Lee el Google Calendar de reservas de la cabaña y devuelve las noches
// ocupadas como fechas ISO, para pintarlas en el calendario del formulario
// de reservas. Se ejecuta del lado del servidor porque Google no permite
// leer el calendario directamente desde el navegador (CORS).
//
// Modo preferido: Google Calendar API (variable de entorno GOOGLE_CALENDAR_API_KEY)
// — refleja cambios en segundos, sin caché de Google.
// Modo de respaldo: feed público en formato iCal — más simple, pero Google
// puede tardar minutos u horas en reflejar cambios ahí, así que solo se usa
// si todavía no se configuró la API key.

const CALENDAR_ID = 'efbca7a2ad9d5916f837a26e8a97a7f2594d532261d3db8ab7c07b15f915de89@group.calendar.google.com';
const CALENDAR_ICS_URL =
  'https://calendar.google.com/calendar/ical/efbca7a2ad9d5916f837a26e8a97a7f2594d532261d3db8ab7c07b15f915de89%40group.calendar.google.com/public/basic.ics';

const MONTHS_AHEAD = 18;

function toISODate(date) {
  return date.toISOString().split('T')[0];
}

function addBusyRange(busyNights, start, end, horizon) {
  // Si el evento no abarca más de un día (ej. evento con hora, no "todo el día"),
  // marcamos igual ese día como ocupado en vez de un rango vacío.
  const effectiveEnd = end > start ? end : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
  const cursor = new Date(start);
  while (cursor < effectiveEnd && cursor < horizon) {
    busyNights.add(toISODate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

// ===== Modo API (tiempo real) =====
async function fetchBusyNightsFromApi(apiKey, horizon) {
  const timeMin = new Date().toISOString();
  const timeMax = horizon.toISOString();
  const busyNights = new Set();
  let pageToken = '';

  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('maxResults', '2500');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Calendar API fetch failed: ${response.status}`);
    const data = await response.json();

    for (const event of data.items || []) {
      const startRaw = event.start && (event.start.date || event.start.dateTime);
      const endRaw = event.end && (event.end.date || event.end.dateTime);
      if (!startRaw || !endRaw) continue;
      const start = new Date(startRaw.slice(0, 10));
      const end = new Date(endRaw.slice(0, 10));
      addBusyRange(busyNights, start, end, horizon);
    }

    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return busyNights;
}

// ===== Modo iCal (respaldo, con demora de Google) =====
function parseICSDate(value) {
  const datePart = value.slice(0, 8);
  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6)) - 1;
  const day = Number(datePart.slice(6, 8));
  return new Date(Date.UTC(year, month, day));
}

function extractIcsEvents(icsText) {
  const events = [];
  const blocks = icsText.split('BEGIN:VEVENT').slice(1);
  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0];
    const startMatch = body.match(/DTSTART[^:\r\n]*:([\dTZ]+)/);
    const endMatch = body.match(/DTEND[^:\r\n]*:([\dTZ]+)/);
    if (!startMatch || !endMatch) continue;
    events.push({ start: parseICSDate(startMatch[1]), end: parseICSDate(endMatch[1]) });
  }
  return events;
}

async function fetchBusyNightsFromIcs(horizon) {
  const response = await fetch(CALENDAR_ICS_URL);
  if (!response.ok) throw new Error(`Calendar fetch failed: ${response.status}`);
  const icsText = await response.text();
  const events = extractIcsEvents(icsText);

  const busyNights = new Set();
  for (const { start, end } of events) addBusyRange(busyNights, start, end, horizon);
  return busyNights;
}

module.exports = async function handler(req, res) {
  const horizon = new Date();
  horizon.setUTCMonth(horizon.getUTCMonth() + MONTHS_AHEAD);

  try {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    const busyNights = apiKey ? await fetchBusyNightsFromApi(apiKey, horizon) : await fetchBusyNightsFromIcs(horizon);

    res.setHeader('Cache-Control', apiKey ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=60');
    res.status(200).json({ busyNights: Array.from(busyNights).sort() });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ busyNights: [], error: 'No se pudo obtener el calendario de disponibilidad' });
  }
};
