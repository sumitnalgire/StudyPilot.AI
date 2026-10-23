// Core domain types for StudyPilot AI

export type View = 'dashboard' | 'create-plan' | 'timetable' | 'progress' | 'assistant';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type TaskStatus = 'pending' | 'completed' | 'missed';

export interface Subject {
  id: string;
  name: string;
  difficultTopics: string[];
  examDate: string; // ISO date string (YYYY-MM-DD)
  difficulty: Difficulty;
  hoursAllocated: number; // total hours the student wants to study this subject
}

export interface StudyPlanInput {
  subjects: Subject[];
  availableHoursPerDay: number;
  preferredSessionDuration: number; // minutes per study session
  studyDaysAhead: number; // how many days to schedule
}

export interface StudyTask {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  type: 'study' | 'revision' | 'break';
  status: TaskStatus;
  isBreak?: boolean;
}

export interface StudyPlan {
  id: string;
  createdAt: string;
  input: StudyPlanInput;
  tasks: StudyTask[];
}

export interface RescheduleProposal {
  missedTaskIds: string[];
  explanation: string;
  oldTasks: StudyTask[];
  proposedTasks: StudyTask[];
  hasConflict: boolean;
  conflictDetails: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AppData {
  plan: StudyPlan | null;
  proposals: RescheduleProposal[];
  chatHistory: ChatMessage[];
  studentName: string;
}

export const DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  hard: 'text-red-700 bg-red-50 border-red-200',
};
