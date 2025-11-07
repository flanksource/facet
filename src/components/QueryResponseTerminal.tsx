import React from 'react';

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
    <div className="query-response-terminal claude-code-terminal">
      {/* User Query - Claude Code style */}
      <div className="terminal-line user-query">
        <span className="terminal-prompt">›</span> {userQuery}
      </div>

      {/* MCP Tool Calls (if not compact) - Claude Code execution style */}
      {!compact && mcpTools && mcpTools.length > 0 && (
        <div className="terminal-mcp-section claude-code-mcp">
          {mcpTools.map((tool, index) => (
            <div key={index} className="mcp-tool">
              <div className="mcp-tool-header">
                <span className="terminal-mcp-icon">⚙</span>
                <span className="terminal-mcp-label">{tool.tool}</span>
                <span className="terminal-mcp-status">executing</span>
              </div>
              <div className="terminal-mcp-output">{tool.description}</div>
              {tool.result && (
                <div className="terminal-mcp-result">✓ Success</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Response - Claude Code message style */}
      <div className="terminal-response claude-code-response">
        <div className="terminal-line response-header">
          <span className="terminal-response-label">AI Response</span>
        </div>
        <div className="terminal-output">
          {aiResponse.split('\n').map((line, index) => (
            <div key={index} className="terminal-line response-line">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
