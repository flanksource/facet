import type { TaskSummary } from '../types/billing';
import { MdCheckBox as IconCheckbox, MdCheckBoxOutlineBlank as IconCheckboxUnchecked } from 'react-icons/md';
import { IoGitBranchOutline as IconGitBranch } from 'react-icons/io5';

interface TaskSummarySectionProps {
  tasks: TaskSummary[];
}

const STATUS_COLORS: Record<string, string> = {
  'Completed': 'bg-green-100 text-green-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Not Started': 'bg-gray-100 text-gray-600',
  'Blocked': 'bg-red-100 text-red-800',
  'On Hold': 'bg-yellow-100 text-yellow-800',
  'Cancelled': 'bg-gray-200 text-gray-500',
  'Planned': 'bg-purple-100 text-purple-800',
  'Started': 'bg-blue-100 text-blue-700',
};

const THEME_COLORS: Record<string, string> = {
  'CICD': 'border-purple-400',
  'CLI Tools': 'border-green-400',
  'Terraform': 'border-purple-500',
  'GKE': 'border-blue-400',
  'Cost Management': 'border-orange-400',
  'Compliance': 'border-red-400',
  'Backup': 'border-green-500',
  'Bazel': 'border-blue-500',
  'AWS': 'border-orange-500',
  'Clickhouse': 'border-yellow-500',
  'Grafana': 'border-orange-600',
  'Kubernetes': 'border-blue-500',
  'OpenShift': 'border-red-500',
  'Postgres': 'border-blue-600',
  'Security': 'border-red-600',
  'VMware': 'border-gray-500',
  'Custom': 'border-gray-400',
  'Temporal': 'border-purple-600',
  'Anyscale': 'border-purple-400',
  'SLURM': 'border-indigo-500',
};

export default function TaskSummarySection({ tasks }: TaskSummarySectionProps) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Tasks & Milestones</h3>

      <div className="space-y-3">
        {tasks.map((task, idx) => (
          <div
            key={idx}
            className={`border-l-4 ${THEME_COLORS[task.theme] || 'border-gray-300'} bg-gray-50 p-3 rounded-r`}
          >
            {/* Task Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {task.status === 'Completed' ? (
                    <IconCheckbox className="w-4 h-4 text-green-600" />
                  ) : (
                    <IconCheckboxUnchecked className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="font-semibold text-sm text-gray-900">{task.theme}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-600'}`}>
                    {task.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 ml-6">{task.description}</p>
              </div>

              {/* Commit Stats */}
              {task.commits && (
                <div className="flex items-center gap-2 text-xs text-gray-600 ml-4">
                  <IconGitBranch className="w-4 h-4" />
                  <span className="font-semibold">{task.commits.count}</span>
                  {task.commits.additions && (
                    <span className="text-green-600">+{task.commits.additions}</span>
                  )}
                  {task.commits.deletions && (
                    <span className="text-red-600">-{task.commits.deletions}</span>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            {task.notes && (
              <div className="text-xs text-gray-600 ml-6 mt-2">
                {typeof task.notes === 'string' ? <p>{task.notes}</p> : task.notes}
              </div>
            )}

            {/* Achievements */}
            {task.achievements && task.achievements.length > 0 && (
              <div className="ml-6 mt-2">
                <ul className="text-xs text-gray-700 space-y-1">
                  {task.achievements.map((achievement, aidx) => (
                    <li key={aidx} className="flex gap-2">
                      <span className="text-green-600">✓</span>
                      <span>{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
