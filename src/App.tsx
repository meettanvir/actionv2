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
      <nav className="w-20 md:w-64 flex-shrink-0 flex flex-col bg-[#0a0c10] border-r border-[#1f2937] z-20">
        <div className="p-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center">
            <Target className="w-5 h-5 text-[#0f1115]" />
          </div>
          <span className="hidden md:block font-serif text-xl tracking-tight text-accent">ACTION</span>
        </div>

        <div className="flex-1 px-4 space-y-2">
          {[
            { id: 'today', icon: Clock, label: 'Today' },
            { id: 'schedule', icon: Calendar, label: 'Schedule' },
            { id: 'stats', icon: BarChart2, label: 'Stats' },
            { id: 'reading', icon: BookOpen, label: 'Reading' },
            { id: 'skill', icon: Target, label: 'Skill Set' },
            { id: 'settings', icon: SettingsIcon, label: 'Settings' },
          ].map(v => (
            <button 
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 rounded transition-all ${view === v.id ? 'bg-[#161920] text-accent' : 'text-text2 hover:bg-[#161920]/50 hover:text-white'}`}
            >
              <v.icon size={18} className={view === v.id ? 'text-accent' : 'text-muted'} />
              <span className="hidden md:block text-sm font-medium">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-[#1f2937]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1f2937] flex items-center justify-center">
              <span className="text-[10px] font-mono text-accent">ID</span>
            </div>
            <div className="hidden md:block overflow-hidden">
              <p className="text-xs font-medium truncate">{settings.name}</p>
              <p className="text-[10px] text-muted truncate">Daily Operations</p>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 flex flex-col h-full bg-[#0f1115] overflow-y-auto relative">
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-[#1f2937] bg-[#0c0e12]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-lg text-white capitalize">{view}</h1>
            <span className="text-[10px] font-mono text-muted uppercase tracking-widest">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 mr-4">
              <Flame className="w-4 h-4 text-orange" />
              <span className="text-xs font-mono">{streak.current} DAY STREAK</span>
            </div>
            <button 
              onClick={() => openBlockModal()}
              className="flex items-center gap-2 px-4 py-1.5 rounded bg-accent text-[#0f1115] font-medium text-xs hover:bg-accent-dim transition-colors shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            >
              <Plus className="w-4 h-4" />
              <span>ENTRY</span>
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
                  <div className="absolute left-[51px] top-0 bottom-0 w-px bg-[#1f2937] z-0" />
                  {Array.from({ length: 21 }, (_, i) => i + 5).map(h => {
                    const displayHour = h % 24;
                    const label = displayHour === 0 ? '12 AM' :
                                  displayHour < 12 ? displayHour + ' AM' :
                                  displayHour === 12 ? '12 PM' :
                                  (displayHour - 12) + ' PM';
                    return (
                      <div key={h} className="hour-row group relative flex min-h-[64px] border-t border-[#1f2937]/50 first:border-t-0">
                        <div className="hour-label w-[52px] flex-shrink-0 select-none px-2 py-3 font-mono text-[9px] text-muted tracking-tighter">
                          {label}
                        </div>
                        <div className="hour-blocks relative flex-1 ml-1">
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
                                <motion.div 
                                  key={block.id}
                                  layoutId={block.id}
                                  onClick={() => openBlockModal(block)}
                                  className={`time-block absolute left-1 right-2 rounded-lg border-l-4 px-3 py-2 text-[12px] transition-all hover:shadow-lg hover:z-30 cat-${block.cat} ${block.done ? 'opacity-40 grayscale-[0.5]' : ''} ${isNow ? 'ring-2 ring-accent ring-offset-2 ring-offset-[#0f1115] shadow-[0_0_20px_rgba(16,185,129,0.2)]' : ''}`}
                                  style={{ 
                                    top: `${top}px`, 
                                    height: `${Math.max(32, duration)}px`,
                                    zIndex: isNow ? 20 : 1
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-3 h-full overflow-hidden">
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate font-bold text-white tracking-tight leading-none mb-1">{block.name}</div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-[9px] text-muted">{formatDisplayTime(block.start)}</span>
                                        {block.note && <div className="w-1 h-1 rounded-full bg-muted/40" />}
                                        <span className="truncate font-sans text-[9px] text-muted italic">{block.note}</span>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); toggleDone(block.id); }}
                                      className={`h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full border transition-all ${block.done ? 'bg-accent text-[#0f1115] border-accent shadow-inner' : 'border-white/10 text-white/20 hover:border-accent hover:text-accent'}`}
                                    >
                                      {block.done && <Check size={12} strokeWidth={4} />}
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })
                          }
                        </div>
                        {/* Current time line if within this hour */}
                        {now.getHours() === (displayHour) && (
                          <div 
                            className="current-time-line absolute left-[52px] right-0 h-[2px] bg-red/60 z-10 pointer-events-none"
                            style={{ top: `${now.getMinutes()}px` }}
                          >
                            <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-red shadow-[0_0_10px_rgba(239,68,68,0.5)] border-2 border-[#0f1115]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="col-right flex flex-col gap-6 p-6 md:max-h-full overflow-y-auto">
                {/* DAILY SCORE */}
                <div className="bg-[#161920] border border-[#1f2937] rounded-xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-mono text-muted uppercase tracking-[2px]">Daily Execution</h3>
                    <Target className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-serif text-white">{score}%</span>
                    <span className="text-[10px] font-mono text-accent uppercase tracking-wider">{score >= 80 ? 'Master' : 'Active'}</span>
                  </div>
                  <div className="mt-5 h-1 w-full bg-[#0a0c10] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-accent pr-1 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* PROTOCOL */}
                <div className="bg-[#161920] border border-[#1f2937] rounded-xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-mono text-muted uppercase tracking-[2px]">Morning Protocol</h3>
                    <ClipboardList className="w-4 h-4 text-blue" />
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { key: 'wake', label: 'Wake at 6:30 AM', icon: '☀️' },
                      { key: 'taichi', label: 'Movement / Flow', icon: '🧘' },
                      { key: 'shower', label: 'Contrast Shower', icon: '🚿' },
                      { key: 'phone', label: 'Phone Sanctuary', icon: '📵' },
                    ].map(h => (
                      <button 
                        key={h.key} 
                        onClick={() => logHabit(h.key, !habits[h.key])}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          habits[h.key] 
                            ? 'bg-accent/5 border-accent/30 text-accent' 
                            : 'bg-[#0a0c10] border-[#1f2937] text-text2 hover:border-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{h.icon}</span>
                          <span className="text-xs font-medium">{h.label}</span>
                        </div>
                        {habits[h.key] ? <Check className="w-4 h-4" /> : <div className="w-3.5 h-3.5 rounded-full border border-muted/30" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SYSTEM OVERRIDES */}
                <div className="bg-[#161920] border border-[#1f2937] rounded-xl p-5 shadow-xl">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-[10px] font-mono text-muted uppercase tracking-[2px]">System Overrides</h3>
                     <AlertTriangle className="w-4 h-4 text-orange" />
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'DND ON', type: 'phone', msg: "Distraction Lockdown Initiated." },
                        { label: 'RESET', type: 'rest', msg: "Sequence reset requested." },
                      ].map(o => (
                        <button 
                          key={o.type} 
                          onClick={() => showToast(o.msg, 'warn')}
                          className="flex flex-col items-center gap-2 py-3 rounded-lg bg-[#0a0c10] border border-[#1f2937] text-[10px] font-mono text-text2 hover:border-accent hover:text-accent transition-all"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-2xl border border-[#1f2937] bg-[#161920] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)]"
            >
               <div className="flex items-center justify-between border-b border-[#1f2937] px-6 py-5 bg-[#0a0c10]/40">
                  <div>
                    <h3 className="font-serif text-xl text-white">{editingBlock ? 'Modify' : 'New'} Architecture</h3>
                    <p className="text-[10px] font-mono text-muted uppercase tracking-widest mt-1">Block Configuration</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1c1f26] text-muted hover:text-white transition-colors"><X size={16}/></button>
               </div>
               
               <div className="flex flex-col gap-5 p-6">
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[9px] uppercase tracking-widest text-[#94a3b8]">Operation Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Deep Work Session"
                      value={blockForm.name}
                      onChange={(e) => setBlockForm({...blockForm, name: e.target.value})}
                      className="w-full rounded-xl border border-[#1f2937] bg-[#0a0c10] px-4 py-3 text-sm text-white outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-[#94a3b8]">Initiation Time</label>
                      <input 
                        type="time" 
                        value={blockForm.start}
                        onChange={(e) => setBlockForm({...blockForm, start: e.target.value})}
                        className="w-full rounded-xl border border-[#1f2937] bg-[#0a0c10] px-4 py-3 text-sm text-white outline-none focus:border-accent/50 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-[#94a3b8]">Termination Time</label>
                      <input 
                        type="time" 
                        value={blockForm.end}
                        onChange={(e) => setBlockForm({...blockForm, end: e.target.value})}
                        className="w-full rounded-xl border border-[#1f2937] bg-[#0a0c10] px-4 py-3 text-sm text-white outline-none focus:border-accent/50 transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[9px] uppercase tracking-widest text-[#94a3b8]">Classification</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(Category).map(c => (
                        <button 
                          key={c}
                          onClick={() => setBlockForm({...blockForm, cat: c})}
                          className={`flex-1 min-w-[80px] rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all h-10 ${
                            blockForm.cat === c 
                              ? 'border-accent bg-accent/10 text-accent' 
                              : 'border-[#1f2937] bg-[#0a0c10] text-[#94a3b8] hover:border-[#374151]'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[9px] uppercase tracking-widest text-[#94a3b8]">Field Notes</label>
                    <textarea 
                      placeholder="Objectives and deliverables..."
                      value={blockForm.note}
                      rows={2}
                      onChange={(e) => setBlockForm({...blockForm, note: e.target.value})}
                      className="w-full rounded-xl border border-[#1f2937] bg-[#0a0c10] px-4 py-3 text-sm text-white outline-none focus:border-accent/50 transition-colors resize-none"
                    />
                  </div>
               </div>
               
               <div className="flex items-center justify-between border-t border-[#1f2937] px-6 py-5 bg-[#0a0c10]/20">
                  {editingBlock ? (
                    <button onClick={deleteBlock} className="flex items-center gap-2 text-xs text-red/60 hover:text-red transition-colors font-medium">
                      <Trash2 size={14}/> <span>Abort</span>
                    </button>
                  ) : <div />}
                  <div className="flex gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-semibold text-muted hover:text-white transition-colors">Dismiss</button>
                    <button onClick={saveBlock} className="px-6 py-2.5 rounded-xl bg-accent text-[#0f1115] font-bold text-xs shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.3)] transition-all active:scale-95">Commit Block</button>
                  </div>
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
