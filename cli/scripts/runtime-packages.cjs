'use strict';
const targets = require('../src/runtime/platforms.json');

function runtimePackages(version) {
  return Object.fromEntries(targets.map(target => [`@flanksource/facet-runtime-${[target.platform, target.arch, target.libc].filter(Boolean).join('-')}`, version]));
}

module.exports = { runtimePackages };
