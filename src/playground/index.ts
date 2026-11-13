export { mountFillPdf } from './fill-pdf-app';
import { createBrowserPreview } from './browser-runtime';
export { inspectStyles } from './browser-runtime';
const preview = createBrowserPreview();
export const renderBrowserPage = preview.render;
export const disposeBrowserPage = preview.dispose;
export const invalidateBrowserPage = preview.invalidate;
export const showBrowserError = preview.showError;
