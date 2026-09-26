import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProductInput } from "../utils/productInput.js";

const validProduct = {
  name: "Leather jacket",
  description: "A warm, durable jacket.",
  category: "Outerwear",
  imageUrl: "https://example.com/jacket.jpg",
  unitAmount: 4900,
  currency: "USD",
  active: true,
};

test("normalizes valid product data", () => {
  assert.deepEqual(normalizeProductInput(validProduct), {
    ...validProduct,
    currency: "usd",
  });
});

test("rejects non-HTTPS or HTTP image protocols", () => {
  assert.throws(
    () => normalizeProductInput({ ...validProduct, imageUrl: "javascript:alert(1)" }),
    /must use http or https/,
  );
});

test("rejects fractional and unsafe product prices", () => {
  assert.throws(
    () => normalizeProductInput({ ...validProduct, unitAmount: 49.5 }),
    /positive amount in minor currency units/,
  );
});

test("rejects unsupported currencies rather than mixing dashboard totals", () => {
  assert.throws(
    () => normalizeProductInput({ ...validProduct, currency: "eur" }),
    /USD only/,
  );
});

test("allows partial updates only for provided fields", () => {
  assert.deepEqual(
    normalizeProductInput({ active: false }, { partial: true }),
    { active: false },
  );
  assert.throws(
    () => normalizeProductInput({}, { partial: true }),
    /At least one product field/,
  );
});
