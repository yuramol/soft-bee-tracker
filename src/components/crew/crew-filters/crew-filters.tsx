'use client';

import { SearchIcon } from 'lucide-react';

import { IconInput } from '@components/common/form/icon-input';
import { ROLE_OPTIONS } from '@components/crew/role-badge';
import { Field, FieldLabel } from '@ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import type { UserRole } from '@/lib/api/auth';
import { ALL_FILTER, type CrewFilters as CrewFiltersValue } from '@/lib/crew';
import type { CrewStatus } from '@/mocks/crew.mock';
import content from '../content.json';

export function CrewFilters({ filters, positions, onChange }: CrewFiltersProps) {
  const positionOptions = [{ value: ALL_FILTER, label: content.filters.allPositions }, ...positions.map(toOption)];

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...filters, query: event.target.value });
  }

  function handleRoleChange(value: CrewFiltersValue['role'] | null) {
    onChange({ ...filters, role: value ?? ALL_FILTER });
  }

  function handlePositionChange(value: string | null) {
    onChange({ ...filters, position: value ?? ALL_FILTER });
  }

  function handleStatusChange(value: CrewFiltersValue['status'] | null) {
    onChange({ ...filters, status: value ?? ALL_FILTER });
  }

  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]'>
      <Field className='sm:col-span-2 xl:col-span-1'>
        <FieldLabel htmlFor='crewSearch'>{content.filters.searchLabel}</FieldLabel>
        <IconInput
          id='crewSearch'
          type='search'
          icon={SearchIcon}
          placeholder={content.filters.searchPlaceholder}
          value={filters.query}
          onChange={handleQueryChange}
        />
      </Field>

      <FilterSelect
        id='crewRole'
        label={content.filters.roleLabel}
        value={filters.role}
        options={ROLE_FILTER_OPTIONS}
        onChange={handleRoleChange}
      />
      <FilterSelect
        id='crewPosition'
        label={content.filters.positionLabel}
        value={filters.position}
        options={positionOptions}
        onChange={handlePositionChange}
      />
      <FilterSelect
        id='crewStatus'
        label={content.filters.statusLabel}
        value={filters.status}
        options={STATUS_FILTER_OPTIONS}
        onChange={handleStatusChange}
      />
    </div>
  );
}

function FilterSelect<T extends string>({ id, label, value, options, onChange }: FilterSelectProps<T>) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select<T> value={value} onValueChange={onChange} items={options}>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function toOption(value: string): FilterOption<string> {
  return { value, label: value };
}

const ROLE_FILTER_OPTIONS: Array<FilterOption<UserRole | typeof ALL_FILTER>> = [
  { value: ALL_FILTER, label: content.filters.allRoles },
  ...ROLE_OPTIONS
];

const STATUS_FILTER_OPTIONS: Array<FilterOption<CrewStatus | typeof ALL_FILTER>> = [
  { value: ALL_FILTER, label: content.filters.allStatuses },
  { value: 'active', label: content.status.active },
  { value: 'pending', label: content.status.pending },
  { value: 'blocked', label: content.status.blocked }
];

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface CrewFiltersProps {
  filters: CrewFiltersValue;
  positions: string[];
  onChange: (filters: CrewFiltersValue) => void;
}

interface FilterSelectProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: Array<FilterOption<T>>;
  onChange: (value: T | null) => void;
}
