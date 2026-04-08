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

// CSS backgrounds instead of images for reliable html2canvas capture
export const CSS_BG_VERTICAL = `
  radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.4) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 20%, rgba(245, 158, 11, 0.3) 0%, transparent 40%),
  radial-gradient(ellipse at 20% 80%, rgba(251, 191, 36, 0.25) 0%, transparent 45%),
  radial-gradient(ellipse at 50% 100%, rgba(234, 179, 8, 0.35) 0%, transparent 50%),
  linear-gradient(180deg, 
    rgba(15, 10, 30, 0.95) 0%, 
    rgba(26, 18, 50, 0.9) 30%, 
    rgba(45, 30, 80, 0.85) 60%, 
    rgba(26, 18, 50, 0.9) 80%, 
    rgba(15, 10, 30, 0.95) 100%
  )
`;

export const CSS_BG_HORIZONTAL = `
  radial-gradient(ellipse at 10% 50%, rgba(251, 191, 36, 0.3) 0%, transparent 40%),
  radial-gradient(ellipse at 90% 50%, rgba(245, 158, 11, 0.3) 0%, transparent 40%),
  radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.25) 0%, transparent 50%),
  radial-gradient(ellipse at 50% 100%, rgba(234, 179, 8, 0.3) 0%, transparent 50%),
  linear-gradient(90deg, 
    rgba(15, 10, 30, 0.95) 0%, 
    rgba(26, 18, 50, 0.88) 25%, 
    rgba(45, 30, 80, 0.85) 50%, 
    rgba(26, 18, 50, 0.88) 75%, 
    rgba(15, 10, 30, 0.95) 100%
  )
`;

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

  // Load schedules
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

  // Generate image with dedicated capture container
  const generateImage = async () => {
    if (!current) return;
    setIsGenerating(true);
    
    try {
      // Wait for fonts to be ready
      await document.fonts.ready;
      
      // Create a dedicated capture container
      const captureContainer = document.createElement('div');
      const width = orientation === 'vertical' ? 720 : 1280;
      const height = orientation === 'vertical' ? 1280 : 720;
      
      captureContainer.style.width = `${width}px`;
      captureContainer.style.height = `${height}px`;
      captureContainer.style.position = 'fixed';
      captureContainer.style.left = '-9999px';
      captureContainer.style.top = '0';
      captureContainer.style.zIndex = '-9999';
      
      // Apply background based on orientation
      const bgGradient = orientation === 'vertical' 
        ? 'linear-gradient(180deg, #0f0a1e 0%, #1a1232 30%, #2d1e50 60%, #1a1232 80%, #0f0a1e 100%)'
        : 'linear-gradient(90deg, #0f0a1e 0%, #1a1232 25%, #2d1e50 50%, #1a1232 75%, #0f0a1e 100%)';
      
      captureContainer.style.background = bgGradient;
      captureContainer.style.borderRadius = '0';
      captureContainer.style.overflow = 'hidden';
      captureContainer.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      
      // Create inner content container
      const innerContainer = document.createElement('div');
      innerContainer.style.width = '100%';
      innerContainer.style.height = '100%';
      innerContainer.style.display = 'flex';
      innerContainer.style.flexDirection = 'column';
      innerContainer.style.padding = '40px';
      innerContainer.style.boxSizing = 'border-box';
      innerContainer.style.color = '#fef3c7';
      
      // Add title
      const titleEl = document.createElement('h1');
      titleEl.textContent = scheduleTitle || 'ДУХОВНОЕ РАСПИСАНИЕ';
      titleEl.style.fontSize = '32px';
      titleEl.style.fontWeight = '300';
      titleEl.style.letterSpacing = '0.2em';
      titleEl.style.textAlign = 'center';
      titleEl.style.marginBottom = '30px';
      titleEl.style.color = '#fef3c7';
      titleEl.style.textTransform = 'uppercase';
      innerContainer.appendChild(titleEl);
      
      // Add week range
      const weekRangeEl = document.createElement('div');
      weekRangeEl.textContent = formatWeekRange(current.weekStart);
      weekRangeEl.style.fontSize = '16px';
      weekRangeEl.style.textAlign = 'center';
      weekRangeEl.style.marginBottom = '30px';
      weekRangeEl.style.color = '#fbbf24';
      weekRangeEl.style.letterSpacing = '0.1em';
      innerContainer.appendChild(weekRangeEl);
      
      // Render schedule content based on orientation
      if (orientation === 'vertical') {
        // Vertical layout - days as rows
        const daysContainer = document.createElement('div');
        daysContainer.style.flex = '1';
        daysContainer.style.display = 'flex';
        daysContainer.style.flexDirection = 'column';
        daysContainer.style.gap = '16px';
        daysContainer.style.overflow = 'hidden';
        
        current.days.forEach((day, dayIndex) => {
          const dayEl = document.createElement('div');
          dayEl.style.background = 'rgba(255, 255, 255, 0.05)';
          dayEl.style.border = '1px solid rgba(251, 191, 36, 0.2)';
          dayEl.style.borderRadius = '12px';
          dayEl.style.padding = '12px 16px';
          
          const isWeekend = dayIndex >= 5;
          if (isWeekend) {
            dayEl.style.background = 'rgba(251, 191, 36, 0.08)';
          }
          
          // Day header
          const dayHeaderEl = document.createElement('div');
          dayHeaderEl.style.display = 'flex';
          dayHeaderEl.style.justifyContent = 'space-between';
          dayHeaderEl.style.alignItems = 'center';
          dayHeaderEl.style.marginBottom = '10px';
          
          const dayNameEl = document.createElement('span');
          dayNameEl.textContent = DAY_NAMES_SHORT[dayIndex];
          dayNameEl.style.fontSize = '14px';
          dayNameEl.style.fontWeight = '600';
          dayNameEl.style.color = '#fbbf24';
          dayNameEl.style.letterSpacing = '0.1em';
          
          const dateEl = document.createElement('span');
          const date = weekDates[dayIndex];
          dateEl.textContent = date ? `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}` : '';
          dateEl.style.fontSize = '12px';
          dateEl.style.color = '#fbbf24';
          dateEl.style.opacity = '0.7';
          
          dayHeaderEl.appendChild(dayNameEl);
          dayHeaderEl.appendChild(dateEl);
          dayEl.appendChild(dayHeaderEl);
          
          // Items
          if (day.items.length > 0) {
            const itemsContainer = document.createElement('div');
            itemsContainer.style.display = 'flex';
            itemsContainer.style.flexDirection = 'column';
            itemsContainer.style.gap = '6px';
            
            day.items.forEach(item => {
              const itemEl = document.createElement('div');
              itemEl.style.display = 'flex';
              itemEl.style.alignItems = 'center';
              itemEl.style.gap = '10px';
              itemEl.style.padding = '6px 0';
              
              const iconEl = document.createElement('span');
              iconEl.textContent = item.icon;
              iconEl.style.fontSize = '16px';
              
              const timeEl = document.createElement('span');
              timeEl.textContent = item.time;
              timeEl.style.fontSize = '13px';
              timeEl.style.fontFamily = 'monospace';
              timeEl.style.color = '#fbbf24';
              timeEl.style.minWidth = '45px';
              
              const titleElItem = document.createElement('span');
              titleElItem.textContent = item.title;
              titleElItem.style.fontSize = '14px';
              titleElItem.style.color = '#fef3c7';
              titleElItem.style.flex = '1';
              titleElItem.style.whiteSpace = 'nowrap';
              titleElItem.style.overflow = 'hidden';
              titleElItem.style.textOverflow = 'ellipsis';
              
              itemEl.appendChild(iconEl);
              itemEl.appendChild(timeEl);
              itemEl.appendChild(titleElItem);
              itemsContainer.appendChild(itemEl);
            });
            
            dayEl.appendChild(itemsContainer);
          } else {
            const emptyEl = document.createElement('div');
            emptyEl.textContent = '—';
            emptyEl.style.fontSize = '20px';
            emptyEl.style.color = '#fbbf24';
            emptyEl.style.opacity = '0.5';
            emptyEl.style.textAlign = 'center';
            emptyEl.style.padding = '10px 0';
            dayEl.appendChild(emptyEl);
          }
          
          daysContainer.appendChild(dayEl);
        });
        
        innerContainer.appendChild(daysContainer);
      } else {
        // Horizontal layout - days as columns
        const gridContainer = document.createElement('div');
        gridContainer.style.flex = '1';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(7, 1fr)';
        gridContainer.style.gap = '12px';
        gridContainer.style.overflow = 'hidden';
        
        current.days.forEach((day, dayIndex) => {
          const dayEl = document.createElement('div');
          dayEl.style.background = 'rgba(255, 255, 255, 0.05)';
          dayEl.style.border = '1px solid rgba(251, 191, 36, 0.2)';
          dayEl.style.borderRadius = '12px';
          dayEl.style.padding = '10px';
          dayEl.style.display = 'flex';
          dayEl.style.flexDirection = 'column';
          
          const isWeekend = dayIndex >= 5;
          if (isWeekend) {
            dayEl.style.background = 'rgba(251, 191, 36, 0.08)';
          }
          
          // Day header
          const dayHeaderEl = document.createElement('div');
          dayHeaderEl.style.textAlign = 'center';
          dayHeaderEl.style.marginBottom = '10px';
          dayHeaderEl.style.paddingBottom = '8px';
          dayHeaderEl.style.borderBottom = '1px solid rgba(251, 191, 36, 0.2)';
          
          const dayNameEl = document.createElement('div');
          dayNameEl.textContent = DAY_NAMES_SHORT[dayIndex];
          dayNameEl.style.fontSize = '12px';
          dayNameEl.style.fontWeight = '600';
          dayNameEl.style.color = '#fbbf24';
          dayNameEl.style.letterSpacing = '0.1em';
          dayNameEl.style.marginBottom = '4px';
          
          const dateEl = document.createElement('div');
          const date = weekDates[dayIndex];
          dateEl.textContent = date ? `${date.getDate()}` : '';
          dateEl.style.fontSize = '18px';
          dayEl.style.color = '#fef3c7';
          dateEl.style.fontWeight = '600';
          
          dayHeaderEl.appendChild(dayNameEl);
          dayHeaderEl.appendChild(dateEl);
          dayEl.appendChild(dayHeaderEl);
          
          // Items
          const itemsContainer = document.createElement('div');
          itemsContainer.style.flex = '1';
          itemsContainer.style.display = 'flex';
          itemsContainer.style.flexDirection = 'column';
          itemsContainer.style.gap = '4px';
          itemsContainer.style.overflow = 'hidden';
          
          if (day.items.length > 0) {
            day.items.forEach(item => {
              const itemEl = document.createElement('div');
              itemEl.style.display = 'flex';
              itemEl.style.alignItems = 'center';
              itemEl.style.gap = '6px';
              itemEl.style.padding = '4px 0';
              
              const iconEl = document.createElement('span');
              iconEl.textContent = item.icon;
              iconEl.style.fontSize = '12px';
              
              const timeEl = document.createElement('span');
              timeEl.textContent = item.time;
              timeEl.style.fontSize = '10px';
              timeEl.style.fontFamily = 'monospace';
              timeEl.style.color = '#fbbf24';
              timeEl.style.minWidth = '35px';
              
              const titleElItem = document.createElement('span');
              titleElItem.textContent = item.title;
              titleElItem.style.fontSize = '10px';
              titleElItem.style.color = '#fef3c7';
              titleElItem.style.flex = '1';
              titleElItem.style.whiteSpace = 'nowrap';
              titleElItem.style.overflow = 'hidden';
              titleElItem.style.textOverflow = 'ellipsis';
              
              itemEl.appendChild(iconEl);
              itemEl.appendChild(timeEl);
              itemEl.appendChild(titleElItem);
              itemsContainer.appendChild(itemEl);
            });
          } else {
            const emptyEl = document.createElement('div');
            emptyEl.textContent = '—';
            emptyEl.style.fontSize = '16px';
            emptyEl.style.color = '#fbbf24';
            emptyEl.style.opacity = '0.5';
            emptyEl.style.textAlign = 'center';
            emptyEl.style.padding = '10px 0';
            itemsContainer.appendChild(emptyEl);
          }
          
          dayEl.appendChild(itemsContainer);
          gridContainer.appendChild(dayEl);
        });
        
        innerContainer.appendChild(gridContainer);
      }
      
      captureContainer.appendChild(innerContainer);
      document.body.appendChild(captureContainer);
      
      // Wait for DOM to render
      await new Promise(r => setTimeout(r, 300));
      
      // Capture with html2canvas
      const canvas = await html2canvas(captureContainer, {
        scale: 2,
        backgroundColor: '#0f0a1e',
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        foreignObjectRendering: false,
        width: width,
        height: height,
      });
      
      // Remove capture container
      document.body.removeChild(captureContainer);
      
      // Convert to data URL and download
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      if (dataUrl.length < 1000) {
        throw new Error('Generated image is too small');
      }
      
      const link = document.createElement('a');
      link.download = `schedule-${scheduleTitle || 'week'}-${orientation}.png`;
      link.href = dataUrl;
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

  const aspectRatio = orientation === 'vertical' ? '9 / 16' : '16 / 9';
  const activeDayItems = current?.days[activeDay]?.items || [];
  const weekDates = current ? getWeekDates(current.weekStart) : [];
  const previewBg = orientation === 'vertical' ? CSS_BG_VERTICAL : CSS_BG_HORIZONTAL;

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background - CSS gradients for reliable capture */}
      <div className="fixed inset-0 z-0" style={{ background: CSS_BG_VERTICAL }} />
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
                    style={{ background: previewBg }}
                  >
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
