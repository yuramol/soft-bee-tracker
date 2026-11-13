import { BrandPanel } from '@components/layout/auth-shell/brand-panel';
import { ThemeToggle } from '@components/layout/theme-toggle/theme-toggle';
import { LogoMark } from '@/assets/icons/logo-mark';
import content from './content.json';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='bg-background grid min-h-screen gap-4 p-4 lg:grid-cols-[1fr_minmax(0,1.1fr)]'>
      <main className='relative flex flex-col'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2.5 lg:invisible'>
            <div className='bg-electric-green text-brand-black flex size-9 items-center justify-center rounded-full'>
              <LogoMark className='h-5 w-auto' />
            </div>
            <span className='font-semibold tracking-tight'>{content.appName}</span>
          </div>
          <ThemeToggle />
        </div>
        <div className='flex flex-1 items-center justify-center px-2 py-10'>
          <div className='animate-in fade-in slide-in-from-bottom-4 w-full max-w-lg duration-500'>{children}</div>
        </div>
      </main>
      <BrandPanel />
    </div>
  );
}
