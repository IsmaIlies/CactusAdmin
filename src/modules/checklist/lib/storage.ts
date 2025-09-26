import { EntryReviewStatus, Status, ProjectOption } from './constants';

export type DayEntry = {
  id: string;
  day: string; // yyyy-mm-dd
  includeMorning: boolean;
  includeAfternoon: boolean;
  morningStart: string; // HH:mm
  morningEnd: string;   // HH:mm
  afternoonStart: string; // HH:mm
  afternoonEnd: string;   // HH:mm
  project: ProjectOption;
  notes?: string;
  briefCount?: number | null;
  status: 'draft' | 'submitted';
  reviewStatus: EntryReviewStatus;
  hasDispute?: boolean;
};

export type StoredAgentState = {
  period: string; // yyyy-MM
  status: Status;
  rejectionNote?: string | null;
  entries: DayEntry[];
};

const KEY = 'cactus-hours-agent-state';

export function persistAgentState(state: StoredAgentState) {
  try { localStorage.setItem(`${KEY}:${state.period}`, JSON.stringify(state)); } catch {}
}

export function loadAgentFromStorage(period?: string): StoredAgentState {
  const now = new Date();
  const p = period || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  try {
    const raw = localStorage.getItem(`${KEY}:${p}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { period: p, status: Status.Draft, entries: [], rejectionNote: null };
}
