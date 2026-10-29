import type { ReactNode } from 'react';
import { Tabs } from '@/components/ui/client';
import { SETTINGS } from '@/lib/nav';

/** Every settings page: a tab per settings page, then the page (the shell's header carries the breadcrumb). */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Tabs items={SETTINGS.map((item) => ({ href: item.href, label: item.label }))} />
      {children}
    </div>
  );
}
