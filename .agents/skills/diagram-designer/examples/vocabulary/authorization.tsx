import type { ReactNode } from "react";
import { UiDatabase, UiKey, UiRobotAi, UiServerProcess, UiShieldCheck, UiUser } from "@flanksource/clicky-ui/icons";
import { Arrow, BoxNode, DEFAULT_NODE_PALETTE, Diagram } from "@flanksource/facet";
import { ROLES, Sheet, Swatch } from "./common";

const SECURITY = { ...DEFAULT_NODE_PALETTE, accent: ROLES.security.header, tint: ROLES.security.body, border: ROLES.security.border };
const SERVICE = { ...DEFAULT_NODE_PALETTE, accent: ROLES.new.header, tint: ROLES.new.body, border: ROLES.new.border };
const EXTERNAL = { ...DEFAULT_NODE_PALETTE, accent: ROLES.external.header, tint: ROLES.external.body, border: ROLES.external.border };

type NodeSpec = { title: string; icon: ReactNode; detail?: string; role?: "security" | "external" };

function Node({ id, title, icon, detail, role }: NodeSpec & { id: string }) {
  return <BoxNode id={id} variant="tinted" title={title} icon={icon} description={detail} palette={role === "security" ? SECURITY : role === "external" ? EXTERNAL : SERVICE} compact shadow="shadow-none" />;
}

function EdgeLabel({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap rounded bg-white px-1 text-[9px] font-semibold text-slate-700">{children}</span>;
}

function Sequence({ nodes, labels }: { nodes: NodeSpec[]; labels: string[] }) {
  return (
    <Diagram className="w-full">
      {(id) => (
        <>
          <div className="flex items-center justify-between gap-12 px-3 py-5">
            {nodes.map((node, index) => <Node key={index} id={id(`node-${index}`)} {...node} />)}
          </div>
          {labels.map((label, index) => <Arrow key={index} from={id(`node-${index}`)} to={id(`node-${index + 1}`)} variant="er" path="straight" startAnchor="right" endAnchor="left" color={ROLES.security.header} headSize={3} labelPosition="top" labels={<EdgeLabel>{label}</EdgeLabel>} />)}
        </>
      )}
    </Diagram>
  );
}

function DistributedPolicy() {
  return (
    <Diagram className="w-full">
      {(id) => (
        <>
          <div className="grid grid-cols-3 items-center gap-x-20 gap-y-6 px-3 py-3">
            <Node id={id("policy-a")} title="Policy A" icon={<UiKey />} role="external" />
            <Node id={id("pdp-a")} title="Local PDP A" icon={<UiShieldCheck />} role="security" />
            <Node id={id("pep-a")} title="Service PEP A" icon={<UiServerProcess />} />
            <Node id={id("policy-b")} title="Policy B" icon={<UiKey />} role="external" />
            <Node id={id("pdp-b")} title="Local PDP B" icon={<UiShieldCheck />} role="security" />
            <Node id={id("pep-b")} title="Service PEP B" icon={<UiServerProcess />} />
          </div>
          {["a", "b"].map((row) => (
            <Arrow key={`policy-${row}`} from={id(`policy-${row}`)} to={id(`pdp-${row}`)} variant="er" path="straight" startAnchor="right" endAnchor="left" color={ROLES.security.header} headSize={3} />
          ))}
          {["a", "b"].map((row) => (
            <Arrow key={`decision-${row}`} from={id(`pdp-${row}`)} to={id(`pep-${row}`)} variant="er" path="straight" startAnchor="right" endAnchor="left" color={ROLES.security.header} headSize={3} />
          ))}
        </>
      )}
    </Diagram>
  );
}

function DelegatedAccess() {
  return (
    <Diagram className="w-full">
      {(id) => (
        <>
          <div className="grid grid-cols-3 items-center gap-x-20 gap-y-12 px-3 py-3">
            <Node id={id("subject")} title="Subject" icon={<UiUser />} role="external" />
            <Node id={id("actor")} title="Acting agent" icon={<UiRobotAi />} />
            <Node id={id("pep")} title="Service PEP" icon={<UiShieldCheck />} role="security" />
            <div />
            <Node id={id("issuer")} title="Token issuer" icon={<UiKey />} role="external" />
          </div>
          <Arrow from={id("subject")} to={id("actor")} variant="er" path="straight" startAnchor="right" endAnchor="left" color={ROLES.security.header} headSize={3} labelPosition="top" labels={<EdgeLabel>delegates</EdgeLabel>} />
          <Arrow from={id("actor")} to={id("pep")} variant="er" path="straight" startAnchor="right" endAnchor="left" color={ROLES.security.header} headSize={3} labelPosition="top" labels={<EdgeLabel>scoped call</EdgeLabel>} />
          <Arrow from={id("actor")} to={id("issuer")} variant="er" path="straight" startAnchor="bottom" endAnchor="top" color={ROLES.security.header} headSize={3} showTail />
        </>
      )}
    </Diagram>
  );
}

export function AuthorizationModels() {
  return (
    <Sheet columns={1} intro="Separate the authorization model, the decision topology and delegation. Policy authorities and local decision points are distinct from the services that enforce decisions.">
      <Swatch name="authorization/rbac" note="An assigned role maps the analyst to an action on a scoped resource." height={105}>
        <Sequence nodes={[{ title: "Analyst", icon: <UiUser />, role: "external" }, { title: "Investigator", icon: <UiKey />, role: "security" }, { title: "telemetry.read", icon: <UiShieldCheck />, role: "security" }, { title: "Tenant data", icon: <UiDatabase /> }]} labels={["assigned", "permits", "on"]} />
      </Swatch>
      <Swatch name="authorization/abac" note="The PDP uses subject, resource, action and environment inputs; the service enforces its decision." height={105}>
        <Sequence nodes={[{ title: "Attributes", icon: <UiUser />, detail: "tenant · action · time", role: "external" }, { title: "Policy PDP", icon: <UiShieldCheck />, role: "security" }, { title: "Service PEP", icon: <UiServerProcess /> }, { title: "Tenant data", icon: <UiDatabase /> }]} labels={["inputs", "decision", "enforces"]} />
      </Swatch>
      <Swatch name="authorization/decentralized" note="Two independent authorities distribute policies to local PDPs; each service enforces its own decision." height={150}>
        <DistributedPolicy />
      </Swatch>
      <Swatch name="authorization/delegated" note="The issuer exchanges a scoped token; the service checks the distinct subject and actor, audience and scope." height={170}>
        <DelegatedAccess />
      </Swatch>
    </Sheet>
  );
}
