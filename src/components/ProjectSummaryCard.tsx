import React from 'react';
import Shield from './Shield';
import ScoreGauge from './ScoreGauge';
import IconGithub from '~icons/mdi/github';
import IconTrendingUp from '~icons/ion/trending-up-outline';
import IconTrendingDown from '~icons/ion/trending-down-outline';
import IconArrowUp from '~icons/ion/arrow-up';
import IconArrowDown from '~icons/ion/arrow-down';

interface ProjectSummaryCardProps {
  icon?: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  security: any;
  githubUrl: string;
  className?: string;
}

/**
 * Compact summary card for additional projects showing key security metrics
 */
export default function ProjectSummaryCard({
  icon: Icon,
  name,
  description,
  security,
  githubUrl,
  className = ''
}: ProjectSummaryCardProps) {
  const scorecard = security.scorecard || {};
  const github = security.github || {};

  // Calculate passing checks
  const passingChecks = scorecard.checks?.filter((c: any) => c.score >= 5).length || 0;
  const totalChecks = scorecard.checks?.length || 0;
  const passRate = totalChecks > 0 ? ((passingChecks / totalChecks) * 100).toFixed(0) : 0;

  // Get severity counts and trend data
  const severity = github.severity || { critical: 0, high: 0, medium: 0, low: 0 };
  const totalAlerts = github.totalCount || 0;
  const trend = github.trend;

  // Calculate overall trend
  const totalAdded = trend ? trend.recentlyAdded || 0 : 0;
  const totalClosed = trend ? trend.recentlyClosed || 0 : 0;
  const totalDelta = totalAdded - totalClosed;

  return (
    <div className={`border border-gray-300 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-6 h-6 text-gray-700 flex-shrink-0" />}
        <h3 className="text-lg font-bold text-gray-900 flex-1">{name}</h3>
        <ScoreGauge score={scorecard.score || 0} size="sm" />
      </div>
      <p className="text-xs text-gray-600 mb-2">{description}</p>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <IconGithub className="w-3 h-3" />
          {security.repo.name}
        </a>
        <span className="text-gray-400">•</span>
        <Shield
          label="OpenSSF"
          value={`${scorecard.score && scorecard.score % 1 === 0 ? scorecard.score : scorecard.score?.toFixed(1) || 0}`}
          href={`https://scorecard.dev/viewer/?uri=github.com/${security.repo.org}/${security.repo.repo}`}
          theme={scorecard.score >= 7 ? 'success' : scorecard.score >= 4 ? 'warning' : 'error'}
          size="h-4"
        />
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 rounded p-2">
            <div className="text-gray-600 mb-1">Security Checks</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700 font-medium">
                {passingChecks}/{totalChecks}
              </span>
              <div className="relative flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full ${
                    Number(passRate) >= 70 ? 'bg-green-600' :
                    Number(passRate) >= 50 ? 'bg-yellow-500' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${passRate}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{passRate}%</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="text-gray-600">Open Alerts</div>
              {trend && (totalAdded > 0 || totalClosed > 0 || totalDelta !== 0) && (
                <div className="flex items-center gap-1.5 text-xs">
                  {totalAdded > 0 && (
                    <div className="text-red-600 flex items-center gap-0.5">
                      <IconArrowUp className="w-3 h-3" />
                      <span>{totalAdded}</span>
                    </div>
                  )}
                  {totalClosed > 0 && (
                    <div className="text-green-600 flex items-center gap-0.5">
                      <IconArrowDown className="w-3 h-3" />
                      <span>{totalClosed}</span>
                    </div>
                  )}
                  {totalDelta !== 0 && (
                    <div className={`font-semibold flex items-center gap-0.5 ${totalDelta <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {totalDelta < 0 ? (
                        <IconTrendingDown className="w-3 h-3" />
                      ) : (
                        <IconTrendingUp className="w-3 h-3" />
                      )}
                      <span>{Math.abs(totalDelta)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="font-semibold text-gray-900">
              {totalAlerts} total
              {totalAlerts > 0 && (
                <div className="flex gap-1 mt-1">
                  {severity.critical > 0 && (
                    <Shield value={`${severity.critical}C`} theme="error" size="h-3" />
                  )}
                  {severity.high > 0 && (
                    <Shield value={`${severity.high}H`} theme="high" size="h-3" />
                  )}
                  {severity.medium > 0 && (
                    <Shield value={`${severity.medium}M`} theme="warning" size="h-3" />
                  )}
                  {severity.low > 0 && (
                    <Shield value={`${severity.low}L`} theme="info" size="h-3" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
