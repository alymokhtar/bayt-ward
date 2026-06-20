export const BUSINESS_TIME_ZONE = "Africa/Cairo";

/** Business day starts at 03:00 Cairo and ends at 02:59:59 on the next civil day. */
export const BUSINESS_DAY_START_HOUR = 3;

const EGYPT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
};

function getZonedDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", EGYPT_DATE_FORMAT).formatToParts(
    date
  );

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = getZonedDateParts(date);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return zonedAsUtc - date.getTime();
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
  const firstPass = new Date(utcGuess - getTimeZoneOffsetMs(new Date(utcGuess)));

  return new Date(utcGuess - getTimeZoneOffsetMs(firstPass));
}

function addDaysToDateParts(
  year: number,
  month: number,
  day: number,
  days: number
) {
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function formatDateKey(year: number, month: number, day: number) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

/** Civil calendar date in Egypt (wall-clock), including 00:00–03:59 on the same day. */
export function getEgyptCalendarDateParts(date = new Date()) {
  return getZonedDateParts(date);
}

/** Business date in Egypt — 03:00 → 03:00 Cairo (00:00–02:59 belong to the previous day). */
export function getEgyptBusinessDateParts(date = new Date()) {
  const calendar = getEgyptCalendarDateParts(date);

  if (calendar.hour < BUSINESS_DAY_START_HOUR) {
    const adjusted = addDaysToDateParts(
      calendar.year,
      calendar.month,
      calendar.day,
      -1
    );

    return { ...calendar, ...adjusted };
  }

  return calendar;
}

export function getEgyptCalendarDateKey(date = new Date()) {
  const { year, month, day } = getEgyptCalendarDateParts(date);

  return formatDateKey(year, month, day);
}

export function getEgyptBusinessDateKey(date = new Date()) {
  const { year, month, day } = getEgyptBusinessDateParts(date);

  return formatDateKey(year, month, day);
}

export function getEgyptCalendarDateStamp(date = new Date()) {
  const { year, month, day } = getEgyptCalendarDateParts(date);

  return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return { year, month, day };
}

/** UTC instant for noon on a Cairo calendar day — safe for date-only DB fields. */
export function dateKeyToUtcNoon(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);

  return zonedTimeToUtc(year, month, day, 12);
}

export function getBusinessDayBoundsForDateKey(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  const nextDay = addDaysToDateParts(year, month, day, 1);

  return {
    start: zonedTimeToUtc(year, month, day, BUSINESS_DAY_START_HOUR),
    end: zonedTimeToUtc(
      nextDay.year,
      nextDay.month,
      nextDay.day,
      BUSINESS_DAY_START_HOUR
    ),
  };
}

export function getEgyptBusinessDayBounds(date = new Date()) {
  return getBusinessDayBoundsForDateKey(getEgyptBusinessDateKey(date));
}

export function getBusinessDayBoundsFromDateKeys(from?: string, to?: string) {
  const todayKey = getEgyptBusinessDateKey();
  const { year, month } = getEgyptBusinessDateParts();
  const defaultFrom = formatDateKey(year, month, 1);
  const fromKey = from || defaultFrom;
  const toKey = to || todayKey;
  const fromBounds = getBusinessDayBoundsForDateKey(fromKey);
  const toBounds = getBusinessDayBoundsForDateKey(toKey);

  return {
    start: fromBounds.start,
    end: toBounds.end,
  };
}

export function getEgyptMonthBounds(date = new Date()) {
  const { year, month } = getEgyptCalendarDateParts(date);
  const nextMonth =
    month === 12
      ? { year: year + 1, month: 1, day: 1 }
      : { year, month: month + 1, day: 1 };

  return {
    start: zonedTimeToUtc(year, month, 1, 0),
    end: zonedTimeToUtc(nextMonth.year, nextMonth.month, nextMonth.day, 0),
  };
}

export function formatEgyptChartDateLabel(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  const anchor = zonedTimeToUtc(year, month, day, 12);

  return anchor.toLocaleDateString("ar-EG", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "short",
    day: "numeric",
  });
}

export type ReportPeriod = "today" | "week" | "month" | "custom";

export function getOffsetBusinessDateKey(daysOffset: number, date = new Date()) {
  const businessDate = getEgyptBusinessDateParts(date);
  const offset = addDaysToDateParts(
    businessDate.year,
    businessDate.month,
    businessDate.day,
    daysOffset
  );

  return formatDateKey(offset.year, offset.month, offset.day);
}

export function getReportPeriodRange(period: Exclude<ReportPeriod, "custom">) {
  const today = getEgyptBusinessDateKey();
  const businessDate = getEgyptBusinessDateParts();

  if (period === "today") {
    return { from: today, to: today };
  }

  if (period === "week") {
    return { from: getOffsetBusinessDateKey(-6), to: today };
  }

  return {
    from: formatDateKey(businessDate.year, businessDate.month, 1),
    to: today,
  };
}

export function detectReportPeriod(from: string, to: string): ReportPeriod {
  const presets: Array<Exclude<ReportPeriod, "custom">> = [
    "today",
    "week",
    "month",
  ];

  for (const preset of presets) {
    const range = getReportPeriodRange(preset);
    if (from === range.from && to === range.to) {
      return preset;
    }
  }

  return "custom";
}
