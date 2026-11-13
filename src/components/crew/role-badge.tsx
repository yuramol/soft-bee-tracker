import { Badge } from '@ui/badge';
import type { UserRole } from '@/lib/api/auth';
import content from './content.json';

export function RoleBadge({ role }: { role: UserRole }) {
  const config = ROLE_BADGES[role];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

const ROLE_BADGES: Record<UserRole, { label: string; variant: 'brand' | 'info' | 'secondary'; className?: string }> = {
  admin: { label: content.roles.admin, variant: 'brand' },
  manager: { label: content.roles.manager, variant: 'info', className: 'text-brand-black dark:text-foreground' },
  worker: { label: content.roles.worker, variant: 'secondary' }
};

export const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'worker', label: content.roles.worker },
  { value: 'manager', label: content.roles.manager },
  { value: 'admin', label: content.roles.admin }
];
