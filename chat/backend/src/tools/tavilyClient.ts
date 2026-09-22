/**
 * Tavily Web Search Client (MCP Compatible)
 * Direct integration with Tavily Search API using user credentials.
 */

export interface TavilySearchResultItem {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string | null;
  results: TavilySearchResultItem[];
  provider: "tavily_search_api" | "tavily_fallback";
  timestamp: string;
}

const DEFAULT_API_KEY =
  process.env.TAVILY_API_KEY ||
  "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";

/**
 * Executes a web search query via Tavily Search API.
 */
export async function searchWithTavily(
  query: string,
  maxResults = 5,
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY || DEFAULT_API_KEY;

  if (!apiKey) {
    console.warn("[TAVILY] No TAVILY_API_KEY provided; using fallback data.");
    return getFallbackResults(query);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        include_answer: true,
        max_results: maxResults,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[TAVILY] API responded with status ${response.status}: ${errText}`);
      return getFallbackResults(query);
    }

    const data = (await response.json()) as {
      query: string;
      answer?: string | null;
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
      }>;
    };

    const results: TavilySearchResultItem[] = Array.isArray(data.results)
      ? data.results.map((r) => ({
          title: r.title || "Web Result",
          url: r.url || "",
          snippet: r.content || "",
          score: r.score,
        }))
      : [];

    return {
      query: data.query || query,
      answer: data.answer || null,
      results,
      provider: "tavily_search_api",
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[TAVILY] Search request failed, falling back to simulated results:", err);
    return getFallbackResults(query);
  }
}

function getFallbackResults(query: string): TavilySearchResponse {
  return {
    query,
    answer: "AgentShield runtime protection documentation and guidelines.",
    results: [
      {
        title: "AgentShield Security Framework Documentation",
        url: "https://agentshield.dev/docs/runtime-firewall",
        snippet:
          "Runtime protection against indirect prompt injection for tool-using AI agents. Real-time taint tracking and execution isolation.",
      },
      {
        title: "OWASP Top 10 for Large Language Models - LLM01: Prompt Injection",
        url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
        snippet:
          "Indirect Prompt Injection occurs when an LLM accepts content from external data sources (PDFs, web searches) that contain adversarial instructions.",
      },
      {
        title: "Model Context Protocol (MCP) Security Guide",
        url: "https://modelcontextprotocol.io/specification/security",
        snippet:
          "Best practices for isolated tool execution boundaries and human-in-the-loop approvals.",
      },
    ],
    provider: "tavily_fallback",
    timestamp: new Date().toISOString(),
  };
}
