import { describe, expect, it } from 'vitest';
import { injectCustomCss } from './custom-css.js';

describe('custom render CSS', () => {
  it('places overrides after built styles and preserves literal replacement characters', () => {
    const html = '<html><head><style>h1{color:red}</style></head><body><h1>Report</h1></body></html>';
    const css = 'h1{color:blue} h1::after{content:"$&"}';
    expect(injectCustomCss(html, css)).toBe(`<html><head><style>h1{color:red}</style><style>${css}</style></head><body><h1>Report</h1></body></html>`);
  });

  it('escapes HTML delimiters without letting CSS close its style element', () => {
    expect(injectCustomCss('<head></head>', 'p::after{content:"</style><script>"}')).toBe('<head><style>p::after{content:"\\3c /style>\\3c script>"}</style></head>');
  });
});
