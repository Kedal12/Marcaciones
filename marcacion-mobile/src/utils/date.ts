// src/utils/date.ts
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('es');

export const BOGOTA_TZ = 'America/Bogota';

export function nowInBogota(): Dayjs {
  return dayjs().tz(BOGOTA_TZ);
}

export function toLocal(value?: string | Date | null): Dayjs | null {
  if (!value) return null;

  let s = typeof value === 'string' ? value : (value as Date).toISOString();

  // recorta microsegundos 7→3
  s = s.replace(
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\d{4}([Zz]|[+-]\d{2}:\d{2})/,
    '$1$2'
  );

  const hasOffset = /([Zz]|[+-]\d{2}:\d{2})$/.test(s);
  try {
    const m = hasOffset ? dayjs(s) : dayjs.utc(s);
    return m.isValid() ? m.tz(BOGOTA_TZ) : null;
  } catch {
    return null;
  }
}

export function parseBackendDate(value?: string | null): Dayjs | null {
  if (!value) return null;
  let s = value.replace(
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.)\d+([Zz]|[+-]\d{2}:\d{2})/,
    (_all, a, b) => a + '000' + b
  );
  s = s.replace(
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\d{4}([Zz]|[+-]\d{2}:\d{2})/,
    '$1$2'
  );
  return toLocal(s);
}

export { dayjs }; // opcional si quieres usar el mismo dayjs configurado

