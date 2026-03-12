import React from 'react';
import Shield from './Shield';
import CompactTable from './CompactTable';
import type { TableSize } from './CompactTable';
import {
  IoCheckmarkCircle as IconCheck,
  IoCheckmark as IconCheckLight,
  IoWarningOutline as IconWarning,
  IoCloseCircle as IconClose
} from 'react-icons/io5';

interface SecurityCheck {
  name: string;
  score: number;
  reason: string;
  details?: string[];
  documentation?: { url: string };
}

interface ParsedDetail {
  level: 'Info' | 'Warn';
  message: string;
  file?: string;
  line?: number;
  count?: number;
}

interface SecurityChecksTableProps {
  checks: SecurityCheck[];
  className?: string;
  size?: TableSize;
}

const IGNORE_PATTERNS = [
  "badge detected: passing",
  "update tool detected",
  "no binaries found in the repo",
  "update your workflow using https://",
  "no significant issues found",
  "dependency not pinned by hash detected -- score normalized to 5",
  "sast tool is not run on all commits -- score normalized to 0",
  "non read-only tokens detected in github workflows",
  "security policy file detected",
  "check passed successfully",
  "no binaries found",
  "no badge detected",
  "no GitHub publishing workflow detected",
  "no dangerous workflow patterns detected",
  "no dangerous workflow patterns",
  "no secrets detected in the codebase",
  "no secrets detected",
  "no issues detected",
  "no vulnerabilities found",
  "project is not fuzzed",
  "project does not have a fuzzing",
  "license file not detected",
  "no published package detected",
  "no effort to publish",
  "license file detected",
  "packaging workflow not detected",
  "no dependencies found",
  "no workflow found",
  "no codeql queries found",
  "no security policies found",
  "no maintainers found",
  "SAST tool is run on all commits",
  "no active committers found",
  "uses github's merge queue",
  "no github actions workflows",
  "no detected",
  "update tool detected",
  "check could not run",
  "no fuzzer integrations found"
];

function Reason(reason: string) {
  if (!reason) return null;
  for (const pattern of IGNORE_PATTERNS) {
    if (reason.toLowerCase().includes(pattern)) return '';
  }
  return <div className="text-xs text-gray-600 mt-1">{reason}</div>;
}

function sortDetailsByLevel(details: ParsedDetail[]): ParsedDetail[] {
  return details.sort((a, b) => {
    if (a.level === 'Warn' && b.level === 'Info') return -1;
    if (a.level === 'Info' && b.level === 'Warn') return 1;
    return 0;
  });
}

function parseDetails(details: string[] | undefined, checkName: string): ParsedDetail[] {
  if (!details || details.length === 0) return [];
  const filtered = details.filter(d => {
    const lower = d.toLowerCase();
    return !IGNORE_PATTERNS.some(pattern => lower.includes(pattern));
  });

  let parsedDetails: ParsedDetail[];
  switch (checkName) {
    case 'License': parsedDetails = parseLicenseDetails(filtered); break;
    case 'Packaging': parsedDetails = parsePackagingDetails(filtered); break;
    case 'Branch-Protection': parsedDetails = parseBranchProtectionDetails(filtered); break;
    case 'Pinned-Dependencies': parsedDetails = parsePinnedDependenciesDetails(filtered); break;
    case 'Signed-Releases': parsedDetails = parseSignedReleasesDetails(filtered); break;
    case 'Vulnerabilities': parsedDetails = parseVulnerabilitiesDetails(filtered); break;
    default: parsedDetails = parseGenericDetails(filtered);
  }
  return sortDetailsByLevel(parsedDetails);
}

function parseLicenseDetails(details: string[]): ParsedDetail[] {
  const result: ParsedDetail[] = [];
  details.forEach(detail => {
    const match = detail.match(/^(Info|Warn):\s*(.+)$/);
    if (!match) return;
    const [, level, content] = match;
    const licenseMatch = content.match(/FSF or OSI recognized license:\s*(.+?):/);
    if (licenseMatch) {
      result.push({ level: 'Info', message: licenseMatch[1] });
      return;
    }
    if (content.includes('project has a license file')) return;
    result.push({ level: level as 'Info' | 'Warn', message: content });
  });
  return result;
}

function parsePackagingDetails(details: string[]): ParsedDetail[] {
  const result: ParsedDetail[] = [];
  details.forEach(detail => {
    const match = detail.match(/^(Info|Warn):\s*(.+)$/);
    if (!match) return;
    const [, , content] = match;
    const packagingMatch = content.match(/Project packages its releases by way of (.+?)\.:\s*(.+?):/);
    if (packagingMatch) {
      const fileName = packagingMatch[2].split('/').pop() || packagingMatch[2];
      result.push({ level: 'Info', message: `${packagingMatch[1]}: ${fileName}` });
      return;
    }
    result.push({ level: 'Info', message: content });
  });
  return result;
}

