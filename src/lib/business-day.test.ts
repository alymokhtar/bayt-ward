import assert from "node:assert/strict";
import test from "node:test";
import {
  BUSINESS_TIME_ZONE,
  getBusinessDayBoundsForDateKey,
  getBusinessDayBoundsFromDateKeys,
  getEgyptBusinessDateKey,
  getEgyptBusinessDateStamp,
  isValidDateKey,
  normalizeBusinessDateRange,
} from "./business-day";

function cairoDateTime(date: Date): string {
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
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

test("covers the Cairo business day across the start of daylight saving time", () => {
  const { start, end } = getBusinessDayBoundsForDateKey("2026-04-23");

  assert.equal(start.toISOString(), "2026-04-23T01:00:00.000Z");
  assert.equal(end.toISOString(), "2026-04-24T00:00:00.000Z");
  assert.equal((end.getTime() - start.getTime()) / 3_600_000, 23);
  assert.equal(cairoDateTime(start), "2026-04-23 03:00:00");
  assert.equal(cairoDateTime(end), "2026-04-24 03:00:00");
  assert.equal(getEgyptBusinessDateKey(new Date(start.getTime() - 1)), "2026-04-22");
  assert.equal(getEgyptBusinessDateKey(start), "2026-04-23");
  assert.equal(getEgyptBusinessDateKey(new Date(end.getTime() - 1)), "2026-04-23");
  assert.equal(getEgyptBusinessDateKey(end), "2026-04-24");
  assert.equal(getEgyptBusinessDateStamp(new Date(start.getTime() - 1)), "20260422");
  assert.equal(getEgyptBusinessDateStamp(start), "20260423");
});

test("covers the Cairo business day across the end of daylight saving time", () => {
  const { start, end } = getBusinessDayBoundsForDateKey("2026-10-29");

  assert.equal(start.toISOString(), "2026-10-29T00:00:00.000Z");
  assert.equal(end.toISOString(), "2026-10-30T01:00:00.000Z");
  assert.equal((end.getTime() - start.getTime()) / 3_600_000, 25);
  assert.equal(cairoDateTime(start), "2026-10-29 03:00:00");
  assert.equal(cairoDateTime(end), "2026-10-30 03:00:00");
  assert.equal(getEgyptBusinessDateKey(new Date(start.getTime() - 1)), "2026-10-28");
  assert.equal(getEgyptBusinessDateKey(start), "2026-10-29");
  assert.equal(getEgyptBusinessDateKey(new Date(end.getTime() - 1)), "2026-10-29");
  assert.equal(getEgyptBusinessDateKey(end), "2026-10-30");
  assert.equal(getEgyptBusinessDateStamp(new Date(start.getTime() - 1)), "20261028");
  assert.equal(getEgyptBusinessDateStamp(start), "20261029");
});

test("normalizes reversed business date ranges without reversing their UTC bounds", () => {
  const normalized = normalizeBusinessDateRange("2026-10-05", "2026-10-01");
  const { start, end } = getBusinessDayBoundsFromDateKeys(
    "2026-10-05",
    "2026-10-01",
  );
  const expected = getBusinessDayBoundsFromDateKeys("2026-10-01", "2026-10-05");

  assert.deepEqual(normalized, { from: "2026-10-01", to: "2026-10-05" });
  assert.equal(start.getTime(), expected.start.getTime());
  assert.equal(end.getTime(), expected.end.getTime());
  assert.ok(start < end);
});

test("rejects malformed and impossible date keys when normalizing ranges", () => {
  assert.equal(isValidDateKey("2026-10-06"), true);
  assert.equal(isValidDateKey("2026-02-29"), false);
  assert.equal(isValidDateKey("2026-13-01"), false);
  assert.equal(isValidDateKey("06-10-2026"), false);
  assert.deepEqual(
    normalizeBusinessDateRange("2026-02-30", "2026-10-06"),
    { from: undefined, to: "2026-10-06" },
  );
});