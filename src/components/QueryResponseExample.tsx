import QueryResponseChat from './QueryResponseChat';
import QueryResponseTerminal from './QueryResponseTerminal';

export interface MCPToolCall {
  tool: string;
  description: string;
  result?: string;
}

interface QueryResponseExampleProps {
  userQuery: string;
  mcpTools?: MCPToolCall[];
  aiResponse: string;
  variant?: 'chat' | 'terminal' | 'both';
  compact?: boolean;
  title?: string;
}

/**
 * QueryResponseExample Component
 *
 * Wrapper component for displaying AI query/response interactions.
 * Supports multiple visualization styles: chat bubbles, terminal, or both.
 * Can show or hide MCP tool calls via compact mode.
 *
 * Usage:
 * <QueryResponseExample
 *   title="Example: Incident Troubleshooting"
 *   userQuery="Why is the payment-service pod crashing?"
 *   mcpTools={[
 *     { tool: "search_catalog", description: "Found 3 replicas, 2 in CrashLoopBackOff" },
 *     { tool: "query_health_checks", description: "HTTP check failing with 500 errors" },
 *     { tool: "search_catalog_changes", description: "ConfigMap updated 18 minutes ago" }
 *   ]}
 *   aiResponse="The payment-service pods are crashing because the ConfigMap update changed the database connection pool size from 10 to 100, exceeding the database's max_connections limit."
 *   variant="both"
 *   compact={false}
 * />
 */
export default function QueryResponseExample({
  userQuery,
  mcpTools,
  aiResponse,
  variant = 'both',
  compact = false,
  title
}: QueryResponseExampleProps) {
  return (
    <div className="my-6 p-5 bg-gray-50 border border-gray-200 rounded">
      {title && <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>}

      {variant === 'chat' && (
        <QueryResponseChat
          userQuery={userQuery}
          mcpTools={mcpTools}
          aiResponse={aiResponse}
          compact={compact}
        />
      )}

      {variant === 'terminal' && (
        <QueryResponseTerminal
          userQuery={userQuery}
          mcpTools={mcpTools}
          aiResponse={aiResponse}
          compact={compact}
        />
      )}

      {variant === 'both' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Chat Interface</h4>
            <QueryResponseChat
              userQuery={userQuery}
              mcpTools={mcpTools}
              aiResponse={aiResponse}
              compact={compact}
            />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Terminal/CLI</h4>
            <QueryResponseTerminal
              userQuery={userQuery}
              mcpTools={mcpTools}
              aiResponse={aiResponse}
              compact={compact}
            />
          </div>
        </div>
      )}

      {!compact && mcpTools && mcpTools.length > 0 && (
        <p className="mt-4 text-xs text-gray-500 italic text-center">
          <em>Note: AI agent queries Mission Control via {mcpTools.length} MCP tool call{mcpTools.length > 1 ? 's' : ''} to gather context.</em>
        </p>
      )}
    </div>
  );
}
