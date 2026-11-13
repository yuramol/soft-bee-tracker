import type { ReactNode } from 'react';

import { Field, FieldDescription, FieldError, FieldLabel } from '@ui/field';

export function FormField({ label, htmlFor, error, description, className, children }: FormFieldProps) {
  return (
    <Field className={className} data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {description && !error ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[error]} />
    </Field>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: { message?: string };
  description?: string;
  className?: string;
  children: ReactNode;
}
