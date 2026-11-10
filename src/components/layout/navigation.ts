import { ChartColumnIcon, ClockIcon, FolderKanbanIcon, UsersIcon, type LucideIcon } from 'lucide-react';

import { ROUTES } from '@/constants';
import content from './content.json';

export const NAV_ITEMS: NavItem[] = [
  { title: content.navigation.tracker, href: ROUTES.TRACKER, icon: ClockIcon },
  { title: content.navigation.crew, href: ROUTES.CREW, icon: UsersIcon },
  { title: content.navigation.reports, href: ROUTES.REPORTS, icon: ChartColumnIcon },
  { title: content.navigation.projects, href: ROUTES.PROJECTS, icon: FolderKanbanIcon }
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}
