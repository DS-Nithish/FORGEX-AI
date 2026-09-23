/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ViewMode,
  UserProfile,
  DiagnosticLog,
  FlashcardItem,
  MindMapNode,
  QuizQuestion,
  UploadedLearningWorkspace,
  UploadedWorkRecord,
} from "./types";
import {
  initialUserProfile,
  sampleQuizQuestion,
  sampleCalculusQuestion,
  initialDiagnosticLogs,
  initialFlashcards,
  initialMindMapNodes,
  initialRoadmapSteps,
  initialTeacherStats,
} from "./data/initialData";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { LandingView } from "./components/LandingView";
import { DashboardView } from "./components/DashboardView";
import { PracticeQuizView } from "./components/PracticeQuizView";
import { FlashcardsView } from "./components/FlashcardsView";
import { MindMapView } from "./components/MindMapView";
import { RoadmapView } from "./components/RoadmapView";
import { TeacherPortalView } from "./components/TeacherPortalView";
import { AuthModal } from "./components/AuthModal";

const uploadDiagnosticStorageKey = (userId: string) =>
  `cognifix_upload_diagnostic_${userId}`;
const uploadedWorkspacesStorageKey = (userId: string) =>
  `cognifix_uploaded_workspaces_${userId}`;

function loadSavedUploadDiagnostic(userId: string): QuizQuestion | null {
  if (!userId || userId === initialUserProfile.id) return null;
  try {
    const saved = JSON.parse(
      localStorage.getItem(uploadDiagnosticStorageKey(userId)) || "null",
    ) as QuizQuestion | null;
    return saved?.stem &&
      Array.isArray(saved.options) &&
      saved.options.length === 4
      ? saved
      : null;
  } catch {
    return null;
  }
}

function loadUploadedWorkspaces(userId: string): UploadedLearningWorkspace[] {
  if (!userId || userId === initialUserProfile.id) return [];
  try {
    const saved = JSON.parse(
      localStorage.getItem(uploadedWorkspacesStorageKey(userId)) || "[]",
    );
    return Array.isArray(saved)
      ? saved.filter(
          (item): item is UploadedLearningWorkspace =>
            item?.question?.stem && item?.uploadPath,
        )
      : [];
  } catch {
    return [];
  }
}

