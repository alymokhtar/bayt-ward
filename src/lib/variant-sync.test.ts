import assert from "node:assert/strict";
import test from "node:test";
import { getDeletedVariantIds } from "@/lib/variant-sync";

test("returns explicit and payload-missing variant ids for deletion", () => {
  const deleted = getDeletedVariantIds(
    ["v1", "v2", "v3"],
    ["v1", "v3"],
    ["v2"]
  );

  assert.deepEqual(deleted, ["v2"]);
});

test("includes variants removed from the payload even without explicit deletion ids", () => {
  const deleted = getDeletedVariantIds(["v1", "v2"], ["v1"]);

  assert.deepEqual(deleted, ["v2"]);
});
