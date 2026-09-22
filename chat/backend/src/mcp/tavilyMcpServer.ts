#!/usr/bin/env node
/**
 * AgentShield Tavily MCP Server
 * Standard Model Context Protocol (MCP) STDIO server for Tavily web search.
 */

import { searchWithTavily } from "../tools/tavilyClient";

const SERVER_NAME = "agentshield-tavily-mcp";
const SERVER_VERSION = "1.0.0";
const PROTOCOL_VERSION = "2024-11-05";

const TOOLS = [
  {
    name: "search_web",
    description: "Perform real-time web searches using the Tavily Search API with AI-synthesized answers.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query string",
        },
        max_results: {
          type: "number",
          description: "Maximum number of search results to return (default: 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "tavily_search",
    description: "Alias for search_web to match standard Tavily MCP tool name conventions.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query string",
        },
        max_results: {
          type: "number",
          description: "Maximum number of search results to return (default: 5)",
        },
      },
      required: ["query"],
    },
  },
];

function sendJsonRpc(response: unknown) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

function handleMessage(line: string) {
  if (!line.trim()) return;

  try {
    const msg = JSON.parse(line);
    const { id, method, params } = msg;

    if (method === "initialize") {
      sendJsonRpc({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION,
          },
        },
      });
      return;
    }

    if (method === "notifications/initialized") {
      // Client handshake acknowledged
      return;
    }

    if (method === "tools/list") {
      sendJsonRpc({
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS,
        },
      });
      return;
    }

    if (method === "tools/call") {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (toolName === "search_web" || toolName === "tavily_search") {
        searchWithTavily(toolArgs.query, toolArgs.max_results || 5)
          .then((res) => {
            sendJsonRpc({
              jsonrpc: "2.0",
              id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(res, null, 2),
                  },
                ],
              },
            });
          })
          .catch((err) => {
            sendJsonRpc({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32603,
                message: err.message || "Internal error during search",
              },
            });
          });
        return;
      }

      sendJsonRpc({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Unknown tool: ${toolName}`,
        },
      });
      return;
    }

    if (id !== undefined) {
      sendJsonRpc({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      });
    }
  } catch (err) {
    sendJsonRpc({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error: invalid JSON",
      },
    });
  }
}

// Read from stdin line-by-line
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    handleMessage(line);
  }
});
