import assert from "node:assert/strict";
import test from "node:test";
import { buildSalesCsv } from "./sales-export";

test("exports headers, including sales channel, with no matching records", () => {
  const csv = buildSalesCsv([]);
  const rows = csv.slice(1).split("\r\n");

  assert.equal(rows.length, 1);
  assert.match(rows[0] ?? "", /"قناة البيع"/);
});

test("exports the channel and escapes commas and quotes in CSV cells", () => {
  const csv = buildSalesCsv([{
    invoiceNumber: "INV-1",
    channel: "ONLINE",
    customerName: "عميل, \"مميز\"",
    totalAmount: 100,
    status: "مكتملة",
    paymentMethod: "كاش",
    createdAt: "2026-10-04",
  }]);

  assert.match(csv, /"المتجر"/);
  assert.match(csv, /"عميل, ""مميز"""/);
});