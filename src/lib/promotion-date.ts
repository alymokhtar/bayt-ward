export type PromotionDateValue = Date | string | null | undefined;

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
    timeZone: "Africa/Cairo",
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

function getCalendarDayKey(parts: CairoDateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function formatPromotionValidity(
  startDate: PromotionDateValue,
  endDate: PromotionDateValue,
): string {
  const start = startDate == null ? null : getCairoDateParts(startDate);
  const end = endDate == null ? null : getCairoDateParts(endDate);

  if (start && end) {
    if (getCalendarDayKey(start) === getCalendarDayKey(end)) {
      return `العرض ساري يوم ${formatDay(start)} فقط`;
    }

    return `العرض ساري من يوم ${formatDay(start)} وحتى ${formatDay(end)}`;
  }

  if (start) return `العرض ساري من يوم ${formatDay(start)}`;
  if (end) return `العرض ساري حتى ${formatDay(end)}`;
  return "العرض ساري حالياً";
}