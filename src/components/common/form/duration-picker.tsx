'use client';

import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { CheckIcon, ClockIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Input } from '@ui/input';
import { cn } from '@/lib/utils';
import { formatHoursMinutes, MAX_DURATION_MINUTES, parseHoursMinutes } from '@/lib/format-duration';
import content from '../content.json';

export function DurationPicker({ id, value, onChange, isDisabled = false, isInvalid = false }: DurationPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const hasValue = Number.isFinite(value) && value > 0;
  const displayValue = isEditing || !hasValue ? draft : formatHoursMinutes(value);

  function openList() {
    setActiveIndex(DURATION_OPTIONS.indexOf(value));
    setIsOpen(true);
  }

  function startEditing() {
    setIsOpen(false);
    setDraft(hasValue ? formatHoursMinutes(value) : draft);
    setIsEditing(true);
    inputRef.current?.select();
  }

  function commitDraft() {
    setIsEditing(false);
    onChange(parseHoursMinutes(draft));
  }

  function selectOption(minutes: number) {
    setDraft(formatHoursMinutes(minutes));
    setIsOpen(false);
    onChange(minutes);
  }

  function moveActiveIndex(step: number) {
    const nextIndex = Math.min(DURATION_OPTIONS.length - 1, Math.max(0, activeIndex + step));

    setActiveIndex(nextIndex);
    scrollListToOption(listRef.current, nextIndex, 'nearest');
  }

  function handleInputClick() {
    if (isOpen) {
      startEditing();
    } else if (!isEditing) {
      openList();
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value);
  }

  function handleInputBlur() {
    setIsOpen(false);

    if (isEditing) {
      commitDraft();
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (isEditing) {
      handleEditingKeyDown(event);
    } else if (isOpen) {
      handleListKeyDown(event);
    } else if (event.key === 'ArrowDown' || event.key === 'Enter') {
      event.preventDefault();
      openList();
    }
  }

  function handleEditingKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraft();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsEditing(false);
    }
  }

  function handleListKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveIndex(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectOption(DURATION_OPTIONS[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  }

  const handleListRef = useCallback(
    (element: HTMLUListElement | null) => {
      listRef.current = element;
      scrollListToOption(element, DURATION_OPTIONS.indexOf(value), 'center');
    },
    [value]
  );

  function handleOpenChange(nextOpen: boolean, eventDetails: PopoverPrimitive.Root.ChangeEventDetails) {
    const target = eventDetails.event?.target;

    if (!nextOpen && target instanceof Node && inputRef.current?.contains(target)) {
      return;
    }

    setIsOpen(nextOpen);
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <div className='relative'>
        <ClockIcon aria-hidden className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
        <Input
          ref={inputRef}
          id={id}
          role='combobox'
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${id}-options` : undefined}
          aria-invalid={isInvalid}
          inputMode='numeric'
          autoComplete='off'
          placeholder={content.durationPicker.placeholder}
          readOnly={!isEditing}
          disabled={isDisabled}
          className={cn('pl-9 tabular-nums', !isEditing && 'cursor-pointer')}
          value={displayValue}
          onClick={handleInputClick}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
      </div>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner anchor={inputRef} side='bottom' align='start' sideOffset={4} className='isolate z-50'>
          <PopoverPrimitive.Popup
            initialFocus={false}
            finalFocus={false}
            className='bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-(--anchor-width) origin-(--transform-origin) rounded-xl p-1.5 shadow-md ring-1 outline-hidden duration-100'
          >
            <ul
              ref={handleListRef}
              id={`${id}-options`}
              role='listbox'
              aria-label={content.durationPicker.listLabel}
              className='relative max-h-64 overflow-y-auto'
            >
              {DURATION_OPTIONS.map((minutes, index) => (
                <DurationOption
                  key={minutes}
                  minutes={minutes}
                  isSelected={minutes === value}
                  isActive={index === activeIndex}
                  onSelect={selectOption}
                  onHover={setActiveIndex}
                  index={index}
                />
              ))}
            </ul>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function DurationOption({ minutes, index, isSelected, isActive, onSelect, onHover }: DurationOptionProps) {
  function handleMouseDown(event: React.MouseEvent<HTMLLIElement>) {
    event.preventDefault();
  }

  function handleClick() {
    onSelect(minutes);
  }

  function handleMouseEnter() {
    onHover(index);
  }

  return (
    <li
      role='option'
      aria-selected={isSelected}
      data-active={isActive}
      className='data-[active=true]:bg-accent data-[active=true]:text-accent-foreground relative flex cursor-pointer items-center rounded-lg py-2 pr-9 pl-2.5 text-sm tabular-nums select-none'
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      {formatHoursMinutes(minutes)}
      {isSelected ? <CheckIcon className='text-deep-teal dark:text-electric-green absolute right-2.5 size-4' /> : null}
    </li>
  );
}

function scrollListToOption(list: HTMLUListElement | null, index: number, position: 'center' | 'nearest') {
  const option = index >= 0 ? list?.children[index] : undefined;

  if (!list || !(option instanceof HTMLElement)) {
    return;
  }

  const optionTop = option.offsetTop;
  const optionBottom = optionTop + option.offsetHeight;

  if (position === 'center') {
    list.scrollTop = optionTop - (list.clientHeight - option.offsetHeight) / 2;
  } else if (optionTop < list.scrollTop) {
    list.scrollTop = optionTop;
  } else if (optionBottom > list.scrollTop + list.clientHeight) {
    list.scrollTop = optionBottom - list.clientHeight;
  }
}

const DURATION_STEP_MINUTES = 30;

const DURATION_OPTIONS = Array.from(
  { length: MAX_DURATION_MINUTES / DURATION_STEP_MINUTES },
  (_, index) => (index + 1) * DURATION_STEP_MINUTES
);

interface DurationPickerProps {
  id: string;
  value: number;
  onChange: (minutes: number) => void;
  isDisabled?: boolean;
  isInvalid?: boolean;
}

interface DurationOptionProps {
  minutes: number;
  index: number;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (minutes: number) => void;
  onHover: (index: number) => void;
}
