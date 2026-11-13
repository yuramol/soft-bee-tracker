'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { getFullName } from '@/lib/crew';
import type { CrewMember } from '@/mocks/crew.mock';

export function ManagerSelect({ id, value, candidates, placeholder, isDisabled, isInvalid, onChange }: ManagerSelectProps) {
  const options = candidates.map((member) => ({ value: member.id, label: getFullName(member) }));

  function handleValueChange(nextValue: string | null) {
    if (nextValue) {
      onChange(nextValue);
    }
  }

  return (
    <Select<string> value={value || null} onValueChange={handleValueChange} items={options} disabled={isDisabled}>
      <SelectTrigger id={id} className='w-full' aria-invalid={isInvalid}>
        <SelectValue placeholder={placeholder} />
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
  candidates: CrewMember[];
  placeholder: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  onChange: (value: string) => void;
}
