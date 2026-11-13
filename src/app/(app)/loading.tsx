import { PageHeaderSkeleton, SkeletonRegion } from '@components/common/loading-state/skeletons';
import { Skeleton } from '@ui/skeleton';

// Fallback for routes without their own loading.tsx
export default function AppLoading() {
  return (
    <SkeletonRegion className='flex flex-col gap-8'>
      <PageHeaderSkeleton />
      <Skeleton className='h-96 rounded-2xl' />
    </SkeletonRegion>
  );
}
