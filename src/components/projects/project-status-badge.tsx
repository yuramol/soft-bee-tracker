import { Badge } from '@ui/badge';
import type { ProjectStatus } from '@/lib/api/projects';
import content from './content.json';

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANT[status]}>{content.status[status]}</Badge>;
}

const STATUS_VARIANT: Record<ProjectStatus, 'success' | 'secondary'> = {
  active: 'success',
  archived: 'secondary'
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}
