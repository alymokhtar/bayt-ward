import assert from "node:assert/strict";
import test from "node:test";
import {
  getDuplicateVariantColorError,
  mergeColorOptions,
  normalizeHexColor,
  resolveColorSelection,
} from "@/lib/color-utils";

test("normalizes hex values to 6-digit format", () => {
  assert.equal(normalizeHexColor("#abc"), "#AABBCC");
  assert.equal(normalizeHexColor("123456"), "#123456");
});

test("returns the preset hex for known color names", () => {
  const result = resolveColorSelection("أبيض");
  assert.deepEqual(result, { label: "أبيض", hex: "#FFFFFF" });
});

test("supports manual hex input", () => {
  const result = resolveColorSelection("#12ab34");
  assert.deepEqual(result, { label: "#12AB34", hex: "#12AB34" });
});

test("merges custom colors with presets for future reuse", () => {
  const result = mergeColorOptions([
    { name: "أزرق", hex: "#1E88E5" },
    { name: "أبيض", hex: "#FFFFFF" },
  ]);

  const names = result.map((color: { name: string }) => color.name);
  assert.ok(names.includes("أبيض"));
  assert.ok(names.includes("أزرق"));
  assert.ok(result.some((color) => color.name === "أزرق" && color.hex === "#1E88E5"));
});

test("blocks reusing the same color across multiple variants", () => {
  const error = getDuplicateVariantColorError([
    { color: "أبيض" },
    { color: "أبيض" },
  ]);

  assert.equal(error, "لا يمكن إضافة أكثر من متغير بنفس اللون: أبيض");
});
