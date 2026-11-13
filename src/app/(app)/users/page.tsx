import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants';

export default function UsersPage() {
  redirect(ROUTES.CREW);
}
