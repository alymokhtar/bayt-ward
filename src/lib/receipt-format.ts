export function formatReceiptDateTime(date: Date | string) {
  const source =
    typeof date === "string" &&
    !date.endsWith("Z") &&
    !/[+-]\d{2}:\d{2}$/.test(date)
      ? `${date}Z`
      : date;
  const dateObj = date instanceof Date ? date : new Date(source);

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Cairo",
    numberingSystem: "latn",
  }).format(dateObj);
}
