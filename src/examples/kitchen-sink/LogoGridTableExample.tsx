import { LogoGrid } from '@facet';

const logos = [
  { name: 'Prometheus', health: true, configuration: false, change: false, playbooks: true },
  { name: 'Kubernetes', health: true, configuration: true, change: true, playbooks: true },
  { name: 'Datadog', health: true, configuration: true, change: true, playbooks: true },
  { name: 'Flux', health: false, configuration: true, change: true, playbooks: true },
  { name: 'ArgoCD', health: true, configuration: true, change: false, playbooks: false },
];

export default function LogoGridTableExample() {
  return (
    <div className="space-y-10 p-6">
      <h1 className="text-2xl font-bold">LogoGrid (table variant) Examples</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Default Sizes</h2>
        <LogoGrid variant="table" title="Integration Capabilities" logos={logos} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">fontSize=7pt, headerFontSize=9pt</h2>
        <LogoGrid variant="table" title="Integration Capabilities" logos={logos} fontSize="7pt" headerFontSize="9pt" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">fontSize=6pt, headerFontSize=7pt</h2>
        <LogoGrid variant="table" title="Integration Capabilities" logos={logos} fontSize="6pt" headerFontSize="7pt" />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">fontSize=12pt, headerFontSize=14pt</h2>
        <LogoGrid variant="table" title="Integration Capabilities" logos={logos} fontSize="12pt" headerFontSize="14pt" />
      </section>
    </div>
  );
}
