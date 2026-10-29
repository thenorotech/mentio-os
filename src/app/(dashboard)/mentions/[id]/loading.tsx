import { DetailSkeleton } from '@/components/detail-skeleton';

/** The mention as a full page while it loads (the list's skeleton is for the list). */
export default function Loading() {
  return <DetailSkeleton layout="split" />;
}
