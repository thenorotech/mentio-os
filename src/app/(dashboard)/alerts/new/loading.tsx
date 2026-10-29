import { DetailSkeleton } from '@/components/detail-skeleton';

/** The create form as a full page while it loads. */
export default function Loading() {
  return <DetailSkeleton layout="form" />;
}
