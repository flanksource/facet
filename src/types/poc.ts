
/**
 * POC Evaluation Data Structure
 * Defines the schema for technical POC evaluation data
 */

/** Star rating type (1-5 scale) */
export type StarRating = 1 | 2 | 3 | 4 | 5;

/** KPI metric types */
export type KpiType = 'time' | 'percentage' | 'count' | 'custom';

/**
 * KPI Metric Interface
 * Represents a measurable key performance indicator
 */
export interface KpiMetric {
  /** Numeric value of the metric */
  value: number | string;
  /** Type of metric (time, percentage, count, custom) */
  type: KpiType;
  /** Unit of measurement (e.g., 'seconds', 'steps', '%') */
  unit?: string;
  /** Display value for the metric (optional, for formatting) */
  displayValue?: string;
}

/**
 * KPI with Target and Actual for comparison
 * Used in completed stage to show goal vs result
 */
export interface KpiComparison {
  /** Metric description */
  metric: string;
  /** Target/goal value (what was planned) */
  target: KpiMetric;
  /** Actual achieved value */
  actual: KpiMetric;
  /** Percentage difference (positive = exceeded, negative = fell short) */
  percentageOfTarget?: number;
}

/**
 * Test Variant Interface
 * Represents a single test execution with before/after measurements
 */
export interface TestVariant {
  /** Description of test scenario */
  step: string;
  /** Name or role of person who performed test */
  tester: string;
  /** KPI measurement before POC */
  beforeKpi: KpiMetric;
  /** KPI measurement after POC */
  afterKpi: KpiMetric;
  /** Calculated percentage improvement */
  improvement: number;
  /** Benefit rating (1-5 stars) */
  rating: StarRating;
  /** Qualitative assessment and comments */
  comments: string;
}

/**
 * POC Objective Interface
 * Represents one of the four evaluation objectives
 */
export interface PocObjective {
  /** Unique identifier (e.g., 'tash', 'self-service') */
  id: string;
  /** Objective title */
  title: string;
  /** Detailed explanation of objective */
  description: string;
  /** Icon component name */
  icon: string;
  /** Category for grouping objectives */
  category?: string;
  /** Key KPI summary for this objective */
  keyKpi: {
    /** Metric description */
    metric: string;
    /** Before measurement */
    before: KpiMetric;
    /** After measurement */
    after: KpiMetric;
    /** Calculated percentage improvement */
    improvement?: number;
  };
  /** Array of 3-5 test scenarios */
  tests: TestVariant[];
}

export interface Customer {
  name: string;
  logoUrl?: string;
}

/** POC lifecycle stage */
export type PocStage = 'planned' | 'in-progress' | 'completed';

/** Rating category names for completed POCs */
export type RatingCategory =
  | 'Technical Feasibility'
  | 'User Experience'
  | 'Performance & Scalability'
  | 'Integration Complexity'
  | 'Security';

/** Category rating with 1-5 scale */
export interface CategoryRating {
  category: RatingCategory;
  rating: StarRating;
  notes?: string;
}

/** Planned stage information */
export interface PlannedInfo {
  goals: string[];
  successCriteria: string[];
  scope: string;
  timeline: {
    duration: string;
    milestones: string[];
  };
  resourcesNeeded: {
    team: string[];
    infrastructure: string[];
    dataAccess: string[];
  };
}

/** In-progress tracking information */
export interface InProgressInfo {
  progressUpdates: {
    date: string;
    status: string;
    blockers?: string[];
  }[];
  observations: string[];
  timelineAdjustments?: string;
}

/** Completed evaluation information */
export interface CompletedInfo {
  categoryRatings: CategoryRating[];
  qualitativeAssessment: {
    strengths: string[];
    weaknesses: string[];
    summary: string;
  };
  nextSteps: {
    decision: 'go' | 'no-go' | 'conditional';
    actionItems: string[];
    recommendations: string[];
  };
}

/**
 * Root POC Evaluation Data Interface
 * Contains all four objectives and metadata
 */
export interface PocEvaluationData {
  /** Evaluation title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Current date time */
  date: string;
  customer: Customer;
  /** POC start date */
  startDate: string;
  /** POC end date */
  endDate?: string;
  /** Test environment description */
  environment: string;
  /** Exactly 4 objectives */
  objectives: PocObjective[];
  /** Current POC stage */
  status: PocStage;
  /** Planned stage information (present when status is 'planned') */
  plannedInfo?: PlannedInfo;
  /** In-progress tracking (present when status is 'in-progress') */
  inProgressInfo?: InProgressInfo;
  /** Completed evaluation (present when status is 'completed') */
  completedInfo?: CompletedInfo;
}

/**
 * Component Props Interface
 */
export interface PocEvaluationProps {
  /** Evaluation data (defaults to sampleEvaluationData if not provided) */
  data?: PocEvaluationData;
  /** Show methodology section (default: true) */
  showMethodology?: boolean;
  /** Show glossary section (default: true) */
  showGlossary?: boolean;
  /** Inline CSS string */
  css: string;
}
