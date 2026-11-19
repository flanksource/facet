const sides = ['top', 'right', 'bottom', 'left'] as const;

export function themeMarginFields(workspace = false): string {
  return `
    <div class="theme-page-margins" role="group" aria-label="Page margins in millimeters">
      <div class="theme-page-edges">
        ${sides.map(side => {
          const label = side[0]!.toUpperCase() + side.slice(1);
          const name = workspace ? side : 'margin' + label;
          const id = workspace ? 'workspaceThemeMargin-' + side : 'theme-' + name;
          return `<div class="theme-page-edge theme-page-edge-${side}">
            <label for="${id}">${label}</label>
            <input type="number" id="${id}" name="${name}" min="0" step="any" placeholder="Auto"
              aria-label="${label} margin in millimeters"${workspace ? '' : ` data-facet-setting aria-describedby="${id}-error"`}>
          </div>`;
        }).join('')}
        <div class="theme-page-content" aria-hidden="true">Content</div>
      </div>
    </div>
    ${workspace ? '' : sides.map(side => {
      const label = side[0]!.toUpperCase() + side.slice(1);
      return `<p id="theme-margin${label}-error" class="theme-error" hidden>${label} margin must be at least 0 mm.</p>`;
    }).join('')}
    <p class="theme-field-help">Margins in mm. Blank inherits the document or theme value.</p>`;
}

export const THEME_MARGIN_STYLES = `
  .theme-page-margins { margin-top: 10px; padding: 8px; background: #181e27; border: 1px solid #465164; border-radius: 8px; }
  .theme-page-edges { display: grid; grid-template: "top top top" auto "left content right" minmax(66px, auto) "bottom bottom bottom" auto / clamp(52px, 18%, 94px) minmax(0, 1fr) clamp(52px, 18%, 94px); gap: 4px; }
  .theme-page-edge { display: grid; align-content: center; justify-items: center; padding: 3px 6px 6px; background: #242f40; border-radius: 4px; }
  .theme-page-edge:focus-within { box-shadow: inset 0 0 0 1px #93c5fd; background: #2b4160; }
  .theme-page-edge-top { grid-area: top; }
  .theme-page-edge-right { grid-area: right; }
  .theme-page-edge-bottom { grid-area: bottom; }
  .theme-page-edge-left { grid-area: left; }
  #theme-editor .theme-page-edge label { margin: 1px 0 3px; font-size: 11px; }
  #theme-editor .theme-page-edge input { max-width: 76px; padding: 4px 2px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; }
  .theme-page-content { grid-area: content; display: grid; place-items: center; min-width: 0; padding-block: 8px; background: #e8eff8; border-radius: 3px; color: #334e73; font-size: 12px; font-weight: 600; }
  .theme-field-help { margin-top: 6px; color: #bdbdc3; font-size: 12px; }
`;
