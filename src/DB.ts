import { Category, TimeBlock, Streak, Settings, DayArchive, ReadingData, SkillData } from './types';

const KEYS = {
  TODAY_BLOCKS: 'action_today_blocks',
  TODAY_DATE: 'action_today_date',
  TODAY_HABITS: 'action_today_habits',
  ARCHIVE: 'action_archive',
  STREAK: 'action_streak',
  SETTINGS: 'action_settings',
  LAST_RESET: 'action_last_reset',
  READING: 'action_reading',
  SKILL: 'action_skill',
};

export const DB = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key: string, value: any) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  // TODAY BLOCKS
  getTodayBlocks(): TimeBlock[] {
    return this.get<TimeBlock[]>(KEYS.TODAY_BLOCKS) || [];
  },

  saveTodayBlocks(blocks: TimeBlock[]) {
    this.set(KEYS.TODAY_BLOCKS, blocks);
  },

  addBlock(block: Partial<TimeBlock>): TimeBlock {
    const blocks = this.getTodayBlocks();
    const newBlock: TimeBlock = {
      id: 'blk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: block.name || 'Untitled',
      start: block.start || '09:00',
      end: block.end || '10:00',
      cat: block.cat || Category.STUDY,
      note: block.note || '',
      done: false,
      createdAt: new Date().toISOString(),
    };
    blocks.push(newBlock);
    blocks.sort((a, b) => a.start.localeCompare(b.start));
    this.saveTodayBlocks(blocks);
    return newBlock;
  },

  updateBlock(id: string, updates: Partial<TimeBlock>) {
    const blocks = this.getTodayBlocks();
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx !== -1) {
      blocks[idx] = { ...blocks[idx], ...updates };
      blocks.sort((a, b) => a.start.localeCompare(b.start));
      this.saveTodayBlocks(blocks);
    }
  },

  deleteBlock(id: string) {
    const blocks = this.getTodayBlocks().filter((b) => b.id !== id);
    this.saveTodayBlocks(blocks);
  },

  toggleBlockDone(id: string): boolean {
    const blocks = this.getTodayBlocks();
    const block = blocks.find((b) => b.id === id);
    if (block) {
      block.done = !block.done;
      this.saveTodayBlocks(blocks);
      return block.done;
    }
    return false;
  },

  // HABITS
  getTodayHabits(): Record<string, boolean> {
    return this.get<Record<string, boolean>>(KEYS.TODAY_HABITS) || {};
  },

  setHabit(habitKey: string, value: boolean) {
    const habits = this.getTodayHabits();
    habits[habitKey] = value;
    this.set(KEYS.TODAY_HABITS, habits);
  },

  // ARCHIVE
  getArchive(): DayArchive[] {
    return this.get<DayArchive[]>(KEYS.ARCHIVE) || [];
  },

  archiveToday() {
    const blocks = this.getTodayBlocks();
    const habits = this.getTodayHabits();
    const dateStr = new Date().toISOString().split('T')[0];

    const total = blocks.length;
    const done = blocks.filter((b) => b.done).length;
    const score = total > 0 ? Math.round((done / total) * 100) : 0;

    const habitCount = Object.values(habits).filter(Boolean).length;
    const level = score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : score > 0 || habitCount > 0 ? 1 : 0;

    const entry: DayArchive = {
      date: dateStr,
      blocks,
      habits,
      total,
      done,
      score,
      level,
      archivedAt: new Date().toISOString(),
    };

    const archive = this.getArchive();
    const existingIdx = archive.findIndex((a) => a.date === dateStr);
    if (existingIdx >= 0) archive[existingIdx] = entry;
    else archive.push(entry);

    this.set(KEYS.ARCHIVE, archive);
    return entry;
  },

  // STREAK
  getStreak(): Streak {
    return this.get<Streak>(KEYS.STREAK) || { current: 0, best: 0, lastDate: null };
  },

  updateStreak(score: number) {
    const streak = this.getStreak();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (streak.lastDate === today) return streak;

    if (score >= 50) {
      if (streak.lastDate === yesterday) {
        streak.current += 1;
      } else {
        streak.current = 1;
      }
      if (streak.current > streak.best) streak.best = streak.current;
    } else {
      streak.current = 0;
    }
    streak.lastDate = today;
    this.set(KEYS.STREAK, streak);
    return streak;
  },

  // SETTINGS
  getSettings(): Settings {
    return this.get<Settings>(KEYS.SETTINGS) || {
      name: 'Elveance Martin',
      wakeTime: '06:30',
      sleepTarget: '01:00',
    };
  },

  saveSettings(settings: Settings) {
    this.set(KEYS.SETTINGS, settings);
  },

  // RESET
  performReset() {
    const blocks = this.getTodayBlocks();
    const score = blocks.length > 0 ? Math.round((blocks.filter(b => b.done).length / blocks.length) * 100) : 0;
    this.archiveToday();
    this.updateStreak(score);
    localStorage.removeItem(KEYS.TODAY_BLOCKS);
    localStorage.removeItem(KEYS.TODAY_HABITS);
    this.set(KEYS.LAST_RESET, new Date().toISOString());
  },

  // TRACKERS
  getReading(): ReadingData {
    return this.get<ReadingData>(KEYS.READING) || {
      book: null,
      sessions: [],
      totalPages: 0,
      totalMins: 0,
      streak: 0,
      lastLogDate: null,
    };
  },

  saveReading(data: ReadingData) {
    this.set(KEYS.READING, data);
  },

  getSkill(): SkillData {
    return this.get<SkillData>(KEYS.SKILL) || {
      active: null,
      sessions: [],
      totalMins: 0,
      streak: 0,
      lastLogDate: null,
    };
  },

  saveSkill(data: SkillData) {
    this.set(KEYS.SKILL, data);
  },
};