function learningAssetsFor(question: QuizQuestion): {
  flashcards: FlashcardItem[];
  nodes: MindMapNode[];
} {
  const misconception = question.detectedMisconceptions[0];
  const topic = question.topic;
  const subject = question.subject;
  const miscName = misconception?.name || "Targeted Operation Review";
  const miscDesc = misconception?.description || "Common misconception detected from student error.";

  const nodes: MindMapNode[] = [
    {
      id: `node_prereq_${question.id}`,
      label: `${topic} Foundations`,
      subject,
      level: 1,
      x: 120,
      y: 180,
      status: "mastered",
      prerequisites: [],
      description: `Prerequisite definitions, domain restrictions, and primitive rules governing ${topic}.`,
      keyTakeaway: `Before performing compound steps, establish valid variable definitions and boundaries.`,
      exampleOrFormula: question.mathNotation || `Input validity check: verify preconditions on ${topic}`,
      commonMistake: `Skipping basic definitions and assuming operations work on arbitrary types without validation.`,
      whyItMatters: `Without foundational grounding, arithmetic transformations yield undefined states.`,
    },
    {
      id: `node_core_${question.id}`,
      label: `Core Mechanism: ${topic}`,
      subject,
      level: 1,
      x: 120,
      y: 340,
      status: "mastered",
      prerequisites: [`node_prereq_${question.id}`],
      description: question.mathObjective || `Fundamental computational mechanism and evaluation logic in ${topic}.`,
      keyTakeaway: `Evaluate step-by-step strictly following operator precedence and algebraic identities.`,
      exampleOrFormula: question.options.find(o => o.isCorrect)?.rationale || question.socraticHint.anchor,
      commonMistake: `Executing multiple mixed operations simultaneously in mental arithmetic.`,
      whyItMatters: `Forms the computational engine of all problems in ${topic}.`,
    },
    {
      id: `node_trap_${question.id}`,
      label: `Trap: ${miscName.length > 25 ? miscName.slice(0, 24) + '…' : miscName}`,
      subject,
      level: 2,
      x: 360,
      y: 260,
      status: "vulnerable",
      misconceptionRisk: `Active Trap: ${miscName}`,
      prerequisites: [`node_core_${question.id}`],
      description: miscDesc,
      keyTakeaway: question.socraticHint.anchor || `Carefully verify each transformation instead of relying on procedural shortcuts.`,
      exampleOrFormula: `Watch out: ${miscName}. Always test against first principles.`,
      commonMistake: miscDesc,
      whyItMatters: `Resolving this barrier prevents cascading errors into advanced problems.`,
    },
    {
      id: `node_app_${question.id}`,
      label: `Boundary & Rule Verification`,
      subject,
      level: 2,
      x: 360,
      y: 130,
      status: "unlocked",
      prerequisites: [`node_core_${question.id}`],
      description: `Techniques to test corner cases, zero values, and inverse checks in ${topic}.`,
      keyTakeaway: `Back-substitute solutions into original statements to verify correctness before concluding.`,
      exampleOrFormula: `Check: f(result) === target_constraint`,
      commonMistake: `Assuming an answer is correct because it matches an intuitive pattern without back-checking.`,
      whyItMatters: `Guarantees self-correction and exam accuracy.`,
    },
    {
      id: `node_adv_${question.id}`,
      label: `Advanced Synthesis`,
      subject,
      level: 3,
      x: 600,
      y: 240,
      status: "unlocked",
      prerequisites: [`node_trap_${question.id}`, `node_app_${question.id}`],
      description: question.theoremDomain || `Higher-order compositions and advanced theorems building upon ${topic}.`,
      keyTakeaway: `Complex systems are simply chains of rigorously verified elementary steps.`,
      exampleOrFormula: `Composed: TargetTheorem( verified_${topic}_core )`,
      commonMistake: `Attempting optimization or complex theorems before basic mechanics are solidified.`,
      whyItMatters: `Prepares you for collegiate and olympiad level STEM problem solving.`,
    },
  ];

  return {
    flashcards: [
      {
        id: `upload-card-${question.id}`,
        subject: question.subject,
        topic: question.topic,
        frontQuestion: question.stem,
        backIntuition:
          question.options.find((option) => option.isCorrect)?.rationale ||
          question.socraticHint.anchor,
        mathematicalProof:
          question.mathNotation ||
          question.theoremDomain ||
          "Review the rule used in this question.",
        trapWarning:
          misconception?.description ||
          "Check the original rule before choosing an answer.",
        status: "due",
        decayLevel: "Critical",
        nextReview: "Today",
      },
    ],
    nodes,
  };
}

async function fetchMindMapFromAI(
  question: QuizQuestion,
): Promise<MindMapNode[]> {
  const misconception = question.detectedMisconceptions[0];
  try {
    const response = await fetch("/api/agents/generate-mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: question.topic,
        subject: question.subject,
        misconception: misconception?.name || question.theoremDomain || "Core concept review",
        questionStem: question.stem,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.nodes) && data.nodes.length >= 3) {
        return data.nodes as MindMapNode[];
      }
    }
  } catch (err) {
    console.warn("AI mindmap generation failed, using static fallback:", err);
  }
  return learningAssetsFor(question).nodes;
}

