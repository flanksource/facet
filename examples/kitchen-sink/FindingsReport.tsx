import type { ComponentType, ReactNode } from "react";
import { Page, SeverityStatCard, ListTable, Finding, Header, Footer, PageNo } from "@flanksource/facet";
import type { Entity, Sample } from "@flanksource/facet";
import { Sqlserver, K8S, Aws, Azure, MissionControl, MissionControlLogo } from "@flanksource/icons/mi";



export interface IconDef { body: string; viewBox: string }

function ph(body: string): IconDef { return { body, viewBox: "0 0 256 256" }; }
function mdi(body: string): IconDef { return { body, viewBox: "0 0 24 24" }; }
function tabler(body: string): IconDef { return { body, viewBox: "0 0 24 24" }; }
function lucide(body: string): IconDef { return { body, viewBox: "0 0 24 24" }; }

// ── Outcomes ────────────────────────────────────────────────────────

// ph:power
export const ICON_SAFETY_SWITCH = ph(`<path fill="currentColor" d="M120 128V48a8 8 0 0 1 16 0v80a8 8 0 0 1-16 0m60.37-78.7a8 8 0 0 0-8.74 13.4C194.74 77.77 208 101.57 208 128a80 80 0 0 1-160 0c0-26.43 13.26-50.23 36.37-65.3a8 8 0 0 0-8.74-13.4C47.9 67.38 32 96.06 32 128a96 96 0 0 0 192 0c0-31.94-15.9-60.62-43.63-78.7"/>`);

// icons8:fire-alarm (kept as tabler:bell-ringing equivalent — stroke 24x24)
export const ICON_PAGE_ONCALL = tabler(`<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 18v-6a5 5 0 1 1 10 0v6M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2zm16-9h1m-3.5-7.5L18 5M2 12h1m9-10v1M4.929 4.929l.707.707M12 12v6"/>`);

// icons8:high-risk (kept as tabler:alert-triangle — stroke 24x24)
export const ICON_HIGH_TICKET = tabler(`<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m-1.637-9.409L2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0M12 16h.01"/>`);

// icons8:ticket (kept as tabler:ticket — stroke 24x24)
export const ICON_LOW_TICKET = tabler(`<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2"/>`);

// ph:scroll
export const ICON_INFORMATIONAL = ph(`<path fill="currentColor" d="M96 104a8 8 0 0 1 8-8h64a8 8 0 0 1 0 16h-64a8 8 0 0 1-8-8m8 40h64a8 8 0 0 0 0-16h-64a8 8 0 0 0 0 16m128 48a32 32 0 0 1-32 32H88a32 32 0 0 1-32-32V64a16 16 0 0 0-32 0c0 5.74 4.83 9.62 4.88 9.66A8 8 0 0 1 24 88a7.9 7.9 0 0 1-4.79-1.61C18.05 85.54 8 77.61 8 64a32 32 0 0 1 32-32h136a32 32 0 0 1 32 32v104h8a8 8 0 0 1 4.8 1.6c1.2.86 11.2 8.79 11.2 22.4M96.26 173.48A8.07 8.07 0 0 1 104 168h88V64a16 16 0 0 0-16-16H67.69A31.7 31.7 0 0 1 72 64v128a16 16 0 0 0 32 0c0-5.74-4.83-9.62-4.88-9.66a7.82 7.82 0 0 1-2.86-8.86M216 192a12.58 12.58 0 0 0-3.23-8h-94a27 27 0 0 1 1.21 8a31.8 31.8 0 0 1-4.29 16H200a16 16 0 0 0 16-16"/>`);

// ── Attack Categories ───────────────────────────────────────────────

// mdi:key-alert
export const ICON_CREDENTIAL_ATTACK = mdi(`<path fill="currentColor" d="M4 6.5C4 4 6 2 8.5 2S13 4 13 6.5c0 1.96-1.25 3.63-3 4.24V15h3v3h-3v4H7V10.74c-1.75-.61-3-2.28-3-4.24m3 0C7 7.33 7.67 8 8.5 8S10 7.33 10 6.5S9.33 5 8.5 5S7 5.67 7 6.5M18 7h2v6h-2m0 4h2v-2h-2"/>`);

