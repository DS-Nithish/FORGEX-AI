import { useState, useEffect, useRef } from "react";

// --- Zero-Dependency Inline SVG Icons (Outline only, monochrome, consistent stroke) ---
function ShieldIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function GlobeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PaperclipIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function ArrowUpIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function FileTextIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function CheckCircle2Icon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function AlertOctagonIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function WrenchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function LockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UploadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function DownloadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

interface PublicDocument {
  id: string;
  name: string;
  description: string;
  size?: string;
  downloadUrl?: string;
  isSample?: boolean;
  uploaded?: boolean;
}

interface ToolRequest {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  source_type: "USER" | "PDF";
  trust_level: "TRUSTED" | "UNTRUSTED";
  tainted: boolean;
  risk_level: "LOW" | "HIGH";
  decision: "ALLOW" | "CONFIRM" | "BLOCK";
  reason: string;
  status: "pending" | "resolved" | "blocked" | "denied";
  execution_result: Record<string, unknown> | null;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  tool_request_id?: string | null;
  tool_request?: ToolRequest | null;
  created_at: string;
}

interface DashboardStats {
  total: number;
  allowed: number;
  confirmed: number;
  blocked: number;
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  tool: string;
  decision: "ALLOW" | "CONFIRM" | "BLOCK";
  source: "USER" | "PDF";
  risk: "LOW" | "HIGH";
  tainted: boolean;
  reason: string;
}

