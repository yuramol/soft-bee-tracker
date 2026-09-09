import * as React from 'react';

import { useProjectsStore } from '@/lib/api/projects';

export function useUserProjectsList() {
  const userProjects = useProjectsStore((state) => state.userProjects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const error = useProjectsStore((state) => state.error);
  const getUserProjects = useProjectsStore((state) => state.getUserProjects);

  React.useEffect(() => {
    void getUserProjects().catch(() => undefined);
  }, [getUserProjects]);

  return {
    userProjects,
    isLoading,
    error
  };
}
