'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The shell's scroll area and the only surface that scrolls (Inerpy's
 * ShellContent). Re-keyed per route, so the scroll resets and
 * `shell-context-enter` fades the new page in (globals.css, @starting-style).
 * Full-height pages use `flex min-h-0 flex-1 flex-col` inside it.
 */
export function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} data-slot="shell-content" className="shell-context-enter flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      <div data-slot="page" className="@container flex min-w-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
