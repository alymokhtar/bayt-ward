import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSalesChannelAnalytics,
  buildNetSalesChannelTrend,
  buildSalesChannelTrend,
  getSalesChannelWhere,
  subtractChannelReturns,
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

test("subtracts approved returns from channel revenue without changing order counts", () => {
  const netSales = subtractChannelReturns(
    [
      { channel: "POS", revenue: 500, orders: 4 },
      { channel: "ONLINE", revenue: 300, orders: 2 },
    ],
    [
      { channel: "POS", refundAmount: 75 },
      { channel: "ONLINE", refundAmount: 50 },
    ],
  );

  assert.deepEqual(netSales, [
    { channel: "POS", revenue: 425, orders: 4 },
    { channel: "ONLINE", revenue: 250, orders: 2 },
  ]);
});

test("subtracts returns from channels with no sales in the selected period", () => {
  assert.deepEqual(
    subtractChannelReturns(
      [{ channel: "POS", revenue: 500, orders: 4 }],
      [
        { channel: "POS", refundAmount: 75 },
        { channel: "ONLINE", refundAmount: 50 },
      ],
    ),
    [
      { channel: "POS", revenue: 425, orders: 4 },
      { channel: "ONLINE", revenue: -50, orders: 0 },
    ],
  );
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

test("builds daily net channel revenue including return-only and empty days", () => {
  assert.deepEqual(
    buildNetSalesChannelTrend(
      [
        { date: "2026-10-03", channel: "POS", revenue: 100 },
        { date: "2026-10-03", channel: "POS", revenue: -25 },
        { date: "2026-10-04", channel: "ONLINE", revenue: -40 },
      ],
      "ALL",
      "2026-10-03",
      "2026-10-05",
    ),
    [
      { date: "2026-10-03", POS: 75, ONLINE: 0 },
      { date: "2026-10-04", POS: 0, ONLINE: -40 },
      { date: "2026-10-05", POS: 0, ONLINE: 0 },
    ],
  );
});