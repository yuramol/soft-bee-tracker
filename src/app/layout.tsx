import './globals.css';
import { Geist } from 'next/font/google';
import { Toaster } from '@ui/sonner';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@ui/sidebar';
import { AppSidebar } from '@components/layout/app-sidebar/app-sidebar';
import { cn, getUserAvatarFallback } from '@/lib/utils';
import { getSessionProfile } from '@/lib/api/auth/server';
import { QueryProvider } from '@/providers/query-provider';
import { AvatarDropdown } from '@/components/layout/app-sidebar/avatar-dropdown';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // app chrome only belongs to signed-in routes; /login and friends render bare
  const profile = await getSessionProfile();

  const userAvatar = profile?.avatarUrl ? profile.avatarUrl : undefined

  return (
    <html lang='en' className={cn('font-sans', geist.variable)}>
      <body>
        <QueryProvider>
          {profile ? (
            <SidebarProvider>
              <AppSidebar profile={profile} />
              <SidebarInset>
                <header className='flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4'>
                  <SidebarTrigger />
                  <AvatarDropdown avatarUrl={userAvatar} fallback={getUserAvatarFallback({ firstName: profile.firstName, lastName: profile.lastName})} />
                </header>
                <main className='flex flex-1 flex-col p-6'>{children}</main>
              </SidebarInset>
            </SidebarProvider>
          ) : (
            <main className='flex min-h-screen flex-col items-center justify-center p-6'>{children}</main>
          )}
          <Toaster richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
