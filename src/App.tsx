import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, Calendar, BarChart2, BookOpen, Target, Settings as SettingsIcon, 
  Flame, Plus, Check, ChevronRight, AlertTriangle, X, Trash2, Smartphone, 
  Brush, ClipboardList, BedDouble, LogOut, Download
} from 'lucide-react';
import { DB } from './DB';
import { TimeBlock, Category, DayArchive, Settings, ReadingData, SkillData } from './types';

// ── UTILS ─────────────────────────────────────
const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const formatDisplayTime = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}${m > 0 ? ':' + String(m).padStart(2, '0') : ''} ${suffix}`;
};

const CAT_COLORS = {
  [Category.STUDY]: '#c8ff00',
  [Category.TUITION]: '#ff9500',
  [Category.PERSONAL]: '#00aaff',
  [Category.REST]: '#cc88ff',
  [Category.CLASS]: '#ff4466',
};

// ── HOOKS ────────────────────────────────────
const useToast = () => {
  const [toast, setToast] = useState<{ msg: string; type: string; id: number } | null>(null);

  const showToast = useCallback((msg: string, type: string = '') => {
    const id = Date.now();
    setToast({ msg, type, id });
    setTimeout(() => {
      setToast(prev => prev?.id === id ? null : prev);
    }, 3000);
  }, []);

  return { toast, showToast };
};

// ── COMPONENTS ────────────────────────────────

export default function App() {
  const [view, setView] = useState('today');
  const [now, setNow] = useState(new Date());
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [habits, setHabits] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<Settings>(DB.getSettings());
  const [streak, setStreak] = useState(DB.getStreak());
  
  const { toast, showToast } = useToast();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [blockForm, setBlockForm] = useState({ name: '', start: '', end: '', note: '', cat: Category.STUDY });

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Data Loading
  const loadData = useCallback(() => {
    setBlocks(DB.getTodayBlocks());
    setHabits(DB.getTodayHabits());
    setSettings(DB.getSettings());
    setStreak(DB.getStreak());
  }, []);

  useEffect(() => {
    loadData();
    
    // Check for 1AM reset intermittently
    const checkReset = setInterval(() => {
      const h = new Date().getHours();
      if (h === 1) {
        // Simple logic: if today's date in local storage != current date, reset
        const lastReset = localStorage.getItem('action_last_reset');
        const today = new Date().toISOString().split('T')[0];
        if (!lastReset || !lastReset.startsWith(today)) {
          DB.performReset();
          loadData();
          window.location.reload();
        }
      }
    }, 60000);
    
    return () => clearInterval(checkReset);
  }, [loadData]);

  // Current Block Logic
  const currentBlock = useMemo(() => {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return blocks.find(b => {
      const start = timeToMinutes(b.start);
      const end = timeToMinutes(b.end);
      return start <= nowMins && end > nowMins;
    });
  }, [blocks, now]);

  // Handle Blocks
  const openBlockModal = (block?: TimeBlock, presetTime?: string) => {
    if (block) {
      setEditingBlock(block);
      setBlockForm({ name: block.name, start: block.start, end: block.end, note: block.note || '', cat: block.cat });
    } else {
      setEditingBlock(null);
      setBlockForm({ name: '', start: presetTime || '', end: '', note: '', cat: Category.STUDY });
    }
    setIsModalOpen(true);
  };

  const saveBlock = () => {
    if (!blockForm.name || !blockForm.start || !blockForm.end) {
      showToast('Fill all required fields', 'danger');
      return;
    }
    if (editingBlock) {
      DB.updateBlock(editingBlock.id, blockForm);
      showToast('Block updated');
    } else {
      DB.addBlock(blockForm);
      showToast('Block added');
    }
    setIsModalOpen(false);
    loadData();
  };

  const deleteBlock = () => {
    if (editingBlock) {
      DB.deleteBlock(editingBlock.id);
      showToast('Block deleted', 'warn');
      setIsModalOpen(false);
      loadData();
    }
  };

  const toggleDone = (id: string) => {
    DB.toggleBlockDone(id);
    loadData();
    showToast('Execution updated');
  };

  const logHabit = (key: string, val: boolean) => {
    DB.setHabit(key, val);
    loadData();
  };

  // Score
  const score = useMemo(() => {
    if (blocks.length === 0) return 0;
    return Math.round((blocks.filter(b => b.done).length / blocks.length) * 100);
  }, [blocks]);

  return (
    <div id="app" className="flex h-screen bg-[#0f1115] font-sans text-[#e2e8f0] overflow-hidden">
      {/* ── SIDEBAR NAVIGATION ── */}
      <nav className="w-64 flex-shrink-0 border-r border-[#1f2937] bg-[#0a0c10] flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-black" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">SystemAction</span>
          </div>
          
          <ul className="space-y-1">
            {[
              { id: 'today', icon: Clock, label: 'Overview' },
              { id: 'schedule', icon: Calendar, label: 'Schedule' },
              { id: 'stats', icon: BarChart2, label: 'Diagnostics' },
              { id: 'reading', icon: BookOpen, label: 'Reading' },
              { id: 'skill', icon: Target, label: 'Skill Set' },
              { id: 'settings', icon: SettingsIcon, label: 'Terminal' },
            ].map(v => (
              <li key={v.id}>
                <button 
                  onClick={() => setView(v.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-md transition-all ${view === v.id ? 'bg-[#1c1f26] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1c1f26]'}`}
                >
                  <v.icon size={16} className={view === v.id ? 'text-accent' : 'text-gray-500'} />
                  <span className="text-sm font-medium">{v.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto p-6 border-t border-[#1f2937]">
          <div className="bg-[#1c1f26] p-4 rounded-xl border border-[#374151]">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1 tracking-widest">STREAK</p>
            <p className="text-accent text-sm font-medium flex items-center gap-1.5">
              <Flame size={14} /> {streak.current} Day Streak
            </p>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 flex flex-col h-full bg-[#0f1115] overflow-y-auto">
        {/* Header Bar */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-[#1f2937] bg-[#0f1115]">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-white">{view.charAt(0).toUpperCase() + view.slice(1)} Console</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">ALL_SYSTEMS_NOMINAL</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Current Session</p>
              <p className="text-xs font-mono text-accent">{now.toLocaleTimeString('en-US', { hour12: false })}</p>
            </div>
            <button 
              onClick={() => openBlockModal()}
              className="px-4 py-2 bg-accent text-black text-sm font-bold rounded hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              Execute Action
            </button>
          </div>
        </header>

      {/* ── CURRENT BANNER ── */}
      <AnimatePresence>
        {currentBlock && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="current-banner relative flex items-center gap-4 border-b border-[rgba(200,255,0,0.2)] bg-[var(--accent-faint)] px-6 py-2.5 overflow-hidden"
          >
            <div className="banner-label flex-shrink-0 font-mono text-[9px] uppercase tracking-[2px] text-accent">RIGHT NOW</div>
            <div className="banner-task flex-1 text-[15px] font-medium">{currentBlock.name}</div>
            <div className="banner-time flex-shrink-0 font-mono text-xs text-[#999]">
              {formatDisplayTime(currentBlock.start)} – {formatDisplayTime(currentBlock.end)}
            </div>
            
            <div className="banner-progress-bar absolute bottom-0 left-0 h-[2px] w-full bg-[#222]">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.min(100, Math.round(((now.getHours() * 60 + now.getMinutes()) - timeToMinutes(currentBlock.start)) / (timeToMinutes(currentBlock.end) - timeToMinutes(currentBlock.start)) * 100))}%` 
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {view === 'today' && (
            <motion.div 
              key="today"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="view-cols grid grid-cols-1 gap-0 md:grid-cols-[1fr,340px]"
            >
              {/* TIMELINE */}
              <div className="col-left border-r border-[#222] p-6">
                <div className="col-header mb-5 flex items-center justify-between">
                  <h2 className="font-serif text-[22px] text-white">Daily Execution</h2>
                  <button onClick={() => openBlockModal()} className="btn-add rounded-[var(--radius)] border border-[rgba(200,255,0,0.3)] bg-[var(--accent-faint)] px-3.5 py-1.5 text-xs text-accent transition-all hover:bg-[rgba(200,255,0,0.12)]">
                    + Add Block
                  </button>
                </div>
                
                <div className="timeline relative">
                  {Array.from({ length: 21 }, (_, i) => i + 5).map(h => {
                    const displayHour = h % 24;
                    const label = displayHour === 0 ? '12 AM' :
                                  displayHour < 12 ? displayHour + ' AM' :
                                  displayHour === 12 ? '12 PM' :
                                  (displayHour - 12) + ' PM';
                    return (
                      <div key={h} className="hour-row group relative flex min-h-[60px] border-t border-[#222]">
                        <div className="hour-label w-[52px] flex-shrink-0 select-none px-2 py-1.5 font-mono text-[10px] text-muted">
                          {label}
                        </div>
                        <div className="hour-blocks relative flex-1">
                          {blocks
                            .filter(b => {
                              let startH = Math.floor(timeToMinutes(b.start) / 60);
                              if (startH < 5) startH += 24;
                              return startH === h;
                            })
                            .map(block => {
                              const startMins = timeToMinutes(block.start);
                              const duration = timeToMinutes(block.end) - startMins;
                              const top = (startMins % 60);
                              const isNow = currentBlock?.id === block.id;

                              return (
                                <div 
                                  key={block.id}
                                  onClick={() => openBlockModal(block)}
                                  className={`time-block absolute left-0.5 right-0.5 rounded-[3px] border-l-[3px] px-2.5 py-1.5 text-[12px] transition-all hover:brightness-110 cat-${block.cat} ${block.done ? 'opacity-45' : ''} ${isNow ? 'ring-2 ring-accent animate-pulse' : ''}`}
                                  style={{ 
                                    top: `${top}px`, 
                                    height: `${Math.max(24, duration)}px`,
                                    zIndex: isNow ? 20 : 1
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                                    <div className="flex-1 overflow-hidden">
                                      <div className="truncate font-semibold text-white leading-tight">{block.name}</div>
                                      <div className="font-mono text-[10px] text-[#999]">{formatDisplayTime(block.start)}</div>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); toggleDone(block.id); }}
                                      className={`h-5 w-5 flex-shrink-0 animate-in fade-in zoom-in items-center justify-center rounded-[2px] border border-current text-[10px] transition-all ${block.done ? 'bg-accent text-black border-accent' : 'text-accent'}`}
                                    >
                                      {block.done && <Check size={12} strokeWidth={3} />}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
                        {/* Current time line if within this hour */}
                        {now.getHours() === (h % 24) && (
                          <div 
                            className="current-time-line absolute left-[52px] right-0 h-[2px] bg-red z-10 pointer-events-none before:absolute before:-left-1 before:-top-1 before:h-2.5 before:w-2.5 before:rounded-full before:bg-red"
                            style={{ top: `${now.getMinutes()}px` }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="col-right flex flex-col gap-4 p-5 md:max-h-[calc(100vh-100px)] overflow-y-auto">
                {/* DAILY SCORE */}
                <div className="card rounded-[var(--radius)] border border-[#222] bg-surface p-4">
                  <div className="card-label mb-3 font-mono text-[9px] uppercase tracking-[2px] text-muted">TODAY'S EXECUTION</div>
                  <div className="score-ring-wrap relative mx-auto mb-3 w-[100px]">
                    <svg className="h-[100px] w-[100px]" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1a1a" strokeWidth="8"/>
                      <motion.circle 
                        cx="60" cy="60" r="50" fill="none" 
                        stroke={score >= 80 ? '#c8ff00' : score >= 50 ? '#ff9500' : '#ff4466'} 
                        strokeWidth="8"
                        strokeDasharray="314"
                        animate={{ strokeDashoffset: 314 - (314 * score / 100) }}
                        strokeLinecap="round" transform="rotate(-90 60 60)"
                        transition={{ duration: 0.6 }}
                      />
                    </svg>
                    <div className="score-center absolute inset-0 flex flex-col items-center justify-center">
                      <div className="font-serif text-[22px] leading-none text-white">{score}%</div>
                      <div className="text-[10px] text-muted">complete</div>
                    </div>
                  </div>
                  <div className="score-stats flex justify-around mt-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-lg font-medium text-white">{blocks.filter(b => b.done).length}</span>
                      <small className="text-[10px] text-muted">done</small>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-lg font-medium text-white">{blocks.length}</span>
                      <small className="text-[10px] text-muted">total</small>
                    </div>
                  </div>
                </div>

                {/* PROTOCOL */}
                <div className="card rounded-[var(--radius)] border border-[#222] bg-surface p-4">
                  <div className="card-label mb-3 font-mono text-[9px] uppercase tracking-[2px] text-muted">MORNING PROTOCOL</div>
                  <div className="protocol-steps flex flex-col">
                    {[
                      { key: 'wake', label: 'Woke by 6:30 AM' },
                      { key: 'taichi', label: 'Tai Chi · 20 min' },
                      { key: 'shower', label: 'Cold shower' },
                      { key: 'task', label: 'Household task' },
                      { key: 'phone', label: 'Phone across room ✓' },
                    ].map(h => (
                      <label key={h.key} className="proto-step flex items-center gap-2.5 border-b border-[#222] py-2 last:border-0 cursor-pointer group">
                        <div className="relative h-4 w-4 overflow-hidden rounded-[2px] border border-[#2a2a2a] transition-all group-hover:border-accent">
                          <input 
                            type="checkbox" 
                            checked={habits[h.key] || false} 
                            onChange={(e) => logHabit(h.key, e.target.checked)}
                            className="peer h-full w-full cursor-pointer appearance-none outline-none checked:bg-accent" 
                          />
                          <Check size={12} className="pointer-events-none absolute inset-0 hidden m-auto text-black peer-checked:block" strokeWidth={4} />
                        </div>
                        <span className={`text-[13px] transition-all ${habits[h.key] ? 'text-muted line-through' : 'text-[#e0e0e0]'}`}>{h.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* OVERRIDE */}
                <div className="card rounded-[var(--radius)] border border-[#222] bg-surface p-4">
                   <div className="card-label mb-3 font-mono text-[9px] uppercase tracking-[2px] text-muted">AVOIDANCE OVERRIDE</div>
                   <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: '📱 Phone urge', type: 'phone', msg: "Your phone is not going to study for you. Put it face-down, other side of the room." },
                        { label: '🧹 Cleaning', type: 'clean', msg: "Cleaning is avoidance with a clean conscience. Sit down. progress before polish." },
                        { label: '📋 Planning', type: 'plan', msg: "Execution makes you execute. Close this planning loop. Do the next physical action." },
                        { label: '😴 Rest loop', type: 'rest', msg: "Rest is earned, not defaulted into. Set a 25-minute timer. Work first." },
                      ].map(o => (
                        <button 
                          key={o.type} 
                          onClick={() => showToast(o.msg, 'warn')}
                          className="rounded-[var(--radius)] border border-[#2a2a2a] bg-[#1a1a1a] p-2 text-left text-xs text-[#e0e0e0] transition-all hover:border-red hover:bg-[rgba(255,68,102,0.06)] hover:text-red"
                        >
                          {o.label}
                        </button>
                      ))}
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'schedule' && (
            <motion.div 
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="view-header mb-8 px-0">
                <h2 className="font-serif text-3xl text-white">Schedule Builder</h2>
                <p className="mt-1 text-sm text-muted">Plan tomorrow tonight. System archives at 1:00 AM.</p>
              </div>

              <div className="schedule-builder grid grid-cols-1 gap-6 md:grid-cols-[1fr,320px]">
                <div className="builder-grid-wrap overflow-hidden rounded-[var(--radius)] border border-[#222]">
                  {Array.from({ length: 21 }, (_, i) => i + 5).map(h => (
                    <div key={h} onClick={() => openBlockModal(undefined, `${String(h % 24).padStart(2, '0')}:00`)} className="builder-hour flex h-[60px] cursor-pointer border-b border-[#222] last:border-0 hover:bg-[rgba(200,255,0,0.04)]">
                       <div className="builder-hour-label w-[52px] flex-shrink-0 border-r border-[#222] p-2 font-mono text-[10px] text-muted">
                        {(h % 24) === 0 ? '12 AM' : (h % 24) < 12 ? (h % 24) + ' AM' : (h % 24) === 12 ? '12 PM' : ((h % 24) - 12) + ' PM'}
                       </div>
                       <div className="builder-hour-cell relative flex-1">
                          {blocks.filter(b => {
                            let startH = Math.floor(timeToMinutes(b.start) / 60);
                            if (startH < 5) startH += 24;
                            return startH === h;
                          }).map(b => (
                            <div key={b.id} className={`absolute left-0 right-0 rounded-sm border-l-2 py-0.5 px-2 cat-${b.cat}`} style={{ top: `${timeToMinutes(b.start) % 60}px`, height: `${Math.max(20, timeToMinutes(b.end) - timeToMinutes(b.start))}px` }}>
                               <div className="truncate font-semibold text-[10px]">{b.name}</div>
                            </div>
                          ))}
                       </div>
                    </div>
                  ))}
                </div>
                
                <div className="builder-panel flex flex-col gap-3">
                  <div className="builder-blocks flex flex-col gap-2">
                    {blocks.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted">No blocks scheduled yet.</div>
                    ) : (
                      blocks.map(b => (
                        <div key={b.id} onClick={() => openBlockModal(b)} className="flex items-center gap-3 rounded-[var(--radius)] border border-[#222] bg-[#1a1a1a] p-3 transition-all hover:border-accent cursor-pointer group">
                           <div className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLORS[b.cat] }}></div>
                           <div className="flex-1 overflow-hidden">
                              <div className="truncate text-sm font-medium text-white">{b.name}</div>
                              <div className="font-mono text-[10px] text-muted">{formatDisplayTime(b.start)} – {formatDisplayTime(b.end)}</div>
                           </div>
                           <ChevronRight size={14} className="text-muted group-hover:text-accent" />
                        </div>
                      ))
                    )}
                  </div>
                  <button onClick={() => openBlockModal()} className="btn-primary w-full rounded-[var(--radius)] bg-accent p-2.5 text-sm font-semibold text-black transition-all hover:brightness-110">
                    + New Time Block
                  </button>
                  <button onClick={() => setView('today')} className="btn-secondary w-full rounded-[var(--radius)] border border-[#2a2a2a] p-2.5 text-sm text-[#999] transition-all hover:border-[#999] hover:text-[#e0e0e0]">
                    ← Back to Execution
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <div className="view-header mb-8 px-0">
                <h2 className="font-serif text-3xl text-white">System Settings</h2>
                <p className="mt-1 text-sm text-muted">Tune the architecture of your environment.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="card rounded-[var(--radius)] border border-[#222] bg-surface p-5">
                   <div className="card-label mb-4 font-mono text-[9px] uppercase tracking-[2px] text-muted">IDENTITY</div>
                   <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-4 border-b border-[#222] pb-3">
                        <label className="text-sm text-[#999]">Agent Name</label>
                        <input 
                          type="text" 
                          value={settings.name} 
                          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                          className="rounded-[var(--radius)] border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-sm outline-none focus:border-accent"
                        />
                      </div>
                      <button onClick={() => { DB.saveSettings(settings); showToast('Identity updated'); loadData(); }} className="btn-primary mt-2 flex items-center justify-center gap-2">
                        <Check size={16} /> Save Changes
                      </button>
                   </div>
                </div>

                <div className="card rounded-[var(--radius)] border border-[#222] bg-surface p-5">
                   <div className="card-label mb-4 font-mono text-[9px] uppercase tracking-[2px] text-muted">DATA MANAGEMENT</div>
                   <div className="flex flex-col gap-2">
                      <button onClick={() => { 
                        const data = { exportedAt: new Date().toISOString(), settings, blocks, habits, archive: DB.getArchive(), streak: DB.getStreak(), reading: DB.getReading(), skill: DB.getSkill() };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'action-system-backup.json'; a.click();
                        showToast('Dataset exported');
                      }} className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[#2a2a2a] p-2.5 text-sm text-[#999] hover:bg-[rgba(255,255,255,0.05)]">
                        <Download size={16} /> Export Backup (JSON)
                      </button>
                      <button onClick={() => { if(confirm('Purge all records? This is irreversible.')) { localStorage.clear(); window.location.reload(); } }} className="mt-2 flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[rgba(255,68,102,0.3)] bg-[rgba(255,68,102,0.1)] p-2.5 text-sm text-red hover:bg-[rgba(255,68,102,0.2)]">
                        <Trash2 size={16} /> Complete System Reset
                      </button>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Fallback for other views */}
          {['stats', 'reading', 'skill'].includes(view) && (
            <motion.div 
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-[calc(100vh-100px)] items-center justify-center p-6 text-center"
            >
              <div className="max-w-md">
                <BarChart2 size={48} className="mx-auto mb-4 text-muted opacity-20" />
                <h3 className="font-serif text-2xl text-white capitalize">{view} Tracking</h3>
                <p className="mt-2 text-sm text-muted">This module is currently being optimized for high-performance data visualization. The core execution engine is fully operational.</p>
                <button onClick={() => setView('today')} className="btn-primary mt-6">Return to Execution</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>

      {/* ── MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-500 flex items-center justify-center p-5">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-lg border border-[#2a2a2a] bg-surface p-0 shadow-2xl"
            >
               <div className="flex items-center justify-between border-b border-[#222] p-5">
                  <h3 className="font-serif text-xl text-white">{editingBlock ? 'Edit' : 'Add'} Time Block</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white"><X size={20}/></button>
               </div>
               
               <div className="flex flex-col gap-4 p-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase tracking-wider text-muted">TASK IDENTIFIER</label>
                    <input 
                      type="text" 
                      placeholder="e.g. French Methodology Revision"
                      value={blockForm.name}
                      onChange={(e) => setBlockForm({...blockForm, name: e.target.value})}
                      className="rounded-[var(--radius)] border border-[#2a2a2a] bg-[#1a1a1a] p-2.5 text-sm outline-none focus:border-accent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-muted">START</label>
                      <input 
                        type="time" 
                        value={blockForm.start}
                        onChange={(e) => setBlockForm({...blockForm, start: e.target.value})}
                        className="rounded-[var(--radius)] border border-[#2a2a2a] bg-[#1a1a1a] p-2.5 text-sm outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[10px] uppercase tracking-wider text-muted">END</label>
                      <input 
                        type="time" 
                        value={blockForm.end}
                        onChange={(e) => setBlockForm({...blockForm, end: e.target.value})}
                        className="rounded-[var(--radius)] border border-[#2a2a2a] bg-[#1a1a1a] p-2.5 text-sm outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase tracking-wider text-muted">ARCHITECTURE</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.values(Category).map(c => (
                        <button 
                          key={c}
                          onClick={() => setBlockForm({...blockForm, cat: c})}
                          className={`rounded-[var(--radius)] border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs transition-all hover:border-accent ${blockForm.cat === c ? 'border-accent bg-[var(--accent-faint)] text-accent' : 'text-[#999]'}`}
                        >
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase tracking-wider text-muted">ANNOTATION</label>
                    <input 
                      type="text" 
                      placeholder="Specific focus or goal..."
                      value={blockForm.note}
                      onChange={(e) => setBlockForm({...blockForm, note: e.target.value})}
                      className="rounded-[var(--radius)] border border-[#2a2a2a] bg-[#1a1a1a] p-2.5 text-sm outline-none focus:border-accent"
                    />
                  </div>
               </div>
               
               <div className="flex justify-end gap-2 border-t border-[#222] p-4">
                  {editingBlock && (
                    <button onClick={deleteBlock} className="mr-auto text-red hover:underline flex items-center gap-1.5 text-xs">
                      <Trash2 size={14}/> Delete
                    </button>
                  )}
                  <button onClick={() => setIsModalOpen(false)} className="rounded-[var(--radius)] border border-[#2a2a2a] px-4 py-2 text-sm text-[#999] hover:text-white">Cancel</button>
                  <button onClick={saveBlock} className="btn-primary">Save Architecture</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`toast show border-l-4 px-5 py-3.5 shadow-2xl ${toast.type === 'danger' ? 'border-red' : toast.type === 'warn' ? 'border-orange' : 'border-accent'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
