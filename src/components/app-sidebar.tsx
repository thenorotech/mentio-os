'use client';

/**
 * The navigation, in Inerpy's shell: shadcn's Sidebar as an inset panel
 * that collapses to icons (tooltips name them), the brand and search at the
 * top, the pages in labeled groups (src/lib/nav.ts), the workspace at the
 * foot. On a phone it becomes a drawer.
 */
import { ChevronsUpDown, LogOut, Search, Settings, SunMoon } from 'lucide-react';
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { signOut } from '@/app/login/actions';
import { NAV_GROUPS } from '@/lib/nav';
import { cn } from '@/lib/utils';

export type Workspace = { name: string | null };

export function BrandMark({ className }: { className?: string }) {
  return brand.logo ? (
    // A file under public/, any size or format, so a plain img rather than next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logo} alt="" className={cn('size-6 rounded-md object-contain', className)} />
  ) : (
    <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold text-primary-foreground', className)}>{brand.name.slice(0, 1)}</span>
  );
}

export function AppSidebar({ workspace, canSignOut = false }: { workspace: Workspace; canSignOut?: boolean }) {
  const path = usePathname();
  const { theme, setTheme } = useTheme();
  const isActive = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-2 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />} tooltip={brand.name} className="gap-2.5 px-2 group-data-[collapsible=icon]:p-1!">
              <BrandMark className="size-7 rounded-lg" />
              <span className="grid min-w-0 leading-tight">
                <span className="truncate font-semibold tracking-tight">{brand.name}</span>
                <span className="truncate text-[11px] text-muted-foreground">Inteligencia política</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-background font-normal text-muted-foreground shadow-xs group-data-[collapsible=icon]:hidden" onClick={openCommandMenu} aria-keyshortcuts="Meta+K">
          <Search aria-hidden /> Buscar…
          <KbdGroup className="ml-auto">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive(item.href)} tooltip={item.label} className="text-muted-foreground data-active:text-sidebar-accent-foreground">
                    <item.icon aria-hidden />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-popup-open:bg-sidebar-accent group-data-[collapsible=icon]:p-0.5">
            <Avatar className="size-7 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">{(workspace.name ?? brand.name).slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{workspace.name ?? brand.name}</span>
              <span className="truncate text-xs text-muted-foreground">Espacio de trabajo</span>
            </span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
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
            {canSignOut ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut /> Cerrar sesión
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
