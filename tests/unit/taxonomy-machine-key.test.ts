import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidMachineKey,
  normalizeMachineKeyInput,
  suggestMachineKeyFromName,
} from "../../src/lib/taxonomy/machine-key";

test("isValidMachineKey accepts lowercase snake_case starting with a letter", () => {
  assert.equal(isValidMachineKey("physical_assault"), true);
  assert.equal(isValidMachineKey("a"), true);
  assert.equal(isValidMachineKey("a1"), true);
  assert.equal(isValidMachineKey("a_1_b_2"), true);
});

test("isValidMachineKey rejects uppercase, leading digits, spaces, and double underscores", () => {
  assert.equal(isValidMachineKey("Physical_Assault"), false);
  assert.equal(isValidMachineKey("1_physical"), false);
  assert.equal(isValidMachineKey("physical assault"), false);
  assert.equal(isValidMachineKey("physical__assault"), false);
  assert.equal(isValidMachineKey("_physical"), false);
  assert.equal(isValidMachineKey("physical_"), false);
  assert.equal(isValidMachineKey(""), false);
  assert.equal(isValidMachineKey("physical-assault"), false);
});

test("normalizeMachineKeyInput trims surrounding whitespace only", () => {
  assert.equal(normalizeMachineKeyInput("  physical_assault  "), "physical_assault");
  assert.equal(normalizeMachineKeyInput("Physical_Assault"), "Physical_Assault");
});

test("suggestMachineKeyFromName lowercases and underscores a plain name", () => {
  assert.equal(suggestMachineKeyFromName("Physical Assault"), "physical_assault");
});

test("suggestMachineKeyFromName strips accents via NFKD normalization", () => {
  assert.equal(suggestMachineKeyFromName("Café Discrimination"), "cafe_discrimination");
});

test("suggestMachineKeyFromName collapses punctuation and repeated separators into single underscores", () => {
  assert.equal(suggestMachineKeyFromName("Online  Harassment / Stalking!!"), "online_harassment_stalking");
});

test("suggestMachineKeyFromName prefixes a key_ when the slug would start with a digit", () => {
  assert.equal(suggestMachineKeyFromName("111 Emergency Line"), "key_111_emergency_line");
});

test("suggestMachineKeyFromName returns an empty string for a name with no valid characters", () => {
  assert.equal(suggestMachineKeyFromName("!!!"), "");
});

test("every non-empty suggestion is itself a valid machine key", () => {
  for (const name of ["Café Discrimination", "111 Emergency Line", "Online  Harassment / Stalking!!", "Physical Assault"]) {
    const suggested = suggestMachineKeyFromName(name);
    assert.ok(suggested.length > 0);
    assert.equal(isValidMachineKey(suggested), true, `expected "${suggested}" (from "${name}") to be a valid machine key`);
  }
});
