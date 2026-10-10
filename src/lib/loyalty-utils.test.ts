import assert from "node:assert/strict";
import test from "node:test";

import { calculateLoyaltyPointsEarned } from "./loyalty-utils";

test("earns five loyalty points for each full 100 of eligible net spend", () => {
  assert.equal(calculateLoyaltyPointsEarned(0), 0);
  assert.equal(calculateLoyaltyPointsEarned(99.99), 0);
  assert.equal(calculateLoyaltyPointsEarned(100), 5);
  assert.equal(calculateLoyaltyPointsEarned(250), 10);
  assert.equal(calculateLoyaltyPointsEarned(Number.NaN), 0);
});
