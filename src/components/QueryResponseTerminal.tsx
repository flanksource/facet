interface MCPToolCall {
  tool: string;
  description: string;
  result?: string;
}

interface QueryResponseTerminalProps {
  userQuery: string;
  mcpTools?: MCPToolCall[];
  aiResponse: string;
  compact?: boolean;
}

/**
 * QueryResponseTerminal Component
 *
 * Displays AI query/response interaction in Claude Code terminal style.
 * Uses monospace font with dark background (matching Claude Code's theme).
 * User queries prefixed with command prompt.
 * MCP tool calls shown with execution indicators.
 * Styled to match Claude Code's integrated terminal aesthetic.
 *
 * Usage:
 * <QueryResponseTerminal
 *   userQuery="Why is the payment-service pod crashing?"
 *   mcpTools={[
 *     { tool: "search_catalog", description: "Found 3 replicas, 2 in CrashLoopBackOff" },
 *     { tool: "get_check_status", description: "HTTP check failing with 500 errors" }
 *   ]}
 *   aiResponse="The payment-service pods are crashing because..."
 *   compact={false}
 * />
 */
export default function QueryResponseTerminal({
  userQuery,
  mcpTools,
  aiResponse,
  compact = false
}: QueryResponseTerminalProps) {
  return (
    <div className="bg-gray-950 border border-gray-700 rounded p-5 font-mono text-[8pt] leading-[12pt] overflow-x-auto">
      {/* User Query - Claude Code style */}
      <div className="text-white font-medium border-b border-gray-700 mb-3 pb-2">
        <span className="text-blue-300 font-bold mr-2">›</span> {userQuery}
      </div>

      {/* MCP Tool Calls (if not compact) - Claude Code execution style */}
      {!compact && mcpTools && mcpTools.length > 0 && (
        <div className="bg-black rounded border-l-2 border-l-cyan-400 my-2 p-2">
          {mcpTools.map((tool, index) => (
            <div key={index} className="text-gray-300 flex flex-col gap-1 mb-2 py-1 px-2">
              <div className="flex items-center gap-2">
                <span className="text-blue-300 font-bold w-3 text-center">⚙</span>
                <span className="text-blue-300 font-bold min-w-[10rem]">{tool.tool}</span>
                <span className="text-blue-600 bg-blue-950 rounded text-[7pt] px-2 py-0.5">executing</span>
              </div>
              <div className="text-gray-300 ml-7 text-[8pt] leading-[11pt]">{tool.description}</div>
              {tool.result && (
                <div className="text-green-500 text-[7pt] mt-1">✓ Success</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Response - Claude Code message style */}
      <div className="mt-3 pt-2 border-t border-gray-700">
        <div className="mb-2 pb-1 border-b border-gray-700">
          <span className="text-blue-300 font-bold text-[8pt]">AI Response</span>
        </div>
        <div className="text-gray-100 pl-2">
          {aiResponse.split('\n').map((line, index) => (
            <div key={index} className="text-gray-100 mb-1 leading-[12pt]">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