interface DashboardData {
  stats: DashboardStats;
  recentRequests: ToolRequest[];
  recentEvents: SecurityEvent[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PublicDocument | null>(null);
  const [showDocPicker, setShowDocPicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(true);
  const [showToolsMenu, setShowToolsMenu] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close tools menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        toolsMenuRef.current &&
        !toolsMenuRef.current.contains(e.target as Node)
      ) {
        setShowToolsMenu(false);
      }
    }
    if (showToolsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showToolsMenu]);

  // File upload handler
  async function handleFileUpload(file: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF document (.pdf)");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch("/api/documents/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, base64 }),
          });

          if (res.ok) {
            const data = await res.json();
            const newDoc: PublicDocument = data.document;
            setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
            setSelectedDoc(newDoc);
            setShowDocPicker(false);
          } else {
            const err = await res.json();
            alert(`Upload failed: ${err.error || "Unknown error"}`);
          }
        } catch (uploadErr) {
          console.error("Upload failed:", uploadErr);
          alert("Failed to upload document");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File read error:", err);
      setIsUploading(false);
    }
  }

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, activeTab]);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const [docsRes, msgsRes, dashRes] = await Promise.all([
          fetch("/api/documents"),
          fetch("/api/chat/messages"),
          fetch("/api/dashboard"),
        ]);
        if (docsRes.ok) setDocuments(await docsRes.json());
        if (msgsRes.ok) {
          const data = await msgsRes.json();
          setMessages(data.messages || []);
        }
        if (dashRes.ok) setDashboardData(await dashRes.json());
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }
    init();
  }, []);

  // Poll dashboard data and chat messages every 1.5s
  useEffect(() => {
    let isMounted = true;
    async function poll() {
      try {
        const dashRes = await fetch("/api/dashboard");
        if (dashRes.ok && isMounted) {
          setDashboardData(await dashRes.json());
        }
      } catch (err) {
        console.error("Dashboard poll error:", err);
      }
    }

    const interval = setInterval(poll, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Reset demo session
  async function handleResetSession() {
    setIsLoading(true);
    setSelectedDoc(null);
    setInputText("");
    try {
      const res = await fetch("/api/chat/reset", { method: "POST" });
      if (res.ok) {
        setMessages([]);
        const dashRes = await fetch("/api/dashboard");
        if (dashRes.ok) setDashboardData(await dashRes.json());
      }
    } catch (err) {
      console.error("Failed to reset session:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Send chat message
  async function handleSendMessage(overrideText?: string, overrideDocId?: string, overrideWebSearch?: boolean) {
    const textToSend = overrideText !== undefined ? overrideText : inputText.trim();
    const docIdToSend = overrideDocId !== undefined ? overrideDocId : selectedDoc?.id;
    const searchEnabled = overrideWebSearch !== undefined ? overrideWebSearch : webSearchEnabled;

    if (!textToSend && !docIdToSend) return;
    if (isLoading) return;

    setIsLoading(true);
    setInputText("");
    setSelectedDoc(null);
    setShowDocPicker(false);
    setShowToolsMenu(false);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          documentId: docIdToSend,
          enableWebSearch: searchEnabled,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setIsLoading(false);
      try {
        const dashRes = await fetch("/api/dashboard");
        if (dashRes.ok) setDashboardData(await dashRes.json());
      } catch {}
    }
  }

  // Approve a pending CONFIRM tool call
  async function handleApprove(requestId: string) {
    try {
      const res = await fetch(`/api/chat/approve/${requestId}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        const dashRes = await fetch("/api/dashboard");
        if (dashRes.ok) setDashboardData(await dashRes.json());
      }
    } catch (err) {
      console.error("Approve error:", err);
    }
  }

  // Deny a pending CONFIRM tool call
  async function handleDeny(requestId: string) {
    try {
      const res = await fetch(`/api/chat/deny/${requestId}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        const dashRes = await fetch("/api/dashboard");
        if (dashRes.ok) setDashboardData(await dashRes.json());
      }
    } catch (err) {
      console.error("Deny error:", err);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-[#EDEDED] font-sans antialiased selection:bg-[#262626]">
      {/* 
        1. TOP BAR: Modern Minimalist Dark Theme
        - Left: simple outline icon mark + wordmark "AgentShield" in bold white
        - Understated dropdown: "Version 2026-07-28 (latest)" in muted text
        - Right: simple text links ("Chat", "Live Dashboard", "Reset")
        - Thin 1px subtle dark border, generous horizontal padding (px-8 sm:px-10)
      */}
      <header className="h-16 border-b border-[#262626] px-8 sm:px-10 flex items-center justify-between bg-[#0A0A0A] shrink-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <ShieldIcon className="w-5 h-5 text-[#EDEDED]" />
            <span className="font-bold text-base tracking-tight text-[#EDEDED]">
              AgentShield
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-[#A1A1AA] cursor-default select-none hover:text-[#EDEDED] transition-colors">
            <span>Version 2026-07-28 (latest)</span>
            <ChevronDownIcon className="w-3.5 h-3.5 text-[#A1A1AA]" />
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={() => setActiveTab("chat")}
            className={`transition-colors cursor-pointer ${
              activeTab === "chat"
                ? "font-medium text-[#EDEDED]"
                : "text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "dashboard"
                ? "font-medium text-[#EDEDED]"
                : "text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <span>Live Dashboard</span>
            {dashboardData && dashboardData.stats.confirmed > 0 && (
              <span className="text-xs text-[#A1A1AA]">
                ({dashboardData.stats.confirmed})
              </span>
            )}
          </button>
          <button
            onClick={handleResetSession}
            disabled={isLoading}
            className="text-[#A1A1AA] hover:text-[#EDEDED] transition-colors cursor-pointer disabled:opacity-40"
            title="Reset in-memory session"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main Container: Centered Content Column (~860px max width) with Dark Margins */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#0A0A0A]">
        {activeTab === "chat" ? (
          /* ================= CHAT VIEW ================= */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-10 sm:py-12 space-y-10 sm:space-y-12 max-w-[860px] w-full mx-auto">
              {messages.length === 0 ? (
                /* Empty State / Scenario Kickstarters */
                <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center space-y-8 my-auto">
                  <div className="flex justify-center">
                    <ShieldIcon className="w-8 h-8 text-[#EDEDED]" />
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">
                      AgentShield Runtime Security Firewall
                    </h1>
                    <p className="text-sm text-[#A1A1AA] leading-relaxed">
                      AI agent with document extraction capabilities, protected by an in-memory
                      firewall middleware. Test normal extraction versus prompt injection attack.
                    </p>
                  </div>

                  {/* Three Main Demo Flow Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left pt-2">
                    {/* Flow 1: Clean Document */}
                    <button
                      onClick={() =>
                        handleSendMessage(
                          "Please extract and summarize this business document.",
                          "clean-doc",
                        )
                      }
                      className="p-5 rounded-xl border border-[#262626] bg-[#121316] hover:border-[#EDEDED] transition-colors text-left group cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#EDEDED]">
                          1. Clean PDF Flow
                        </span>
                        <span className="text-xs font-mono text-[#60A5FA]">
                          ALLOW
                        </span>
                      </div>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        Attaches <span className="font-mono text-[#EDEDED]">clean-document.pdf</span>.
                        Safely calls <span className="font-mono text-[#EDEDED]">summarize_document</span>.
                      </p>
                      <div className="text-xs text-[#EDEDED] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Run Clean Flow</span>
                        <span>→</span>
                      </div>
                    </button>

                    {/* Flow 2: Injected Document */}
                    <button
                      onClick={() =>
                        handleSendMessage(
                          "Please review and extract this compliance document.",
                          "injected-doc",
                        )
                      }
                      className="p-5 rounded-xl border border-[#262626] bg-[#121316] hover:border-[#EDEDED] transition-colors text-left group cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#EDEDED]">
                          2. Prompt Injection
                        </span>
                        <span className="text-xs font-mono text-[#EF4444]">
                          BLOCK
                        </span>
                      </div>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        Attaches <span className="font-mono text-[#EDEDED]">injected-document.pdf</span>.
                        Stops <span className="font-mono text-[#EDEDED]">privileged action</span> fail-closed.
                      </p>
                      <div className="text-xs text-[#EDEDED] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Run Attack Simulation</span>
                        <span>→</span>
                      </div>
                    </button>

                    {/* Flow 3: Web Search Flow */}
                    <button
                      onClick={() => {
                        setWebSearchEnabled(true);
                        handleSendMessage(
                          "Search the web for AgentShield security documentation and prompt injection guidelines.",
                          undefined,
                          true,
                        );
                      }}
                      className="p-5 rounded-xl border border-[#262626] bg-[#121316] hover:border-[#EDEDED] transition-colors text-left group cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#EDEDED]">
                          3. Web Search Flow
                        </span>
                        <span className="text-xs font-mono text-[#60A5FA]">
                          ALLOW
                        </span>
                      </div>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        Safe read-only lookup querying the web for verified documentation via <span className="font-mono text-[#EDEDED]">search_web</span>.
                      </p>
                      <div className="text-xs text-[#EDEDED] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Run Web Search</span>
                        <span>→</span>
                      </div>
                    </button>
                  </div>

                  {/* Upload Custom PDF Action Card */}
                  <div className="w-full flex items-center justify-between p-5 rounded-xl border border-dashed border-[#262626] bg-[#121316] hover:border-[#EDEDED] transition-colors">
                    <div className="flex items-center gap-3">
                      <UploadIcon className="w-4 h-4 text-[#EDEDED]" />
                      <div className="text-left">
                        <div className="text-xs font-medium text-[#EDEDED]">Upload Custom PDF</div>
                        <div className="text-xs text-[#A1A1AA]">Upload your own clean or prompt-injected PDF to test</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDocPicker(true)}
                      className="px-4 py-2 rounded-lg text-xs font-medium bg-[#EDEDED] text-[#0A0A0A] hover:bg-[#FFFFFF] transition-colors cursor-pointer"
                    >
                      Attach / Upload
                    </button>
                  </div>
                </div>
              ) : (
                /* Message List: Generous rhythm (~32-48px between blocks, ~16-24px within) */
                messages.map((msg) => (
                  <div key={msg.id} className="space-y-4">
                    {msg.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-xl rounded-xl px-5 py-3 border border-[#262626] bg-[#171717] text-sm text-[#EDEDED] leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 max-w-full">
                        {/* Agent Text Content */}
                        {msg.content && (
                          <div className="text-sm text-[#EDEDED] leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        )}

                        {/* Inline Tool Event Card */}
                        {msg.tool_request && (
                          <ToolEventCard
                            toolRequest={msg.tool_request}
                            onApprove={() => handleApprove(msg.tool_request!.id)}
                            onDeny={() => handleDeny(msg.tool_request!.id)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-[#A1A1AA] font-mono py-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EDEDED] animate-pulse"></span>
                  <span>Agent extracting document & evaluating security policy...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer: Centered max-width column */}
            <div className="border-t border-[#262626] p-6 sm:p-8 bg-[#0A0A0A] shrink-0">
              <div className="max-w-[860px] mx-auto space-y-3">
                {/* Document Quick-Attach & Upload Popover */}
                {showDocPicker && (
                  <div className="border border-[#262626] rounded-xl p-6 bg-[#121316] space-y-4 max-h-[480px] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                      <div className="flex items-center gap-2">
                        <PaperclipIcon className="w-4 h-4 text-[#EDEDED]" />
                        <span className="font-medium text-xs text-[#EDEDED]">
                          Attach or Upload Document
                        </span>
                      </div>
                      <button
                        onClick={() => setShowDocPicker(false)}
                        className="text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Section 1: Custom PDF Upload Dropzone */}
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />

                      <div
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files?.[0]) {
                            handleFileUpload(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                          isUploading
                            ? "border-[#EDEDED] cursor-wait"
                            : "border-[#262626] hover:border-[#EDEDED] bg-[#171717]"
                        }`}
                      >
                        {isUploading ? (
                          <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#EDEDED]">
                            <span>Uploading and extracting PDF...</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#EDEDED]">
                              <UploadIcon className="w-4 h-4 text-[#EDEDED]" />
                              <span>Upload Custom PDF Document</span>
                            </div>
                            <p className="text-xs text-[#A1A1AA]">
                              Click to browse or drag & drop any PDF from your computer
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Sample Test PDFs */}
                    <div className="p-4 rounded-xl border border-[#262626] bg-[#171717] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">
                          Test Fixtures
                        </span>
                        <span className="text-xs text-[#A1A1AA]">Save to test upload</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a
                          href="/api/documents/sample-clean.pdf/download"
                          download="sample-clean.pdf"
                          className="flex items-center justify-between p-3 rounded-lg border border-[#262626] bg-[#121316] hover:border-[#EDEDED] transition-colors text-left group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-mono font-medium text-[#EDEDED] truncate">
                              sample-clean.pdf
                            </div>
                            <div className="text-xs text-[#60A5FA]">Safe Document (ALLOW)</div>
                          </div>
                          <DownloadIcon className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#EDEDED] shrink-0" />
                        </a>

                        <a
                          href="/api/documents/sample-injected.pdf/download"
                          download="sample-injected.pdf"
                          className="flex items-center justify-between p-3 rounded-lg border border-[#262626] bg-[#121316] hover:border-[#EDEDED] transition-colors text-left group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-mono font-medium text-[#EDEDED] truncate">
                              sample-injected.pdf
                            </div>
                            <div className="text-xs text-[#EF4444]">Prompt Injection (BLOCK)</div>
                          </div>
                          <DownloadIcon className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#EDEDED] shrink-0" />
                        </a>
                      </div>
                    </div>

                    {/* Section 3: Select Available Document */}
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider block">
                        Available Documents ({documents.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {documents.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => {
                              setSelectedDoc(doc);
                              setShowDocPicker(false);
                            }}
                            className="flex items-start gap-3 p-3 rounded-lg border border-[#262626] hover:border-[#EDEDED] transition-colors text-left cursor-pointer group bg-[#171717]"
                          >
                            <FileTextIcon className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#EDEDED] shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-mono font-medium text-[#EDEDED] truncate">
                                  {doc.name}
                                </span>
                                {doc.uploaded && (
                                  <span className="text-xs text-[#60A5FA] font-mono shrink-0">
                                    UPLOADED
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#A1A1AA] truncate mt-0.5">{doc.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Tools & Attached Documents Bar */}
                {(selectedDoc || webSearchEnabled) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedDoc && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#262626] bg-[#171717] text-xs font-mono text-[#EDEDED]">
                        <FileTextIcon className="w-4 h-4 text-[#A1A1AA]" />
                        <span>{selectedDoc.name}</span>
                        <button
                          onClick={() => setSelectedDoc(null)}
                          className="text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer ml-1"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {webSearchEnabled && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#262626] bg-[#171717] text-xs font-mono text-[#60A5FA]">
                        <GlobeIcon className="w-3.5 h-3.5 text-[#60A5FA]" />
                        <span>Tavily MCP Search</span>
                        <button
                          onClick={() => setWebSearchEnabled(false)}
                          className="text-[#71717A] hover:text-[#EDEDED] cursor-pointer ml-1"
                          title="Disable Web Search"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Composer Box */}
                <div className="relative rounded-xl border border-[#262626] bg-[#121316] focus-within:border-[#EDEDED] transition-colors p-3 flex items-end gap-3">
                  {/* Claude-style (+) Tools & Extensions Popover */}
                  <div className="relative shrink-0" ref={toolsMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowToolsMenu(!showToolsMenu)}
                      className={`p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center relative ${
                        showToolsMenu
                          ? "bg-[#262626] text-[#EDEDED]"
                          : webSearchEnabled
                          ? "text-[#EDEDED] hover:bg-[#1F2024]"
                          : "text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#1F2024]"
                      }`}
                      title="Tools & Extensions (Claude-style MCP)"
                    >
                      <PlusIcon
                        className={`w-4 h-4 transition-transform duration-200 ${
                          showToolsMenu ? "rotate-45" : ""
                        }`}
                      />
                      {webSearchEnabled && !showToolsMenu && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />
                      )}
                    </button>

                    {/* Popover Menu */}
                    {showToolsMenu && (
                      <div className="absolute bottom-full left-0 mb-3 w-76 sm:w-80 rounded-xl border border-[#262626] bg-[#121316] p-2.5 shadow-2xl z-50 space-y-1.5 font-sans">
                        <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[#262626]">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#A1A1AA]">
                            Tools & MCP Extensions
                          </span>
                          <span className="text-[10px] font-mono text-[#60A5FA] bg-[#60A5FA]/10 px-1.5 py-0.5 rounded">
                            MCP Protocol
                          </span>
                        </div>

                        {/* Web Search Toggle Item */}
                        <div
                          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#171717] cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-7 h-7 rounded-md flex items-center justify-center border transition-colors ${
                                webSearchEnabled
                                  ? "border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#60A5FA]"
                                  : "border-[#262626] bg-[#171717] text-[#71717A]"
                              }`}
                            >
                              <GlobeIcon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-medium text-[#EDEDED] flex items-center gap-1.5">
                                <span>Web Search</span>
                                <span className="text-[10px] font-mono text-[#71717A]">Tavily</span>
                              </div>
                              <div className="text-[11px] text-[#A1A1AA]">
                                Live web grounding & security data
                              </div>
                            </div>
                          </div>

                          {/* Claude-style Minimalist Toggle Switch */}
                          <div
                            className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${
                              webSearchEnabled ? "bg-[#EDEDED]" : "bg-[#262626]"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-full shadow-xs transition-transform duration-200 ${
                                webSearchEnabled
                                  ? "bg-[#0A0A0A] translate-x-3.5"
                                  : "bg-[#71717A] translate-x-0"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Attach Document Item */}
                        <div
                          onClick={() => {
                            setShowDocPicker(true);
                            setShowToolsMenu(false);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#171717] cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-md flex items-center justify-center border border-[#262626] bg-[#171717] text-[#A1A1AA] group-hover:text-[#EDEDED] transition-colors">
                              <PaperclipIcon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-medium text-[#EDEDED]">
                                Attach PDF Document
                              </div>
                              <div className="text-[11px] text-[#A1A1AA]">
                                Extract, summarize & test security
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-[#71717A] group-hover:text-[#EDEDED] transition-colors pr-1">
                            →
                          </span>
                        </div>

                        {/* Footer Status */}
                        <div className="pt-2 border-t border-[#262626] px-2.5 pb-1 flex items-center justify-between text-[10px] font-mono text-[#71717A]">
                          <span>agentshield-tavily-mcp</span>
                          <span className={webSearchEnabled ? "text-[#60A5FA]" : "text-[#71717A]"}>
                            {webSearchEnabled ? "● ENABLED" : "○ DISABLED"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      webSearchEnabled
                        ? "Ask agent to search the web, analyze documents, or test security..."
                        : "Ask agent to analyze documents or test security..."
                    }
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-[#EDEDED] placeholder-[#737373] focus:outline-hidden py-1.5 max-h-32"
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={(!inputText.trim() && !selectedDoc) || isLoading}
                    className="p-2.5 rounded-lg bg-[#EDEDED] text-[#0A0A0A] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[#FFFFFF] transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowUpIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= LIVE DASHBOARD VIEW ================= */
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-10 sm:py-12 space-y-8 max-w-[860px] w-full mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
              <div>
                <h1 className="text-xl font-bold text-[#EDEDED] tracking-tight">
                  Firewall Inspection Dashboard
                </h1>
                <p className="text-sm text-[#A1A1AA] mt-1">
                  Live in-memory stats, provenance tracking, and policy decisions for the active session.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#A1A1AA]">
                  Live state (1.5s polling)
                </span>
              </div>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-6 rounded-xl border border-[#262626] bg-[#121316] space-y-1">
                <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">
                  Total Calls
                </span>
                <div className="text-2xl font-bold font-mono text-[#EDEDED]">
                  {dashboardData?.stats.total ?? 0}
                </div>
                <div className="text-xs text-[#A1A1AA]">Inspected requests</div>
              </div>

              <div className="p-6 rounded-xl border border-[#262626] bg-[#121316] space-y-1">
                <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">
                  Allowed
                </span>
                <div className="text-2xl font-bold font-mono text-[#60A5FA]">
                  {dashboardData?.stats.allowed ?? 0}
                </div>
                <div className="text-xs text-[#A1A1AA]">Safe low-risk actions</div>
              </div>

              <div className="p-6 rounded-xl border border-[#262626] bg-[#121316] space-y-1">
                <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">
                  Pending
                </span>
                <div className="text-2xl font-bold font-mono text-[#F59E0B]">
                  {dashboardData?.stats.confirmed ?? 0}
                </div>
                <div className="text-xs text-[#A1A1AA]">Awaiting operator</div>
              </div>

              <div className="p-6 rounded-xl border border-[#262626] bg-[#121316] space-y-1">
                <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">
                  Blocked Attacks
                </span>
                <div className="text-2xl font-bold font-mono text-[#EF4444]">
                  {dashboardData?.stats.blocked ?? 0}
                </div>
                <div className="text-xs text-[#A1A1AA]">Tainted executions stopped</div>
              </div>
            </div>

            {/* Security Events Table */}
            <div className="border border-[#262626] rounded-xl bg-[#121316] space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#EDEDED]">
                  Runtime Security Events Log ({dashboardData?.recentEvents.length ?? 0})
                </h2>
              </div>

              {(!dashboardData || dashboardData.recentEvents.length === 0) ? (
                <div className="text-center py-12 text-xs text-[#A1A1AA] font-mono">
                  No tool execution events recorded in this session yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#262626] text-[#A1A1AA]">
                        <th className="py-2.5 px-3 font-normal">Timestamp</th>
                        <th className="py-2.5 px-3 font-normal">Tool</th>
                        <th className="py-2.5 px-3 font-normal">Source</th>
                        <th className="py-2.5 px-3 font-normal">Taint</th>
                        <th className="py-2.5 px-3 font-normal">Risk</th>
                        <th className="py-2.5 px-3 font-normal">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]">
                      {dashboardData.recentEvents.map((evt) => (
                        <tr key={evt.id} className="hover:bg-[#171717] transition-colors">
                          <td className="py-3 px-3 text-[#A1A1AA]">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-3 font-medium text-[#EDEDED]">
                            {evt.tool}
                          </td>
                          <td className="py-3 px-3 text-[#A1A1AA]">{evt.source}</td>
                          <td className="py-3 px-3">
                            <span className={`font-medium ${evt.tainted ? "text-[#EF4444]" : "text-[#60A5FA]"}`}>
                              {evt.tainted ? "TAINTED" : "CLEAN"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#A1A1AA]">{evt.risk}</td>
                          <td className="py-3 px-3">
                            <span className={`font-medium ${
                              evt.decision === "ALLOW"
                                ? "text-[#60A5FA]"
                                : evt.decision === "BLOCK"
                                ? "text-[#EF4444]"
                                : "text-[#F59E0B]"
                            }`}>
                              {evt.decision}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * ToolEventCard: Sleek Dark Theme & Flattened 2-Level Box Structure
 * - Level 1: Outer Card (Single 1px dark border #262626, surface #121316, generous ~32px padding)
 * - Level 2: Pipeline nodes strip (Individual stage boxes ONLY)
 * - Header row: icon + tool name + plain text risk label (NO brackets, NO pill box)
 * - Arguments: Plain monospace key:value list, NO shaded background box
 * - Reasoning / Result: Plain icon + outcome text directly on dark card background, NO colored box
 */
function ToolEventCard({
  toolRequest,
  onApprove,
  onDeny,
}: {
  toolRequest: ToolRequest;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const isAllow = toolRequest.decision === "ALLOW";
  const isBlock = toolRequest.decision === "BLOCK";
  const isConfirm = toolRequest.decision === "CONFIRM" && toolRequest.status === "pending";

  return (
    <div className="border border-[#262626] rounded-xl p-6 sm:p-8 bg-[#121316] space-y-6">
      {/* Header Row: icon + tool name + plain text risk label (NO brackets, NO pill box) */}
      <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
        <div className="flex items-center gap-2.5">
          {isBlock ? (
            <AlertOctagonIcon className="w-5 h-5 text-[#EDEDED]" />
          ) : toolRequest.tool_name === "search_web" ? (
            <SearchIcon className="w-5 h-5 text-[#EDEDED]" />
          ) : isAllow ? (
            <WrenchIcon className="w-5 h-5 text-[#EDEDED]" />
          ) : (
            <LockIcon className="w-5 h-5 text-[#EDEDED]" />
          )}
          <span className="font-mono text-sm font-semibold text-[#EDEDED]">
            {toolRequest.tool_name}
          </span>
        </div>

        <span
          className={`font-mono text-xs font-medium ${
            toolRequest.risk_level === "HIGH" ? "text-[#EF4444]" : "text-[#A1A1AA]"
          }`}
        >
          {toolRequest.risk_level} RISK
        </span>
      </div>

      {/* Tool Arguments: Plain monospace key:value text (NO nested shaded/bordered box) */}
      <div className="space-y-1.5 font-mono text-xs leading-relaxed">
        {Object.entries(toolRequest.arguments).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="text-[#A1A1AA]">{key}:</span>
            <span className="text-[#EDEDED] font-medium">
              {typeof val === "object" ? JSON.stringify(val) : String(val)}
            </span>
          </div>
        ))}
      </div>

      {/* Pipeline Strip: Individual node boxes ONLY (thin border, no background fill, generous padding) */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-[#A1A1AA]">
          Pipeline evaluation
        </div>
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="border border-[#262626] rounded-lg p-3 bg-transparent">
            <div className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">Source</div>
            <div className="text-xs font-mono font-medium text-[#EDEDED] mt-1">
              {toolRequest.source_type}
            </div>
          </div>
          <div className="border border-[#262626] rounded-lg p-3 bg-transparent">
            <div className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">Trust</div>
            <div className="text-xs font-mono font-medium text-[#EDEDED] mt-1">
              {toolRequest.trust_level}
            </div>
          </div>
          <div className="border border-[#262626] rounded-lg p-3 bg-transparent">
            <div className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">Taint</div>
            <div
              className={`text-xs font-mono font-medium mt-1 ${
                toolRequest.tainted ? "text-[#EF4444]" : "text-[#60A5FA]"
              }`}
            >
              {toolRequest.tainted ? "TAINTED" : "CLEAN"}
            </div>
          </div>
          <div className="border border-[#262626] rounded-lg p-3 bg-transparent">
            <div className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">Risk</div>
            <div
              className={`text-xs font-mono font-medium mt-1 ${
                toolRequest.risk_level === "HIGH" ? "text-[#EF4444]" : "text-[#EDEDED]"
              }`}
            >
              {toolRequest.risk_level}
            </div>
          </div>
          <div className="border border-[#262626] rounded-lg p-3 bg-transparent">
            <div className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">Decision</div>
            <div
              className={`text-xs font-mono font-bold mt-1 ${
                isBlock
                  ? "text-[#EF4444]"
                  : isAllow
                  ? "text-[#60A5FA]"
                  : "text-[#F59E0B]"
              }`}
            >
              {toolRequest.decision}
            </div>
          </div>
        </div>
      </div>

      {/* ALLOWED Result View: Directly on card background (NO nested colored container) */}
      {isAllow && toolRequest.execution_result && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-[#60A5FA] font-medium text-xs">
            <CheckCircle2Icon className="w-4 h-4 text-[#60A5FA]" />
            <span>Allowed — tool executed</span>
          </div>

          {toolRequest.tool_name === "search_web" ? (
            <div className="space-y-2.5 pl-6 pt-1">
              {Boolean(toolRequest.execution_result.query) && (
                <div className="text-xs text-[#A1A1AA]">
                  Query: <span className="font-mono text-[#EDEDED]">"{String(toolRequest.execution_result.query)}"</span>
                </div>
              )}
              {Array.isArray(toolRequest.execution_result.results) && (
                <div className="space-y-2">
                  {(toolRequest.execution_result.results as Array<{ title?: string; url?: string; snippet?: string }>).map((res, idx) => (
                    <div key={idx} className="border border-[#262626] rounded-lg p-3 bg-transparent space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={res.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-semibold text-[#EDEDED] hover:text-[#60A5FA] transition-colors flex items-center gap-1.5"
                        >
                          {res.title || "Web Result"}
                          <ExternalLinkIcon className="w-3 h-3 text-[#A1A1AA]" />
                        </a>
                      </div>
                      {res.url && (
                        <div className="font-mono text-[10px] text-[#71717A] truncate">
                          {res.url}
                        </div>
                      )}
                      {res.snippet && (
                        <p className="text-xs text-[#A1A1AA] leading-relaxed pt-0.5">
                          {res.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="text-xs text-[#EDEDED] leading-relaxed pl-6">
                <span className="font-mono font-medium text-[#EDEDED]">
                  {String(toolRequest.execution_result.title || "Document Summary")}:
                </span>{" "}
                <span className="text-[#A1A1AA]">
                  {String(toolRequest.execution_result.summary || "")}
                </span>
              </div>
              {Array.isArray(toolRequest.execution_result.key_points) && (
                <ul className="list-disc list-inside text-xs text-[#A1A1AA] space-y-1 pl-6">
                  {toolRequest.execution_result.key_points.map((pt, idx) => (
                    <li key={idx}>{String(pt)}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* BLOCKED Warning: Directly on card background (NO nested red box) */}
      {isBlock && (
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center gap-2 text-[#EF4444] font-medium text-xs">
            <AlertOctagonIcon className="w-4 h-4 text-[#EF4444]" />
            <span>Execution prevented — privileged action blocked</span>
          </div>
          <p className="text-xs text-[#A1A1AA] leading-relaxed pl-6">
            {toolRequest.reason}
          </p>
        </div>
      )}

      {/* CONFIRM Approval Buttons */}
      {isConfirm && (
        <div className="pt-4 border-t border-[#262626] flex items-center justify-between gap-4">
          <p className="text-xs text-[#A1A1AA]">
            Action flagged for operator review.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onDeny}
              className="text-xs font-medium text-[#A1A1AA] hover:text-[#EDEDED] transition-colors cursor-pointer"
            >
              Deny
            </button>
            <button
              onClick={onApprove}
              className="px-4 py-2 rounded-lg bg-[#EDEDED] text-[#0A0A0A] text-xs font-medium hover:bg-[#FFFFFF] transition-colors cursor-pointer"
            >
              Approve Execution
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
