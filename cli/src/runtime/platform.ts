import publishedTargets from './platforms.json';

export interface RuntimePlatform { platform: string; arch: string; libc?: 'glibc' | 'musl' }

export function runtimePlatform(): RuntimePlatform {
  if (process.platform !== 'linux') return { platform: process.platform, arch: process.arch };
  const report = process.report.getReport() as { header: { glibcVersionRuntime?: string } };
  return { platform: process.platform, arch: process.arch, libc: report.header.glibcVersionRuntime ? 'glibc' : 'musl' };
}

export function runtimePlatformName(target: { platform: string; arch: string; libc?: string } = runtimePlatform()): string {
  return [target.platform, target.arch, target.libc].filter(Boolean).join('-');
}

/** Platforms with a released `@flanksource/facet-runtime-<name>` package; rendering is unsupported elsewhere. */
export const PUBLISHED_RUNTIME_PLATFORMS: readonly string[] = publishedTargets.map(target => runtimePlatformName(target));
