'use client';

import { format, isValid, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@ui/button';
import { Calendar } from '@ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { cn } from '@/lib/utils';
import content from '../content.json';

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = content.datePicker.placeholder,
  isDisabled = false,
  isInvalid = false,
  minDate
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseDate(value);

  function handleSelect(date: Date | undefined) {
    onChange(date ? format(date, ISO_DATE_FORMAT) : '');
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type='button'
            variant='outline'
            disabled={isDisabled}
            aria-invalid={isInvalid}
            className={cn(
              'h-12 w-full justify-start rounded-lg font-normal focus-visible:ring-1 aria-invalid:ring-1',
              !selectedDate && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon data-icon='inline-start' />
        {selectedDate ? format(selectedDate, 'd MMM yyyy') : placeholder}
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          selected={selectedDate}
          defaultMonth={selectedDate}
          disabled={minDate ? { before: parseISO(minDate) } : undefined}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = parseISO(value);

  return isValid(date) ? date : undefined;
}

const ISO_DATE_FORMAT = 'yyyy-MM-dd';

interface DatePickerProps {
  id?: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  minDate?: string;
}
