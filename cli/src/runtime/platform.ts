export interface RuntimePlatform { platform: string; arch: string; libc?: 'glibc' | 'musl' }

export function runtimePlatform(): RuntimePlatform {
  if (process.platform !== 'linux') return { platform: process.platform, arch: process.arch };
  const report = process.report.getReport() as { header: { glibcVersionRuntime?: string } };
  return { platform: process.platform, arch: process.arch, libc: report.header.glibcVersionRuntime ? 'glibc' : 'musl' };
}

export function runtimePlatformName(target = runtimePlatform()): string {
  return [target.platform, target.arch, target.libc].filter(Boolean).join('-');
}
