import { resolveOutput } from '../src/utils/resolve-output.js';

describe('resolveOutput', () => {
  it('treats path with extension as file path', () => {
    expect(resolveOutput('./reports/my-report.pdf')).toEqual({
      outputDir: './reports',
      outputName: 'my-report',
    });
  });

  it('strips extension from filename regardless of type', () => {
    expect(resolveOutput('/tmp/out/report.html')).toEqual({
      outputDir: '/tmp/out',
      outputName: 'report',
    });
  });

  it('treats trailing slash as directory', () => {
    expect(resolveOutput('./reports/')).toEqual({
      outputDir: './reports/',
    });
  });

  it('treats path without extension as directory', () => {
    expect(resolveOutput('./output')).toEqual({
      outputDir: './output',
    });
  });

  it('handles bare filename with extension', () => {
    expect(resolveOutput('report.pdf')).toEqual({
      outputDir: '.',
      outputName: 'report',
    });
  });

  it('treats dotfile-like path as directory (no extension)', () => {
    expect(resolveOutput('.hidden')).toEqual({
      outputDir: '.hidden',
    });
  });

  it('treats backslash trailing as directory on windows-style paths', () => {
    expect(resolveOutput('output\\')).toEqual({
      outputDir: 'output\\',
    });
  });

  it('handles dist default', () => {
    expect(resolveOutput('dist')).toEqual({
      outputDir: 'dist',
    });
  });
});
