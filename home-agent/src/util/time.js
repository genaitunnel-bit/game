// 時刻まわりのユーティリティ。すべて「家のタイムゾーンでの壁時計」で考える。
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const cache = new Map();
function formatter(timezone) {
  if (!cache.has(timezone)) {
    cache.set(
      timezone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        hour12: false,
      })
    );
  }
  return cache.get(timezone);
}

/** 指定時刻を家のタイムゾーンの壁時計に分解する。 */
export function localParts(date, timezone = 'Asia/Tokyo') {
  const parts = {};
  for (const p of formatter(timezone).formatToParts(date)) parts[p.type] = p.value;
  const hour = Number(parts.hour) % 24; // 24:00 表記対策
  const minute = Number(parts.minute);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute,
    minutes: hour * 60 + minute,
    dow: parts.weekday.toLowerCase().slice(0, 3),
    dowIndex: DOW.indexOf(parts.weekday.toLowerCase().slice(0, 3)),
  };
}

/** "07:30" → 450。不正な値は null。 */
export function parseClock(text) {
  if (typeof text !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 450 → "07:30" */
export function formatClock(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** "2026-09-20" を n 日ずらす。 */
export function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** 日付文字列の曜日（'mon' など）。 */
export function dowOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** 1970-01-01 からの日数。interval スケジュールの基準に使う。 */
export function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** 静かにしていてほしい時間帯か（from > to の日跨ぎに対応）。 */
export function inQuietHours(minutes, quiet) {
  if (!quiet) return false;
  const from = parseClock(quiet.from);
  const to = parseClock(quiet.to);
  if (from == null || to == null) return false;
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

export { DOW };
