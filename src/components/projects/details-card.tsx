import type { ReactNode } from 'react';

export function DetailsCard({ title, titleId, action, children }: DetailsCardProps) {
  return (
    <section aria-labelledby={titleId} className='bg-card flex min-w-0 flex-col gap-4 rounded-2xl border p-5 sm:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 id={titleId} className='text-xl font-semibold'>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

interface DetailsCardProps {
  title: string;
  titleId: string;
  action?: ReactNode;
  children: ReactNode;
}
