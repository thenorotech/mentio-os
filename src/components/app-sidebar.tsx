'use client';

/**
 * The navigation, drawn on shadcn's Sidebar: the
 * brand at the top, one flat list (an item with children opens a sub-list
 * under a line), the docs in a tinted block at the foot and
 * the workspace under them. On a phone it becomes a drawer.
 */
import { ChevronDown, ChevronsUpDown, LogOut, Search, Settings, SunMoon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { brand } from '@/brand.config';
import { openCommandMenu } from '@/components/command-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { signOut } from '@/app/login/actions';
import { DOCS, NAV } from '@/lib/nav';
import { cn } from '@/lib/utils';

export type Workspace = { name: string | null };
/** The signed-in account (src/auth.ts), or null when sign-in is off. */
export type SignedInAccount = { name: string; email: string };

export function BrandMark({ className }: { className?: string }) {
  return brand.logo ? (
    // A file under public/, any size or format, so a plain img rather than next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logo} alt="" className={cn('size-6 rounded-md object-contain', className)} />
  ) : (
    <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground', className)}>{brand.name.slice(0, 1)}</span>
  );
}

const ROW = 'h-9 gap-2.5 px-3 text-muted-foreground data-active:text-sidebar-accent-foreground';

export function AppSidebar({ workspace, account = null }: { workspace: Workspace; account?: SignedInAccount | null }) {
  const path = usePathname();
  const { theme, setTheme } = useTheme();
  const isActive = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));

  return (
    <Sidebar>
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-5">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="truncate font-semibold tracking-tight">{brand.name}</span>
        </Link>
      </SidebarHeader>

      <div className="px-3 pt-3">
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-background font-normal text-muted-foreground" onClick={openCommandMenu}>
          <Search /> Buscar…
          <KbdGroup className="ml-auto">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </Button>
      </div>
      <SidebarContent className="p-3">
        <SidebarMenu className="gap-1">
          {NAV.map((item) =>
            item.children ? (
              <Collapsible key={item.label} defaultOpen render={<SidebarMenuItem />}>
                <SidebarMenuButton render={<Link href={item.href} />} className={ROW}>
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
                <CollapsibleTrigger render={<SidebarMenuAction className="top-2 data-[panel-open]:[&>svg]:rotate-0 [&>svg]:-rotate-90 [&>svg]:transition-transform" />}>
                  <ChevronDown />
                  <span className="sr-only">Alternar {item.label}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="mt-0.5 mr-0 ml-5 gap-0.5 border-sidebar-border pr-0 pl-2">
                    {item.children.map((child) => (
                      <SidebarMenuSubItem key={child.href}>
                        <SidebarMenuSubButton render={<Link href={child.href} />} isActive={isActive(child.href)} className={cn(ROW, 'h-9')}>
                          <child.icon className="text-current!" />
                          <span>{child.label}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive(item.href)} className={ROW}>
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="gap-0 p-0">
        <div className="border-t border-sidebar-border bg-sidebar-accent px-3 py-1.5">
          <div className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium text-foreground">
            <DOCS.icon className="size-4" />
            <span className="flex-1">{DOCS.label}</span>
          </div>
        </div>
        <div className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:bg-sidebar-accent data-popup-open:bg-sidebar-accent">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{(workspace.name ?? brand.name).slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-medium">{workspace.name ?? brand.name}</span>
                <span className="truncate text-xs text-muted-foreground">{account?.email ?? 'Espacio de trabajo'}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={6} className="w-56">
              <DropdownMenuItem render={<Link href="/settings/company" />}>
                <Settings /> Ajustes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <SunMoon /> Tema
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={(value: string) => setTheme(value)}>
                    <DropdownMenuRadioItem value="light">Claro</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">Oscuro</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">Sistema</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {account ? (
                <>
                  <DropdownMenuSeparator />
                  <div className="grid px-2 py-1.5 leading-tight">
                    <span className="truncate text-sm font-medium">{account.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{account.email}</span>
                  </div>
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut /> Cerrar sesión
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
