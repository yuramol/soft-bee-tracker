'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { getFullName } from '@/lib/crew';
import type { ProjectPerson } from '@/lib/api/users';

export function ManagerSelect({ id, value, candidates, placeholder, isDisabled, isInvalid, onChange }: ManagerSelectProps) {
  const options = candidates.map((member) => ({ value: member.id, label: getFullName(member) }));
  const labelsById = new Map(options.map((option) => [option.value, option.label]));

  // never fall back to showing a raw id when the value isn't among the options
  function renderValue(selected: string | null) {
    const label = selected ? labelsById.get(selected) : undefined;

    return label ?? <span className='text-muted-foreground'>{placeholder}</span>;
  }

  function handleValueChange(nextValue: string | null) {
    if (nextValue) {
      onChange(nextValue);
    }
  }

  return (
    <Select<string> value={value || null} onValueChange={handleValueChange} items={options} disabled={isDisabled}>
      <SelectTrigger id={id} className='w-full' aria-invalid={isInvalid}>
        <SelectValue>{renderValue}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ManagerSelectProps {
  id: string;
  value: string;
  candidates: ProjectPerson[];
  placeholder: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  onChange: (value: string) => void;
}
