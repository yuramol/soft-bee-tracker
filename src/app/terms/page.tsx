import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

import { ThemeToggle } from '@components/layout/theme-toggle/theme-toggle';
import { LogoMark } from '@/assets/icons/logo-mark';
import { buttonVariants } from '@ui/button';
import { Typography } from '@ui/typography';
import { ROUTES } from '@/constants';
import content from './content.json';

export const metadata: Metadata = {
  title: content.metadataTitle
};

export default function TermsPage() {
  return (
    <div className='bg-background min-h-screen'>
      <header className='glass sticky top-0 z-10 border-b'>
        <div className='mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4'>
          <Link href={ROUTES.LOGIN} className={buttonVariants({ variant: 'ghost' })}>
            <ArrowLeftIcon data-icon='inline-start' />
            {content.backLink}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className='mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:py-14'>
        <section className='bg-brand-black text-brand-white animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-3xl p-8 duration-500 sm:p-10'>
          <div aria-hidden className='bg-glow absolute inset-0' />
          <div className='relative flex flex-col gap-4'>
            <div className='bg-electric-green text-brand-black flex size-10 items-center justify-center rounded-full'>
              <LogoMark className='h-5.5 w-auto' />
            </div>
            <Typography variant='h2' tag='h1' className='font-semibold tracking-tight'>
              {content.title}
            </Typography>
            <p className='text-brand-white/70 max-w-xl text-sm'>{content.intro}</p>
            <p className='text-brand-white/50 text-xs'>{content.lastUpdated}</p>
          </div>
        </section>

        <nav aria-label={content.sectionsNavLabel} className='flex flex-wrap gap-2'>
          {content.sections.map((section, index) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className='bg-muted hover:bg-electric-green/30 rounded-full px-3 py-1.5 text-xs font-medium transition-colors'
            >
              {index + 1}. {section.title}
            </a>
          ))}
        </nav>

        <ol className='flex flex-col gap-4'>
          {content.sections.map((section, index) => (
            <li key={section.id} id={section.id} className='bg-card scroll-mt-20 rounded-2xl border p-6'>
              <h2 className='flex items-baseline gap-3 text-lg font-semibold tracking-tight'>
                <span className='text-deep-teal dark:text-electric-green text-sm tabular-nums'>{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </h2>
              <ul className='text-muted-foreground mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed'>
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <p className='text-muted-foreground text-center text-xs'>{content.footer}</p>
      </main>
    </div>
  );
}
