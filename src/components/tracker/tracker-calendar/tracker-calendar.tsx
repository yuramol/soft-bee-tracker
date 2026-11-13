'use client';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isWeekend,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@ui/button';
import { Skeleton } from '@ui/skeleton';
import { formatClock } from '@/lib/format-duration';
import { formatText } from '@/lib/format-text';
import { DAILY_NORM_MINUTES, toDateKey } from '@/lib/tracker-days';
import { cn } from '@/lib/utils';
import content from '../content.json';

export function TrackerCalendar({
  visibleMonth,
  onVisibleMonthChange,
  selectedDate,
  onSelectDate,
  minutesByDate,
  isLoading,
  hasError
}: TrackerCalendarProps) {
  const days = buildCalendarDays(visibleMonth, minutesByDate, hasError);
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
    <section aria-label={content.calendar.label} className='bg-card flex flex-col gap-4 rounded-2xl border p-4 sm:p-5'>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='font-semibold'>{format(visibleMonth, 'MMMM yyyy')}</h2>
        <div className='flex items-center gap-1'>
          <Button variant='ghost' size='icon-sm' aria-label={content.calendar.previousMonth} onClick={handlePreviousMonthClick}>
            <ChevronLeftIcon />
          </Button>
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
      </div>

      <div className='grid grid-cols-7 gap-1 text-center'>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className='text-muted-foreground py-1 text-[11px] font-medium uppercase'>
            {weekday.slice(0, 2)}
          </span>
        ))}
        {isLoading
          ? Array.from({ length: 35 }, (_, index) => <Skeleton key={index} className='aspect-square rounded-lg' />)
          : days.map((day) => <CalendarDay key={day.key} day={day} isSelected={day.key === selectedDate} onSelect={onSelectDate} />)}
      </div>

      {hasError ? (
        <p role='alert' className='text-destructive text-xs'>
          {content.calendar.error}
        </p>
      ) : null}

      <ul className='text-muted-foreground flex flex-wrap gap-x-4 gap-y-2 border-t pt-3 text-xs'>
        {LEGEND.map((status) => (
          <li key={status} className='flex items-center gap-1.5'>
            <span aria-hidden className={cn('size-3 rounded-[4px]', LEGEND_SWATCH_CLASS[status])} />
            {STATUS_LABEL[status]}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CalendarDay({ day, isSelected, onSelect }: CalendarDayProps) {
  function handleClick() {
    onSelect(day.date);
  }

  const label = [
    format(day.date, 'EEEE, d MMMM'),
    day.status ? STATUS_LABEL[day.status] : null,
    day.minutes > 0 ? formatClock(day.minutes) : null
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type='button'
      disabled={day.isFuture}
      aria-pressed={isSelected}
      aria-label={label}
      data-status={day.status ?? undefined}
      className={cn(
        'relative flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums',
        'focus-visible:ring-ring/50 outline-none focus-visible:ring-3 disabled:cursor-default',
        'text-foreground',
        day.status && DAY_CLASS_BY_STATUS[day.status],
        day.isOutside && 'opacity-35',
        day.isToday && 'ring-foreground ring-1',
        isSelected && 'bg-foreground text-background font-semibold'
      )}
      onClick={handleClick}
    >
      {day.dayOfMonth}
    </button>
  );
}

function buildCalendarDays(month: Date, minutesByDate: Map<string, number>, hasError: boolean): CalendarDayData[] {
  const interval = { start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) };
  const today = startOfDay(new Date());

  return eachDayOfInterval(interval).map((date) => {
    const key = toDateKey(date);
    const minutes = minutesByDate.get(key) ?? 0;
    const isFuture = isAfter(date, today);

    return {
      key,
      date,
      dayOfMonth: date.getDate(),
      minutes,
      isFuture,
      isOutside: !isSameMonth(date, month),
      isToday: isSameDay(date, today),
      status: resolveDayStatus({ date, minutes, isFuture, hasError })
    };
  });
}

function resolveDayStatus({ date, minutes, isFuture, hasError }: DayStatusInput): DayStatus | null {
  if (hasError || isFuture) {
    return null;
  }

  if (isWeekend(date)) {
    return 'weekend';
  }

  return minutes >= DAILY_NORM_MINUTES ? 'tracked' : 'untracked';
}

const WEEKDAYS = content.calendar.weekdays;

const NORM_HOURS = String(DAILY_NORM_MINUTES / 60);

const DAY_CLASS_BY_STATUS: Record<DayStatus, string> = {
  untracked: 'bg-destructive/10 dark:bg-destructive/20',
  weekend: 'bg-yellow-200/30 dark:bg-yellow-200/10',
  tracked: 'bg-deep-teal/10 dark:bg-electric-green/15'
};

const LEGEND_SWATCH_CLASS: Record<DayStatus, string> = {
  untracked: 'bg-destructive/25',
  weekend: 'bg-yellow-200/70 dark:bg-yellow-200/30',
  tracked: 'bg-deep-teal/25 dark:bg-electric-green/30'
};

const STATUS_LABEL: Record<DayStatus, string> = {
  untracked: formatText(content.calendar.legend.untracked, { hours: NORM_HOURS }),
  weekend: content.calendar.legend.weekend,
  tracked: formatText(content.calendar.legend.tracked, { hours: NORM_HOURS })
};

const LEGEND: DayStatus[] = ['untracked', 'tracked', 'weekend'];

type DayStatus = 'untracked' | 'weekend' | 'tracked';

interface DayStatusInput {
  date: Date;
  minutes: number;
  isFuture: boolean;
  hasError: boolean;
}

interface TrackerCalendarProps {
  visibleMonth: Date;
  onVisibleMonthChange: (month: Date) => void;
  selectedDate: string;
  onSelectDate: (date: Date) => void;
  minutesByDate: Map<string, number>;
  isLoading: boolean;
  hasError: boolean;
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
  status: DayStatus | null;
}
