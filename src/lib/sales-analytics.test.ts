import assert from "node:assert/strict";
import test from "node:test";
import { buildSalesChannelAnalytics, getSalesChannelWhere } from "./sales-analytics";

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