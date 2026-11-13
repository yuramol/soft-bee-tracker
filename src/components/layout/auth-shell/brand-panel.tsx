import { ChartColumnIcon, ClockIcon, UsersIcon } from 'lucide-react';

import { LogoMark } from '@/assets/icons/logo-mark';
import { Typography } from '@ui/typography';
import content from '../content.json';

export function BrandPanel() {
  return (
    <aside className='bg-brand-black text-brand-white relative hidden overflow-hidden rounded-3xl p-10 lg:flex lg:flex-col lg:justify-between'>
      <div aria-hidden className='bg-glow absolute inset-0' />
      <div aria-hidden className='bg-grid absolute inset-0 opacity-40' />

      <div className='relative flex items-center gap-3'>
        <div className='bg-electric-green text-brand-black flex size-10 items-center justify-center rounded-full'>
          <LogoMark className='h-5.5 w-auto' />
        </div>
        <span className='text-lg font-semibold tracking-tight'>{content.brandPanel.appName}</span>
      </div>

      <div className='relative flex flex-col gap-8'>
        <Typography variant='h2' className='max-w-md font-semibold tracking-tight'>
          {content.brandPanel.headline} <span className='text-electric-green'>{content.brandPanel.headlineAccent}</span>
        </Typography>
        <ul className='flex flex-col gap-4'>
          {FEATURES.map((feature) => (
            <li key={feature.title} className='flex items-center gap-3'>
              <span className='bg-brand-white/10 ring-brand-white/15 flex size-9 items-center justify-center rounded-xl ring-1'>
                <feature.icon className='text-electric-green size-4' />
              </span>
              <span className='text-brand-white/80 text-sm'>{feature.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className='text-brand-white/50 relative text-xs'>{content.brandPanel.footer}</p>
    </aside>
  );
}

const FEATURES = [
  { title: content.brandPanel.features.logHours, icon: ClockIcon },
  { title: content.brandPanel.features.crew, icon: UsersIcon },
  { title: content.brandPanel.features.reports, icon: ChartColumnIcon }
];
