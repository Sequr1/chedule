import { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';

// ==================== TYPES ====================
interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
  icon: string;
}

interface WeekDay {
  dayIndex: number; // 0=Пн ... 6=Вс
  items: ScheduleItem[];
}

type Orientation = 'vertical' | 'horizontal';

interface WeekSchedule {
  id: string;
  title: string;
  weekStart: string; // ISO date of Monday
  days: WeekDay[];
  orientation: Orientation;
  createdAt: number;
}

// ==================== CONSTANTS ====================
const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_NAMES_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTH_NAMES = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const ICON_OPTIONS = [
  { value: '✨', label: 'Сияние' },
  { value: '🧘', label: 'Медитация' },
  { value: '☀️', label: 'Солнце' },
  { value: '🌙', label: 'Луна' },
  { value: '⭐', label: 'Звезда' },
  { value: '🕯️', label: 'Свеча' },
  { value: '🌸', label: 'Цветок' },
  { value: '💫', label: 'Энергия' },
  { value: '🙏', label: 'Молитва' },
  { value: '📿', label: 'Чётки' },
  { value: '🌅', label: 'Рассвет' },
  { value: '🌄', label: 'Закат' },
  { value: '🔔', label: 'Колокол' },
  { value: '📖', label: 'Книга' },
  { value: '🍵', label: 'Чай' },
  { value: '🎵', label: 'Музыка' },
  { value: '🏃', label: 'Активность' },
  { value: '💤', label: 'Сон' },
  { value: '🍽️', label: 'Еда' },
  { value: '💎', label: 'Кристалл' },
  { value: '🧵', label: 'Нити' },
];

const BG_VERTICAL = '/images/luxury-background.jpg';
const BG_HORIZONTAL = '/images/bg-horizontal.jpg';

// ==================== HELPERS ====================
const pad = (n: number) => n.toString().padStart(2, '0');
const formatTime = (h: number, m: number) => `${pad(h)}:${pad(m)}`;

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDates(mondayISO: string): Date[] {
  const monday = new Date(mondayISO);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}.`;
}

function formatWeekRange(mondayISO: string): string {
  const dates = getWeekDates(mondayISO);
  const first = dates[0];
  const last = dates[6];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} ${MONTH_NAMES[first.getMonth()]}`;
  }
  return `${first.getDate()} ${MONTH_NAMES[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()].slice(0, 3)}`;
}

function createEmptyWeek(): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, items: [] }));
}

// ==================== SVG ICONS ====================
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const IconSparkles = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);
const IconMonitor = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
);
const IconSmartphone = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
);
const IconChevronUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
);
const IconChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const IconChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const IconChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
);

