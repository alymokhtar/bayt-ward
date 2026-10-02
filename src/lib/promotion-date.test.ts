import assert from "node:assert/strict";
import test from "node:test";
import { formatPromotionValidity } from "./promotion-date";

test("formats a one-day promotion using the Cairo calendar day", () => {
  assert.equal(
    formatPromotionValidity("2026-10-02T00:00:00.000Z", "2026-10-02T20:59:59.999Z"),
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