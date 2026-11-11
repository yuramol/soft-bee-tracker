'use client';

import { parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@ui/button';
import { Calendar } from '@ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { findPeriodPreset, formatPeriodShort, resolvePeriodPreset, type ReportRange } from '@/lib/reports';
import { REPORT_PERIODS, type ReportPeriod } from '@/lib/team-report-params';
import { toDateKey } from '@/lib/tracker-days';
import { cn } from '@/lib/utils';
import content from '../content.json';

export function PeriodPicker({ id, value, todayKey, isInvalid, onChange }: PeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  // the first click of a new range; the period changes only once the second click sets the end
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const activePreset = findPeriodPreset(value, todayKey);
  const selected: DateRange = pendingStart ? { from: pendingStart, to: undefined } : { from: parseISO(value.from), to: parseISO(value.to) };

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    setPendingStart(null);
  }

  function handlePresetSelect(preset: ReportPeriod) {
    onChange(resolvePeriodPreset(preset, todayKey));
    handleOpenChange(false);
  }

  function handleDaySelect(_range: DateRange | undefined, clickedDate: Date) {
    if (!pendingStart) {
      setPendingStart(clickedDate);
      return;
    }

    onChange(toOrderedRange(pendingStart, clickedDate));
    setPendingStart(null);
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type='button'
            variant='outline'
            aria-invalid={isInvalid}
            className='h-12 w-full justify-start rounded-lg font-normal focus-visible:ring-1 aria-invalid:ring-1'
          />
        }
      >
        <CalendarIcon data-icon='inline-start' />
        {formatPeriodShort(value)}
      </PopoverTrigger>
      {/* fixed width and six-week grid keep the popover from resizing while a range is picked */}
      <PopoverContent className='w-72 p-2' align='end'>
        <div className='grid grid-cols-2 gap-1'>
          {REPORT_PERIODS.map((preset) => (
            <PresetButton key={preset} preset={preset} isActive={preset === activePreset} onSelect={handlePresetSelect} />
          ))}
        </div>
        <Calendar
          mode='range'
          weekStartsOn={1}
          fixedWeeks
          selected={selected}
          defaultMonth={selected.from}
          onSelect={handleDaySelect}
          className={CALENDAR_CLASS_NAME}
        />
        <p className='text-muted-foreground min-h-8 px-1 text-xs' aria-live='polite'>
          {pendingStart ? content.filters.pickEnd : content.filters.pickStart}
        </p>
      </PopoverContent>
    </Popover>
  );
}

function PresetButton({ preset, isActive, onSelect }: PresetButtonProps) {
  function handleClick() {
    onSelect(preset);
  }

  return (
    <Button
      type='button'
      size='sm'
      variant={isActive ? 'secondary' : 'ghost'}
      aria-pressed={isActive}
      className={cn('justify-start', isActive && 'font-semibold')}
      onClick={handleClick}
    >
      {content.filters.periodPresets[preset]}
    </Button>
  );
}

// lets the end be clicked before the start, e.g. going back from January to December
function toOrderedRange(first: Date, second: Date): ReportRange {
  const [start, end] = first <= second ? [first, second] : [second, first];

  return { from: toDateKey(start), to: toDateKey(end) };
}

// drops the focus ring the calendar draws on a clicked day, but keeps it for keyboard focus
const CALENDAR_CLASS_NAME =
  'mx-auto p-0 [&_button[data-day]]:ring-0 [&_button[data-day]:focus-visible]:ring-[3px] [&_button[data-day]:focus-visible]:ring-ring/50';

interface PeriodPickerProps {
  id: string;
  value: ReportRange;
  todayKey: string;
  isInvalid: boolean;
  onChange: (range: ReportRange) => void;
}

interface PresetButtonProps {
  preset: ReportPeriod;
  isActive: boolean;
  onSelect: (preset: ReportPeriod) => void;
}
