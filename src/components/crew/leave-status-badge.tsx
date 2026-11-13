import { Badge } from '@ui/badge';
import type { LeaveStatus } from '@/lib/api/leave';
import content from './content.json';

export function LeaveStatusBadge({ status }: LeaveStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANT[status]}>{content.leave.status[status]}</Badge>;
}

const STATUS_VARIANT: Record<LeaveStatus, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'secondary'
};

interface LeaveStatusBadgeProps {
  status: LeaveStatus;
}