// mdi:shield-account
export const ICON_PRIVILEGE_ESCALATION = mdi(`<path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5zm0 4a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m5.13 12A9.7 9.7 0 0 1 12 20.92A9.7 9.7 0 0 1 6.87 17c-.34-.5-.63-1-.87-1.53c0-1.65 2.71-3 6-3s6 1.32 6 3c-.24.53-.53 1.03-.87 1.53"/>`);

// tabler:stack-push
export const ICON_PRIVILEGE_ACCUMULATION = tabler(`<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m6 10l-2 1l8 4l8-4l-2-1M4 15l8 4l8-4M12 4v7"/><path d="m15 8l-3 3l-3-3"/></g>`);

// mdi:database-export
export const ICON_DATA_EXFILTRATION = mdi(`<path fill="currentColor" d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4c.5 0 1-.03 1.5-.08V9.5h2.89l-1-1L18.9 5c-1.4-1.2-3.96-2-6.9-2m6.92 4.08L17.5 8.5L20 11h-5v2h5l-2.5 2.5l1.42 1.42L23.84 12M4 9v3c0 1.68 2.07 3.12 5 3.7v-.2c0-.93.2-1.85.58-2.69C6.34 12.3 4 10.79 4 9m0 5v3c0 2.21 3.58 4 8 4c2.94 0 5.5-.8 6.9-2L17 17.1c-1.39.56-3.1.9-5 .9c-4.42 0-8-1.79-8-4"/>`);

// (no selection — kept original)
export const ICON_LATERAL_MOVEMENT = tabler(`<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m7 8l-4 4l4 4m10-8l4 4l-4 4M3 12h18"/>`);

// (no selection — kept original)
export const ICON_PERSISTENCE = tabler(`<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v12m-8-8a8 8 0 0 0 16 0m1 0h-2M5 13H3m6-7a3 3 0 1 0 6 0a3 3 0 1 0-6 0"/>`);

// lucide:shredder
export const ICON_AUDIT_TAMPERING = lucide(`<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M4 13V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5"/><path d="M14 2v5a1 1 0 0 0 1 1h5M10 22v-5m4 2v-2m4 3v-3M2 13h20M6 20v-3"/></g>`);

// ph:moon-stars
export const ICON_AFTER_HOURS = ph(`<path fill="currentColor" d="M240 96a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16V72a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8m-96-40h8v8a8 8 0 0 0 16 0v-8h8a8 8 0 0 0 0-16h-8v-8a8 8 0 0 0-16 0v8h-8a8 8 0 0 0 0 16m72.77 97a8 8 0 0 1 1.43 8A96 96 0 1 1 95.07 37.8a8 8 0 0 1 10.6 9.06a88.07 88.07 0 0 0 103.47 103.47a8 8 0 0 1 7.63 2.67m-19.39 14.88c-1.79.09-3.59.14-5.38.14A104.11 104.11 0 0 1 88 64c0-1.79 0-3.59.14-5.38a80 80 0 1 0 109.24 109.24Z"/>`);

// icons8:hammer (kept as tabler:hammer — stroke 24x24)
export const ICON_BREAK_GLASS = tabler(`<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m11.414 10l-7.383 7.418a2.09 2.09 0 0 0 0 2.967a2.11 2.11 0 0 0 2.976 0L14.414 13m3.707 2.293l2.586-2.586a1 1 0 0 0 0-1.414l-7.586-7.586a1 1 0 0 0-1.414 0L9.121 6.293a1 1 0 0 0 0 1.414l7.586 7.586a1 1 0 0 0 1.414 0"/>`);

// mdi:account-switch
export const ICON_SHARED_ACCOUNT = mdi(`<path fill="currentColor" d="M16 9c6 0 6 4 6 4v2h-6v-2s0-1.69-1.15-3.2c-.17-.23-.38-.45-.6-.66C14.77 9.06 15.34 9 16 9M2 13s0-4 6-4s6 4 6 4v2H2zm7 4v2h6v-2l3 3l-3 3v-2H9v2l-3-3zM8 1C6.34 1 5 2.34 5 4s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3m8 0c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3"/>`);

// (no selection — kept original)
export const ICON_SERVICE_ACCOUNT_MISUSE = tabler(`<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zm6-4v2m-3 8v9m6-9v9M5 16l4-2m6 0l4 2M9 18h6M10 8v.01M14 8v.01"/>`);

