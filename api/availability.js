// Lee el Google Calendar de reservas de la cabaña (feed público en formato iCal)
// y devuelve las noches ocupadas como fechas ISO, para pintarlas en el calendario
// del formulario de reservas. Se ejecuta del lado del servidor porque Google no
// permite leer el feed directamente desde el navegador (CORS).

const CALENDAR_ICS_URL =
  'https://calendar.google.com/calendar/ical/efbca7a2ad9d5916f837a26e8a97a7f2594d532261d3db8ab7c07b15f915de89%40group.calendar.google.com/public/basic.ics';

const MONTHS_AHEAD = 18;

function parseICSDate(value) {
  const datePart = value.slice(0, 8);
  const year = Number(datePart.slice(0, 4));
  const month = Number(datePart.slice(4, 6)) - 1;
  const day = Number(datePart.slice(6, 8));
  return new Date(Date.UTC(year, month, day));
}

function toISODate(date) {
  return date.toISOString().split('T')[0];
}

function extractEvents(icsText) {
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

module.exports = async function handler(req, res) {
  try {
    const response = await fetch(CALENDAR_ICS_URL);
    if (!response.ok) throw new Error(`Calendar fetch failed: ${response.status}`);
    const icsText = await response.text();
    const events = extractEvents(icsText);

    const horizon = new Date();
    horizon.setUTCMonth(horizon.getUTCMonth() + MONTHS_AHEAD);

    const busyNights = new Set();
    for (const { start, end } of events) {
      const cursor = new Date(start);
      while (cursor < end && cursor < horizon) {
        busyNights.add(toISODate(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.status(200).json({ busyNights: Array.from(busyNights).sort() });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ busyNights: [], error: 'No se pudo obtener el calendario de disponibilidad' });
  }
};
