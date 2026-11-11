'use client';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { CalendarCheck2Icon, CalendarX2Icon, ChevronLeftIcon, ChevronRightIcon, GaugeIcon, type LucideIcon } from 'lucide-react';

import { Button } from '@ui/button';
import { Progress } from '@ui/progress';
import { Skeleton } from '@ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDuration, toPercent } from '@/lib/format-duration';
import { DAILY_NORM_MINUTES, toDateKey } from '@/lib/tracker-days';
import { formatText } from '@/lib/format-text';
import content from '../content.json';

export function TrackerCalendar({
  visibleMonth,
  onVisibleMonthChange,
  selectedDate,
  onSelectDate,
  minutesByDate,
  isLoading
}: TrackerCalendarProps) {
  const days = buildCalendarDays(visibleMonth, minutesByDate);
  const stats = summarizeMonth(days);
  const isCurrentMonth = isSameMonth(visibleMonth, new Date());

  function handlePreviousMonthClick() {
    onVisibleMonthChange(addMonths(visibleMonth, -1));
  }

  function handleNextMonthClick() {
    if (!isCurrentMonth) {
      onVisibleMonthChange(addMonths(visibleMonth, 1));
    }
  }

  return (
    <section aria-label={content.calendar.label} className='bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-1'>
          <Button variant='ghost' size='icon-sm' aria-label={content.calendar.previousMonth} onClick={handlePreviousMonthClick}>
            <ChevronLeftIcon />
          </Button>
          <h2 className='min-w-36 text-center text-base font-semibold'>{format(visibleMonth, 'MMMM yyyy')}</h2>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={content.calendar.nextMonth}
            disabled={isCurrentMonth}
            className={cn(isCurrentMonth && 'invisible')}
            onClick={handleNextMonthClick}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <ul className='text-muted-foreground flex flex-wrap gap-4 text-xs'>
          {LEGEND.map((item) => (
            <li key={item.status} className='flex items-center gap-1.5'>
              <span className={cn('ring-foreground/15 size-3 rounded-[4px] ring-1', DAY_BG_CLASS_BY_STATUS[item.status])} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className='grid grid-cols-7 gap-1.5 text-center sm:gap-2'>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className='text-muted-foreground py-1 text-xs font-medium'>
            {weekday}
          </span>
        ))}
        {isLoading
          ? Array.from({ length: 35 }, (_, index) => <Skeleton key={index} className='aspect-square rounded-xl sm:aspect-[4/3]' />)
          : days.map((day) => <CalendarDay key={day.key} day={day} isSelected={day.key === selectedDate} onSelect={onSelectDate} />)}
      </div>

      {isLoading ? <Skeleton className='h-36 rounded-xl' /> : <MonthSummary stats={stats} />}
    </section>
  );
}

export function TrackerCalendarSkeleton() {
  return <Skeleton className='h-[38rem] rounded-2xl' />;
}

function CalendarDay({ day, isSelected, onSelect }: CalendarDayProps) {
  function handleClick() {
    onSelect(day.date);
  }

  return (
    <button
      type='button'
      disabled={day.isFuture}
      aria-pressed={isSelected}
      aria-label={format(day.date, 'EEEE, d MMMM')}
      data-status={isSelected ? undefined : day.status}
      data-today={day.isToday}
      className={cn(
        'group/day relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent text-sm transition-all sm:aspect-[4/3]',
        'hover:border-border hover:shadow-sm disabled:cursor-default disabled:hover:border-transparent disabled:hover:shadow-none',
        day.isOutside && !isSelected && 'opacity-35',
        !isSelected && DAY_BG_CLASS_BY_STATUS[day.status],
        isSelected && 'bg-foreground text-background shadow-md'
      )}
      onClick={handleClick}
    >
      <span className='font-medium tabular-nums'>{day.dayOfMonth}</span>
      {day.minutes > 0 ? (
        <span className={cn('hidden text-[11px] tabular-nums sm:block', isSelected ? 'text-background/70' : 'text-muted-foreground')}>
          {formatDuration(day.minutes)}
        </span>
      ) : null}
    </button>
  );
}