// mdi:firewall (alias: wall-fire)
export const ICON_NETWORK_EXPOSURE = mdi(`<path fill="currentColor" d="m22.14 15.34l-.02.01c.23.28.43.59.58.92l.09.19c.71 1.69.21 3.64-1.1 4.86c-1.19 1.09-2.85 1.38-4.39 1.18c-1.46-.18-2.8-1.1-3.57-2.37c-.23-.39-.43-.83-.53-1.28c-.13-.35-.17-.73-.2-1.1c-.09-1.6.55-3.3 1.76-4.3c-.55 1.21-.42 2.72.39 3.77l.11.13c.14.12.31.15.47.09c.15-.06.27-.21.27-.37l-.07-.24c-.88-2.33-.14-5.03 1.73-6.56c.51-.42 1.14-.8 1.8-.97c-.68 1.36-.46 3.14.63 4.2c.46.5 1.02.79 1.49 1.23zM19.86 20l-.01-.03c.45-.39.7-1.06.68-1.66L20.5 18c-.2-1-1.07-1.34-1.63-2.07l-.43-.78c-.22.5-.24.97-.15 1.51c.1.57.32 1.06.21 1.65c-.16.65-.67 1.3-1.56 1.51c.5.49 1.31.88 2.12.6c.26-.07.59-.26.8-.42M3 16h8.06L11 17c0 1.41.36 2.73 1 3.88V21H3zm-1-6h6v5H2zm7 0h6v.07A8.03 8.03 0 0 0 11.25 15H9zM3 4h8v5H3zm9 0h9v5h-9z"/>`);

// ph:bomb
export const ICON_DESTRUCTIVE_ACTION = ph(`<path fill="currentColor" d="M248 32a8 8 0 0 0-8 8a52.7 52.7 0 0 1-3.57 17.39C232.38 67.22 225.7 72 216 72c-11.06 0-18.85-9.76-29.49-24.65C176 32.66 164.12 16 144 16c-16.39 0-29 8.89-35.43 25a66 66 0 0 0-3.9 15H88a16 16 0 0 0-16 16v9.59A88 88 0 0 0 112 248h1.59A88 88 0 0 0 152 81.59V72a16 16 0 0 0-16-16h-15.12a46.8 46.8 0 0 1 2.69-9.37C127.62 36.78 134.3 32 144 32c11.06 0 18.85 9.76 29.49 24.65C184 71.34 195.88 88 216 88c16.39 0 29-8.89 35.43-25A68.7 68.7 0 0 0 256 40a8 8 0 0 0-8-8M140.8 94a72 72 0 1 1-57.6 0a8 8 0 0 0 4.8-7.34V72h48v14.66a8 8 0 0 0 4.8 7.34m-28.91 115.32A8 8 0 0 1 104 216a8.5 8.5 0 0 1-1.33-.11a57.5 57.5 0 0 1-46.57-46.57a8 8 0 1 1 15.78-2.64a41.29 41.29 0 0 0 33.43 33.43a8 8 0 0 1 6.58 9.21"/>`);

// ph:eye-slash
export const ICON_COVERAGE_GAP = ph(`<path fill="currentColor" d="M53.92 34.62a8 8 0 1 0-11.84 10.76l19.24 21.17C25 88.84 9.38 123.2 8.69 124.76a8 8 0 0 0 0 6.5c.35.79 8.82 19.57 27.65 38.4C61.43 194.74 93.12 208 128 208a127.1 127.1 0 0 0 52.07-10.83l22 24.21a8 8 0 1 0 11.84-10.76Zm47.33 75.84l41.67 45.85a32 32 0 0 1-41.67-45.85M128 192c-30.78 0-57.67-11.19-79.93-33.25A133.2 133.2 0 0 1 25 128c4.69-8.79 19.66-33.39 47.35-49.38l18 19.75a48 48 0 0 0 63.66 70l14.73 16.2A112 112 0 0 1 128 192m6-95.43a8 8 0 0 1 3-15.72a48.16 48.16 0 0 1 38.77 42.64a8 8 0 0 1-7.22 8.71a6 6 0 0 1-.75 0a8 8 0 0 1-8-7.26A32.09 32.09 0 0 0 134 96.57m113.28 34.69c-.42.94-10.55 23.37-33.36 43.8a8 8 0 1 1-10.67-11.92a132.8 132.8 0 0 0 27.8-35.14a133.2 133.2 0 0 0-23.12-30.77C185.67 75.19 158.78 64 128 64a118.4 118.4 0 0 0-19.36 1.57A8 8 0 1 1 106 49.79A134 134 0 0 1 128 48c34.88 0 66.57 13.26 91.66 38.35c18.83 18.83 27.3 37.62 27.65 38.41a8 8 0 0 1 0 6.5Z"/>`);