function parseBranchProtectionDetails(details: string[]): ParsedDetail[] {
  const result: ParsedDetail[] = [];
  details.forEach(detail => {
    const match = detail.match(/^(Info|Warn):\s*(.+)$/);
    if (!match) return;
    const [, level, content] = match;
    result.push({ level: level as 'Info' | 'Warn', message: content.replace(/\s+on branch '[^']+'/g, '') });
  });
  return result;
}

function parsePinnedDependenciesDetails(details: string[]): ParsedDetail[] {
  const fileCount = new Map<string, { count: number; type: string; level: 'Info' | 'Warn' }>();
  details.forEach(detail => {
    const match = detail.match(/^(Info|Warn):\s*(.+?):\s*(.+?):(\d+):/);
    if (!match) return;
    const [, level, issueType, file] = match;
    if (fileCount.has(file)) {
      fileCount.get(file)!.count++;
    } else {
      fileCount.set(file, { count: 1, type: issueType, level: level as 'Info' | 'Warn' });
    }
  });
  return Array.from(fileCount.entries()).map(([file, data]) => ({
    level: data.level, message: data.type, file, count: data.count,
  }));
}

function parseSignedReleasesDetails(details: string[]): ParsedDetail[] {
  const unsigned = details.filter(d => d.includes('not signed'));
  if (unsigned.length === 0) return [];
  return [{ level: 'Warn', message: `${unsigned.length} unsigned release artifact${unsigned.length > 1 ? 's' : ''}`, count: unsigned.length }];
}

function parseVulnerabilitiesDetails(details: string[]): ParsedDetail[] {
  const result: ParsedDetail[] = [];
  details.forEach(detail => {
    const match = detail.match(/^Warn:\s*Project is vulnerable to:\s*(.+)$/);
    if (!match) return;
    const ids = match[1].split(/\s*\/\s*/);
    const links = ids.map(id => {
      if (id.startsWith('GHSA-')) return `<a href="https://github.com/advisories/${id}" target="_blank" class="text-blue-600 hover:underline">${id}</a>`;
      if (id.startsWith('GO-')) return `<a href="https://pkg.go.dev/vuln/${id}" target="_blank" class="text-blue-600 hover:underline">${id}</a>`;
      if (id.startsWith('CVE-')) return `<a href="https://nvd.nist.gov/vuln/detail/${id}" target="_blank" class="text-blue-600 hover:underline">${id}</a>`;
      return id;
    }).join(' / ');
    result.push({ level: 'Warn', message: links });
  });
  return result;
}

function parseGenericDetails(details: string[]): ParsedDetail[] {
  const grouped = new Map<string, ParsedDetail>();
  details.forEach(detail => {
    const match = detail.match(/^(Info|Warn):\s*(.+)$/);
    if (!match) return;
    const [, level, content] = match;
    const fileMatch = content.match(/^(.+?):\s*(.+?):(\d+):/);
    if (fileMatch) {
      const [, issueType, file, line] = fileMatch;
      const key = `${file}:${issueType}`;
      if (grouped.has(key)) {
        grouped.get(key)!.count = (grouped.get(key)!.count || 1) + 1;
      } else {
        grouped.set(key, { level: level as 'Info' | 'Warn', message: issueType, file, line: parseInt(line, 10), count: 1 });
      }
    } else {
      if (!grouped.has(content)) {
        grouped.set(content, { level: level as 'Info' | 'Warn', message: content });
      }
    }
  });
  return Array.from(grouped.values());
}

function CheckCell({ check }: { check: SecurityCheck }) {
  const parsedDetails = parseDetails(check.details, check.name);
  return (
    <>
      <div className="font-medium text-gray-900">
        {check.documentation?.url ? (
          <a href={check.documentation.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {check.name}
          </a>
        ) : check.name}
      </div>
      {Reason(check.reason)}
      {parsedDetails.length > 0 && (
        <ul className="text-xs text-gray-500">
          {parsedDetails.map((detail, idx) => (
            <li key={idx} className="flex items-start">
              {detail.level === 'Warn' && <span className="text-yellow-600"><IconWarning /></span>}
              {detail.level === 'Info' && <span className="text-green-600"><IconCheckLight /></span>}
              <span>
                <span dangerouslySetInnerHTML={{ __html: detail.message }} />
                {detail.file && (
                  <span className="text-gray-400">
                    {' '}in <span className="font-mono">{detail.file}</span>
                    {detail.line && <span>:{detail.line}</span>}
                  </span>
                )}
                {detail.count && detail.count > 1 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded font-semibold">
                    x{detail.count}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function getCheckIcon(score: number) {
  if (score >= 7) return <IconCheck className="w-4 h-4 text-green-600" />;
  if (score >= 4) return <IconWarning className="w-4 h-4 text-yellow-600" />;
  return <IconClose className="w-4 h-4 text-red-600" />;
}

function getCheckTheme(score: number): 'success' | 'warning' | 'error' {
  if (score >= 7) return 'success';
  if (score >= 4) return 'warning';
  return 'error';
}

export default function SecurityChecksTable({
  checks = [],
  className = '',
  size,
}: SecurityChecksTableProps) {
  if (!checks || checks.length === 0) {
    return <div className="text-center text-gray-500 py-4">No security check data available</div>;
  }

  const rows: React.ReactNode[][] = checks.map(check => [
    getCheckIcon(check.score),
    <CheckCell check={check} />,
    <Shield
      value={check.score % 1 === 0 ? check.score.toString() : check.score.toFixed(1)}
      theme={getCheckTheme(check.score)}
      size="h-5"
      className="inline-flex"
    />,
  ]);

  return (
    <div className={`overflow-x-auto ${className}`}>
      <CompactTable variant="reference" columns={["", "Check", "Score"]} data={rows} size={size} />
    </div>
  );
}
