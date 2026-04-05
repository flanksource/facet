import React from 'react';

export interface AIModelCardProps {
  name: string;
  model: string;
  tokensUsed: number;
  cost: number;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'card' | 'compact' | 'bordered';
  className?: string;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toFixed(0);
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

export default function AIModelCard({
  name,
  model,
  tokensUsed,
  cost,
  icon: Icon,
  variant = 'card',
  className = '',
}: AIModelCardProps) {
  const base = 'flex flex-col gap-3';

  const variantClasses = {
    card: 'bg-white rounded-lg p-5 shadow-sm',
    compact: 'bg-white rounded-lg p-3',
    bordered: 'bg-white rounded-lg p-5 border border-gray-200',
  };

  return (
    <div className={`${base} ${variantClasses[variant]} ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-gray-500" />}
        <span className="text-sm font-semibold text-gray-900">{name}</span>
      </div>

      <div className="text-xs text-gray-500 font-mono">{model}</div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Tokens</span>
          <span className="text-lg font-bold text-gray-900">{formatTokens(tokensUsed)}</span>
        </div>
        <div className="w-px h-8 bg-gray-200" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Cost</span>
          <span className="text-lg font-bold text-blue-600">{formatCost(cost)}</span>
        </div>
      </div>
    </div>
  );
}
