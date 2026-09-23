import { DiagnosticLog, FlashcardItem, MindMapNode, QuizQuestion, RoadmapStep, TeacherClassStats, UserProfile } from '../types';

export const initialUserProfile: UserProfile = {
  id: '',
  name: '',
  email: '',
  isGuest: true,
  role: 'student',
  streak: 0,
  xp: 0,
  tier: 'New learner',
  masteryScore: 0
};

export const sampleQuizQuestion: QuizQuestion = {
  id: 'q_spectral_401',
  subject: 'Linear Algebra',
  topic: 'Eigenvalues & Eigenvectors',
  code: 'MATH-302',
  questionNumber: 4,
  totalQuestions: 10,
  stem: 'Let A be an n × n real symmetric matrix. If λ is an eigenvalue of A with multiplicity 2, what can be deduced about the dimension of the corresponding eigenspace?',
  mathNotation: 'A = A^T ∈ ℝ^(n×n), alg_mult(λ) = 2',
  mathObjective: 'Evaluate dim(E_λ) = nullity(A - λI)',
  theoremDomain: 'Spectral Theorem Domain',
  options: [
    {
      id: 'A',
      text: 'The geometric multiplicity must be strictly less than 2.',
      rationale: 'Conflates general non-diagonalizable Jordan blocks with real symmetric operators.',
      isCorrect: false,
      misconceptionTrigger: 'Defective Eigenspace Confusion',
      errorTag: 'Err: #402'
    },
    {
      id: 'B',
      text: 'The eigenspace has dimension exactly 2 because symmetric matrices are always orthogonally diagonalizable.',
      rationale: 'By the Real Spectral Theorem, every real symmetric matrix has an orthonormal eigenbasis; hence algebraic multiplicity equals geometric multiplicity.',
      isCorrect: true
    },
    {
      id: 'C',
      text: 'The dimension cannot be determined without knowing the rank of A.',
      rationale: 'Believing global rank of A dictates relative nullity of shifted operator (A - λI).',
      isCorrect: false,
      misconceptionTrigger: 'Rank-Nullity Decoupling',
      errorTag: 'Err: #405'
    },
    {
      id: 'D',
      text: 'The eigenspace dimension is at most 1.',
      rationale: 'Assuming a single geometric dimension per unique eigenvalue regardless of multiplicity.',
      isCorrect: false,
      misconceptionTrigger: 'Geometric Multiplicity Bound Misbelief',
      errorTag: 'Err: #408'
    }
  ],
  socraticHint: {
    question: 'Recall the Spectral Theorem: Every real symmetric matrix has an orthonormal basis of eigenvectors. What does orthogonal diagonalizability imply about the relationship between algebraic multiplicity and geometric multiplicity?',
    anchor: 'For symmetric A: geo_mult(λ) = alg_mult(λ) always.'
  },
  detectedMisconceptions: [
    {
      name: 'Geometric Degeneracy Bias',
      errorTag: 'Err: #401',
      description: 'Assuming eigenvalues with multiplicity > 1 inherently result in defective eigenspaces (confusing generic matrices with symmetric matrices).',
      historicalFrequency: '38%',
      status: 'Remediated in Step 2',
      triggerOption: 'A'
    },
    {
      name: 'Rank-Nullity Decoupling',
      errorTag: 'Err: #405',
      description: 'Believing global rank of A dictates relative nullity of shifted operator (A - λI).',
      historicalFrequency: '24%',
      status: 'Active Trap Check',
      triggerOption: 'C'
    }
  ],
  knowledgeTree: {
    nodeId: 'Node #LA-88',
    title: 'Orthogonal Diagonalization',
    relationship: 'Prerequisite for Spectral Decomposition'
  }
};

