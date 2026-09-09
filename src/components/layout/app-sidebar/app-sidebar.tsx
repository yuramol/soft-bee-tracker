'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartColumnIcon, ClockIcon, FolderKanbanIcon, HexagonIcon, UsersIcon, type LucideIcon } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from '@ui/sidebar';
import { NavUser } from '@components/layout/app-sidebar/nav-user';
import { ROUTES } from '@/constants';
import type { UserProfile } from '@/lib/api/auth';

interface AppSidebarProps {
  profile: UserProfile;
}

export function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' tooltip='Soft Bee Tracker' render={<Link href={ROUTES.TRACKER} />}>
              <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
                <HexagonIcon />
              </div>
              <div className='grid flex-1 text-left leading-tight'>
                <span className='truncate font-medium'>Soft Bee</span>
                <span className='text-muted-foreground truncate text-xs'>Tracker</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isNavItemActive(pathname, item.href)}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser profile={profile} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Tracker', href: ROUTES.TRACKER, icon: ClockIcon },
  { title: 'Crew', href: ROUTES.CREW, icon: UsersIcon },
  { title: 'Reports', href: ROUTES.REPORTS, icon: ChartColumnIcon },
  { title: 'Projects', href: ROUTES.PROJECTS, icon: FolderKanbanIcon }
];

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}
