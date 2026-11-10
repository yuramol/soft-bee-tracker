import { redirect } from 'next/navigation';

import { PageHeader } from '@components/common/page-header/page-header';
import { TrackerWorkspace } from '@components/tracker/tracker-workspace/tracker-workspace';
import { ROUTES } from '@/constants';
import { getSessionProfile } from '@/lib/api/auth/server';
import content from './content.json';

export default async function TrackerPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  return <TrackerWorkspace header={<PageHeader title={content.title} />} />;
}
