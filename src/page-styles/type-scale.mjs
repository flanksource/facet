export const TEXT_SCALE = {
  xs: { pt: 7, leading: 9 },
  sm: { pt: 9, leading: 12 },
  base: { pt: 10, leading: 14 },
  md: { pt: 10, leading: 14 },
  lg: { pt: 15, leading: 19 },
  xl: { pt: 18, leading: 22 },
  '2xl': { pt: 24, leading: 28 },
};

export const ELEMENT_SCALE = {
  body: { pt: 10, leading: 14 },
  h1: { pt: 22, leading: 26 },
  h2: { pt: 15, leading: 19 },
  h3: { pt: 12, leading: 15 },
  h4: { pt: 10, leading: 12 },
  p: { pt: 9, leading: 12 },
};

export function tailwindThemeBlock() {
  return ['@theme {', ...Object.entries(TEXT_SCALE).flatMap(([name, step]) => [
    `  --text-${name}: ${step.pt}pt;`,
    `  --text-${name}--line-height: ${step.leading}pt;`,
  ]), '}'].join('\n');
}

export const theme = tailwindThemeBlock();
