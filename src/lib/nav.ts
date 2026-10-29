/** The sidebar, in one place: add a page here to put it in the navigation. */
import {
  Bell,
  BookOpen,
  Building2,
  Eye,
  FileText,
  Filter,
  FolderTree,
  Layers,
  LayoutDashboard,
  Map,
  Megaphone,
  type LucideIcon,
  Radio,
  Settings,
  Sparkles,
  Swords,
  Tag,
  TrendingUp,
  UsersRound,
  Webhook,
} from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon; children?: NavItem[] };
export type NavGroup = { label: string; items: NavItem[] };

/** The sidebar's sections, in Inerpy's grouped navigation; the breadcrumb reads the group as its parent. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Campaña',
    items: [
      { href: '/', label: 'Resumen', icon: LayoutDashboard },
      { href: '/mentions', label: 'Menciones', icon: Radio },
      { href: '/views', label: 'Vistas', icon: Eye },
      { href: '/keywords', label: 'Candidatos y temas', icon: Tag },
    ],
  },
  {
    label: 'Inteligencia',
    items: [
      { href: '/analytics', label: 'Análisis', icon: TrendingUp },
      { href: '/contienda', label: 'Cara a cara', icon: Swords },
      { href: '/temas', label: 'Mapa de temas', icon: Map },
      { href: '/voceros', label: 'Voceros y detractores', icon: Megaphone },
      { href: '/reporte', label: 'Reporte ejecutivo', icon: FileText },
    ],
  },
  {
    label: 'Audiencia',
    items: [
      { href: '/people', label: 'Personas', icon: UsersRound },
      { href: '/segments', label: 'Segmentos', icon: Layers },
    ],
  },
  {
    label: 'Avisos',
    items: [
      { href: '/alerts', label: 'Alertas', icon: Bell },
      { href: '/channels', label: 'Canales', icon: Webhook },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/arranque', label: 'Asistente de arranque', icon: Sparkles },
      { href: '/settings/company', label: 'Ajustes', icon: Settings },
    ],
  },
];

/** Every page in one flat list (⌘K, the breadcrumb). */
export const NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** The settings pages, for the breadcrumb above them. */
export const SETTINGS: NavItem[] = [
  { href: '/settings/company', label: 'Perfil de la organización', icon: Building2 },
  { href: '/settings/groups', label: 'Campañas', icon: FolderTree },
  { href: '/settings/filters', label: 'Filtros de ruido', icon: Filter },
];

export const DOCS = { href: '#', label: 'Inteligencia política', icon: BookOpen };
