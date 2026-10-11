import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LOYALTY_COUPON_THRESHOLD,
  getLoyaltyCouponEligibility,
} from "./loyalty-coupon-utils";

test("uses the default threshold and requires the next unissued milestone", () => {
  assert.equal(DEFAULT_LOYALTY_COUPON_THRESHOLD, 5_000);
  assert.equal(
    getLoyaltyCouponEligibility({
      totalSpent: 5_000,
      customThreshold: null,
      lastIssuedLevel: 0,
    }).eligible,
    true
  );
  assert.equal(
    getLoyaltyCouponEligibility({
      totalSpent: 9_999,
      customThreshold: null,
      lastIssuedLevel: 1,
    }).eligible,
    false
  );
  assert.equal(
    getLoyaltyCouponEligibility({
      totalSpent: 10_000,
      customThreshold: null,
      lastIssuedLevel: 1,
    }).eligible,
    true
  );
});

test("uses a customer's custom threshold for repeated milestones", () => {
  const status = getLoyaltyCouponEligibility({
    totalSpent: 12_000,
    customThreshold: 6_000,
    lastIssuedLevel: 1,
  });

  assert.equal(status.nextLevel, 2);
  assert.equal(status.nextThreshold, 12_000);
  assert.equal(status.eligible, true);
});

test("does not mark invalid thresholds or spend as eligible", () => {
  assert.equal(
    getLoyaltyCouponEligibility({
      totalSpent: 5_000,
      customThreshold: 0,
      lastIssuedLevel: 0,
    }).eligible,
    false
  );
  assert.equal(
    getLoyaltyCouponEligibility({
      totalSpent: Number.NaN,
      customThreshold: null,
      lastIssuedLevel: 0,
    }).eligible,
    false
  );
});
