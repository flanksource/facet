export interface CarbonCLIOptions {
  theme?: string;
  backgroundColor?: string;
  windowTheme?: string;
  windowControls?: boolean;
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  paddingVertical?: string;
  paddingHorizontal?: string;
  dropShadow?: boolean;
  dropShadowOffsetY?: string;
  dropShadowBlurRadius?: string;
  widthAdjustment?: boolean;
  lineNumbers?: boolean;
  firstLineNumber?: number;
  exportSize?: string;
  watermark?: boolean;
  squaredImage?: boolean;
  language?: string;
}

export interface CarbonLoaderOptions {
  outputDir?: string;
  cacheDir?: string;
  carbonOptions?: CarbonCLIOptions;
}

export interface CacheEntry {
  hash: string;
  filePath: string;
  screenshotPath: string;
  timestamp: number;
}

export interface CacheMetadata {
  [key: string]: CacheEntry;
}