function MonthSummary({ stats }: { stats: MonthStats }) {
  const percent = toPercent(stats.loggedMinutes, stats.normMinutes);

  return (
    <div className='bg-muted/50 animate-in fade-in flex flex-col gap-4 rounded-xl p-4 duration-500'>
      <div className='flex flex-col gap-3'>
        <div className='flex items-end justify-between gap-3'>
          <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
            <span className='text-28 leading-none font-semibold tracking-tight tabular-nums'>{formatDuration(stats.loggedMinutes)}</span>
            <span className='text-muted-foreground text-sm'>
              {formatText(content.calendar.normOf, { norm: formatDuration(stats.normMinutes) })}
            </span>
          </div>
          <span
            data-complete={percent >= 100}
            className='bg-background data-[complete=true]:bg-electric-green data-[complete=true]:text-brand-black rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums shadow-xs'
          >
            {percent}%
          </span>
        </div>
        <Progress
          value={percent}
          aria-label={content.calendar.progressLabel}
          className='[&_[data-slot=progress-indicator]]:bg-deep-teal dark:[&_[data-slot=progress-indicator]]:bg-electric-green [&_[data-slot=progress-track]]:bg-background [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-track]]:h-2'
        />
      </div>

      <dl className='divide-border grid grid-cols-3 divide-x'>
        <MonthMetric
          icon={CalendarCheck2Icon}
          label={content.calendar.metrics.onNorm}
          value={`${stats.daysOnNorm}/${stats.workingDays}`}
          iconClassName='text-success'
        />
        <MonthMetric
          icon={CalendarX2Icon}
          label={content.calendar.metrics.belowNorm}
          value={String(stats.daysBelowNorm)}
          iconClassName='text-destructive'
        />
        <MonthMetric
          icon={GaugeIcon}
          label={content.calendar.metrics.dailyAverage}
          value={formatDuration(stats.averageMinutes)}
          iconClassName='text-info'
        />
      </dl>
    </div>
  );
}

function MonthMetric({ icon: Icon, label, value, iconClassName }: MonthMetricProps) {
  return (
    <div className='flex flex-col items-center gap-1 px-2 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left'>
      <span className='bg-background flex size-8 shrink-0 items-center justify-center rounded-lg shadow-xs'>
        <Icon className={cn('size-4', iconClassName)} />
      </span>
      <div className='flex flex-col'>
        <dt className='text-muted-foreground text-[11px] sm:text-xs'>{label}</dt>
        <dd className='text-sm font-semibold tabular-nums sm:order-first'>{value}</dd>
      </div>
    </div>
  );
}

function summarizeMonth(days: CalendarDayData[]): MonthStats {
  const monthDays = days.filter((day) => !day.isOutside);
  const workingDays = monthDays.filter((day) => day.status !== 'weekend').length;
  const daysOnNorm = monthDays.filter((day) => day.status === 'tracked').length;
  const daysBelowNorm = monthDays.filter((day) => day.status === 'missing').length;
  const loggedMinutes = monthDays.reduce((sum, day) => sum + day.minutes, 0);
  const elapsedWorkingDays = daysOnNorm + daysBelowNorm;

  return {
    loggedMinutes,
    normMinutes: workingDays * DAILY_NORM_MINUTES,
    workingDays,
    daysOnNorm,
    daysBelowNorm,
    averageMinutes: elapsedWorkingDays > 0 ? Math.round(loggedMinutes / elapsedWorkingDays) : 0
  };
}

function buildCalendarDays(month: Date, minutesByDate: Map<string, number>): CalendarDayData[] {
  const interval = { start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) };
  const today = new Date();

  return eachDayOfInterval(interval).map((date) => {
    const key = toDateKey(date);
    const minutes = minutesByDate.get(key) ?? 0;
    const isFuture = date > today;

    return {
      key,
      date,
      dayOfMonth: date.getDate(),
      minutes,
      isFuture,
      isOutside: !isSameMonth(date, month),
      isToday: isToday(date),
      status: resolveDayStatus(date, minutes, isFuture)
    };
  });
}

function resolveDayStatus(date: Date, minutes: number, isFuture: boolean): DayStatus {
  if (isWeekend(date)) {
    return 'weekend';
  }

  if (isFuture) {
    return 'upcoming';
  }

  return minutes >= DAILY_NORM_MINUTES ? 'tracked' : 'missing';
}

const WEEKDAYS = content.calendar.weekdays;

const DAY_BG_CLASS_BY_STATUS: Record<DayStatus, string> = {
  tracked: 'bg-success/10',
  missing: 'bg-destructive/5',
  weekend: 'bg-muted/60',
  upcoming: ''
};

const LEGEND: Array<{ status: DayStatus; label: string }> = [
  { status: 'tracked', label: content.calendar.legend.tracked },
  { status: 'missing', label: content.calendar.legend.missing },
  { status: 'weekend', label: content.calendar.legend.weekend }
];

type DayStatus = 'tracked' | 'missing' | 'weekend' | 'upcoming';

interface MonthStats {
  loggedMinutes: number;
  normMinutes: number;
  workingDays: number;
  daysOnNorm: number;
  daysBelowNorm: number;
  averageMinutes: number;
}

interface MonthMetricProps {
  icon: LucideIcon;
  label: string;
  value: string;
  iconClassName: string;
}

interface TrackerCalendarProps {
  visibleMonth: Date;
  onVisibleMonthChange: (month: Date) => void;
  selectedDate: string;
  onSelectDate: (date: Date) => void;
  minutesByDate: Map<string, number>;
  isLoading: boolean;
}

interface CalendarDayProps {
  day: CalendarDayData;
  isSelected: boolean;
  onSelect: (date: Date) => void;
}

interface CalendarDayData {
  key: string;
  date: Date;
  dayOfMonth: number;
  minutes: number;
  isOutside: boolean;
  isToday: boolean;
  isFuture: boolean;
  status: DayStatus;
}
