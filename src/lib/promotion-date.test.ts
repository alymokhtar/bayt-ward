import assert from "node:assert/strict";
import test from "node:test";
import { formatPromotionValidity, parseCairoCalendarDate } from "./promotion-date";

test("parses Cairo-local day boundaries with the date-specific timezone offset", () => {
  assert.equal(
    parseCairoCalendarDate("2026-10-02")?.toISOString(),
    "2026-10-01T21:00:00.000Z",
  );
  assert.equal(
    parseCairoCalendarDate("2026-10-02", true)?.toISOString(),
    "2026-10-02T20:59:59.999Z",
  );
  assert.equal(
    parseCairoCalendarDate("2026-01-02")?.toISOString(),
    "2026-01-01T22:00:00.000Z",
  );
  assert.equal(parseCairoCalendarDate("2026-02-30"), null);
});

test("formats a one-day promotion using the Cairo calendar day", () => {
  assert.equal(
    formatPromotionValidity("2026-10-01T21:00:00.000Z", "2026-10-02T20:59:59.999Z"),
    "العرض ساري يوم الجمعة 2-10-2026 فقط",
  );
});

test("formats a multi-day promotion with Arabic weekdays and numeric dates", () => {
  assert.equal(
    formatPromotionValidity("2026-10-02T00:00:00.000Z", "2026-10-03T20:59:59.999Z"),
    "العرض ساري من يوم الجمعة 2-10-2026 وحتى السبت 3-10-2026",
  );
});

test("handles open-ended and missing promotion dates", () => {
  assert.equal(
    formatPromotionValidity("2026-10-02T00:00:00.000Z", null),
    "العرض ساري من يوم الجمعة 2-10-2026",
  );
  assert.equal(formatPromotionValidity(null, null), "العرض ساري حالياً");
});