export interface MCPToolCall {
  tool: string;
  description: string;
  result?: string;
}

export interface QueryResponseChatProps {
  userQuery: string;
  mcpTools?: MCPToolCall[];
  aiResponse: string;
  compact?: boolean;
}

export default function QueryResponseChat({
  userQuery,
  mcpTools,
  aiResponse,
  compact = false
}: QueryResponseChatProps) {
  return (
    <div className="rounded-md font-sans my-4">
      {/* Window controls header */}
      <div className="h-7 bg-gradient-to-b from-neutral-600 to-neutral-700 rounded-t-md px-2.5 flex items-center justify-between">
        {/* macOS-style window controls */}
        <div className="flex items-center gap-2">
          <div className="bg-red-400 rounded-full h-3 w-3" />
          <div className="bg-yellow-400 rounded-full h-3 w-3" />
          <div className="bg-green-400 rounded-full h-3 w-3" />
        </div>
        <div className="text-gray-500 text-xs font-medium">claude</div>
        <div className="w-[52px]" />
      </div>

      {/* Terminal content */}
      <div className="bg-slate-950 text-zinc-200 p-4 font-mono text-[13px] leading-relaxed rounded-b-md">
        {/* User Query - Claude Code style prompt */}
        <div className="mb-4">
          <span className="text-violet-400 font-semibold">❯</span>
          <span className="text-zinc-200 ml-2">{userQuery}</span>
        </div>

        {/* MCP Tool Calls */}
        {!compact && mcpTools && mcpTools.length > 0 && (
          <div className="mb-4 pl-1">
            {mcpTools.map((tool, index) => (
              <div key={index} className="mb-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 shrink-0">✓</span>
                  <div>
                    <span className="text-blue-400 font-medium">{tool.tool}</span>
                    <span className="text-zinc-500"> {tool.description}</span>
                  </div>
                </div>
                {tool.result && (
                  <div className="text-zinc-400 text-xs ml-5 mt-1 pl-2 border-l-2 border-zinc-700">
                    {tool.result}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI Response */}
        <div className="text-zinc-200 whitespace-pre-wrap pl-1">
          {aiResponse}
        </div>
      </div>
    </div>
  );
}
