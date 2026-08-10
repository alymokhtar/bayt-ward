import test from "node:test";
import assert from "node:assert/strict";

import { getShareUrl } from "./maps-utils.ts";

test("returns direct Google Maps search URL for full iframe embed code with coordinates", () => {
  const iframeEmbed = '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345.678!2d31.059347900000002!3d29.918170099999998!2sOctober%20Gardens%20Mall"></iframe>';

  assert.equal(
    getShareUrl(iframeEmbed),
    "https://www.google.com/maps/search/?api=1&query=29.918170099999998,31.059347900000002"
  );
});

test("returns direct Google Maps search URL for embed URL with pb containing coordinates", () => {
  const embedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12345.678!2d31.059347900000002!3d29.918170099999998!2sOctober%20Gardens%20Mall";

  assert.equal(
    getShareUrl(embedUrl),
    "https://www.google.com/maps/search/?api=1&query=29.918170099999998,31.059347900000002"
  );
});

test("returns original direct share URL unchanged", () => {
  const shareUrl = "https://www.google.com/maps/place/October+Gardens+Mall/@29.9181701,31.0593479,17z";

  assert.equal(getShareUrl(shareUrl), shareUrl);
});
