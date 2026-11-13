'use client';

import { format, isValid, parseISO } from 'date-fns';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@ui/button';
import { Calendar } from '@ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { formatText } from '@/lib/format-text';
import { getYearPage, getYearPageStart, isMonthAfter, YEARS_PER_PAGE } from '@/lib/staged-date';
import { cn } from '@/lib/utils';
import content from '../content.json';

// Picks a date in three steps — year, month, day — which is far quicker than
// paging month by month for dates years in the past (start dates, birthdays)
export function StagedDatePicker({
  id,
  value,
  onChange,
  placeholder = content.datePicker.placeholder,
  maxDate,
  isDisabled = false,
  isInvalid = false,
  className
}: StagedDatePickerProps) {
  const selectedDate = parseDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<PickerView>('years');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(0);
  const [yearPageStart, setYearPageStart] = useState(() => getYearPageStart(new Date().getFullYear()));

  function handleOpenChange(open: boolean) {
    if (open) {
      // reopening starts from the chosen day, or from the year list when nothing is set
      const anchor = selectedDate ?? new Date();
      setView(selectedDate ? 'days' : 'years');
      setViewYear(anchor.getFullYear());
      setViewMonth(anchor.getMonth());
      setYearPageStart(getYearPageStart(anchor.getFullYear()));
    }

    setIsOpen(open);
  }

  function handleYearSelect(year: number) {
    setViewYear(year);
    setView('months');
  }

  function handleMonthSelect(month: number) {
    setViewMonth(month);
    setView('days');
  }

  function handleDaySelect(date: Date | undefined) {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  }

  function handleMonthChange(date: Date) {
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  }

  function handleShowYears() {
    setYearPageStart(getYearPageStart(viewYear));
    setView('years');
  }

  function handleShowMonths() {
    setView('months');
  }

  function handlePrevious() {
    if (view === 'years') {
      setYearPageStart(yearPageStart - YEARS_PER_PAGE);
    } else if (view === 'months') {
      setViewYear(viewYear - 1);
    } else {
      handleMonthChange(new Date(viewYear, viewMonth - 1, 1));
    }
  }

  function handleNext() {
    if (view === 'years') {
      setYearPageStart(yearPageStart + YEARS_PER_PAGE);
    } else if (view === 'months') {
      setViewYear(viewYear + 1);
    } else {
      handleMonthChange(new Date(viewYear, viewMonth + 1, 1));
    }
  }

  const maxYear = maxDate?.getFullYear();
  const isNextDisabled =
    maxDate !== undefined &&
    (view === 'years'
      ? yearPageStart + YEARS_PER_PAGE > (maxYear ?? 0)
      : view === 'months'
        ? viewYear + 1 > (maxYear ?? 0)
        : isMonthAfter(viewYear, viewMonth + 1, maxDate));

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type='button'
            variant='outline'
            disabled={isDisabled}
            aria-invalid={isInvalid}
            className={cn('w-full justify-start font-normal', !selectedDate && 'text-muted-foreground', className)}
          />
        }
      >
        <CalendarIcon data-icon='inline-start' />
        {selectedDate ? format(selectedDate, 'd MMMM yyyy') : placeholder}
      </PopoverTrigger>
      <PopoverContent className='w-72 p-3' align='start'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between gap-1'>
            <Button type='button' variant='ghost' size='icon-sm' aria-label={content.stagedDatePicker.previous} onClick={handlePrevious}>
              <ChevronLeftIcon />
            </Button>
            <HeaderLabel
              view={view}
              yearPageStart={yearPageStart}
              viewYear={viewYear}
              viewMonth={viewMonth}
              onShowYears={handleShowYears}
              onShowMonths={handleShowMonths}
            />
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              aria-label={content.stagedDatePicker.next}
              disabled={isNextDisabled}
              onClick={handleNext}
            >
              <ChevronRightIcon />
            </Button>
          </div>

          {view === 'years' ? (
            <OptionGrid
              options={getYearPage(yearPageStart).map((year) => ({
                value: year,
                label: String(year),
                isSelected: selectedDate?.getFullYear() === year,
                isDisabled: maxYear !== undefined && year > maxYear
              }))}
              onSelect={handleYearSelect}
            />
          ) : null}

          {view === 'months' ? (
            <OptionGrid
              options={MONTH_INDEXES.map((month) => ({
                value: month,
                label: format(new Date(2000, month, 1), 'MMM'),
                isSelected: selectedDate?.getFullYear() === viewYear && selectedDate.getMonth() === month,
                isDisabled: isMonthAfter(viewYear, month, maxDate)
              }))}
              onSelect={handleMonthSelect}
            />
          ) : null}

          {view === 'days' ? (
            <Calendar
              mode='single'
              selected={selectedDate}
              month={new Date(viewYear, viewMonth, 1)}
              onMonthChange={handleMonthChange}
              onSelect={handleDaySelect}
              disabled={maxDate ? { after: maxDate } : undefined}
              hideNavigation
              showOutsideDays={false}
              className='mx-auto p-0'
              classNames={{ month_caption: 'hidden' }}
            />
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HeaderLabel({ view, yearPageStart, viewYear, viewMonth, onShowYears, onShowMonths }: HeaderLabelProps) {
  if (view === 'years') {
    return (
      <span className='text-sm font-medium tabular-nums'>
        {formatText(content.stagedDatePicker.yearRange, { from: yearPageStart, to: yearPageStart + YEARS_PER_PAGE - 1 })}
      </span>
    );
  }

  // the label steps back up a level, so a wrong year or month is one click away
  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className='font-medium tabular-nums'
      aria-label={view === 'months' ? content.stagedDatePicker.chooseYear : content.stagedDatePicker.chooseMonth}
      onClick={view === 'months' ? onShowYears : onShowMonths}
    >
      {view === 'months' ? viewYear : format(new Date(viewYear, viewMonth, 1), 'MMMM yyyy')}
    </Button>
  );
}

function OptionGrid({ options, onSelect }: OptionGridProps) {
  return (
    <div className='grid grid-cols-3 gap-1.5'>
      {options.map((option) => (
        <OptionButton key={option.value} option={option} onSelect={onSelect} />
      ))}
    </div>
  );
}

function OptionButton({ option, onSelect }: OptionButtonProps) {
  function handleClick() {
    onSelect(option.value);
  }

  return (
    <Button
      type='button'
      variant={option.isSelected ? 'default' : 'ghost'}
      disabled={option.isDisabled}
      aria-pressed={option.isSelected}
      className='h-10 tabular-nums'
      onClick={handleClick}
    >
      {option.label}
    </Button>
  );
}

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = parseISO(value);

  return isValid(date) ? date : undefined;
}

const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);

type PickerView = 'years' | 'months' | 'days';

interface StagedDatePickerProps {
  id?: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  maxDate?: Date;
  isDisabled?: boolean;
  isInvalid?: boolean;
  className?: string;
}

interface HeaderLabelProps {
  view: PickerView;
  yearPageStart: number;
  viewYear: number;
  viewMonth: number;
  onShowYears: () => void;
  onShowMonths: () => void;
}

interface PickerOption {
  value: number;
  label: string;
  isSelected: boolean;
  isDisabled: boolean;
}

interface OptionGridProps {
  options: PickerOption[];
  onSelect: (value: number) => void;
}

interface OptionButtonProps {
  option: PickerOption;
  onSelect: (value: number) => void;
}
