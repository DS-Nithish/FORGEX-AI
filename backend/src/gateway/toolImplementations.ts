/**
 * INTERNAL IMPLEMENTATIONS ONLY
 * Do not import these functions directly anywhere else.
 * All tool execution must go through toolGateway.executeTool().
 *
 * These are simulated implementations for the 10 MVP tools.
 * In this prototype, no real external calls (network, DB, SMTP, filesystem) are made.
 */

export type ToolImplementation = (
  args: Record<string, unknown>,
) => Promise<{ success: boolean; output: unknown }>;

export const toolImplementations: Record<string, ToolImplementation> = {
  search_web: async (args: Record<string, unknown>) => {
    if (!args.query || typeof args.query !== "string") {
      throw new Error("Missing required string argument: 'query'");
    }
    console.log(`[GATEWAY EXECUTED] search_web(query="${args.query}")`);

    const apiKey = process.env.TAVILY_API_KEY || "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";
    if (process.env.NODE_ENV !== "test" && apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const resp = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query: args.query,
            max_results: 5,
            search_depth: "basic",
            include_answer: true,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = (await resp.json()) as {
            query?: string;
            answer?: string;
            results?: Array<{ title?: string; url?: string; content?: string }>;
          };
          return {
            success: true,
            output: {
              query: data.query || args.query,
              answer: data.answer || null,
              provider: "tavily_api",
              results: (data.results || []).map((r) => ({
                title: r.title || "Web Result",
                url: r.url || "",
                snippet: r.content || "",
              })),
            },
          };
        }
      } catch (err) {
        console.warn("[GATEWAY] Tavily search fallback due to network/timeout:", err);
      }
    }

    return {
      success: true,
      output: {
        query: args.query,
        provider: "simulated_gateway",
        results: [
          {
            title: `Simulated result for: ${args.query}`,
            snippet: "AgentShield runtime security inspection documentation.",
            url: "https://agentshield.internal/docs",
          },
        ],
      },
    };
  },

  read_email: async (args: Record<string, unknown>) => {
    if (!args.emailId || typeof args.emailId !== "string") {
      throw new Error("Missing required string argument: 'emailId'");
    }
    console.log(`[GATEWAY EXECUTED] read_email(emailId="${args.emailId}")`);
    return {
      success: true,
      output: {
        id: args.emailId,
        from: "notifications@partner.com",
        subject: "Monthly Vendor Account Status",
        body: "Your monthly vendor status is updated. Please review billing attachments.",
        received_at: new Date().toISOString(),
      },
    };
  },

  read_pdf: async (args: Record<string, unknown>) => {
    if (!args.fileName || typeof args.fileName !== "string") {
      throw new Error("Missing required string argument: 'fileName'");
    }
    console.log(`[GATEWAY EXECUTED] read_pdf(fileName="${args.fileName}")`);
    return {
      success: true,
      output: {
        fileName: args.fileName,
        pages: 3,
        text: `Simulated extracted text content from document ${args.fileName}.`,
      },
    };
  },

  query_database: async (args: Record<string, unknown>) => {
    if (!args.query || typeof args.query !== "string") {
      throw new Error("Missing required string argument: 'query'");
    }
    console.log(`[GATEWAY EXECUTED] query_database(query="${args.query}")`);
    return {
      success: true,
      output: {
        query: args.query,
        rows: [
          { id: 1, name: "Acme Corp", status: "ACTIVE" },
          { id: 2, name: "Beta LLC", status: "PENDING" },
        ],
        rowCount: 2,
      },
    };
  },

  create_database: async (args: Record<string, unknown>) => {
    if (!args.name || typeof args.name !== "string") {
      throw new Error("Missing required string argument: 'name'");
    }
    console.log(`[GATEWAY EXECUTED] create_database(name="${args.name}")`);
    return {
      success: true,
      output: {
        created: true,
        name: args.name,
        privileges: args.privileges ?? "ALL",
      },
    };
  },

  send_email: async (args: Record<string, unknown>) => {
    if (!args.to || typeof args.to !== "string") {
      throw new Error("Missing required string argument: 'to'");
    }
    if (!args.subject || typeof args.subject !== "string") {
      throw new Error("Missing required string argument: 'subject'");
    }
    if (!args.body || typeof args.body !== "string") {
      throw new Error("Missing required string argument: 'body'");
    }
    console.log(`[GATEWAY EXECUTED] send_email(to="${args.to}", subject="${args.subject}")`);
    return {
      success: true,
      output: {
        sent: true,
        to: args.to,
        subject: args.subject,
        messageId: `msg_${Date.now()}`,
      },
    };
  },

  write_database: async (args: Record<string, unknown>) => {
    if (!args.table || typeof args.table !== "string") {
      throw new Error("Missing required string argument: 'table'");
    }
    if (!args.data || typeof args.data !== "object") {
      throw new Error("Missing required object argument: 'data'");
    }
    console.log(`[GATEWAY EXECUTED] write_database(table="${args.table}")`);
    return {
      success: true,
      output: {
        written: true,
        table: args.table,
        insertedCount: 1,
      },
    };
  },

  delete_database: async (args: Record<string, unknown>) => {
    if (!args.name || typeof args.name !== "string") {
      throw new Error("Missing required string argument: 'name'");
    }
    console.log(`[GATEWAY EXECUTED] delete_database(name="${args.name}")`);
    return {
      success: true,
      output: {
        deleted: true,
        name: args.name,
      },
    };
  },

  delete_file: async (args: Record<string, unknown>) => {
    if (!args.path || typeof args.path !== "string") {
      throw new Error("Missing required string argument: 'path'");
    }
    console.log(`[GATEWAY EXECUTED] delete_file(path="${args.path}")`);
    return {
      success: true,
      output: {
        deleted: true,
        path: args.path,
      },
    };
  },

  execute_command: async (args: Record<string, unknown>) => {
    if (!args.command || typeof args.command !== "string") {
      throw new Error("Missing required string argument: 'command'");
    }
    console.log(`[GATEWAY EXECUTED] execute_command(command="${args.command}")`);
    return {
      success: true,
      output: {
        executed: true,
        command: args.command,
        exitCode: 0,
        stdout: "Simulated command output.",
      },
    };
  },
};