export const sampleCalculusQuestion: QuizQuestion = {
  id: 'q_limits_4092',
  subject: 'Calculus II',
  topic: 'Limits at Infinity & Indeterminate Forms',
  code: 'MATH-201',
  questionNumber: 5,
  totalQuestions: 10,
  stem: 'Evaluate the following limit:',
  mathNotation: 'lim_(x → ∞) (3x^2 + 2) / (5x^2 - 4x)',
  mathObjective: 'Find limit value as x approaches infinity',
  theoremDomain: 'Asymptotic Dominance',
  options: [
    {
      id: 'A',
      text: '0',
      isCorrect: false,
      rationale: 'Assumed denominator degree strictly outgrows numerator.',
      misconceptionTrigger: 'Degree Asymmetry Fallacy',
      errorTag: 'Err: #201'
    },
    {
      id: 'B',
      text: '1',
      isCorrect: false,
      rationale: 'Student submitted reasoning: "Divided ∞ by ∞ to get 1, then multiplied by 3/5..."',
      misconceptionTrigger: 'Arithmetic Invariance on Infinity',
      errorTag: 'Err: #204'
    },
    {
      id: 'C',
      text: '3/5',
      isCorrect: true,
      rationale: 'Correct value: Both polynomials share maximum degree 2. The limit is the ratio of dominant coefficients (3/5).'
    },
    {
      id: 'D',
      text: 'Does not exist (DNE)',
      isCorrect: false,
      rationale: 'Thought indeterminate ratio implies oscillation or divergence.',
      misconceptionTrigger: 'Indeterminate = Nonexistent Confusion',
      errorTag: 'Err: #209'
    }
  ],
  socraticHint: {
    question: 'Factor out the highest power of x (which is x²) from both the numerator and the denominator. What happens to terms like 2/x² and 4/x as x → ∞?',
    anchor: 'Terms with x in denominator approach 0, leaving only leading coefficients 3 and 5.'
  },
  detectedMisconceptions: [
    {
      name: 'Arithmetic Invariance on Infinity',
      errorTag: 'Err: #204',
      description: 'Treating the indeterminate form ∞/∞ as an algebraic cancellation equal to 1, ignoring competing asymptotic rates of polynomial growth.',
      historicalFrequency: '47%',
      status: 'Identified Mental Model Trap',
      triggerOption: 'B'
    }
  ],
  knowledgeTree: {
    nodeId: 'Node #CALC-14',
    title: 'Polynomial Asymptotics',
    relationship: 'Foundation for Rational Limit Evaluation'
  }
};

export const initialDiagnosticLogs: DiagnosticLog[] = [];

export const initialFlashcards: FlashcardItem[] = [
  {
    id: 'fc_1',
    topic: 'Differential Calculus',
    subject: 'Calculus',
    frontQuestion: 'Why is dx/dt not simply a fraction that can always be canceled algebraically?',
    backIntuition: 'dx/dt represents the instantaneous limit of Δx/Δt as Δt approaches 0. While the Chain Rule mimics fraction multiplication, treating it as standalone algebraic numbers fails in multivariable partial derivatives and differential forms.',
    mathematicalProof: 'dx/dt = lim_(h→0) [x(t+h) - x(t)] / h. In multivariable: (∂z/∂x)(∂x/∂y)(∂y/∂z) = -1 (Triple Product Rule), which contradicts naive fraction cancellation.',
    trapWarning: 'Assuming single-variable differential notation properties hold identically across multivariable partial gradients.',
    status: 'due',
    decayLevel: 'Critical',
    nextReview: 'Today'
  },
  {
    id: 'fc_2',
    topic: 'Linear Algebra',
    subject: 'Linear Algebra',
    frontQuestion: 'Does a matrix with det(A) = 0 necessarily mean the system Ax = b has no solution?',
    backIntuition: 'No! If b lies inside the column space col(A), there exist infinitely many solutions. Having det(A) = 0 only rules out a UNIQUE solution.',
    mathematicalProof: 'By Rouché-Capelli: rank(A) = rank([A|b]) guarantees existence. When det(A)=0, nullity(A) ≥ 1, so solutions form an affine subspace.',
    trapWarning: 'Conflating "no unique inverse" with "inconsistent system".',
    status: 'due',
    decayLevel: 'Critical',
    nextReview: '18h'
  },
  {
    id: 'fc_3',
    topic: 'Thermodynamics',
    subject: 'Physics',
    frontQuestion: 'Why does entropy increase even in a spontaneous process where temperature remains constant?',
    backIntuition: 'Entropy measures accessible microstates (phase volume). In isothermal expansion, thermal energy remains unchanged, but spatial dispersal multiplies available quantum states.',
    mathematicalProof: 'ΔS = nR ln(V2/V1). When V2 > V1, ΔS > 0 strictly from spatial configuration, independent of temperature delta.',
    trapWarning: 'Assuming entropy change strictly requires heat transfer ΔQ ≠ 0 or temperature shifts.',
    status: 'due',
    decayLevel: 'Stable',
    nextReview: '3d'
  },
  {
    id: 'fc_4',
    topic: 'Quantum Mechanics',
    subject: 'Physics',
    frontQuestion: 'Why does wavefunction probability current density j(x,t) satisfy a continuity equation?',
    backIntuition: 'Total probability of finding a particle anywhere in the universe is invariant (conserved at 1). Local probability changes must equal the divergence of probability flux.',
    mathematicalProof: '∂ρ/∂t + ∇·j = 0, where ρ = |Ψ|² and j = (ℏ/2mi)(Ψ*∇Ψ - Ψ∇Ψ*). Derived directly from the Schrödinger equation.',
    trapWarning: 'Treating probability density as static rather than dynamically conserving fluid-like flow.',
    status: 'known',
    decayLevel: 'Optimal',
    nextReview: '6d'
  }
];

