import { cookies } from 'next/headers';
import type { CSSProperties, ReactNode } from 'react';
import { AppSidebar, type Workspace } from '@/components/app-sidebar';
import { CommandMenu } from '@/components/command-menu';
import { ShellContent } from '@/components/shell/shell-content';
import { SiteHeader } from '@/components/shell/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { currentAccount } from '@/auth';
import { accountsEnabled } from '@/lib/accounts';
import { mentio } from '@/lib/mentio';

// Every page reads the workspace live, the sidebar included.
export const dynamic = 'force-dynamic';

/** A thinner collapsed sidebar (2.5rem + the inset gap) than shadcn's 3rem, as Inerpy has it. */
const SHELL_STYLE = { '--sidebar-width-icon': '2.5rem' } as CSSProperties;

/** The workspace for the sidebar. A bad key shows up here first. */
async function workspace(): Promise<Workspace> {
  const who = await Promise.resolve().then(() => mentio().whoami()).catch(() => null);
  return { name: who?.data?.workspace?.name ?? null };
}

/**
 * The dashboard, in Inerpy's shell: the inset sidebar, a rounded canvas with
 * a thin header, the canvas's single scroll surface (the page), and the
 * drawer a list opened over it (@drawer).
 */
export default async function DashboardLayout({ children, drawer }: { children: ReactNode; drawer: ReactNode }) {
  const [ws, jar, account] = await Promise.all([workspace(), cookies(), accountsEnabled() ? currentAccount() : null]);
  const defaultOpen = jar.get('sidebar_state')?.value !== 'false';
  return (
    <SidebarProvider defaultOpen={defaultOpen} className="agora-shell" style={SHELL_STYLE}>
      <AppSidebar workspace={ws} account={account} />
      <SidebarInset className="h-dvh min-w-0 overflow-hidden md:peer-data-[variant=inset]:h-[calc(100svh-1rem)] md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border/60 md:peer-data-[variant=inset]:shadow-md">
        <SiteHeader />
        <ShellContent>{children}</ShellContent>
        {drawer}
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
