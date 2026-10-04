export type PromotionDateValue = Date | string | null | undefined;

const CAIRO_TIME_ZONE = "Africa/Cairo";

export function getCairoDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getCairoOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const zonedAsUtc = Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    getPart("hour"),
    getPart("minute"),
    getPart("second"),
  );

  return zonedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function parseCairoCalendarDate(value: string, endOfDay = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const dateOnly = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(dateOnly.getTime()) || dateOnly.toISOString().slice(0, 10) !== value) {
    return null;
  }

  const utcGuess = Date.UTC(
    dateOnly.getUTCFullYear(),
    dateOnly.getUTCMonth(),
    dateOnly.getUTCDate(),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  const firstPass = new Date(utcGuess - getCairoOffsetMs(new Date(utcGuess)));
  const result = new Date(utcGuess - getCairoOffsetMs(firstPass));

  return getCairoDateString(result) === value ? result : null;
}

type CairoDateParts = {
  weekday: string;
  day: number;
  month: number;
  year: number;
};

function getCairoDateParts(value: Date | string): CairoDateParts | null {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    timeZone: CAIRO_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const weekday = getPart("weekday");
  const day = Number(getPart("day"));
  const month = Number(getPart("month"));
  const year = Number(getPart("year"));

  if (!weekday || !Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }

  return { weekday, day, month, year };
}

function formatDay(parts: CairoDateParts): string {
  return `${parts.weekday} ${parts.day}-${parts.month}-${parts.year}`;
}

export function formatPromotionValidity(
  startDate: PromotionDateValue,
  endDate: PromotionDateValue,
): string {
  const startValue = startDate == null
    ? null
    : startDate instanceof Date ? startDate : new Date(startDate);
  const endValue = endDate == null
    ? null
    : endDate instanceof Date ? endDate : new Date(endDate);
  const start = startValue == null ? null : getCairoDateParts(startValue);
  const end = endValue == null ? null : getCairoDateParts(endValue);

  if (start && end && startValue && endValue) {
    if (getCairoDateString(startValue) === getCairoDateString(endValue)) {
      return `العرض ساري يوم ${formatDay(start)} فقط`;
    }

    return `العرض ساري من يوم ${formatDay(start)} وحتى ${formatDay(end)}`;
  }

  if (start) return `العرض ساري من يوم ${formatDay(start)}`;
  if (end) return `العرض ساري حتى ${formatDay(end)}`;
  return "العرض ساري حالياً";
}