export const initialMindMapNodes: MindMapNode[] = [
  {
    id: 'node_limits',
    label: 'Limits & Asymptotics',
    subject: 'Calculus',
    level: 1,
    x: 120,
    y: 180,
    status: 'mastered',
    prerequisites: [],
    description: 'Foundational behavior of functions approaching boundary points and infinity.',
    keyTakeaway: 'Limits examine what values a function approaches arbitrarily closely, not what happens upon direct evaluation.',
    exampleOrFormula: 'lim_(x→a) f(x) = L  ⟺  ∀ε>0, ∃δ>0 s.t. 0<|x-a|<δ ⟹ |f(x)-L|<ε',
    commonMistake: 'Treating infinity (∞) as an algebraic scalar number that cancels out.',
    whyItMatters: 'Forms the strict foundation upon which derivatives, integrals, and continuity are constructed.'
  },
  {
    id: 'node_continuity',
    label: 'Continuity & IVT',
    subject: 'Calculus',
    level: 1,
    x: 120,
    y: 340,
    status: 'mastered',
    prerequisites: ['node_limits'],
    description: 'Topological smoothness and Intermediate Value guarantees.',
    keyTakeaway: 'A function is continuous at c if and only if lim_(x→c) f(x) = f(c). No jumps, asymptotes, or holes.',
    exampleOrFormula: 'f(c) exists, lim_(x→c) f(x) exists, and lim_(x→c) f(x) = f(c)',
    commonMistake: 'Assuming a function is continuous everywhere without checking domain exclusions like division by zero.',
    whyItMatters: 'Guarantees root existence via Intermediate Value Theorem and enables Extreme Value Theorem.'
  },
  {
    id: 'node_derivatives',
    label: 'Single-Var Derivatives',
    subject: 'Calculus',
    level: 2,
    x: 360,
    y: 140,
    status: 'mastered',
    prerequisites: ['node_limits', 'node_continuity'],
    description: 'Instantaneous rate of change, tangent slopes, and linear approximations.',
    keyTakeaway: 'The derivative is the limit of difference quotients: f\'(x) = lim_(h→0) [f(x+h) - f(x)] / h.',
    exampleOrFormula: 'df/dx = lim_(Δx→0) Δy/Δx; Linearization: L(x) = f(a) + f\'(a)(x-a)',
    commonMistake: 'Memorizing power rules mechanically without understanding when the Chain Rule is strictly required.',
    whyItMatters: 'Core building block for optimization, gradient descent, and physics rate equations.'
  },
  {
    id: 'node_trap_infinity',
    label: 'Trap: Arithmetic on ∞',
    subject: 'Calculus',
    level: 2,
    x: 360,
    y: 320,
    status: 'vulnerable',
    misconceptionRisk: 'Active Trap: ∞/∞ = 1 fallacy',
    prerequisites: ['node_limits'],
    description: 'Vulnerability point where students substitute infinity as a standard scalar quantity.',
    keyTakeaway: '∞ is a limiting behavior, never a number. Forms like ∞/∞, 0/0, and ∞ - ∞ are indeterminate and require asymptotic dominance analysis or L\'Hôpital\'s Rule.',
    exampleOrFormula: 'lim_(x→∞) (3x²)/(5x²) = 3/5, NOT (3*∞)/(5*∞) = 1. Compare degrees of growth!',
    commonMistake: 'Canceling ∞ in the numerator and denominator as if it were a common algebraic factor.',
    whyItMatters: 'Failing this trap corrupts all subsequent work in multivariable convergence, improper integrals, and power series.'
  },
  {
    id: 'node_gradients',
    label: 'Gradients & Directional Derivs',
    subject: 'Calculus',
    level: 3,
    x: 600,
    y: 160,
    status: 'vulnerable',
    misconceptionRisk: 'Confusing gradient magnitude with directional projection',
    prerequisites: ['node_derivatives'],
    description: 'Multidimensional steepness vector and tangent plane normals.',
    keyTakeaway: '∇f points in the direction of greatest instantaneous increase; D_u f = ∇f · u (where u is a unit vector).',
    exampleOrFormula: '∇f = [∂f/∂x, ∂f/∂y, ∂f/∂z]ᵀ; |∇f| = maximum rate of change',
    commonMistake: 'Taking directional derivative along vector v without normalizing it to unit length (|u| = 1).',
    whyItMatters: 'Foundational to backpropagation in Deep Learning, fluid dynamics, and physics field potentials.'
  },
  {
    id: 'node_spectral',
    label: 'Orthogonal Spectral Theorem',
    subject: 'Linear Algebra',
    level: 3,
    x: 600,
    y: 340,
    status: 'unlocked',
    prerequisites: ['node_gradients'],
    description: 'Eigenspace decomposition of real symmetric transformations into orthonormal axes.',
    keyTakeaway: 'Any real symmetric matrix can be orthogonally diagonalized: A = Q Λ Qᵀ where Q is orthonormal.',
    exampleOrFormula: 'A v_i = λ_i v_i with ⟨v_i, v_j⟩ = δ_ij; A = ∑ λ_i v_i v_iᵀ',
    commonMistake: 'Assuming non-symmetric matrices always have a complete set of orthogonal eigenvectors.',
    whyItMatters: 'Powers Principal Component Analysis (PCA), quantum state observable operators, and stability analysis.'
  }
];

