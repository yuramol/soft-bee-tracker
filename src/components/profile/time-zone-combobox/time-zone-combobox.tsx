'use client';

import { Combobox } from '@base-ui/react/combobox';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Input } from '@ui/input';
import { buildTimeZoneOptions, getRuntimeTimeZones, toTimeZoneOption, type TimeZoneOption } from '@/lib/time-zones';
import content from '../content.json';

export function TimeZoneCombobox({ id, value, detectedTimeZone, isDisabled, isInvalid, onChange }: TimeZoneComboboxProps) {
  // offsets are taken as of opening the page
  const [now] = useState(() => new Date());
  const [initialValue] = useState(value);
  // ~420 zones; rebuilt only when the device zone arrives after hydration, which keeps it
  // in the list even when the runtime spells it differently (Europe/Kyiv vs Europe/Kiev)
  const options = useMemo(
    () => buildTimeZoneOptions(getRuntimeTimeZones(), [initialValue, detectedTimeZone], now),
    [initialValue, detectedTimeZone, now]
  );
  const selected = value ? (options.find((option) => option.value === value) ?? toTimeZoneOption(value, now)) : null;

  function handleValueChange(option: TimeZoneOption | null) {
    if (option) {
      onChange(option.value);
    }
  }

  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={handleValueChange}
      itemToStringLabel={getOptionLabel}
      isItemEqualToValue={isSameOption}
      disabled={isDisabled}
    >
      <div className='relative'>
        <Combobox.Input
          render={
            <Input id={id} aria-invalid={isInvalid} placeholder={content.form.timeZonePlaceholder} className='pr-9' autoComplete='off' />
          }
        />
        <Combobox.Trigger
          aria-label={content.form.timeZoneOpen}
          className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md outline-none'
        >
          <ChevronsUpDownIcon className='size-4' />
        </Combobox.Trigger>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className='isolate z-50'>
          <Combobox.Popup className='bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 max-h-[min(20rem,var(--available-height))] w-(--anchor-width) min-w-64 origin-(--transform-origin) overflow-y-auto rounded-xl p-1.5 shadow-md ring-1 duration-100'>
            <Combobox.Empty className='text-muted-foreground px-2.5 py-2 text-sm empty:hidden'>{content.form.timeZoneEmpty}</Combobox.Empty>
            <Combobox.List>
              {(option: TimeZoneOption) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  className='data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-9 pl-2.5 text-sm outline-none select-none'
                >
                  <span className='min-w-0 flex-1 truncate'>{option.value.replaceAll('_', ' ')}</span>
                  <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>{option.offset}</span>
                  <Combobox.ItemIndicator className='absolute right-2.5 flex size-4 items-center justify-center'>
                    <CheckIcon className='size-4' />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function getOptionLabel(option: TimeZoneOption): string {
  return option.label;
}

function isSameOption(option: TimeZoneOption, value: TimeZoneOption): boolean {
  return option.value === value.value;
}

interface TimeZoneComboboxProps {
  id: string;
  value: string;
  detectedTimeZone: string | null;
  isDisabled: boolean;
  isInvalid: boolean;
  onChange: (timeZone: string) => void;
}
