import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSalesChannelAnalytics,
  buildSalesChannelTrend,
  getSalesChannelWhere,
} from "./sales-analytics";

test("builds the matching sales query filter for ALL, POS, and ONLINE", () => {
  assert.deepEqual(getSalesChannelWhere("ALL"), {});
  assert.deepEqual(getSalesChannelWhere("POS"), { channel: "POS" });
  assert.deepEqual(getSalesChannelWhere("ONLINE"), { channel: "ONLINE" });
});

test("aggregates revenue, order count, AOV, and revenue share by sales channel", () => {
  const analytics = buildSalesChannelAnalytics([
    { channel: "POS", revenue: 600, orders: 3 },
    { channel: "ONLINE", revenue: 400, orders: 2 },
  ]);

  assert.deepEqual(analytics.total, {
    revenue: 1000,
    orders: 5,
    averageOrderValue: 200,
  });
  assert.deepEqual(analytics.channels.POS, {
    channel: "POS",
    revenue: 600,
    orders: 3,
    averageOrderValue: 200,
  });
  assert.deepEqual(analytics.channels.ONLINE, {
    channel: "ONLINE",
    revenue: 400,
    orders: 2,
    averageOrderValue: 200,
  });
  assert.deepEqual(analytics.revenueMix.map(({ channel, share }) => ({ channel, share })), [
    { channel: "POS", share: 0.6 },
    { channel: "ONLINE", share: 0.4 },
  ]);
});

test("returns zero-valued metrics when a sales channel has no orders", () => {
  const analytics = buildSalesChannelAnalytics([
    { channel: "POS", revenue: 300, orders: 2 },
  ]);

  assert.deepEqual(analytics.channels.ONLINE, {
    channel: "ONLINE",
    revenue: 0,
    orders: 0,
    averageOrderValue: 0,
  });
  assert.equal(analytics.revenueMix[1]?.share, 0);
});

test("aggregates daily revenue per channel using Cairo business dates", () => {
  const sales = [
    { channel: "POS" as const, totalAmount: 100, createdAt: new Date("2026-10-03T23:30:00.000Z") },
    { channel: "ONLINE" as const, totalAmount: 50, createdAt: new Date("2026-10-03T20:30:00.000Z") },
    { channel: "ONLINE" as const, totalAmount: 80, createdAt: new Date("2026-10-04T20:30:00.000Z") },
  ];

  assert.deepEqual(buildSalesChannelTrend(sales, "ALL"), [
    { date: "2026-10-03", POS: 100, ONLINE: 50 },
    { date: "2026-10-04", POS: 0, ONLINE: 80 },
  ]);
  assert.deepEqual(buildSalesChannelTrend(sales, "ONLINE"), [
    { date: "2026-10-03", POS: 0, ONLINE: 50 },
    { date: "2026-10-04", POS: 0, ONLINE: 80 },
  ]);
});