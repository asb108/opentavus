import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptsOutput } from "../dist/index.js";

const active = { conversation_id: "call-a", generation_id: 2 };

test("accepts the current generation", () => {
  assert.equal(acceptsOutput(active, { ...active }), true);
});

test("rejects late output after interruption", () => {
  assert.equal(acceptsOutput(active, { ...active, generation_id: 1 }), false);
});

test("rejects another conversation with the same generation number", () => {
  assert.equal(acceptsOutput(active, { ...active, conversation_id: "call-b" }), false);
});
