export async function dispatchLoader(): Promise<boolean> {
  const mode = process.env.FACET_LOADER;
  if (mode === undefined) return false;
  if (mode === 'ssr' || mode === 'ssr-daemon') {
    const loader = await import('./ssr.js');
    if (mode === 'ssr-daemon') await loader.runSsrDaemon();
    else await loader.runSsrLoader();
  } else if (mode === 'dev') {
    const { runDevLoader } = await import('./dev.js');
    await runDevLoader();
  } else if (mode === 'css') {
    const { runCssLoader } = await import('./css.js');
    await runCssLoader();
  } else {
    throw new Error(`Unknown Facet loader: ${mode}`);
  }
  return true;
}
