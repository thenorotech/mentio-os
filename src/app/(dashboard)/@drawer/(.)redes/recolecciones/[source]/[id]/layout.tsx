import type { ReactNode } from 'react';
import { RouteDrawer } from '@/components/route-drawer';

/** The drawer itself, kept open while the run loads and when it arrives. */
export default function DrawerLayout({ children }: { children: ReactNode }) {
  return <RouteDrawer title="Recolección" wide>{children}</RouteDrawer>;
}
