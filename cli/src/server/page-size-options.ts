import { PAGE_SIZE_PRESETS } from '../utils/page-size-presets.js';

export function pageSizeOptions(): string {
  const groups = new Map<string, string[]>();
  for (const [name, preset] of Object.entries(PAGE_SIZE_PRESETS)) {
    const options = groups.get(preset.group) ?? [];
    options.push(`<option value="${name}">${preset.label} (${preset.width}×${preset.height} ${preset.unit})</option>`);
    groups.set(preset.group, options);
  }
  return [...groups].map(([group, options]) => `<optgroup label="${group}">${options.join('')}</optgroup>`).join('');
}
