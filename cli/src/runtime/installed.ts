import { assetPath } from '../utils/assets.js';
import { VERSION } from '../version-generated.js';
import { materializeRuntime, readRuntimePayload } from './payload.js';
import { runtimeCacheRoot } from './workspace.js';

export function installedRuntimePayload() {
  const payload = readRuntimePayload(assetPath('default-runtime.json'));
  if (payload.facetVersion !== VERSION) throw new Error(`Installed runtime ${payload.facetVersion} does not match CLI ${VERSION}; reinstall Facet`);
  return payload;
}

export async function installedRuntime() {
  return materializeRuntime({ payload: installedRuntimePayload(), archive: () => assetPath('default-runtime.tgz'), cacheRoot: runtimeCacheRoot(), facetVersion: VERSION });
}
