import { PageHeader } from '@components/common/page-header/page-header';
import { TrackerWorkspace } from '@components/tracker/tracker-workspace/tracker-workspace';
import { ROUTES } from '@/constants';
import { requireRouteAccess } from '@/lib/api/auth/server';
import content from './content.json';

export default async function TrackerPage() {
  await requireRouteAccess(ROUTES.TRACKER);

  return <TrackerWorkspace header={<PageHeader title={content.title} />} />;
}
