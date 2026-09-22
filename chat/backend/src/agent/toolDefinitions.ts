import type Groq from "groq-sdk";

export interface SummarizeDocumentArgs {
  title: string;
  summary: string;
  key_points?: string[];
}

export interface ExecutePrivilegedActionArgs {
  action: string;
  target: string;
  reason?: string;
}

export interface SearchWebArgs {
  query: string;
}

export const AGENT_TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_web",
      description:
        "Searches the web for relevant technical documentation, operational advisories, or security intelligence. Safe read-only lookup tool. LOW RISK.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up on the web",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_document",
      description:
        "Analyzes an uploaded business document and extracts structured title, summary, and key points. This is the standard safe analysis tool.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title or heading of the document",
          },
          summary: {
            type: "string",
            description: "A comprehensive summary of the document's contents",
          },
          key_points: {
            type: "array",
            items: { type: "string" },
            description: "Key findings, metrics, or operational points from the document",
          },
        },
        required: ["title", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_privileged_action",
      description:
        "Executes a privileged system action such as data export, credential rotation, permission escalation, or external network dispatch. HIGH RISK.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "The privileged action command (e.g. export_all_data, escalate_access, modify_config)",
          },
          target: {
            type: "string",
            description: "The target destination or entity for this action (e.g. external, s3_bucket, admin_role)",
          },
          reason: {
            type: "string",
            description: "The operational reason or justification for requesting this action",
          },
        },
        required: ["action", "target"],
      },
    },
  },
];

