import { AvatarDropdown } from '@components/layout/app-header/avatar-dropdown';
import { HeaderBrand } from '@components/layout/app-header/header-brand';
import { HeaderNav } from '@components/layout/app-header/header-nav';
import { MobileNav } from '@components/layout/app-header/mobile-nav';
import { ThemeToggle } from '@components/layout/theme-toggle/theme-toggle';
import type { UserProfile } from '@/lib/api/auth';

interface AppHeaderProps {
  profile: UserProfile;
}

export function AppHeader({ profile }: AppHeaderProps) {
  return (
    <header className='glass sticky top-0 z-30 w-full border-b'>
      <div className='mx-auto flex h-14 w-full max-w-[90rem] items-center gap-4 px-4 sm:px-6 lg:px-8'>
        <HeaderBrand />

        <HeaderNav role={profile.role} className='hidden flex-1 justify-center md:flex' />

        <div className='ml-auto flex items-center gap-1 md:ml-0'>
          <ThemeToggle />
          <AvatarDropdown profile={profile} />
          <MobileNav role={profile.role} />
        </div>
      </div>
    </header>
  );
}