export const initialRoadmapSteps: RoadmapStep[] = [
  {
    id: 'step_1',
    stepNumber: 1,
    title: 'Indeterminate Forms & L\'Hôpital Proof Rigor',
    topic: 'Calculus II',
    description: 'Isolate why ∞/∞ is not unity and verify asymptotic growth hierarchies (exponential > polynomial > logarithmic).',
    completed: true,
    timeEstimate: '45 mins',
    resources: [
      {
        title: '3Blue1Brown: Essence of Calculus - Limits & Derivatives',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=9vKqVkMQHKk',
        source: 'YouTube (Verified)'
      },
      {
        title: 'MIT OpenCourseWare: Asymptotic Behavior of Rational Functions',
        type: 'docs',
        url: 'https://ocw.mit.edu',
        source: 'MIT OCW'
      }
    ]
  },
  {
    id: 'step_2',
    stepNumber: 2,
    title: 'Linear Independence vs Orthogonality',
    topic: 'Linear Algebra',
    description: 'Reconcile geometric projection with algebraic nullity. Avoid conflating orthogonal vectors with merely independent ones.',
    completed: true,
    timeEstimate: '1.2 hours',
    resources: [
      {
        title: 'Gilbert Strang MIT: Orthogonal Vectors and Subspaces',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=Y_Ac6628z54',
        source: 'MIT OCW'
      },
      {
        title: 'Interactive Gram-Schmidt Orthogonalization Visualizer',
        type: 'practice',
        url: 'https://mathlets.org',
        source: 'Mathlets Interactive'
      }
    ]
  },
  {
    id: 'step_3',
    stepNumber: 3,
    title: 'Multivariable Gradients & Tangent Geometry',
    topic: 'Calculus III',
    description: 'Deconstruct why ∇f points perpendicular to level sets and why maximum directional derivative magnitude equals ||∇f||.',
    completed: false,
    timeEstimate: '2.0 hours',
    resources: [
      {
        title: 'Khan Academy: Gradient vector and Directional Derivatives',
        type: 'video',
        url: 'https://www.khanacademy.org/math/multivariable-calculus',
        source: 'Khan Academy'
      },
      {
        title: 'Wolfram MathWorld: Directional Derivative & Gradient Proof',
        type: 'docs',
        url: 'https://mathworld.wolfram.com',
        source: 'Wolfram Research'
      }
    ]
  },
  {
    id: 'step_4',
    stepNumber: 4,
    title: 'The Real Spectral Theorem & Quadratic Forms',
    topic: 'Advanced Linear Algebra',
    description: 'Master geometric multiplicity guarantees for symmetric operators and the principal axes theorem.',
    completed: false,
    timeEstimate: '2.5 hours',
    resources: [
      {
        title: 'Stanford CS229: Review of Linear Algebra and Spectral Decomposition',
        type: 'docs',
        url: 'https://cs229.stanford.edu/section/cs229-linalg.pdf',
        source: 'Stanford University'
      },
      {
        title: '3Blue1Brown: Eigenvectors and Eigenvalues',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=PFDu9oVAE-g',
        source: 'YouTube'
      }
    ]
  }
];

