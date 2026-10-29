import Link from 'next/link';
import type { ReactNode } from 'react';
import { brand } from '@/brand.config';
import { AppSidebar, BrandMark, type Workspace } from '@/components/app-sidebar';
import { CommandMenu } from '@/components/command-menu';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { currentAccount } from '@/auth';
import { accountsEnabled } from '@/lib/accounts';
import { mentio } from '@/lib/mentio';

// Every page reads the workspace live, the sidebar included.
export const dynamic = 'force-dynamic';

/** The workspace for the sidebar. A bad key shows up here first. */
async function workspace(): Promise<Workspace> {
  const who = await Promise.resolve().then(() => mentio().whoami()).catch(() => null);
  return { name: who?.data?.workspace?.name ?? null };
}

/** The dashboard: the sidebar, the page, and the drawer a list opened over it (@drawer). */
export default async function DashboardLayout({ children, drawer }: { children: ReactNode; drawer: ReactNode }) {
  const [ws, account] = await Promise.all([workspace(), accountsEnabled() ? currentAccount() : null]);
  return (
    <SidebarProvider>
      <AppSidebar workspace={ws} account={account} />
      <SidebarInset className="min-w-0">
        <header className="flex h-12 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BrandMark />
            {brand.name}
          </Link>
        </header>
        <main className="@container px-4 py-6 sm:px-6">{children}</main>
        {drawer}
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