// ── Kill Chain Phases (unique, others reuse above) ──────────────────

// mdi:radar
export const ICON_RECONNAISSANCE = mdi(`<path fill="currentColor" d="m19.07 4.93l-1.41 1.41A8 8 0 0 1 20 12a8 8 0 0 1-8 8a8 8 0 0 1-8-8c0-4.08 3.05-7.44 7-7.93v2.02C8.16 6.57 6 9.03 6 12a6 6 0 0 0 6 6a6 6 0 0 0 6-6c0-1.66-.67-3.16-1.76-4.24l-1.41 1.41C15.55 9.9 16 10.9 16 12a4 4 0 0 1-4 4a4 4 0 0 1-4-4c0-1.86 1.28-3.41 3-3.86v2.14c-.6.35-1 .98-1 1.72a2 2 0 0 0 2 2a2 2 0 0 0 2-2c0-.74-.4-1.38-1-1.72V2h-1A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10c0-2.76-1.12-5.26-2.93-7.07"/>`);

// icons8:door-opened (kept as tabler equivalent — stroke 24x24)
export const ICON_INITIAL_ACCESS = tabler(`<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 12v.01M3 21h18M5 21V5a2 2 0 0 1 2-2h6m4 10.5V21m4-14h-7m3-3l-3 3l3 3"/>`);

// mdi:database-search
export const ICON_COLLECTION = mdi(`<path fill="currentColor" d="M18.68 12.32a4.49 4.49 0 0 0-6.36.01a4.49 4.49 0 0 0 0 6.36a4.51 4.51 0 0 0 5.57.63L21 22.39L22.39 21l-3.09-3.11c1.13-1.77.87-4.09-.62-5.57m-1.41 4.95c-.98.98-2.56.97-3.54 0c-.97-.98-.97-2.56.01-3.54c.97-.97 2.55-.97 3.53 0c.97.98.97 2.56 0 3.54M10.9 20.1a6.5 6.5 0 0 1-1.48-2.32C6.27 17.25 4 15.76 4 14v3c0 2.21 3.58 4 8 4c-.4-.26-.77-.56-1.1-.9M4 9v3c0 1.68 2.07 3.12 5 3.7v-.2c0-.93.2-1.85.58-2.69C6.34 12.3 4 10.79 4 9m8-6C7.58 3 4 4.79 4 7c0 2 3 3.68 6.85 4h.05c1.2-1.26 2.86-2 4.6-2c.91 0 1.81.19 2.64.56A3.22 3.22 0 0 0 20 7c0-2.21-3.58-4-8-4"/>`);

// mdi:database-export
export const ICON_EXFILTRATION = mdi(`<path fill="currentColor" d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4c.5 0 1-.03 1.5-.08V9.5h2.89l-1-1L18.9 5c-1.4-1.2-3.96-2-6.9-2m6.92 4.08L17.5 8.5L20 11h-5v2h5l-2.5 2.5l1.42 1.42L23.84 12M4 9v3c0 1.68 2.07 3.12 5 3.7v-.2c0-.93.2-1.85.58-2.69C6.34 12.3 4 10.79 4 9m0 5v3c0 2.21 3.58 4 8 4c2.94 0 5.5-.8 6.9-2L17 17.1c-1.39.56-3.1.9-5 .9c-4.42 0-8-1.79-8-4"/>`);

// mdi:flash-alert
export const ICON_IMPACT = mdi(`<path fill="currentColor" d="M5 2v11h3v9l7-12h-4l4-8m2 13h2v2h-2zm0-8h2v6h-2z"/>`);

// ── Lookup Maps ─────────────────────────────────────────────────────

export const OUTCOME_ICONS: Record<string, IconDef> = {
  "safety-switch": ICON_SAFETY_SWITCH,
  "page-oncall": ICON_PAGE_ONCALL,
  "high-ticket": ICON_HIGH_TICKET,
  "low-ticket": ICON_LOW_TICKET,
  "informational": ICON_INFORMATIONAL,
};