export const initialTeacherStats: TeacherClassStats = {
  totalStudents: 34,
  avgMastery: 74.6,
  activeTrapsFlagged: 19,
  remediationSuccessRate: 91.2,
  topMisconceptions: [
    {
      name: 'Arithmetic Invariance on Infinity (∞/∞ = 1)',
      topic: 'Calculus II',
      count: 16,
      pctClass: 47,
      severity: 'high'
    },
    {
      name: 'Geometric Degeneracy Bias in Symmetric Matrices',
      topic: 'Linear Algebra',
      count: 13,
      pctClass: 38,
      severity: 'high'
    },
    {
      name: 'Normal Force Equals Gravity in Non-Inertial Frames',
      topic: 'Classical Mechanics',
      count: 11,
      pctClass: 32,
      severity: 'medium'
    },
    {
      name: 'Conflating Instantaneous dx/dt with Arithmetic Fractions',
      topic: 'Multivariable Calculus',
      count: 9,
      pctClass: 26,
      severity: 'medium'
    }
  ],
  studentRoster: [
    {
      id: 'st_1',
      name: 'Marcus Keller',
      email: 'mkeller@tech.edu',
      mastery: 78,
      status: 'On Track',
      lastActive: '12m ago',
      primaryTrap: 'Gradient vs Directional Projection'
    },
    {
      id: 'st_2',
      name: 'Sarah Chen',
      email: 'schen@tech.edu',
      mastery: 92,
      status: 'Accelerated',
      lastActive: '1h ago',
      primaryTrap: 'None flagged'
    },
    {
      id: 'st_3',
      name: 'Devon Vance',
      email: 'dvance@tech.edu',
      mastery: 54,
      status: 'Needs Remediation',
      lastActive: '2h ago',
      primaryTrap: 'Arithmetic Invariance on Infinity'
    },
    {
      id: 'st_4',
      name: 'Amina Al-Mansoor',
      email: 'amina@tech.edu',
      mastery: 84,
      status: 'On Track',
      lastActive: '3h ago',
      primaryTrap: 'Integrating Factor Sign Rule'
    },
    {
      id: 'st_5',
      name: 'Lucas Morales',
      email: 'lmorales@tech.edu',
      mastery: 61,
      status: 'Needs Remediation',
      lastActive: '5h ago',
      primaryTrap: 'Rank-Nullity Decoupling'
    }
  ]
};
