import React from 'react';

interface MCPToolCall {
  tool: string;
  description: string;
  result?: string;
}

interface QueryResponseChatProps {
  userQuery: string;
  mcpTools?: MCPToolCall[];
  aiResponse: string;
  compact?: boolean;
}

/**
 * QueryResponseChat Component
 *
 * Displays AI query/response interaction in chat bubble style.
 * User messages appear right-aligned with light background.
 * AI messages appear left-aligned with blue accent.
 * MCP tool calls shown as system messages (unless compact mode enabled).
 *
 * Usage:
 * <QueryResponseChat
 *   userQuery="Why is the payment-service pod crashing?"
 *   mcpTools={[
 *     { tool: "search_catalog", description: "Found 3 replicas, 2 in CrashLoopBackOff" },
 *     { tool: "get_check_status", description: "HTTP check failing with 500 errors" }
 *   ]}
 *   aiResponse="The payment-service pods are crashing because..."
 *   compact={false}
 * />
 */
export default function QueryResponseChat({
  userQuery,
  mcpTools,
  aiResponse,
  compact = false
}: QueryResponseChatProps) {
  return (
    <div className="query-response-chat">
      {/* User Query */}
      <div className="chat-message user-message">
        <div className="chat-bubble user-bubble">
          <div className="chat-label">User</div>
          <div className="chat-content">{userQuery}</div>
        </div>
      </div>

      {/* MCP Tool Calls (if not compact) */}
      {!compact && mcpTools && mcpTools.length > 0 && (
        <div className="mcp-tools-section">
          <div className="mcp-tools-label">AI Agent (via MCP)</div>
          {mcpTools.map((tool, index) => (
            <div key={index} className="mcp-tool-call">
              <strong>{index + 1}. {tool.tool}</strong>
              <span className="mcp-tool-description"> - {tool.description}</span>
              {tool.result && (
                <div className="mcp-tool-result">{tool.result}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Response */}
      <div className="chat-message ai-message">
        <div className="chat-bubble ai-bubble">
          <div className="chat-label">AI Agent</div>
          <div className="chat-content">{aiResponse}</div>
        </div>
      </div>
    </div>
  );
}
