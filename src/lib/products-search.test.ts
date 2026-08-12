import assert from "node:assert/strict";
import test from "node:test";

import { flattenProductSearchResults } from "@/lib/actions/products";

test("keeps all variants for a matched product when the name matches", () => {
  const products = [
    {
      id: "prod-1",
      name: "T-Shirt",
      nameAr: "تي شيرت",
      variants: [
        {
          id: "v1",
          sku: "TS-S",
          barcode: "111",
          size: "S",
          color: "أبيض",
          costPrice: 10,
          sellingPrice: 15,
          stockQuantity: 3,
        },
        {
          id: "v2",
          sku: "TS-M",
          barcode: "222",
          size: "M",
          color: "أسود",
          costPrice: 12,
          sellingPrice: 18,
          stockQuantity: 4,
        },
      ],
    },
  ] as any;

  const results = flattenProductSearchResults(products);

  assert.equal(results.length, 2);
  assert.deepEqual(
    results.map((variant) => variant.id).sort(),
    ["v1", "v2"].sort()
  );
  assert.equal(results[0].product.nameAr, "تي شيرت");
});
