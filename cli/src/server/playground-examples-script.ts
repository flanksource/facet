export const PLAYGROUND_EXAMPLES_SCRIPT = `
    const DEFAULT_TEMPLATE = \`import React from 'react';
import {
  DatasheetTemplate, Page, StatCard, MetricGrid,
  Badge, Status, CompactTable, SpecificationTable,
  ProgressBar, ScoreGauge,
} from '@flanksource/facet';
import {
  IoCheckmarkCircle, IoWarning, IoCloseCircle,
  IoShieldCheckmark, IoServer, IoCloudDone, IoPulse,
  IoSpeedometer, IoTime, IoRocket, IoGitBranch,
} from 'react-icons/io5';

export default function Template({ data }: { data: any }) {
  return (
    <DatasheetTemplate title={data.title}>
      <Page title={data.title} product={data.product} margins={{ top: 5, bottom: 5 }}>
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {data.stats.map((s: any, i: number) => (
              <StatCard key={i} variant="bordered" value={s.value} label={s.label}
                icon={{ uptime: IoCloudDone, items: IoServer, checks: IoPulse, alerts: IoShieldCheckmark }[s.icon] || IoServer}
                color={s.color} size="sm" />
            ))}
          </div>

          <SpecificationTable title="System Requirements" specifications={data.specs} />

          <CompactTable variant="reference" title="API Reference"
            columns={['Command', 'Description', 'Example']}
            data={data.apiRef} />

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Service Health</h3>
            <div className="space-y-2">
              {data.services.map((s: any, i: number) => (
                <ProgressBar key={i} title={s.name} percentage={s.uptime} variant={s.uptime > 99 ? 'success' : s.uptime > 95 ? 'warning' : 'danger'} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="status" status="success" label="Healthy" icon={IoCheckmarkCircle} />
            <Badge variant="status" status="warning" label="Degraded" icon={IoWarning} />
            <Badge variant="status" status="error" label="Critical" icon={IoCloseCircle} />
            <Badge variant="metric" label="Latency" value={data.latency} icon={IoSpeedometer} />
            <Badge variant="metric" label="Deploys" value={data.deploys} icon={IoRocket} />
          </div>

          <div className="flex gap-6 items-end">
            <ScoreGauge score={data.securityScore} label="Security" size="sm" />
            <ScoreGauge score={data.reliabilityScore} label="Reliability" size="sm" />
            <ScoreGauge score={data.maintainabilityScore} label="Maintainability" size="sm" />
          </div>

          <CompactTable variant="inline" title="Release Info" data={data.release} />
        </div>
      </Page>
    </DatasheetTemplate>
  );
}\`;

    const DEFAULT_DATA = JSON.stringify({
      title: "Infrastructure Report",
      product: "Mission Control",
      stats: [
        { value: "99.9%", label: "Uptime", icon: "uptime", color: "green" },
        { value: "156", label: "Config Items", icon: "items", color: "blue" },
        { value: "23", label: "Health Checks", icon: "checks", color: "green" },
        { value: "3", label: "Alerts", icon: "alerts", color: "red" },
      ],
      specs: [
        { category: "Kubernetes", value: "1.24+" },
        { category: "PostgreSQL", value: "13+" },
        { category: "Memory", value: "4GB minimum" },
        { category: "Deployment", value: ["SaaS", "Self-hosted", "Hybrid"] },
      ],
      apiRef: [
        ["search_catalog", "Find config items", "search_catalog('pods')"],
        ["get_config", "Get item details", "get_config('nginx')"],
        ["run_health_check", "Execute check", "run_health_check('api')"],
      ],
      services: [
        { name: "API Gateway", uptime: 99.95 },
        { name: "Auth Service", uptime: 99.8 },
        { name: "Data Pipeline", uptime: 97.2 },
        { name: "Search Index", uptime: 99.99 },
      ],
      latency: "45ms",
      deploys: "2,847",
      securityScore: 8.5,
      reliabilityScore: 9.1,
      maintainabilityScore: 7.2,
      release: [
        { label: "Version", value: "2.0.0" },
        { label: "Date", value: "March 2026" },
        { label: "License", value: "Apache 2.0" },
      ],
    }, null, 2);

    const DEFAULT_HEADER = \`import React from 'react';
import { Header } from '@flanksource/facet';
import { IoShieldCheckmark } from 'react-icons/io5';

export default function MyHeader() {
  return (
    <Header
      variant="solid"
      title="Infrastructure Report"
      subtitle="Mission Control Platform"
      logo={<IoShieldCheckmark style={{ width: '12mm', height: '12mm', color: 'white' }} />}
    />
  );
}\`;

    const DEFAULT_FOOTER = \`import React from 'react';
import { Footer } from '@flanksource/facet';

export default function MyFooter() {
  return (
    <Footer
      variant="compact"
      company="Acme Corp"
      web="https://example.com"
      email="team@example.com"
    />
  );
}\`;

    const DEFAULT_DEPS = JSON.stringify({
      "@flanksource/facet": "__FACET_VERSION__",
      "react-icons": "^5.4.0"
    }, null, 2);

    // Live diagram example. The leading "// @live" directive opts this template
    // into the hydrate-and-bake render path: react-xarrows measures the boxes in
    // a real browser and bakes the arrows to static SVG before the PDF pipeline runs.
    const DIAGRAM_TEMPLATE = \`// @live
import React from 'react';
import {
  DatasheetTemplate, Page,
  Diagram, BoxNode, Arrow, NodeSection, COLORS,
} from '@flanksource/facet';

export default function Template({ data }: { data: any }) {
  return (
    <DatasheetTemplate title={data.title}>
      <Page title={data.title} product={data.product} margins={{ top: 5, bottom: 5 }}>
        <Diagram className="flex items-center justify-between gap-8 py-16 px-6">
          {(id) => (
            <>
              <NodeSection label="Sources">
                {data.sources.map((s: string, i: number) => (
                  <BoxNode key={i} id={id('src' + i)} title={s}
                    headerColor={COLORS.muted} borderColor={COLORS.muted} />
                ))}
              </NodeSection>

              <BoxNode id={id('engine')} title="Facet Engine"
                headerColor={COLORS.primary} borderColor={COLORS.primary}>
                <div className="text-[10px] text-center text-slate-600">
                  React &#8594; HTML &#8594; PDF
                </div>
              </BoxNode>

              <NodeSection label="Outputs">
                {data.outputs.map((o: string, i: number) => (
                  <BoxNode key={i} id={id('out' + i)} title={o}
                    headerColor={COLORS.outputBorder} borderColor={COLORS.outputBorder} />
                ))}
              </NodeSection>

              {data.sources.map((_: string, i: number) => (
                <Arrow key={'a' + i} from={id('src' + i)} to={id('engine')} variant="secondary" />
              ))}
              {data.outputs.map((_: string, i: number) => (
                <Arrow key={'b' + i} from={id('engine')} to={id('out' + i)} />
              ))}
            </>
          )}
        </Diagram>
      </Page>
    </DatasheetTemplate>
  );
}\`;

    const DIAGRAM_DATA = JSON.stringify({
      title: "Data Flow",
      product: "Facet Pipeline",
      sources: ["PostgreSQL", "S3 Bucket", "Webhooks"],
      outputs: ["PDF", "HTML", "WebComponent"],
    }, null, 2);

    // Mirror the default deps so the shared Header/Footer (which import react-icons)
    // still build when this example is loaded. react-xarrows ships with @flanksource/facet.
    const DIAGRAM_DEPS = JSON.stringify({
      "@flanksource/facet": "__FACET_VERSION__",
      "react-icons": "^5.4.0"
    }, null, 2);

    // Markdown example. A plain .md file is auto-wrapped in a printable <Page>
    // with prose styling — no React boilerplate required.
    const MARKDOWN_TEMPLATE = \`# Infrastructure Health Report

A weekly summary rendered to PDF/HTML by Facet. Plain Markdown is wrapped in a
printable page with prose styling automatically — no React required.

## Platform Overview

| Metric        | Value   | Status  |
| ------------- | ------- | ------- |
| Uptime        | 99.97%  | Healthy |
| Config Items  | 1,247   | Tracked |
| Active Alerts | 3       | Warning |

## Recent Changes

1. **Scaled nginx** from 2 to 4 replicas
2. **Rotated TLS certificates** for wildcard ingress
3. **Upgraded Helm chart** to mission-control 0.1.27

## Checklist

- [x] Define SLOs
- [x] Wire up alerting
- [ ] Quarterly access review

---

*Generated by Facet*
\`;

    const MARKDOWN_DATA = JSON.stringify({}, null, 2);

    const MARKDOWN_DEPS = JSON.stringify({
      "@flanksource/facet": "__FACET_VERSION__"
    }, null, 2);

    // MDX example. MDX blends Markdown prose with React components; data from the
    // Data tab is available as props (e.g. {props.title}).
    const MDX_TEMPLATE = \`import { StatCard, ProgressBar, Badge } from '@flanksource/facet';

# {props.title}

MDX blends Markdown prose with React components — import any Facet component and
drop it inline. The heading above pulls its text from the Data tab.

## Key Metrics

<div className="grid grid-cols-3 gap-3 my-4">
  <StatCard variant="bordered" value="99.9%" label="Uptime" color="green" size="sm" />
  <StatCard variant="bordered" value="1,247" label="Config Items" color="blue" size="sm" />
  <StatCard variant="bordered" value="3" label="Alerts" color="red" size="sm" />
</div>

## Resource Usage

<div className="space-y-2 my-4">
  <ProgressBar title="CPU" percentage={65} variant="primary" size="sm" />
  <ProgressBar title="Memory" percentage={82} variant="warning" size="sm" />
</div>

## Status

<div className="flex gap-2 my-4">
  <Badge variant="status" status="success" label="API Gateway" size="sm" />
  <Badge variant="status" status="warning" label="Worker Pool" size="sm" />
</div>

> Generated from an .mdx file combining prose and components.
\`;

    const MDX_DATA = JSON.stringify({
      title: "Platform Report"
    }, null, 2);

    const MDX_DEPS = JSON.stringify({
      "@flanksource/facet": "__FACET_VERSION__"
    }, null, 2);

    // Selectable starting points for the editor, swapped via the Example dropdown.
    // ext drives the inline file extension sent to the server; lang sets the Monaco
    // editor language for the template tab.
    const EXAMPLES = {
      datasheet: { ext: 'tsx', lang: 'typescript', template: DEFAULT_TEMPLATE, data: DEFAULT_DATA, deps: DEFAULT_DEPS },
      diagram: { ext: 'tsx', lang: 'typescript', template: DIAGRAM_TEMPLATE, data: DIAGRAM_DATA, deps: DIAGRAM_DEPS },
      markdown: { ext: 'md', lang: 'markdown', template: MARKDOWN_TEMPLATE, data: MARKDOWN_DATA, deps: MARKDOWN_DEPS },
      mdx: { ext: 'mdx', lang: 'markdown', template: MDX_TEMPLATE, data: MDX_DATA, deps: MDX_DEPS },
    };
    let currentExt = 'tsx';

    let templateEditor, dataEditor, depsEditor, headerEditor, footerEditor;
    let currentFormat = 'html';
    let renderHadError = false;
    // Suppresses URL writes while we apply state read FROM the URL on load.
    let routingReady = false;

    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      monaco.editor.defineTheme('facet-dark', {
        base: 'vs-dark', inherit: true, rules: [],
        colors: { 'editor.background': '#1e1e1e' }
      });
      monaco.editor.setTheme('facet-dark');

      const tsDefaults = monaco.languages.typescript.typescriptDefaults;
      tsDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        allowNonTsExtensions: true,
      });
      tsDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });

      tsDefaults.addExtraLib(
        'declare module "react" {\\n' +
        '  export interface CSSProperties { [key: string]: any; }\\n' +
        '  export type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];\\n' +
        '  export interface ReactElement { type: any; props: any; key: any; }\\n' +
        '  export type ComponentType<P = {}> = (props: P) => ReactElement | null;\\n' +
        '  export type FC<P = {}> = ComponentType<P>;\\n' +
        '  export function createElement(type: any, props?: any, ...children: any[]): ReactElement;\\n' +
        '  export function useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void];\\n' +
        '  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;\\n' +
        '  export function useMemo<T>(factory: () => T, deps: any[]): T;\\n' +
        '  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;\\n' +
        '  export function useRef<T>(initial: T): { current: T };\\n' +
        '  const React: any;\\n' +
        '  export default React;\\n' +
        '}\\n' +
        'declare global {\\n' +
        '  namespace JSX {\\n' +
        '    interface Element extends React.ReactElement {}\\n' +
        '    interface IntrinsicElements { [tag: string]: any; }\\n' +
        '  }\\n' +
        '}\\n',
        'file:///node_modules/@types/react/index.d.ts'
      );
      tsDefaults.addExtraLib(
        'declare module "react/jsx-runtime" {\\n' +
        '  export function jsx(type: any, props: any, key?: any): any;\\n' +
        '  export function jsxs(type: any, props: any, key?: any): any;\\n' +
        '  export const Fragment: any;\\n' +
        '}\\n',
        'file:///node_modules/@types/react/jsx-runtime.d.ts'
      );

      fetch('/types').then(r => r.text()).then(dts => {
        tsDefaults.addExtraLib(dts, 'file:///node_modules/@flanksource/facet/index.d.ts');
      });

      var templateModel = monaco.editor.createModel(
        DEFAULT_TEMPLATE,
        'typescript',
        monaco.Uri.parse('file:///template.tsx')
      );
      templateEditor = monaco.editor.create(document.getElementById('template-editor'), {
        model: templateModel,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      dataEditor = monaco.editor.create(document.getElementById('data-editor'), {
        value: DEFAULT_DATA,
        language: 'json',
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      depsEditor = monaco.editor.create(document.getElementById('deps-editor'), {
        value: DEFAULT_DEPS,
        language: 'json',
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      var headerModel = monaco.editor.createModel(
        DEFAULT_HEADER,
        'typescript',
        monaco.Uri.parse('file:///header.tsx')
      );
      headerEditor = monaco.editor.create(document.getElementById('header-editor'), {
        model: headerModel,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      var footerModel = monaco.editor.createModel(
        DEFAULT_FOOTER,
        'typescript',
        monaco.Uri.parse('file:///footer.tsx')
      );
      footerEditor = monaco.editor.create(document.getElementById('footer-editor'), {
        model: footerModel,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      // The example dropdown was already set from the URL in initUrlRouting; now
      // that the editors exist, swap in that example's content (datasheet is the
      // default already loaded, so it needs no swap).
      var initialExample = document.getElementById('example').value;
      if (initialExample && initialExample !== 'datasheet' && EXAMPLES[initialExample]) {
        loadExample(initialExample);
      }
    });

    function switchTab(tab, btn) {
      document.querySelectorAll('.editor-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['template', 'header', 'footer', 'data', 'deps'].forEach(function(t) {
        document.getElementById(t + '-editor').style.display = tab === t ? 'block' : 'none';
      });
      var editors = { template: templateEditor, header: headerEditor, footer: footerEditor, data: dataEditor, deps: depsEditor };
      if (editors[tab]) editors[tab].layout();
    }

    function loadExample(name) {
      var ex = EXAMPLES[name];
      if (!ex || !templateEditor) return;
      templateEditor.setValue(ex.template);
      dataEditor.setValue(ex.data);
      depsEditor.setValue(ex.deps);
      currentExt = ex.ext;
      var model = templateEditor.getModel();
      if (model) monaco.editor.setModelLanguage(model, ex.lang);
      writeUrlState();
    }

`;
