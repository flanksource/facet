import { useId } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Combobox, JsonSchemaForm, type JsonSchemaObject } from '@flanksource/clicky-ui/components';

const roots = new WeakMap<HTMLElement, Root>();
const fonts = [
  ['System sans', 'system-ui, sans-serif'],
  ['Arial', 'Arial, sans-serif'],
  ['Georgia', 'Georgia, serif'],
  ['Times New Roman', '"Times New Roman", serif'],
  ['Verdana', 'Verdana, sans-serif'],
] as const;
const monospaceFonts = [
  ['System monospace', 'ui-monospace, monospace'],
  ['Menlo', 'Menlo, monospace'],
  ['Consolas', 'Consolas, monospace'],
  ['Courier New', '"Courier New", monospace'],
] as const;

interface FontField {
  name: string;
  label: string;
  value: string;
  mode?: 'mono';
  stack?: boolean;
  error?: string;
}

function pickerRoot(container: HTMLElement): Root {
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  return root;
}

function FontPicker({ field, onChange }: { field: FontField; onChange: (name: string, value: string) => void }) {
  const id = useId();
  const options = (field.mode === 'mono' ? monospaceFonts : fonts).map(([label, stack]) => ({
    label,
    value: field.stack ? stack : label.startsWith('System ') ? stack.split(',')[0]! : label,
    trailing: <span className="theme-font-sample" style={{ fontFamily: stack }} aria-hidden="true">Aa</span>,
  }));
  return <div>
    <label htmlFor={id}>{field.label}</label>
    <Combobox id={id} size="sm" options={options} value={field.value} ariaLabel={field.label}
      placeholder="Default" allowCustomValue invalid={!!field.error} describedBy={field.error ? id + '-error' : undefined}
      onInputValueChange={value => onChange(field.name, value)} onChange={value => onChange(field.name, value)} />
    {field.error && <p id={id + '-error'} className="theme-error">{field.error}</p>}
  </div>;
}

export function renderThemeFonts(container: HTMLElement, fields: FontField[], onChange: (name: string, value: string) => void): void {
  pickerRoot(container).render(fields.map(field => <FontPicker key={field.name} field={field} onChange={onChange} />));
}

interface ColorFields {
  labels: Record<string, string>;
  values: Record<string, string>;
  allowShortHex?: boolean;
  onChange: (values: Record<string, string>) => void;
}

export function isThemeColor(value: string, allowShortHex = false): boolean {
  return (allowShortHex ? /^#(?:[0-9a-f]{6}|[0-9a-f]{3})$/i : /^#[0-9a-f]{6}$/i).test(value);
}

export function isThemeFontStack(value: string): boolean {
  return value.length <= 512 && !/[<>{};\r\n]/.test(value) && CSS.supports('font-family', value);
}

export function renderThemeColors(container: HTMLElement, { labels, values, allowShortHex, onChange }: ColorFields): void {
  const names = Object.keys(labels);
  const schema: JsonSchemaObject = {
    type: 'object',
    'x-columns': 'auto',
    'x-column-min-width': '9rem',
    properties: Object.fromEntries(names.map(name => [name, { type: 'string', title: labels[name], format: 'color' }])),
  };
  const errors = names.filter(name => !isThemeColor(values[name] ?? '', allowShortHex)).map(name => ({
    instancePath: '/' + name.replaceAll('~', '~0').replaceAll('/', '~1'),
    message: 'Enter a hex color such as #2563eb.',
  }));
  pickerRoot(container).render(<JsonSchemaForm idPrefix={container.id} size="sm" schema={schema} value={values} errors={errors}
    showPreferencesMenu={false} showFilter={false} applyDefaults={false} onChange={next => {
      onChange(Object.fromEntries(names.map(name => {
        const color = next[name];
        if (typeof color !== 'string') throw new Error('Expected a color string for ' + name);
        return [name, color];
      })));
    }} />);
}
