import assert from "node:assert/strict";
import test from "node:test";
import { BUSINESS_TIME_ZONE } from "@/lib/business-day";
import { DISPLAY_LOCALE } from "@/lib/constants";
import { formatCairoDateTime } from "@/lib/utils";

test("formats printable invoice timestamps in Cairo time", () => {
  const value = new Date("2024-01-01T00:30:00.000Z");
  const expected = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(value);

  assert.equal(formatCairoDateTime(value), expected);
});
