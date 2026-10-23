import type { AppData } from '@/types';

const STORAGE_KEY = 'studypilot-ai-data-v1';

const emptyData: AppData = {
  plan: null,
  proposals: [],
  chatHistory: [],
  studentName: 'Student',
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    const parsed = JSON.parse(raw) as AppData;
    return {
      plan: parsed.plan ?? null,
      proposals: parsed.proposals ?? [],
      chatHistory: parsed.chatHistory ?? [],
      studentName: parsed.studentName ?? 'Student',
    };
  } catch {
    return emptyData;
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — fail silently in demo
  }
}

export function resetData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4);
}