// ==================== TIME PICKER ====================
function TimePicker({ hour, minute, onChangeHour, onChangeMinute }: {
  hour: number;
  minute: number;
  onChangeHour: (h: number) => void;
  onChangeMinute: (m: number) => void;
}) {
  const [showHours, setShowHours] = useState(false);
  const [showMinutes, setShowMinutes] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => { setShowHours(!showHours); setShowMinutes(false); }}
          className="w-14 h-10 bg-white/10 border border-amber-500/30 rounded-lg text-amber-100 text-lg font-mono flex items-center justify-center hover:bg-amber-500/20 transition-all"
        >
          {pad(hour)}
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 top-0 -translate-y-full pb-1">
          <button type="button" onClick={() => onChangeHour((hour + 1) % 24)} className="w-14 flex justify-center text-amber-400/70 hover:text-amber-300 transition-all">
            <IconChevronUp />
          </button>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full pt-1">
          <button type="button" onClick={() => onChangeHour((hour - 1 + 24) % 24)} className="w-14 flex justify-center text-amber-400/70 hover:text-amber-300 transition-all">
            <IconChevronDown />
          </button>
        </div>
        {showHours && (
          <div className="absolute top-full left-0 mt-6 z-50 bg-black/90 backdrop-blur-xl border border-amber-500/30 rounded-xl p-3 grid grid-cols-6 gap-1.5 w-64 shadow-2xl">
            {HOURS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => { onChangeHour(h); setShowHours(false); }}
                className={`w-9 h-9 rounded-lg text-sm font-mono flex items-center justify-center transition-all ${
                  h === hour ? 'bg-amber-500 text-black font-bold' : 'text-amber-100 hover:bg-amber-500/20'
                }`}
              >
                {pad(h)}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="text-amber-400 text-xl font-light">:</span>

      <div className="relative">
        <button
          type="button"
          onClick={() => { setShowMinutes(!showMinutes); setShowHours(false); }}
          className="w-14 h-10 bg-white/10 border border-amber-500/30 rounded-lg text-amber-100 text-lg font-mono flex items-center justify-center hover:bg-amber-500/20 transition-all"
        >
          {pad(minute)}
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 top-0 -translate-y-full pb-1">
          <button type="button" onClick={() => onChangeMinute((minute + 5) % 60)} className="w-14 flex justify-center text-amber-400/70 hover:text-amber-300 transition-all">
            <IconChevronUp />
          </button>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full pt-1">
          <button type="button" onClick={() => onChangeMinute((minute - 5 + 60) % 60)} className="w-14 flex justify-center text-amber-400/70 hover:text-amber-300 transition-all">
            <IconChevronDown />
          </button>
        </div>
        {showMinutes && (
          <div className="absolute top-full left-0 mt-6 z-50 bg-black/90 backdrop-blur-xl border border-amber-500/30 rounded-xl p-3 grid grid-cols-4 gap-1.5 w-48 shadow-2xl">
            {MINUTES.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { onChangeMinute(m); setShowMinutes(false); }}
                className={`w-9 h-9 rounded-lg text-sm font-mono flex items-center justify-center transition-all ${
                  m === minute ? 'bg-amber-500 text-black font-bold' : 'text-amber-100 hover:bg-amber-500/20'
                }`}
              >
                {pad(m)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== ORIENTATION SWITCHER ====================
function OrientationSwitcher({ value, onChange }: { value: Orientation; onChange: (o: Orientation) => void }) {
  return (
    <div className="flex bg-white/5 rounded-xl p-1 border border-amber-500/20">
      <button
        type="button"
        onClick={() => onChange('vertical')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
          value === 'vertical'
            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg'
            : 'text-amber-200/60 hover:text-amber-100'
        }`}
      >
        <IconSmartphone />
        <span>9:16</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('horizontal')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
          value === 'horizontal'
            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg'
            : 'text-amber-200/60 hover:text-amber-100'
        }`}
      >
        <IconMonitor />
        <span>16:9</span>
      </button>
    </div>
  );
}

// ==================== WEEK NAVIGATION ====================
function WeekNavigator({ weekStart, onChange }: { weekStart: string; onChange: (iso: string) => void }) {
  const shift = (weeks: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + weeks * 7);
    onChange(d.toISOString().split('T')[0]);
  };
  const goToday = () => {
    onChange(getMonday(new Date()).toISOString().split('T')[0]);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => shift(-1)} className="p-2 rounded-lg bg-white/[0.06] border border-amber-500/15 text-amber-300/70 hover:text-amber-200 hover:bg-amber-500/15 transition-all">
        <IconChevronLeft />
      </button>
      <button onClick={goToday} className="px-3 py-2 rounded-lg bg-white/[0.06] border border-amber-500/15 text-amber-300/70 hover:text-amber-200 hover:bg-amber-500/15 transition-all text-xs tracking-wider">
        Сегодня
      </button>
      <button onClick={() => shift(1)} className="p-2 rounded-lg bg-white/[0.06] border border-amber-500/15 text-amber-300/70 hover:text-amber-200 hover:bg-amber-500/15 transition-all">
        <IconChevronRight />
      </button>
      <span className="ml-2 text-amber-200/60 text-sm">{formatWeekRange(weekStart)}</span>
    </div>
  );
}

// ==================== PREVIEW: VERTICAL (9:16) — FULL WEEK ====================
function PreviewVertical({ schedule }: { schedule: WeekSchedule | null }) {
  if (!schedule) return null;
  const dates = getWeekDates(schedule.weekStart);

  return (
    <div className="absolute inset-0 flex flex-col" style={{ fontFamily: "'Georgia', serif" }}>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/50" />
      <div className="relative flex flex-col h-full p-[4%]">
        {/* Header */}
        <div className="text-center pt-[2%] pb-[1.5%]">
          <p className="text-amber-300/70 tracking-[0.3em] uppercase" style={{ fontSize: 'clamp(5px, 1.4vw, 9px)' }}>
            ✦ расписание на неделю ✦
          </p>
          <h3 className="text-amber-50 font-light tracking-wider mt-[1.5%]" style={{ fontSize: 'clamp(8px, 3vw, 18px)' }}>
            {schedule.title || 'Духовное расписание'}
          </h3>
          <p className="text-amber-300/60 mt-[1%]" style={{ fontSize: 'clamp(5px, 1.5vw, 9px)' }}>
            {formatWeekRange(schedule.weekStart)}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-[3%] my-[1.5%]">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <span className="text-amber-400/60" style={{ fontSize: 'clamp(5px, 1.5vw, 10px)' }}>◆</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        </div>

        {/* Week days */}
        <div className="flex-1 overflow-hidden space-y-[1.2%]">
          {schedule.days.map((day, i) => {
            const date = dates[i];
            const hasItems = day.items.length > 0;
            return (
              <div key={i} className={`px-[3%] py-[1.5%] rounded-lg ${hasItems ? 'bg-white/8 backdrop-blur-sm border border-amber-500/10' : 'bg-white/[0.03] border border-amber-500/[0.05]'}`}>
                <div className="flex items-center gap-[2%] mb-[0.5%]">
                  <span className="text-amber-400 font-semibold" style={{ fontSize: 'clamp(6px, 1.8vw, 11px)' }}>
                    {DAY_NAMES_SHORT[i]}
                  </span>
                  <span className="text-amber-300/50" style={{ fontSize: 'clamp(5px, 1.3vw, 8px)' }}>
                    {date.getDate()} {MONTH_NAMES[date.getMonth()].slice(0, 3)}.
                  </span>
                  {!hasItems && (
                    <span className="text-amber-200/20 ml-auto" style={{ fontSize: 'clamp(4px, 1.1vw, 7px)' }}>—</span>
                  )}
                </div>
                {hasItems && (
                  <div className="space-y-[1%]">
                    {day.items.map(item => (
                      <div key={item.id} className="flex items-center gap-[2%]">
                        <span style={{ fontSize: 'clamp(6px, 1.8vw, 12px)' }}>{item.icon}</span>
                        <span className="text-amber-400/80 font-mono shrink-0" style={{ fontSize: 'clamp(6px, 1.8vw, 12px)' }}>
                          {item.time}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-amber-50 truncate" style={{ fontSize: 'clamp(6px, 1.8vw, 12px)' }}>
                            {item.title}
                          </span>
                          {item.description && (
                            <span className="text-amber-300/50 truncate" style={{ fontSize: 'clamp(4px, 1.2vw, 8px)' }}>
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-[2%] text-center">
          <div className="flex items-center gap-[3%] mb-[1%]">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
            <span className="text-amber-400/40" style={{ fontSize: 'clamp(4px, 1.2vw, 8px)' }}>✦</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
          </div>
          <p className="text-amber-300/40 tracking-wider" style={{ fontSize: 'clamp(4px, 1vw, 7px)' }}>
            С любовью и осознанностью
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== PREVIEW: HORIZONTAL (16:9) — FULL WEEK ====================
function PreviewHorizontal({ schedule }: { schedule: WeekSchedule | null }) {
  if (!schedule) return null;
  const dates = getWeekDates(schedule.weekStart);

  return (
    <div className="absolute inset-0 flex flex-col" style={{ fontFamily: "'Georgia', serif" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-black/45 via-black/20 to-black/45" />
      <div className="relative flex flex-col h-full p-[3%]">
        {/* Header */}
        <div className="text-center pb-[1.5%]">
          <p className="text-amber-300/70 tracking-[0.4em] uppercase" style={{ fontSize: 'clamp(4px, 0.9vw, 8px)' }}>
            ✦ расписание на неделю ✦
          </p>
          <h3 className="text-amber-50 font-light tracking-wider mt-[0.5%]" style={{ fontSize: 'clamp(7px, 2vw, 20px)' }}>
            {schedule.title || 'Духовное расписание'}
          </h3>
          <p className="text-amber-300/60 mt-[0.3%]" style={{ fontSize: 'clamp(4px, 1vw, 9px)' }}>
            {formatWeekRange(schedule.weekStart)}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-[1.5%] mb-[1.5%]">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <span className="text-amber-400/60" style={{ fontSize: 'clamp(4px, 0.9vw, 10px)' }}>◆</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        </div>

        {/* 7 Columns */}
        <div className="flex-1 overflow-hidden grid grid-cols-7 gap-[1%]">
          {schedule.days.map((day, i) => {
            const date = dates[i];
            const isWeekend = i >= 5;
            return (
              <div key={i} className={`flex flex-col rounded-lg overflow-hidden ${isWeekend ? 'bg-amber-500/[0.08]' : 'bg-white/[0.06]'} border border-amber-500/10 backdrop-blur-sm`}>
                {/* Day header */}
                <div className="text-center py-[4%] border-b border-amber-500/10">
                  <p className="text-amber-400 font-semibold" style={{ fontSize: 'clamp(4px, 1vw, 10px)' }}>
                    {DAY_NAMES_SHORT[i]}
                  </p>
                  <p className="text-amber-300/50" style={{ fontSize: 'clamp(3px, 0.7vw, 7px)' }}>
                    {date.getDate()} {MONTH_NAMES[date.getMonth()].slice(0, 3)}.
                  </p>
                </div>
                {/* Items */}
                <div className="flex-1 p-[4%] space-y-[4%] overflow-hidden">
                  {day.items.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-amber-200/15" style={{ fontSize: 'clamp(3px, 0.7vw, 7px)' }}>—</span>
                    </div>
                  ) : (
                    day.items.map(item => (
                      <div key={item.id} className="space-y-[1%]">
                        <div className="flex items-center gap-[3%]">
                          <span style={{ fontSize: 'clamp(5px, 1.2vw, 12px)' }}>{item.icon}</span>
                          <span className="text-amber-400/80 font-mono" style={{ fontSize: 'clamp(4px, 0.9vw, 9px)' }}>
                            {item.time}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-amber-50 truncate leading-tight" style={{ fontSize: 'clamp(4px, 0.9vw, 9px)' }}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-amber-300/50 truncate leading-tight" style={{ fontSize: 'clamp(3px, 0.7vw, 7px)' }}>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-[1.5%] text-center">
          <p className="text-amber-300/40 tracking-wider" style={{ fontSize: 'clamp(3px, 0.7vw, 7px)' }}>
            ✦ С любовью и осознанностью ✦
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
function App() {
  const [schedules, setSchedules] = useState<WeekSchedule[]>([]);
  const [current, setCurrent] = useState<WeekSchedule | null>(null);
  const [activeDay, setActiveDay] = useState(0); // editing day index 0-6
  const [orientation, setOrientation] = useState<Orientation>('vertical');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // New item
  const [newHour, setNewHour] = useState(8);
  const [newMinute, setNewMinute] = useState(0);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('✨');

  const previewRef = useRef<HTMLDivElement>(null);

  // Load
  useEffect(() => {
    const saved = localStorage.getItem('spiritual-week-schedules-v3');
    if (saved) {
      try {
        const parsed: WeekSchedule[] = JSON.parse(saved);
        setSchedules(parsed);
        if (parsed.length > 0) {
          const first = parsed[0];
          setCurrent(first);
          setScheduleTitle(first.title);
          setOrientation(first.orientation);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem('spiritual-week-schedules-v3', JSON.stringify(schedules));
  }, [schedules]);

  const persist = useCallback((updated: WeekSchedule) => {
    setCurrent(updated);
    setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, []);

  // Create
  const createNew = () => {
    const monday = getMonday(new Date());
    const newSch: WeekSchedule = {
      id: Date.now().toString(),
      title: 'Расписание на неделю',
      weekStart: monday.toISOString().split('T')[0],
      days: createEmptyWeek(),
      orientation: 'vertical',
      createdAt: Date.now(),
    };
    setSchedules(prev => [newSch, ...prev]);
    setCurrent(newSch);
    setScheduleTitle(newSch.title);
    setOrientation(newSch.orientation);
    setActiveDay(0);
  };

  // Delete schedule
  const deleteSch = (id: string) => {
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    if (current?.id === id) {
      const next = updated[0] || null;
      setCurrent(next);
      setScheduleTitle(next?.title || '');
      setOrientation(next?.orientation || 'vertical');
    }
  };

  // Load schedule
  const loadSch = (s: WeekSchedule) => {
    setCurrent(s);
    setScheduleTitle(s.title);
    setOrientation(s.orientation);
    setActiveDay(0);
  };

  const handleTitleChange = (title: string) => {
    setScheduleTitle(title);
    if (current) persist({ ...current, title });
  };

  const handleWeekChange = (weekStart: string) => {
    if (current) persist({ ...current, weekStart });
  };

  const handleOrientationChange = (o: Orientation) => {
    setOrientation(o);
    if (current) persist({ ...current, orientation: o });
  };

  // Add item to active day
  const addItem = () => {
    if (!newTitle.trim() || !current) return;
    const item: ScheduleItem = {
      id: Date.now().toString(),
      time: formatTime(newHour, newMinute),
      title: newTitle.trim(),
      description: newDescription.trim(),
      icon: newIcon,
    };
    const newDays = current.days.map((d, i) =>
      i === activeDay
        ? { ...d, items: [...d.items, item].sort((a, b) => a.time.localeCompare(b.time)) }
        : d
    );
    persist({ ...current, days: newDays });
    setNewTitle('');
    setNewDescription('');
    setNewIcon('✨');
    setNewHour(h => (h + 1) % 24);
  };

  // Delete item from active day
  const deleteItem = (itemId: string) => {
    if (!current) return;
    const newDays = current.days.map((d, i) =>
      i === activeDay
        ? { ...d, items: d.items.filter(it => it.id !== itemId) }
        : d
    );
    persist({ ...current, days: newDays });
  };

  // Generate
  const generateImage = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    try {
      // Wait for images to load
      await document.fonts.ready;
      
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: '#1a1a2e',
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 0,
        foreignObjectRendering: true,
        ignoreElements: (el) => {
          const element = el as HTMLElement;
          return element.classList?.contains('no-capture') ?? false;
        },
      });
      
      const link = document.createElement('a');
      link.download = `schedule-${scheduleTitle || 'week'}-${orientation}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to generate:', error);
      alert('Не удалось сгенерировать изображение. Попробуйте ещё раз.');
    } finally {
      setIsGenerating(false);
    }
  };

  const bgImage = orientation === 'vertical' ? BG_VERTICAL : BG_HORIZONTAL;
  const aspectRatio = orientation === 'vertical' ? '9 / 16' : '16 / 9';
  const activeDayItems = current?.days[activeDay]?.items || [];
  const weekDates = current ? getWeekDates(current.weekStart) : [];

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url(${BG_VERTICAL})` }} />
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 z-0" />

      {/* Content */}
      <div className="relative z-10 min-h-screen p-4 md:p-6 lg:p-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <IconSparkles />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-light text-amber-100 tracking-[0.2em]">
              ДУХОВНОЕ РАСПИСАНИЕ
            </h1>
            <IconSparkles />
          </div>
          <p className="text-amber-200/50 text-sm tracking-widest">
            Создайте своё расписание на неделю
          </p>
        </header>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8">
          {/* ===== LEFT: Editor ===== */}
          <div className="space-y-5">
            {/* Saved Schedules */}
            <section className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-5 border border-amber-500/15 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-amber-100/90 text-sm tracking-wider uppercase">Расписания</h2>
                <button
                  onClick={createNew}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 rounded-xl text-amber-200 text-sm transition-all border border-amber-500/25 hover:border-amber-500/40"
                >
                  <IconPlus /> Новое
                </button>
              </div>
              {schedules.length === 0 ? (
                <p className="text-amber-200/30 text-sm text-center py-4">Создайте первое расписание</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {schedules.map(s => {
                    const totalItems = s.days.reduce((sum, d) => sum + d.items.length, 0);
                    return (
                      <div
                        key={s.id}
                        onClick={() => loadSch(s)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                          current?.id === s.id
                            ? 'bg-amber-500/20 border border-amber-500/40 shadow-inner'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-amber-100 text-sm font-medium truncate">{s.title}</p>
                          <p className="text-amber-300/40 text-xs mt-0.5">
                            {formatWeekRange(s.weekStart)} · {totalItems} пунктов · {s.orientation === 'vertical' ? '9:16' : '16:9'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSch(s.id); }}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-amber-300/30 hover:text-red-400 transition-all ml-2 shrink-0"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Settings */}
            {current && (
              <section className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-5 border border-amber-500/15 shadow-xl space-y-5">
                <h2 className="text-amber-100/90 text-sm tracking-wider uppercase">Настройки</h2>

                {/* Title */}
                <div>
                  <label className="block text-amber-200/50 text-xs mb-2 tracking-wider uppercase">Название</label>
                  <input
                    type="text"
                    value={scheduleTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white/[0.06] border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-200/20 focus:outline-none focus:border-amber-500/40 transition-all text-sm"
                    placeholder="Название расписания"
                  />
                </div>

                {/* Week navigator */}
                <div>
                  <label className="block text-amber-200/50 text-xs mb-3 tracking-wider uppercase">Неделя</label>
                  <WeekNavigator weekStart={current.weekStart} onChange={handleWeekChange} />
                </div>

                {/* Orientation */}
                <div>
                  <label className="block text-amber-200/50 text-xs mb-3 tracking-wider uppercase">Формат</label>
                  <OrientationSwitcher value={orientation} onChange={handleOrientationChange} />
                </div>
              </section>
            )}

            {/* Day tabs + add items */}
            {current && (
              <section className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-5 border border-amber-500/15 shadow-xl space-y-4">
                <h2 className="text-amber-100/90 text-sm tracking-wider uppercase">Редактор дней</h2>

                {/* Day tabs */}
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_NAMES_SHORT.map((name, i) => {
                    const dayDate = weekDates[i];
                    const itemCount = current.days[i]?.items.length || 0;
                    return (
                      <button
                        key={i}
                        onClick={() => setActiveDay(i)}
                        className={`flex flex-col items-center min-w-[52px] px-2 py-2 rounded-xl text-xs transition-all duration-300 ${
                          activeDay === i
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/30 scale-105'
                            : 'bg-white/[0.06] border border-amber-500/15 text-amber-200/60 hover:bg-amber-500/15 hover:text-amber-100 hover:border-amber-500/30'
                        }`}
                      >
                        <span className="font-semibold">{name}</span>
                        {dayDate && (
                          <span className={`text-[10px] mt-0.5 ${activeDay === i ? 'text-black/60' : 'text-amber-300/40'}`}>
                            {dayDate.getDate()}
                          </span>
                        )}
                        {itemCount > 0 && (
                          <span className={`text-[9px] mt-0.5 px-1.5 rounded-full ${
                            activeDay === i
                              ? 'bg-black/20 text-black/80'
                              : 'bg-amber-500/20 text-amber-400/70'
                          }`}>
                            {itemCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Separator */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-amber-500/15" />
                  <span className="text-amber-300/40 text-xs">
                    {DAY_NAMES_FULL[activeDay]}, {weekDates[activeDay] && formatDateShort(weekDates[activeDay])}
                  </span>
                  <div className="flex-1 h-px bg-amber-500/15" />
                </div>

                {/* Add new item form */}
                <div className="space-y-3">
                  {/* Time */}
                  <div>
                    <label className="block text-amber-200/50 text-xs mb-2 tracking-wider uppercase">Время</label>
                    <div className="flex justify-center py-2">
                      <TimePicker hour={newHour} minute={newMinute} onChangeHour={setNewHour} onChangeMinute={setNewMinute} />
                    </div>
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="block text-amber-200/50 text-xs mb-2 tracking-wider uppercase">Иконка</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ICON_OPTIONS.map(ic => (
                        <button
                          key={ic.value}
                          type="button"
                          onClick={() => setNewIcon(ic.value)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all duration-200 ${
                            newIcon === ic.value
                              ? 'bg-amber-500/30 border-2 border-amber-400 scale-110 shadow-lg shadow-amber-500/20'
                              : 'bg-white/[0.05] border border-amber-500/10 hover:bg-amber-500/15 hover:scale-105'
                          }`}
                          title={ic.label}
                        >
                          {ic.value}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-amber-200/50 text-xs mb-2 tracking-wider uppercase">Название</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
                      className="w-full px-4 py-3 bg-white/[0.06] border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-200/20 focus:outline-none focus:border-amber-500/40 transition-all text-sm"
                      placeholder="Утренняя медитация"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-amber-200/50 text-xs mb-2 tracking-wider uppercase">
                      Описание <span className="text-amber-500/30">(необязательно)</span>
                    </label>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
                      className="w-full px-4 py-3 bg-white/[0.06] border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-200/20 focus:outline-none focus:border-amber-500/40 transition-all text-sm"
                      placeholder="Краткое описание"
                    />
                  </div>

                  {/* Add button */}
                  <button
                    onClick={addItem}
                    disabled={!newTitle.trim()}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-amber-900/30 disabled:to-amber-900/30 disabled:text-amber-500/30 rounded-xl text-black font-medium transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20 disabled:shadow-none"
                  >
                    <IconPlus />
                    Добавить в {DAY_NAMES_SHORT[activeDay]}
                  </button>
                </div>
              </section>
            )}

            {/* Items list for active day */}
            {current && activeDayItems.length > 0 && (
              <section className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-5 border border-amber-500/15 shadow-xl">
                <h2 className="text-amber-100/90 text-sm tracking-wider uppercase mb-4">
                  {DAY_NAMES_FULL[activeDay]} ({activeDayItems.length})
                </h2>
                <div className="space-y-2">
                  {activeDayItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl border border-amber-500/8 group hover:bg-white/[0.07] transition-all">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400/80 font-mono text-xs shrink-0">{item.time}</span>
                          <span className="text-amber-100 text-sm font-medium truncate">{item.title}</span>
                        </div>
                        {item.description && (
                          <p className="text-amber-200/40 text-xs mt-0.5 truncate">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg text-amber-300/40 hover:text-red-400 transition-all shrink-0"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ===== RIGHT: Preview ===== */}
          <div className="lg:sticky lg:top-6 h-fit space-y-5">
            <section className="bg-white/[0.07] backdrop-blur-xl rounded-2xl p-5 border border-amber-500/15 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-amber-100/90 text-sm tracking-wider uppercase flex items-center gap-2">
                  Предпросмотр
                  <span className="text-amber-400/50 text-xs">
                    {orientation === 'vertical' ? '9:16' : '16:9'}
                  </span>
                </h2>
                <button
                  onClick={generateImage}
                  disabled={!current || isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-amber-900/30 disabled:to-amber-900/30 disabled:text-amber-500/30 rounded-xl text-black text-sm font-medium transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none"
                >
                  <IconDownload />
                  {isGenerating ? 'Генерация...' : 'Скачать PNG'}
                </button>
              </div>

              <div className="flex justify-center">
                <div
                  className={`relative overflow-hidden rounded-xl shadow-2xl shadow-amber-900/30 border border-amber-500/10 ${
                    orientation === 'vertical' ? 'w-full max-w-[320px]' : 'w-full'
                  }`}
                  style={{ aspectRatio }}
                >
                  <div
                    ref={previewRef}
                    className="absolute inset-0 flex flex-col"
                  >
                    <img
                      src={bgImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ pointerEvents: 'none' }}
                    />
                    <div className="absolute inset-0 flex flex-col">
                      {orientation === 'vertical' ? (
                        <PreviewVertical schedule={current} />
                      ) : (
                        <PreviewHorizontal schedule={current} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-amber-200/30 text-xs mt-3 text-center tracking-wider">
                {orientation === 'vertical'
                  ? 'Вертикальный формат (9:16) — для историй и обоев'
                  : 'Горизонтальный формат (16:9) — для постов и презентаций'}
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-10 pb-6">
          <p className="text-amber-200/20 text-xs tracking-widest">
            ✦ Создано с любовью и осознанностью ✦
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
