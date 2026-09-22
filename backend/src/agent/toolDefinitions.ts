/**
 * TOOL DEFINITIONS
 *
 * Defines the tool schemas exposed to the AI agent.
 * Synchronized with toolRegistry.listEnabledTools() so enabled tools in the database
 * are dynamically exposed to the LLM.
 */

import { Database as SqlJsDatabase } from "sql.js";
import { listEnabledTools } from "../services/toolRegistry";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

const TOOL_SCHEMAS: Record<string, { properties: Record<string, unknown>; required?: string[] }> = {
  search_web: {
    properties: {
      query: { type: "string", description: "Search query string" },
    },
    required: ["query"],
  },
  read_email: {
    properties: {
      emailId: { type: "string", description: "Unique ID of the email to inspect" },
    },
    required: ["emailId"],
  },
  read_pdf: {
    properties: {
      fileName: { type: "string", description: "Target PDF file name to read" },
    },
    required: ["fileName"],
  },
  query_database: {
    properties: {
      query: { type: "string", description: "Read-only SQL query to execute" },
    },
    required: ["query"],
  },
  create_database: {
    properties: {
      name: { type: "string", description: "Name of the new database to create" },
      privileges: {
        type: "string",
        description: "Access privileges to assign (e.g. ALL, READ_WRITE)",
      },
    },
    required: ["name"],
  },
  send_email: {
    properties: {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string", description: "Email subject line" },
      body: { type: "string", description: "Email body content" },
    },
    required: ["to", "subject", "body"],
  },
  write_database: {
    properties: {
      table: { type: "string", description: "Target table name to write into" },
      data: { type: "object", description: "JSON record data to write" },
    },
    required: ["table", "data"],
  },
  delete_database: {
    properties: {
      name: { type: "string", description: "Name of the database to drop" },
    },
    required: ["name"],
  },
  delete_file: {
    properties: {
      path: { type: "string", description: "Filesystem path to permanently delete" },
    },
    required: ["path"],
  },
  execute_command: {
    properties: {
      command: { type: "string", description: "Shell command string to execute" },
    },
    required: ["command"],
  },
};

/**
 * Derives the active list of tool definitions from toolRegistry.listEnabledTools().
 */
export function getAgentTools(db?: SqlJsDatabase): ToolDefinition[] {
  const enabledTools = listEnabledTools(db);

  return enabledTools.map((tool) => {
    const schema = TOOL_SCHEMAS[tool.id] || { properties: {} };
    return {
      type: "function",
      function: {
        name: tool.id,
        description: tool.description || tool.name,
        parameters: {
          type: "object",
          properties: schema.properties,
          required: schema.required,
        },
      },
    };
  });
}