export const CATEGORY_ICONS: Record<string, IconDef> = {
  "credential-attack": ICON_CREDENTIAL_ATTACK,
  "privilege-escalation": ICON_PRIVILEGE_ESCALATION,
  "privilege-accumulation": ICON_PRIVILEGE_ACCUMULATION,
  "data-exfiltration": ICON_DATA_EXFILTRATION,
  "lateral-movement": ICON_LATERAL_MOVEMENT,
  "persistence": ICON_PERSISTENCE,
  "audit-tampering": ICON_AUDIT_TAMPERING,
  "after-hours": ICON_AFTER_HOURS,
  "break-glass": ICON_BREAK_GLASS,
  "shared-account": ICON_SHARED_ACCOUNT,
  "service-account-misuse": ICON_SERVICE_ACCOUNT_MISUSE,
  "network-exposure": ICON_NETWORK_EXPOSURE,
  "destructive-action": ICON_DESTRUCTIVE_ACTION,
  "coverage-gap": ICON_COVERAGE_GAP,
};

export const KILL_CHAIN_ICONS: Record<string, IconDef> = {
  "reconnaissance": ICON_RECONNAISSANCE,
  "initial-access": ICON_INITIAL_ACCESS,
  "persistence": ICON_PERSISTENCE,
  "privilege-escalation": ICON_PRIVILEGE_ESCALATION,
  "lateral-movement": ICON_LATERAL_MOVEMENT,
  "collection": ICON_COLLECTION,
  "exfiltration": ICON_EXFILTRATION,
  "impact": ICON_IMPACT,
};

function SvgIcon({ icon, size = 14 }: { icon: IconDef; size?: number }) {
  return <svg viewBox={icon.viewBox} width={size} height={size} dangerouslySetInnerHTML={{ __html: icon.body }} />;
}

function svgIconComponent(icon: IconDef): ComponentType<{ className?: string }> {
  return ({ className }: { className?: string }) => (
    <svg viewBox={icon.viewBox} width="14" height="14" className={className} dangerouslySetInnerHTML={{ __html: icon.body }} />
  );
}

type Severity = "critical" | "high" | "medium" | "low" | "info";
type Platform = "sql-server" | "kubernetes" | "aws" | "azure" | "mission-control";
type Outcome = "safety-switch" | "page-oncall" | "high-ticket" | "low-ticket" | "informational";

interface Identity { name: string; type: string; displayName?: string }
interface Endpoint { ip?: string; hostname?: string; type?: string; network?: string; tags?: string[] }
interface AppRef { name: string; type?: string; tags?: string[] }
interface Resource { name: string; type: string; scope?: string; tags?: string[] }

interface Actor {
  identity?: Identity;
  endpoint?: Endpoint;
  app?: AppRef;
  resource?: Resource;
}

interface AuditSample {
  timestamp: string;
  action: string;
  detail?: string;
  succeeded?: boolean;
  src?: Actor;
  dst?: Actor;
}

interface DataSource {
  type?: string; connection?: string; path?: string; query?: string;
  timeRange?: { start: string; end: string; durationSeconds?: number };
  git?: { sha?: string; repo?: string; file?: string; branch?: string };
}

interface AuditFinding {
  title: string; severity: Severity; platform: Platform; category: string; outcome: Outcome;
  detection: { pattern: string; threshold?: string };
  dataSource?: DataSource;
  evidence: {
    summary: string;
    timeRange?: { start: string; end: string; durationSeconds?: number };
    metrics?: Record<string, number>;
    samples?: AuditSample[];
  };
  recommendation: { action: string; mitigations?: string[]; references?: string[] };
  context?: {
    killChainPhase?: string; mitreTechnique?: string; compliance?: string[];
    relatedFindings?: string[];
    baseline?: { normalValue?: number; observedValue?: number; deviationFactor?: number; baselinePeriod?: string };
  };
  provenance?: { generatedAt?: string; generatedBy?: string; version?: string; runId?: string; model?: string };
}

/* ── Style Maps ─────────────────────────────────────────── */

