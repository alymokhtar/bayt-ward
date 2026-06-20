export const BUSINESS_TIME_ZONE = "Africa/Cairo";
export const BUSINESS_DAY_START_HOUR = 4;

function getZonedDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

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

export function getEgyptBusinessDateParts(date = new Date()) {
  const now = getZonedDateParts(date);

  return now.hour < BUSINESS_DAY_START_HOUR
    ? addDaysToDateParts(now.year, now.month, now.day, -1)
    : { year: now.year, month: now.month, day: now.day };
}

export function getEgyptBusinessDateKey(date = new Date()) {
  const businessDate = getEgyptBusinessDateParts(date);

  return formatDateKey(
    businessDate.year,
    businessDate.month,
    businessDate.day
  );
}

export type ReportPeriod = "today" | "week" | "month" | "custom";

function getOffsetBusinessDateKey(daysOffset: number, date = new Date()) {
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

export function getEgyptBusinessDayBounds(date = new Date()) {
  const businessDate = getEgyptBusinessDateParts(date);
  const nextBusinessDate = addDaysToDateParts(
    businessDate.year,
    businessDate.month,
    businessDate.day,
    1
  );

  return {
    start: zonedTimeToUtc(
      businessDate.year,
      businessDate.month,
      businessDate.day,
      BUSINESS_DAY_START_HOUR
    ),
    end: zonedTimeToUtc(
      nextBusinessDate.year,
      nextBusinessDate.month,
      nextBusinessDate.day,
      BUSINESS_DAY_START_HOUR
    ),
  };
}
