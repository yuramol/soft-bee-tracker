import { UserProjectsList } from '@components/dashboard/user-projects-list';
import { CreateProjectDialog } from '@components/projects/create-project-dialog/create-project-dialog';

export default function ProjectsPage() {
  return (
    <div className='mx-auto flex w-full max-w-lg flex-col gap-6'>
      <div className='flex items-center justify-between gap-4'>
        <h1 className='text-3xl font-semibold tracking-tight'>Projects</h1>
        <CreateProjectDialog />
      </div>
      <UserProjectsList />
    </div>
  );
}
