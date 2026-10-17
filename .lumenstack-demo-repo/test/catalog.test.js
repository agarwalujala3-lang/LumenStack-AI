const test = require("node:test");
const assert = require("node:assert/strict");
const { searchCatalog } = require("../src/services/catalogService");

test("catalog search matches names and categories without case sensitivity", () => {
  assert.deepEqual(searchCatalog("desk").map((item) => item.id), ["p-102"]);
  assert.equal(searchCatalog("STATIONERY").length, 1);
});

test("an empty query returns the full catalog", () => {
  assert.equal(searchCatalog("").length, 4);
});
