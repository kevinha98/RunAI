// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type GoalDistance = "5k" | "10k" | "half" | "marathon" | "ultra" | "custom";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  level: UserLevel;
  goal: GoalDistance;
  fiveKTimeSec?: number;
  weeklyKmBaseline?: number;
  daysPerWeek: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Training Plan ────────────────────────────────────────────────────────────

export type TrainingPhase = "Base" | "Build" | "Peak" | "Taper";

export type SessionType =
  | "Easy Run"
  | "Threshold"
  | "Interval"
  | "Long Run"
  | "Recovery"
  | "Strength"
  | "Mobility"
  | "Rest";

export interface TrainingSession {
  id: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  type: SessionType;
  distance?: string;
  targetPace?: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  actualDistance?: number;
  actualPace?: number;
  heartRateAvg?: number;
  perceivedEffort?: number;
  notes?: string;
}

export interface TrainingWeek {
  id: string;
  week: number;
  phase: TrainingPhase;
  focus: string;
  totalKm: number;
  sessions: TrainingSession[];
  startDate: Date;
  endDate: Date;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  planName: string;
  goal: GoalDistance;
  totalWeeks: number;
  currentWeek: number;
  raceDate: Date;
  predictedTime?: string;
  weeks: TrainingWeek[];
  coachingNotes: string;
  generatedAt: Date;
  lastRegeneratedAt?: Date;
  isActive: boolean;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  userId: string;
  sessionId?: string;
  type: "run" | "strength" | "mobility" | "other";
  distance?: number;
  duration: number;
  avgPace?: number;
  avgPaceSec?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationGain?: number;
  cadenceAvg?: number;
  source: "manual" | "healthkit" | "health_connect" | "strava" | "garmin";
  externalId?: string;
  recordedAt: Date;
  createdAt: Date;
}

// ─── AI Coach ─────────────────────────────────────────────────────────────────

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface CoachConversation {
  id: string;
  userId: string;
  messages: CoachMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Plan generation ──────────────────────────────────────────────────────────

export interface PlanGenerationInput {
  goal: GoalDistance;
  level: UserLevel;
  fiveKTime?: string;
  weeklyKm?: string;
  daysPerWeek: string;
  raceDate?: string;
}

export interface GeneratedPlanJSON {
  planName: string;
  totalWeeks: number;
  raceDate: string;
  predictedTime: string;
  weeklyStructure: {
    week: number;
    phase: TrainingPhase;
    focus: string;
    totalKm: number;
    sessions: {
      day: string;
      type: string;
      distance: string;
      targetPace: string;
      description: string;
    }[];
  }[];
  coachingNotes: string;
}
