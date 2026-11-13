'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import type { ProjectPerson } from '@/lib/api/users';
import { getFullName } from '@/lib/crew';
import { formatText } from '@/lib/format-text';
import content from './content.json';

export function ProjectManagersSelect({ id, value, candidates, isInvalid, onChange }: ProjectManagersSelectProps) {
  const namesById = new Map(candidates.map((person) => [person.id, getFullName(person)]));

  function renderValue(selected: string[]) {
    const names = selected.flatMap((selectedId) => namesById.get(selectedId) ?? []);

    if (names.length === 0) {
      return content.create.managersPlaceholder;
    }

    return names.length === 1 ? names[0] : formatText(content.create.managersSelected, { first: names[0], count: names.length - 1 });
  }

  return (
    <Select<string, true> multiple value={value} onValueChange={onChange} disabled={candidates.length === 0}>
      <SelectTrigger id={id} className='w-full' aria-invalid={isInvalid}>
        <SelectValue>{renderValue}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {candidates.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            {getFullName(person)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ProjectManagersSelectProps {
  id: string;
  value: string[];
  candidates: ProjectPerson[];
  isInvalid?: boolean;
  onChange: (value: string[]) => void;
}
