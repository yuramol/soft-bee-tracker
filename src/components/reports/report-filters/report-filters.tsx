'use client';

import { FileDownIcon, Loader2Icon, RotateCcwIcon } from 'lucide-react';
import { useState } from 'react';

import { PeriodPicker } from '@components/reports/period-picker/period-picker';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { formatText } from '@/lib/format-text';
import type { ReportExportFormat } from '@/lib/report-export';
import {
  getDefaultFilters,
  isSameFilters,
  isValidRange,
  type ReportFilters as ReportFiltersValue,
  type ReportOption,
  type ReportOptions,
  type ReportRange
} from '@/lib/reports';
import content from '../content.json';

export function ReportFilters({ applied, options, labels, todayKey, isPending, onApply, onReset, onExport }: ReportFiltersProps) {
  const [draft, setDraft] = useState<ReportFiltersValue>(applied);
  const defaults = getDefaultFilters(todayKey);
  const isRangeValid = isValidRange(draft);
  const isDirty = !isSameFilters(draft, applied);
  const canReset = !isSameFilters(draft, defaults) || !isSameFilters(applied, defaults);

  function handlePeriodChange(range: ReportRange) {
    setDraft((current) => ({ ...current, ...range }));
  }

  function handleProjectsChange(projectIds: string[]) {
    setDraft((current) => ({ ...current, projectIds }));
  }

  function handlePeopleChange(memberIds: string[]) {
    setDraft((current) => ({ ...current, memberIds }));
  }

  function handleAbsenceChange(checked: boolean) {
    setDraft((current) => ({ ...current, showAbsence: checked }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isRangeValid) {
      onApply(draft);
    }
  }

  // clears unapplied changes too; the report itself reloads only if applied filters differ
  function handleResetClick() {
    setDraft(defaults);
    onReset();
  }

  function handlePdfClick() {
    onExport('pdf');
  }

  function handleCsvClick() {
    onExport('csv');
  }

  return (
    <form aria-label={content.filters.label} className='flex flex-col gap-5' onSubmit={handleSubmit}>
      <Field data-invalid={!isRangeValid || undefined}>
        <FieldLabel htmlFor='reportPeriod'>{content.filters.period}</FieldLabel>
        <PeriodPicker id='reportPeriod' value={draft} todayKey={todayKey} isInvalid={!isRangeValid} onChange={handlePeriodChange} />
        {isRangeValid ? null : <FieldError>{content.filters.periodTooLong}</FieldError>}
      </Field>

      <MultiSelectField
        id='reportProjects'
        label={content.filters.projects}
        allLabel={labels.allProjects}
        value={draft.projectIds}
        options={options.projects}
        onChange={handleProjectsChange}
      />

      <MultiSelectField
        id='reportPeople'
        label={content.filters.people}
        allLabel={labels.allPeople}
        value={draft.memberIds}
        options={options.people}
        isDisabled={!options.canChoosePeople}
        hint={options.canChoosePeople ? undefined : content.filters.onlyMeHint}
        onChange={handlePeopleChange}
      />

      <Field orientation='horizontal'>
        <Checkbox id='reportShowAbsence' checked={draft.showAbsence} onCheckedChange={handleAbsenceChange} />
        <FieldLabel htmlFor='reportShowAbsence' className='font-normal'>
          {content.filters.showAbsence}
        </FieldLabel>
      </Field>

      <div className='flex flex-col gap-3'>
        <Button type='submit' size='lg' disabled={isPending || !isRangeValid} className='w-full'>
          {isPending ? <Loader2Icon data-icon='inline-start' className='animate-spin' /> : null}
          {isPending ? content.filters.applying : content.filters.apply}
        </Button>
        {canReset ? (
          <Button type='button' variant='ghost' disabled={isPending} className='w-full' onClick={handleResetClick}>
            <RotateCcwIcon data-icon='inline-start' />
            {content.filters.reset}
          </Button>
        ) : null}
        {isDirty && !isPending ? <p className='text-muted-foreground text-xs'>{content.filters.unapplied}</p> : null}
        <div className='grid grid-cols-2 gap-3'>
          <Button type='button' variant='outline' disabled={isPending} onClick={handlePdfClick}>
            <FileDownIcon data-icon='inline-start' />
            {content.export.pdf}
          </Button>
          <Button type='button' variant='outline' disabled={isPending} onClick={handleCsvClick}>
            <FileDownIcon data-icon='inline-start' />
            {content.export.csv}
          </Button>
        </div>
      </div>
    </form>
  );
}

function MultiSelectField({ id, label, allLabel, value, options, isDisabled = false, hint, onChange }: MultiSelectFieldProps) {
  const namesById = new Map(options.map((option) => [option.id, option.name]));

  function renderValue(selected: string[]) {
    const names = selected.map((selectedId) => namesById.get(selectedId)).filter((name) => name !== undefined);

    if (names.length === 0) {
      return allLabel;
    }

    return names.length === 1 ? names[0] : formatText(content.filters.selectedCount, { first: names[0], count: names.length - 1 });
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select<string, true> multiple value={value} onValueChange={onChange} disabled={isDisabled || options.length === 0}>
        <SelectTrigger id={id} className='w-full'>
          <SelectValue>{renderValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  );
}

interface ReportFiltersProps {
  applied: ReportFiltersValue;
  options: ReportOptions;
  labels: { allProjects: string; allPeople: string };
  todayKey: string;
  isPending: boolean;
  onApply: (filters: ReportFiltersValue) => void;
  onReset: () => void;
  onExport: (format: ReportExportFormat) => void;
}

interface MultiSelectFieldProps {
  id: string;
  label: string;
  allLabel: string;
  value: string[];
  options: ReportOption[];
  isDisabled?: boolean;
  hint?: string;
  onChange: (value: string[]) => void;
}
