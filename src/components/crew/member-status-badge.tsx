import { Badge } from '@ui/badge';
import type { CrewStatus } from '@/lib/api/crew';
import content from './content.json';

export function MemberStatusBadge({ status }: MemberStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANT[status]}>{content.status[status]}</Badge>;
}

const STATUS_VARIANT: Record<CrewStatus, 'warning' | 'success' | 'destructive'> = {
  pending: 'warning',
  active: 'success',
  blocked: 'destructive'
};

interface MemberStatusBadgeProps {
  status: CrewStatus;
}
