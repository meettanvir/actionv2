export enum Category {
  STUDY = 'study',
  TUITION = 'tuition',
  PERSONAL = 'personal',
  REST = 'rest',
  CLASS = 'class',
}

export interface TimeBlock {
  id: string;
  name: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  note?: string;
  cat: Category;
  done: boolean;
  createdAt: string;
}

export interface Habit {
  id: string;
  label: string;
  key: string;
}

export interface DayArchive {
  date: string;
  blocks: TimeBlock[];
  habits: Record<string, boolean>;
  total: number;
  done: number;
  score: number;
  level: number;
  archivedAt: string;
}

export interface Streak {
  current: number;
  best: number;
  lastDate: string | null;
}

export interface Settings {
  name: string;
  wakeTime: string;
  sleepTarget: string;
}

export interface ReadingData {
  book: {
    title: string;
    author: string;
    totalPages: number;
    currentPage: number;
    startedAt: string;
  } | null;
  sessions: {
    date: string;
    pages: number;
    mins: number;
    note: string;
    pageAfter: number | null;
  }[];
  totalPages: number;
  totalMins: number;
  streak: number;
  lastLogDate: string | null;
}

export interface SkillData {
  active: {
    name: string;
    description: string;
    goalHours: number;
    startedAt: string;
  } | null;
  sessions: {
    date: string;
    mins: number;
    milestone: string;
    note: string;
  }[];
  totalMins: number;
  streak: number;
  lastLogDate: string | null;
}