const SEVERITY_STYLES: Record<Severity, { className: string; dot: string; border: string; order: number; color: "red" | "orange" | "yellow" | "blue" | "gray" }> = {
  critical: { className: "bg-red-50 text-red-700", dot: "bg-red-500", border: "border border-l-2 border-l-red-500 border-gray-200", order: 0, color: "red" },
  high: { className: "bg-orange-50 text-orange-700", dot: "bg-orange-500", border: "border border-l-2 border-l-orange-500 border-gray-200", order: 1, color: "orange" },
  medium: { className: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500", border: "border border-l-2 border-l-yellow-500 border-gray-200", order: 2, color: "yellow" },
  low: { className: "bg-blue-50 text-blue-700", dot: "bg-blue-400", border: "border border-l-2 border-l-blue-300 border-gray-200", order: 3, color: "blue" },
  info: { className: "bg-gray-50 text-gray-600", dot: "bg-gray-400", border: "border border-l-2 border-l-gray-300 border-gray-200", order: 4, color: "gray" },
};

const OUTCOME_STYLES: Record<Outcome, { className: string; icon: ComponentType<{ className?: string }>; label: string }> = {
  "safety-switch": { className: "bg-gray-50 text-red-900 border border-gray-200", icon: svgIconComponent(OUTCOME_ICONS["safety-switch"]), label: "Kill Switch" },
  "page-oncall": { className: "bg-gray-50 text-red-600 border border-gray-200", icon: svgIconComponent(OUTCOME_ICONS["page-oncall"]), label: "Page On-Call" },
  "high-ticket": { className: "bg-gray-50 text-orange-600 border border-gray-200", icon: svgIconComponent(OUTCOME_ICONS["high-ticket"]), label: "High Priority" },
  "low-ticket": { className: "bg-gray-50 text-yellow-700 border border-gray-200", icon: svgIconComponent(OUTCOME_ICONS["low-ticket"]), label: "Track Issue" },
  "informational": { className: "bg-gray-50 text-gray-500 border border-gray-200", icon: svgIconComponent(OUTCOME_ICONS["informational"]), label: "Log Only" },
};

const PLATFORM_LABELS: Record<Platform, string> = {
  "sql-server": "SQL Server", kubernetes: "Kubernetes", aws: "AWS", azure: "Azure", "mission-control": "Mission Control",
};

const PLATFORM_ICONS: Record<Platform, ComponentType<{ className?: string }>> = {
  "sql-server": Sqlserver, kubernetes: K8S, aws: Aws, azure: Azure, "mission-control": MissionControl,
};

/* ── Mapping helpers ────────────────────────────────────── */

function severityBadge(s: Severity) {
  return { label: s, className: SEVERITY_STYLES[s].className, dot: SEVERITY_STYLES[s].dot };
}

function outcomeBadge(o: Outcome) {
  const s = OUTCOME_STYLES[o];
  return { label: s.label, className: s.className, icon: s.icon };
}

const CATEGORY_ICON_COMPONENTS: Record<string, ComponentType<{ className?: string }>> = Object.fromEntries(
  Object.entries(CATEGORY_ICONS).map(([k, v]) => [k, svgIconComponent(v)])
);

function findingTags(f: AuditFinding) {
  const tags: { label: string; className?: string; icon?: ComponentType<{ className?: string }> }[] = [
    { label: f.category, className: "bg-gray-100 text-gray-500", icon: CATEGORY_ICON_COMPONENTS[f.category] },
    { label: PLATFORM_LABELS[f.platform], className: "bg-gray-100 text-gray-500", icon: PLATFORM_ICONS[f.platform] },
  ];
  if (f.context?.killChainPhase) tags.push({ label: f.context.killChainPhase, className: "bg-purple-50 text-purple-600" });
  if (f.context?.mitreTechnique) tags.push({ label: `MITRE ${f.context.mitreTechnique}`, className: "bg-purple-50 text-purple-600" });
  f.context?.compliance?.forEach((c) => tags.push({ label: c, className: "bg-green-50 text-green-600" }));
  f.context?.relatedFindings?.forEach((r) => tags.push({ label: `→ ${r}`, className: "font-mono bg-gray-100 text-gray-600" }));
  return tags;
}

function findingEntities(f: AuditFinding): Entity[] {
  const seen = new Set<string>();
  const entities: Entity[] = [];
  for (const s of f.evidence.samples || []) {
    for (const actor of [s.src, s.dst].filter(Boolean) as Actor[]) {
      if (actor.identity && !seen.has(actor.identity.name)) {
        seen.add(actor.identity.name);
        entities.push({ name: actor.identity.displayName || actor.identity.name, type: actor.identity.type, className: "font-mono bg-gray-100 text-gray-700" });
      }
      if (actor.endpoint?.ip && !seen.has(actor.endpoint.ip)) {
        seen.add(actor.endpoint.ip);
        entities.push({ name: actor.endpoint.ip, type: actor.endpoint.type || "ip", className: "font-mono bg-gray-100 text-gray-700" });
      }
      if (actor.resource && !seen.has(actor.resource.name)) {
        seen.add(actor.resource.name);
        entities.push({ name: actor.resource.name, type: actor.resource.type, scope: actor.resource.scope, className: "bg-blue-50 text-blue-700" });
      }
    }
  }
  return entities;
}

function findingMetrics(f: AuditFinding): Record<string, string | number> | undefined {
  const m: Record<string, string | number> = { ...f.evidence.metrics };
  if (f.context?.baseline?.deviationFactor) m["Deviation"] = `${f.context.baseline.deviationFactor}x`;
  return Object.keys(m).length > 0 ? m : undefined;
}

function findingSamples(f: AuditFinding): Sample[] | undefined {
  return f.evidence.samples?.map((s) => ({
    timestamp: s.timestamp,
    identity: s.src?.identity?.name,
    action: s.action,
    sourceIP: s.src?.endpoint?.ip,
    resource: s.dst?.resource?.name,
    detail: s.detail,
    succeeded: s.succeeded,
  }));
}


/* ── Pages ──────────────────────────────────────────────── */

const OUTCOME_TAG_MAPPING = (key: string, value: unknown) => {
  if (key !== "outcome") return "";
  const s = OUTCOME_STYLES[value as Outcome];
  return s ? s.className : "";
};

function countBy(items: AuditFinding[], key: (f: AuditFinding) => string): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const f of items) { const v = key(f); map.set(v, (map.get(v) || 0) + 1); }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

