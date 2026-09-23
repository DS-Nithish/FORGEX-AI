export type ViewMode =
  | "landing"
  | "dashboard"
  | "practice-and-quiz"
  | "flashcards"
  | "mind-map"
  | "roadmap"
  | "teacher-portal";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
  role: "student" | "teacher";
  streak: number;
  xp: number;
  tier: string;
  masteryScore: number;
}

export interface QuizOption {
  id: "A" | "B" | "C" | "D";
  text: string;
  rationale?: string;
  isCorrect: boolean;
  misconceptionTrigger?: string;
  errorTag?: string;
}

export interface QuizQuestion {
  id: string;
  subject: string;
  topic: string;
  code: string;
  questionNumber: number;
  totalQuestions: number;
  sourceQuestion?: string;
  uploadedAnswer?: string;
  diagnosisSummary?: string;
  stem: string;
  mathNotation?: string;
  mathObjective?: string;
  theoremDomain?: string;
  options: QuizOption[];
  socraticHint: {
    question: string;
    anchor: string;
  };
  detectedMisconceptions: {
    name: string;
    errorTag: string;
    description: string;
    historicalFrequency: string;
    status: string;
    triggerOption: "A" | "B" | "C" | "D";
  }[];
  knowledgeTree: {
    nodeId: string;
    title: string;
    relationship: string;
  };
}

export interface UploadedLearningWorkspace {
  id: string;
  uploadName: string;
  uploadPath: string;
  title: string;
  question: QuizQuestion;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedWorkRecord {
  path: string;
  name: string;
  createdAt: string;
}

export interface DiagnosticLog {
  traceId: string;
  subject: string;
  topic: string;
  flaggedTrap: string;
  status: "Remediated" | "Active Queue" | "Diagnosing";
  resolvedIn: string;
  date: string;
  severity: "critical" | "moderate" | "low";
}

export interface FlashcardItem {
  id: string;
  topic: string;
  subject: string;
  frontQuestion: string;
  backIntuition: string;
  mathematicalProof: string;
  trapWarning: string;
  status: "due" | "known" | "learning";
  decayLevel: "Critical" | "Stable" | "Optimal";
  nextReview: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  subject: string;
  level: number;
  x: number;
  y: number;
  status: "mastered" | "vulnerable" | "unlocked";
  misconceptionRisk?: string;
  prerequisites: string[];
  description: string;
  keyTakeaway?: string;
  exampleOrFormula?: string;
  commonMistake?: string;
  whyItMatters?: string;
}

export interface RoadmapResource {
  id?: string;
  title: string;
  type: "video" | "docs" | "practice";
  url: string;
  source: string;
  completed?: boolean;
}

export interface RoadmapStep {
  id: string;
  stepNumber: number;
  title: string;
  topic: string;
  description: string;
  completed: boolean;
  timeEstimate: string;
  resources: RoadmapResource[];
}

export interface SavedRoadmap {
  id: string;
  topic: string;
  roadmapTitle: string;
  estimatedTotalHours: string;
  steps: RoadmapStep[];
  createdAt: string;
  updatedAt: string;
}

export interface TeacherClassStats {
  totalStudents: number;
  avgMastery: number;
  activeTrapsFlagged: number;
  remediationSuccessRate: number;
  topMisconceptions: {
    name: string;
    topic: string;
    count: number;
    pctClass: number;
    severity: "high" | "medium";
  }[];
  studentRoster: {
    id: string;
    name: string;
    email: string;
    mastery: number;
    status: "Needs Remediation" | "On Track" | "Accelerated";
    lastActive: string;
    primaryTrap: string;
  }[];
}
