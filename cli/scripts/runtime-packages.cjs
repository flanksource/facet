'use strict';
const platforms = require('../src/runtime/platforms.json');

function runtimePackages(version) {
  return Object.fromEntries(platforms.map(platform => [`@flanksource/facet-runtime-${platform}`, version]));
}

module.exports = { runtimePackages };
