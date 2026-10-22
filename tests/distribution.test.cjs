'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {checkDistribution} = require('../scripts/check-distribution.cjs');
test('bundled assets match their manifests and browser scripts parse', () => {
  assert.equal(checkDistribution().assetHashesChecked, 105);
});
