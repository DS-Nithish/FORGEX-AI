import React, { useRef, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileUp,
  Layers,
  LoaderCircle,
  Network,
  Trash2,
} from "lucide-react";
import {
  DiagnosticLog,
  UploadedLearningWorkspace,
  UploadedWorkRecord,
  UserProfile,
  ViewMode,
} from "../types";

interface UploadedWork {
  path: string;
  name: string;
}
interface DashboardViewProps {
  user: UserProfile;
  logs: DiagnosticLog[];
  onNavigate: (view: ViewMode) => void;
  accessToken: string | null;
  onDiagnoseUpload: (upload: UploadedWork) => Promise<void>;
  workspaces: UploadedLearningWorkspace[];
  onOpenWorkspace: (
    workspace: UploadedLearningWorkspace,
    view?: ViewMode,
  ) => void;
  uploadHistory: UploadedWorkRecord[];
  onUploadSaved: (upload: UploadedWorkRecord) => void;
  onDeleteUpload?: (storagePath: string) => Promise<void>;
}
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const acceptedTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  logs,
  onNavigate,
  accessToken,
  onDiagnoseUpload,
  workspaces,
  onOpenWorkspace,
  uploadHistory,
  onUploadSaved,
  onDeleteUpload,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadedWork, setUploadedWork] = useState<UploadedWork | null>(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("cognifix_uploaded_work") || "null",
      );
    } catch {
      return null;
    }
  });
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const uploadFile = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES)
      return setUploadMessage("Please choose a file smaller than 30 MB.");
    if (!acceptedTypes.has(file.type))
      return setUploadMessage(
        "Use a PDF, Word document, JPG, PNG, or WEBP image.",
      );
    if (!accessToken)
      return setUploadMessage(
        "Please sign in with Google again before uploading.",
      );
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const response = await fetch("/api/uploads/wrong-answer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": file.type,
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });
      const result = await response.json();
      if (response.ok && result.path) {
        const upload = { path: result.path, name: file.name };
        sessionStorage.setItem(
          "cognifix_uploaded_work",
          JSON.stringify(upload),
        );
        setUploadedWork(upload);
        onUploadSaved({ ...upload, createdAt: new Date().toISOString() });
        setUploadMessage(
          `${file.name} uploaded. Diagnose it to generate your first practice question.`,
        );
      } else
        setUploadMessage(result.error || "Upload failed. Please try again.");
    } catch {
      setUploadMessage("Upload failed. Check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const startUploadDiagnostic = async () => {
    if (!uploadedWork) return onNavigate("practice-and-quiz");
    setIsDiagnosing(true);
    setUploadMessage(null);
    try {
      await onDiagnoseUpload(uploadedWork);
    } catch (error) {
      setUploadMessage(
        error instanceof Error
          ? error.message
          : "Could not analyze this upload. Please try again.",
      );
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleDelete = async (storagePath: string) => {
    if (deletingPath) return;
    if (!window.confirm("Are you sure you want to delete this upload?")) return;
    setDeletingPath(storagePath);
    setUploadMessage(null);
    try {
      if (onDeleteUpload) {
        await onDeleteUpload(storagePath);
      }
      if (uploadedWork?.path === storagePath) {
        localStorage.removeItem("cognifix_uploaded_work");
        setUploadedWork(null);
      }
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : "Failed to delete upload.",
      );
    } finally {
      setDeletingPath(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-gradient-to-br from-[#08213d] to-[#075b85] p-8 text-white sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            Your private workspace
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome{user.name ? `, ${user.name}` : ""}.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">
            Upload your incorrect work and CogniFix will generate practice
            questions from the mistake it finds.
          </p>
          <button
            onClick={() => void startUploadDiagnostic()}
            disabled={isDiagnosing}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#06213a] disabled:opacity-60"
          >
            {isDiagnosing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {uploadedWork
              ? isDiagnosing
                ? "Analyzing your work…"
                : "Diagnose uploaded work"
              : "Start a diagnostic"}
          </button>
        </div>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#0b1c30]">
                <FileUp className="h-5 w-5 text-[#006096]" />
                Upload a wrong answer
              </div>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                Upload your marked work or a screenshot. CogniFix uses it to
                generate targeted questions. PDF, Word, JPG, PNG, or WEBP — up
                to 30 MB.
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isUploading || isDiagnosing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#006096] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#007abc] disabled:cursor-wait disabled:opacity-60"
              >
                {isUploading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4" />
                )}
                {isUploading ? "Uploading…" : "Choose file"}
              </button>
              {uploadedWork && (
                <button
                  onClick={() => void startUploadDiagnostic()}
                  disabled={isDiagnosing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#006096] px-4 py-3 text-sm font-bold text-[#006096] disabled:opacity-60"
                >
                  {isDiagnosing ? "Analyzing…" : "Diagnose"}
                </button>
              )}
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
            onChange={(event) => {
              void uploadFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {uploadedWork && (
            <p className="mt-4 text-xs font-medium text-slate-600">
              Ready to analyze:{" "}
              <span className="text-[#006096]">{uploadedWork.name}</span>
            </p>
          )}
          {uploadMessage && (
            <p
              className={`mt-4 rounded-lg px-3 py-2 text-xs font-medium ${uploadMessage.includes("uploaded") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
            >
              {uploadMessage}
            </p>
          )}
        </section>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-[#006096]" />
            <div>
              <h2 className="font-bold text-[#0b1c30]">Stored uploads</h2>
              <p className="mt-1 text-sm text-slate-600">
                Every file saved in your private upload history.
              </p>
            </div>
          </div>
          {uploadHistory.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Your uploaded files will appear here automatically.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {uploadHistory.map((upload) => {
                const workspace = workspaces.find(
                  (item) => item.uploadPath === upload.path,
                );
                return (
                  <div
                    key={upload.path}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold text-[#0b1c30]">
                        {workspace?.title || upload.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {upload.name} · Saved{" "}
                        {new Date(upload.createdAt).toLocaleDateString()}
                      </p>
                      {workspace?.question.sourceQuestion && (
                        <p className="mt-2 text-sm text-slate-700">
                          {workspace.question.sourceQuestion}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {workspace ? (
                        <button
                          onClick={() => onOpenWorkspace(workspace)}
                          className="rounded-lg bg-[#006096] px-3 py-2 text-xs font-bold text-white hover:bg-[#007abc] transition"
                        >
                          Open learning set
                        </button>
                      ) : (
                        <button
                          onClick={() => void onDiagnoseUpload(upload)}
                          disabled={isDiagnosing}
                          className="rounded-lg bg-[#006096] px-3 py-2 text-xs font-bold text-white hover:bg-[#007abc] transition disabled:opacity-60"
                        >
                          Create learning set
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(upload.path)}
                        disabled={deletingPath === upload.path}
                        title="Delete this upload"
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 hover:border-red-300 transition disabled:opacity-50"
                      >
                        {deletingPath === upload.path ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-[#006096]" />
            <div>
              <h2 className="font-bold text-[#0b1c30]">Your uploaded work</h2>
              <p className="mt-1 text-sm text-slate-600">
                Each diagnosed upload keeps its extracted question, answer, and
                personalized learning set.
              </p>
            </div>
          </div>
          {workspaces.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Diagnose an upload to add it here. Its practice quiz, mind map,
              and flashcard will stay together.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <button
                    onClick={() => onOpenWorkspace(workspace)}
                    className="text-left"
                  >
                    <p className="font-bold text-[#0b1c30]">
                      {workspace.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {workspace.uploadName}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      <span className="font-semibold">Extracted question:</span>{" "}
                      {workspace.question.sourceQuestion ||
                        workspace.question.stem}
                    </p>
                    {workspace.question.uploadedAnswer && (
                      <p className="mt-1 text-sm text-slate-700">
                        <span className="font-semibold">Your answer:</span>{" "}
                        {workspace.question.uploadedAnswer}
                      </p>
                    )}
                  </button>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          onOpenWorkspace(workspace, "practice-and-quiz")
                        }
                        className="rounded-lg bg-[#006096] px-3 py-2 text-xs font-bold text-white hover:bg-[#007abc] transition"
                      >
                        Practice quiz
                      </button>
                      <button
                        onClick={() => onOpenWorkspace(workspace, "mind-map")}
                        className="rounded-lg border border-[#006096] px-3 py-2 text-xs font-bold text-[#006096] hover:bg-[#eff4ff] transition"
                      >
                        Mind map
                      </button>
                      <button
                        onClick={() => onOpenWorkspace(workspace, "flashcards")}
                        className="rounded-lg border border-[#006096] px-3 py-2 text-xs font-bold text-[#006096] hover:bg-[#eff4ff] transition"
                      >
                        Flashcards
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(workspace.uploadPath)}
                      disabled={deletingPath === workspace.uploadPath}
                      title="Delete this learning set and upload"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition disabled:opacity-50"
                    >
                      {deletingPath === workspace.uploadPath ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: BrainCircuit,
              title: "Diagnostics",
              text: logs.length
                ? `${logs.length} learning record${logs.length === 1 ? "" : "s"} available.`
                : "Your diagnostic history will appear here.",
            },
            {
              icon: Network,
              title: "Knowledge map",
              text: "Concept connections will form as you learn.",
            },
            {
              icon: Layers,
              title: "Review deck",
              text: "Your recall prompts will be saved here.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5eeff] text-[#006096]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-bold text-[#0b1c30]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p>
            This is a fresh workspace. Only work you complete or upload will be
            shown as progress or results.
          </p>
        </div>
      </div>
    </div>
  );
};
