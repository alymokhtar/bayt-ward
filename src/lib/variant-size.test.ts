import assert from "node:assert/strict";
import { CUSTOM_SIZE_OPTION_VALUE, getVariantSizeMode, getVariantSizeSelectValue, resolveVariantSize } from "./variant-size";

assert.equal(getVariantSizeMode("M"), "preset");
assert.equal(getVariantSizeMode("مقاس 42"), "custom");
assert.equal(getVariantSizeSelectValue("M", "preset"), "M");
assert.equal(getVariantSizeSelectValue("مقاس 42", "custom"), CUSTOM_SIZE_OPTION_VALUE);
assert.equal(resolveVariantSize("preset", "M"), "M");
assert.equal(resolveVariantSize("custom", "مقاس 42"), "مقاس 42");

console.log("variant size helpers passed");