function BreakdownTable({ title, rows, iconMap }: {
  title: string;
  rows: { name: string; count: number }[];
  iconMap?: (value: unknown) => ReactNode;
}) {
  return (
    <ListTable
      title={title}
      rows={rows}
      subject="name"
      icon={iconMap ? "name" : undefined}
      iconMap={iconMap}
      keys={["count"]}
      size="xs"
    />
  );
}

interface ReportMetadata {
  reportingWindow?: string;
  environment?: string;
  audience?: string;
  classification?: string;
  scope?: string;
  preparedBy?: string;
}

function MetadataBlock({ metadata, findings }: { metadata: ReportMetadata; findings: AuditFinding[] }) {
  const platforms = [...new Set(findings.map((f) => PLATFORM_LABELS[f.platform]))].join(", ");
  const generatedDate = new Date().toLocaleDateString("en-ZA", { dateStyle: "long" });
  const entries: [string, string][] = [
    ["Reporting Window", metadata.reportingWindow || "Last 30 days"],
    ["Source Systems", platforms],
    ...(metadata.environment ? [["Environment", metadata.environment] as [string, string]] : []),
    ["Generated", generatedDate],
    ["Classification", metadata.classification || "Internal"],
    ...(metadata.audience ? [["Intended Audience", metadata.audience] as [string, string]] : []),
    ...(metadata.preparedBy ? [["Prepared By", metadata.preparedBy] as [string, string]] : []),
  ];

  return (
    <div className="border border-gray-200 rounded p-3 mb-6">
      {metadata.scope && <p className="text-xs text-gray-700 mb-2">{metadata.scope}</p>}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {entries.map(([label, value]) => (
          <div key={label} className="flex gap-2 text-xs">
            <span className="text-gray-400 whitespace-nowrap">{label}:</span>
            <span className="text-gray-900 font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryContent({ findings, metadata }: { findings: AuditFinding[]; metadata?: ReportMetadata }) {
  const sorted = [...findings].sort((a, b) => SEVERITY_STYLES[a.severity].order - SEVERITY_STYLES[b.severity].order);
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;

  const outcomeCounts = countBy(findings, (f) => OUTCOME_STYLES[f.outcome].label);
  const platformCounts = countBy(findings, (f) => PLATFORM_LABELS[f.platform]);
  const severityCounts = countBy(findings, (f) => f.severity);
  const categoryCounts = countBy(findings, (f) => f.category);

  const summaryRows = sorted.map((f, i) => ({
    id: `#${i + 1}`,
    title: f.title,
    severity: f.severity,
    outcome: OUTCOME_STYLES[f.outcome].label,
    platform: PLATFORM_LABELS[f.platform],
    summary: f.evidence.summary,
  }));

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Audit Findings Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generated {new Date().toLocaleDateString("en-ZA", { dateStyle: "long" })} · {findings.length} findings
        </p>
      </div>

      {metadata && <MetadataBlock metadata={metadata} findings={findings} />}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <SeverityStatCard color="red" value={criticalCount} label="Critical" />
        <SeverityStatCard color="orange" value={highCount} label="High" />
        <SeverityStatCard color="yellow" value={mediumCount} label="Medium" />
        <SeverityStatCard color="gray" value={findings.length} label="Total" />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <BreakdownTable title="By Outcome" rows={outcomeCounts} iconMap={(v) => {
          const o = Object.entries(OUTCOME_STYLES).find(([, s]) => s.label === v);
          return o ? <SvgIcon icon={OUTCOME_ICONS[o[0]]} /> : null;
        }} />
        <BreakdownTable title="By Platform" rows={platformCounts} />
        <BreakdownTable title="By Severity" rows={severityCounts} />
        <BreakdownTable title="By Category" rows={categoryCounts} iconMap={(v) => {
          const icon = CATEGORY_ICONS[v as string];
          return icon ? <SvgIcon icon={icon} /> : null;
        }} />
      </div>

      <ListTable
        title="All Findings"
        rows={summaryRows}
        subject="title"
        body="summary"
        primaryTags={["severity", "outcome"]}
        tagMapping={[OUTCOME_TAG_MAPPING]}
        keys={["platform"]}
        size="sm"
      />
    </>
  );
}

/* ── Main Export ─────────────────────────────────────────── */

export default function FindingsReport(props: Record<string, unknown>) {
  const data = (props.data ?? props) as Record<string, unknown>;
  const findings: AuditFinding[] = Array.isArray(data.findings) ? data.findings
    : Array.isArray(data) ? data : [];
  const metadata: ReportMetadata | undefined = data.metadata ? data.metadata as ReportMetadata : {
    reportingWindow: "2026-02-15 — 2026-03-15",
    environment: "Production",
    classification: "Confidential",
    audience: "Security Operations",
    preparedBy: "Flanksource Mission Control",
    scope: "Automated analysis of audit logs across SQL Server, Kubernetes, and AWS environments.",
  };
  const sorted = [...findings].sort((a, b) => SEVERITY_STYLES[a.severity].order - SEVERITY_STYLES[b.severity].order);
  const classification = metadata?.classification || "Internal";
  const reportDate = new Date().toLocaleDateString("en-ZA", { dateStyle: "long" });

  return (
    <>
      <Header type="default" height={10}>
        <div className="flex items-center justify-between px-4 h-full bg-[#1e293b]">
          <MissionControlLogo height="7mm" width="35mm" className="filter grayscale brightness-[250] contrast-100 mix-blend-screen" />
          <span className="text-[9pt] text-white/80">Audit Findings Report</span>
        </div>
      </Header>
      <Footer type="default" height={8}>
        <div className="flex items-center justify-between px-4 h-full border-t border-gray-200 text-[7pt] text-gray-400">
          <span className="uppercase tracking-wide font-semibold">{classification}</span>
          <span>{reportDate}</span>
          <PageNo format="Page ${page} of ${total}" />
        </div>
      </Footer>

      <Page margins={{ top: 10, bottom: 10, left: 5, right: 5 }}>
        <SummaryContent findings={findings} metadata={metadata} />

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Detailed Findings</h2>
          {sorted.map((f, i) => (
            <Finding
              key={i}
              id={`###${i + 1}`}
              title={f.title}
              typeIcon={CATEGORY_ICONS[f.category] ? <SvgIcon icon={CATEGORY_ICONS[f.category]} size={16} /> : undefined}
              summary={f.evidence.summary}
              className={SEVERITY_STYLES[f.severity].border}
              severity={severityBadge(f.severity)}
              outcome={outcomeBadge(f.outcome)}
              tags={findingTags(f)}
              timeRange={f.evidence.timeRange}
              metrics={findingMetrics(f)}
              entities={findingEntities(f)}
              samples={findingSamples(f)}
              recommendation={f.recommendation.action}
              mitigations={f.recommendation.mitigations}
              variant="detail"
            />
          ))}
        </div>
      </Page>
    </>
  );
}
