'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import type { Project } from '@/lib/api/projects';
import content from '../content.json';

export function ProjectSelect({ id, value, onChange, projects, isLoading, isDisabled = false, isInvalid = false }: ProjectSelectProps) {
  function handleValueChange(nextValue: string | null) {
    if (nextValue) {
      onChange(nextValue);
    }
  }

  const placeholder = isLoading
    ? content.projectSelect.loading
    : projects.length === 0
      ? content.projectSelect.empty
      : content.projectSelect.placeholder;
  const projectItems = projects.map((project) => ({ value: project.id, label: project.name }));

  return (
    <Select value={value || null} onValueChange={handleValueChange} items={projectItems} disabled={isDisabled || isLoading}>
      <SelectTrigger id={id} className='w-full' aria-invalid={isInvalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ProjectSelectProps {
  id: string;
  value: string;
  onChange: (projectId: string) => void;
  projects: Project[];
  isLoading: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
}