async function fetchFlashcardsFromAI(
  question: QuizQuestion,
): Promise<FlashcardItem[]> {
  const misconception = question.detectedMisconceptions[0];
  try {
    const response = await fetch("/api/agents/generate-flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: question.topic,
        subject: question.subject,
        misconception: misconception?.name || question.theoremDomain || "Core concept review",
        questionStem: question.stem,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.flashcards) && data.flashcards.length > 0) {
        return data.flashcards as FlashcardItem[];
      }
    }
  } catch (err) {
    console.warn("AI flashcard generation failed, using static fallback:", err);
  }
  // Fallback: return the single static card
  return learningAssetsFor(question).flashcards;
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>("landing");
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("cognifix_user");
    if (!saved) return initialUserProfile;
    try {
      const parsed = JSON.parse(saved) as UserProfile;
      // Remove the legacy seeded profile from browsers that used the old demo build.
      return parsed.id === "usr_cogni_4092" ||
        parsed.email === "learner@cognifix.edu"
        ? initialUserProfile
        : parsed;
    } catch {
      return initialUserProfile;
    }
  });

  const [activeQuestion, setActiveQuestion] =
    useState<QuizQuestion>(sampleQuizQuestion);
  const [uploadedWorkspaces, setUploadedWorkspaces] = useState<
    UploadedLearningWorkspace[]
  >([]);
  const [uploadHistory, setUploadHistory] = useState<UploadedWorkRecord[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null,
  );
  const [logs, setLogs] = useState<DiagnosticLog[]>(initialDiagnosticLogs);
  const [flashcards, setFlashcards] = useState<typeof initialFlashcards>([]);
  const [mindMapNodes, setMindMapNodes] = useState<typeof initialMindMapNodes>(
    [],
  );
  const [roadmapSteps] = useState<typeof initialRoadmapSteps>([]);
  const [teacherStats] = useState<typeof initialTeacherStats>({
    totalStudents: 0,
    avgMastery: 0,
    activeTrapsFlagged: 0,
    remediationSuccessRate: 0,
    topMisconceptions: [],
    studentRoster: [],
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    sessionStorage.getItem("cognifix_access_token"),
  );
  const isAuthenticated = !user.isGuest;

  // Keep an uploaded-work diagnostic tied to the student after a new sign-in.
  useEffect(() => {
    const savedQuestion = isAuthenticated
      ? loadSavedUploadDiagnostic(user.id)
      : null;
    if (savedQuestion) setActiveQuestion(savedQuestion);
  }, [isAuthenticated, user.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setUploadedWorkspaces(loadUploadedWorkspaces(user.id));
  }, [isAuthenticated, user.id]);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/uploads/wrong-answer", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((result) =>
        setUploadHistory(Array.isArray(result.uploads) ? result.uploads : []),
      )
      .catch(() => setUploadHistory([]));
  }, [accessToken]);

  useEffect(() => {
    if (!user.isGuest)
      localStorage.setItem(
        uploadedWorkspacesStorageKey(user.id),
        JSON.stringify(uploadedWorkspaces),
      );
  }, [uploadedWorkspaces, user.id, user.isGuest]);

  useEffect(() => {
    const callbackToken = new URLSearchParams(
      window.location.hash.slice(1),
    ).get("access_token");
    const token =
      callbackToken || sessionStorage.getItem("cognifix_access_token");
    if (!token) return;
    try {
      const encodedPayload = token
        .split(".")[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const paddedPayload = encodedPayload.padEnd(
        encodedPayload.length + ((4 - (encodedPayload.length % 4)) % 4),
        "=",
      );
      const payload = JSON.parse(
        decodeURIComponent(escape(atob(paddedPayload))),
      );
      const metadata = payload.user_metadata || {};
      setUser({
        id: payload.sub,
        name:
          metadata.full_name ||
          metadata.name ||
          payload.email?.split("@")[0] ||
          "Student",
        email: payload.email || "",
        isGuest: false,
        role: "student",
        streak: 0,
        xp: 0,
        tier: "Self-paced learner",
        masteryScore: 0,
      });
      const savedQuestion = loadSavedUploadDiagnostic(payload.sub);
      if (savedQuestion) setActiveQuestion(savedQuestion);
      sessionStorage.setItem("cognifix_access_token", token);
      setAccessToken(token);
      window.history.replaceState(null, "", window.location.pathname);
      setCurrentView("dashboard");
    } catch {
      sessionStorage.removeItem("cognifix_access_token");
      setAccessToken(null);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cognifix_user", JSON.stringify(user));
  }, [user]);

  const handleUpdateUser = (updated: UserProfile) => {
    setUser(updated);
    setCurrentView("dashboard");
  };

  const handleSelectPracticeTopic = (topic: string) => {
    if (topic.toLowerCase().includes("calculus")) {
      setActiveQuestion(sampleCalculusQuestion);
    } else {
      setActiveQuestion(sampleQuizQuestion);
    }
    setCurrentView("practice-and-quiz");
  };

  const activateWorkspace = (
    workspace: UploadedLearningWorkspace,
    view: ViewMode = "practice-and-quiz",
  ) => {
    const assets = learningAssetsFor(workspace.question);
    setActiveWorkspaceId(workspace.id);
    setActiveQuestion(workspace.question);
    setFlashcards(assets.flashcards);
    setMindMapNodes(assets.nodes);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Fire-and-forget AI flashcard & mind map generation
    fetchFlashcardsFromAI(workspace.question).then((aiCards) => {
      if (aiCards.length > 1) setFlashcards(aiCards);
    });
    fetchMindMapFromAI(workspace.question).then((aiNodes) => {
      if (aiNodes.length > 1) setMindMapNodes(aiNodes);
    });
  };

  const handleDiagnoseUpload = async (upload: {
    path: string;
    name: string;
  }) => {
    if (!accessToken)
      throw new Error("Please sign in again before diagnosing your upload.");
    const response = await fetch("/api/uploads/wrong-answer/diagnose", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ storagePath: upload.path }),
    });
    const result = await response.json();
    if (!response.ok || !result.question)
      throw new Error(
        result.error || "Could not generate questions from this upload.",
      );
    const generatedQuestion = result.question as QuizQuestion;
    localStorage.setItem(
      uploadDiagnosticStorageKey(user.id),
      JSON.stringify(generatedQuestion),
    );
    const now = new Date().toISOString();
    const workspace: UploadedLearningWorkspace = {
      id: upload.path,
      uploadPath: upload.path,
      uploadName: upload.name,
      title: `${generatedQuestion.subject} · ${generatedQuestion.topic}`,
      question: generatedQuestion,
      createdAt: now,
      updatedAt: now,
    };
    setUploadedWorkspaces((previous) => [
      workspace,
      ...previous.filter((item) => item.id !== workspace.id),
    ]);
    setUploadHistory((previous) => [
      { path: upload.path, name: upload.name, createdAt: now },
      ...previous.filter((item) => item.path !== upload.path),
    ]);
    activateWorkspace(workspace);
  };

  const handleUploadSaved = (upload: UploadedWorkRecord) => {
    setUploadHistory((previous) => [
      upload,
      ...previous.filter((item) => item.path !== upload.path),
    ]);
  };

  const handleDeleteUpload = async (storagePath: string) => {
    if (accessToken) {
      const response = await fetch("/api/uploads/wrong-answer", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storagePath }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Failed to delete upload.");
      }
    }
    setUploadHistory((previous) =>
      previous.filter((item) => item.path !== storagePath),
    );
    setUploadedWorkspaces((previous) =>
      previous.filter((item) => item.uploadPath !== storagePath),
    );
    if (activeWorkspaceId === storagePath) {
      setActiveWorkspaceId(null);
    }
  };

  const handlePracticeQuestionChanged = (nextQuestion: QuizQuestion) => {
    if (!user.isGuest)
      localStorage.setItem(
        uploadDiagnosticStorageKey(user.id),
        JSON.stringify(nextQuestion),
      );
    setActiveQuestion(nextQuestion);
    if (activeWorkspaceId) {
      setUploadedWorkspaces((previous) =>
        previous.map((workspace) =>
          workspace.id === activeWorkspaceId
            ? {
                ...workspace,
                question: nextQuestion,
                updatedAt: new Date().toISOString(),
              }
            : workspace,
        ),
      );
      const assets = learningAssetsFor(nextQuestion);
      setFlashcards(assets.flashcards);
      setMindMapNodes(assets.nodes);
      // Fire-and-forget AI flashcard & mind map generation
      fetchFlashcardsFromAI(nextQuestion).then((aiCards) => {
        if (aiCards.length > 1) setFlashcards(aiCards);
      });
      fetchMindMapFromAI(nextQuestion).then((aiNodes) => {
        if (aiNodes.length > 1) setMindMapNodes(aiNodes);
      });
    }
  };

  const handleSelectNodeForPractice = async (node: MindMapNode) => {
    try {
      const misconception =
        node.misconceptionRisk ||
        node.commonMistake ||
        node.keyTakeaway ||
        node.description;

      const response = await fetch("/api/agents/generate-remediation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: node.label,
          subject: node.subject,
          misconception,
          difficulty: node.level === 3 ? "Hard" : node.level === 2 ? "Medium" : "Easy",
        }),
      });

      let problemData: any = null;
      if (response.ok) {
        const json = await response.json();
        if (json.problem && json.problem.stem) {
          problemData = json.problem;
        }
      }

      if (!problemData) {
        problemData = {
          stem: `In ${node.subject}, when evaluating ${node.label}, which approach avoids the trap of "${misconception}"?`,
          mathNotation: node.exampleOrFormula || undefined,
          theoremDomain: `${node.subject} · ${node.label}`,
          options: [
            {
              id: "A",
              text: `Apply step-by-step verification: ${node.keyTakeaway || "verify each operational step from first principles"}`,
              isCorrect: true,
              rationale: "Correctly preserves operational order and mathematical equivalence.",
            },
            {
              id: "B",
              text: `Perform immediate cancellation without checking preconditions or variable scope.`,
              isCorrect: false,
              rationale: `This triggers ${misconception}`,
              misconceptionTrigger: misconception,
            },
            {
              id: "C",
              text: `Assume intermediate operations update state in-place without explicit assignment.`,
              isCorrect: false,
              rationale: "Confuses expression evaluation with persistent state modification.",
            },
            {
              id: "D",
              text: `Treat the expression as undefined without evaluating domain boundaries.`,
              isCorrect: false,
              rationale: "The expression is well-formed under standard axioms.",
            },
          ],
          socraticHint: {
            question: `What fundamental rule in ${node.label} applies here?`,
            anchor: node.keyTakeaway || "Check your work carefully against first principles.",
          },
        };
      }

      const now = new Date().toISOString();
      const questionId = `concept_q_${Date.now()}`;
      const newQuestion: QuizQuestion = {
        id: questionId,
        subject: node.subject,
        topic: node.label,
        code: `CONCEPT-0${node.level}`,
        questionNumber: 1,
        totalQuestions: 5,
        sourceQuestion: node.description,
        stem: problemData.stem,
        mathNotation: problemData.mathNotation || node.exampleOrFormula,
        mathObjective: node.keyTakeaway || `Master ${node.label}`,
        theoremDomain: problemData.theoremDomain || `${node.subject} · ${node.label}`,
        options: problemData.options,
        socraticHint: problemData.socraticHint || {
          question: `What rule in ${node.label} governs this?`,
          anchor: node.keyTakeaway || "Check your work carefully.",
        },
        detectedMisconceptions: [
          {
            name: node.misconceptionRisk || node.commonMistake || `${node.label} Pitfall`,
            errorTag: `CONCEPT-0${node.level}`,
            description: node.description,
            historicalFrequency: "Targeted Concept Practice",
            status: "Active Queue",
            triggerOption: "B",
          },
        ],
        knowledgeTree: {
          nodeId: node.id,
          title: node.label,
          relationship: `Targeted Concept Calibration from Knowledge Graph`,
        },
      };

      // Store in localStorage & workspaces so user can return to it!
      const workspaceId = `concept-workspace-${Date.now()}`;
      const workspace: UploadedLearningWorkspace = {
        id: workspaceId,
        uploadPath: workspaceId,
        uploadName: `${node.label} (${node.subject})`,
        title: `${node.subject} · ${node.label}`,
        question: newQuestion,
        createdAt: now,
        updatedAt: now,
      };

      setUploadedWorkspaces((previous) => [
        workspace,
        ...previous.filter((item) => item.id !== workspace.id),
      ]);
      localStorage.setItem(
        uploadDiagnosticStorageKey(user.id),
        JSON.stringify(newQuestion),
      );

      // Activate workspace (sets active question, generates flashcards & mindmap for new concept, and switches view)
      activateWorkspace(workspace, "practice-and-quiz");
    } catch (err) {
      console.error("Error generating concept practice:", err);
      setCurrentView("practice-and-quiz");
    }
  };

  const handleQuestionCompleted = (isCorrect: boolean, errorTag?: string) => {
    setUser((prev) => ({
      ...prev,
      xp: prev.xp + (isCorrect ? 35 : 15),
      masteryScore: isCorrect
        ? Math.min(100, prev.masteryScore + 1)
        : Math.max(50, prev.masteryScore - 1),
    }));

    if (!isCorrect && errorTag) {
      const newLog: DiagnosticLog = {
        traceId: "#LOG-" + Math.floor(8200 + Math.random() * 800),
        subject: activeQuestion.subject,
        topic: activeQuestion.topic,
        flaggedTrap:
          activeQuestion.detectedMisconceptions[0]?.name ||
          "Cognitive Distortion",
        status: "Active Queue",
        resolvedIn: "Under Remediation",
        date: "Just now",
        severity: "critical",
      };
      setLogs((prev) => [newLog, ...prev]);
    }
  };

  const handleNavigate = (view: ViewMode) => {
    if (view !== "landing" && !isAuthenticated) {
      setIsAuthOpen(true);
      return;
    }
    if (view === "practice-and-quiz") {
      const savedQuestion = loadSavedUploadDiagnostic(user.id);
      if (savedQuestion) setActiveQuestion(savedQuestion);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#f8f9ff] text-[#0b1c30]">
      {/* Sticky App Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === "landing" && (
          <LandingView onOpenAuth={() => setIsAuthOpen(true)} />
        )}

        {currentView === "dashboard" && (
          <DashboardView
            user={user}
            logs={logs}
            onNavigate={handleNavigate}
            accessToken={accessToken}
            onDiagnoseUpload={handleDiagnoseUpload}
            workspaces={uploadedWorkspaces}
            onOpenWorkspace={activateWorkspace}
            uploadHistory={uploadHistory}
            onUploadSaved={handleUploadSaved}
            onDeleteUpload={handleDeleteUpload}
          />
        )}

        {currentView === "practice-and-quiz" && (
          <PracticeQuizView
            question={activeQuestion}
            onNavigate={handleNavigate}
            onQuestionCompleted={handleQuestionCompleted}
            onQuestionChanged={handlePracticeQuestionChanged}
          />
        )}

        {currentView === "flashcards" && (
          <FlashcardsView flashcards={flashcards} onNavigate={handleNavigate} />
        )}

        {currentView === "mind-map" && (
          <MindMapView
            nodes={mindMapNodes}
            question={activeQuestion}
            onNavigate={handleNavigate}
            onUpdateNodeStatus={(nodeId, status) => {
              setMindMapNodes((prev) =>
                prev.map((n) => (n.id === nodeId ? { ...n, status } : n))
              );
            }}
            onSelectNodeForPractice={handleSelectNodeForPractice}
          />
        )}

        {currentView === "roadmap" && (
          <RoadmapView
            steps={roadmapSteps}
            onNavigate={handleNavigate}
            userId={user.id}
            accessToken={accessToken}
          />
        )}

        {currentView === "teacher-portal" && (
          <TeacherPortalView stats={teacherStats} onNavigate={handleNavigate} />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Auth / Profile Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        onUpdateUser={handleUpdateUser}
      />
    </div>
  );
}
