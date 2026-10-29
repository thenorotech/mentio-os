'use client';

/**
 * The canvas's thin header (Inerpy's SiteHeader): the sidebar trigger, a
 * breadcrumb derived from the navigation (src/lib/nav.ts), and the chrome's
 * actions on the right: search (⌘K) and the theme. Translucent over the
 * scroll surface, 2.5rem tall (2.75rem on touch).
 */
import { Monitor, Moon, Search, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Fragment, useEffect, useState } from 'react';
import { brand } from '@/brand.config';
import { openCommandMenu } from '@/components/command-menu';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NAV_GROUPS, SETTINGS, type NavItem } from '@/lib/nav';

type Crumb = { label: string; href?: string };

const matches = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));

/** Group › page › record: the navigation entry the path is under, with its sidebar group. */
function trail(path: string): Crumb[] {
  if (path === '/') return [{ label: 'Resumen' }];
  const settings = SETTINGS.find((item) => matches(path, item.href));
  if (settings) return [{ label: 'Ajustes', href: '/settings/company' }, ...withLeaf(path, settings)];
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.href !== '/' && matches(path, i.href));
    if (item) return [{ label: group.label }, ...withLeaf(path, item)];
  }
  return [];
}

function withLeaf(path: string, item: NavItem): Crumb[] {
  if (path === item.href) return [{ label: item.label }];
  const rest = path.slice(item.href.length + 1).split('/')[0];
  const leaf = rest === 'new' ? 'Nuevo' : rest === 'plantillas' ? 'Plantillas' : 'Detalle';
  return [{ label: item.label, href: item.href }, { label: leaf }];
}

const THEMES = [
  { value: 'light', label: 'Tema claro', icon: Sun },
  { value: 'dark', label: 'Tema oscuro', icon: Moon },
  { value: 'system', label: 'Tema del sistema', icon: Monitor },
] as const;

export function SiteHeader() {
  const path = usePathname();
  const { theme, setTheme } = useTheme();
  // The theme is only known in the browser: render "system" until mounted, so hydration matches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const crumbs = trail(path);
  const current = (mounted && THEMES.find((t) => t.value === theme)) || THEMES[2];
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];

  return (
    <header
      data-slot="site-header"
      className="z-20 flex h-11 shrink-0 items-center gap-2 border-b border-border/60 bg-background/90 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:h-10"
    >
      <SidebarTrigger className="-ml-1 size-9 shrink-0 md:size-7" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <nav aria-label="Ruta" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm">
          <li className="hidden shrink-0 sm:contents">
            <Link href="/" className="font-medium text-muted-foreground transition-colors hover:text-foreground">{brand.name}</Link>
          </li>
          {crumbs.map((crumb, i) => (
            <Fragment key={`${crumb.label}-${i}`}>
              <li aria-hidden className={i === 0 ? 'hidden text-muted-foreground/50 sm:block' : 'text-muted-foreground/50'}>/</li>
              <li className="min-w-0 truncate">
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="font-semibold text-foreground">{crumb.label}</span>
                ) : crumb.href ? (
                  <Link href={crumb.href} className="font-medium text-muted-foreground transition-colors hover:text-foreground">{crumb.label}</Link>
                ) : (
                  <span className="font-medium text-muted-foreground">{crumb.label}</span>
                )}
              </li>
            </Fragment>
          ))}
        </ol>
      </nav>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" onClick={openCommandMenu} aria-keyshortcuts="Meta+K" className="hidden gap-2 font-normal text-muted-foreground sm:inline-flex">
          <Search aria-hidden /> Buscar
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={openCommandMenu} aria-label="Buscar" className="text-muted-foreground sm:hidden">
          <Search aria-hidden />
        </Button>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" onClick={() => setTheme(next.value)} aria-label={`${current.label}. Cambiar a ${next.label.toLowerCase()}`} className="text-muted-foreground" />}>
            <current.icon aria-hidden />
          </TooltipTrigger>
          <TooltipContent>{current.label}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
