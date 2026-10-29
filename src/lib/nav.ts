/** The sidebar, in one place: add a page here to put it in the navigation. */
import {
  Bell,
  BookOpen,
  Building2,
  Eye,
  FileText,
  Filter,
  FolderTree,
  Globe2,
  ListChecks,
  Layers,
  LayoutDashboard,
  LayoutGrid,
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

/** One flat list; an item with children opens a sub-list. */
export const NAV: NavItem[] = [
  { href: '/', label: 'Resumen', icon: LayoutDashboard },
  { href: '/mentions', label: 'Menciones', icon: Radio },
  { href: '/views', label: 'Vistas', icon: Eye },
  { href: '/keywords', label: 'Candidatos y temas', icon: Tag },
  { href: '/analytics', label: 'Análisis', icon: TrendingUp },
  {
    href: '/redes',
    label: 'Redes y web',
    icon: Globe2,
    children: [
      { href: '/redes', label: 'Panorama', icon: LayoutDashboard },
      { href: '/redes/recolecciones', label: 'Recolecciones', icon: ListChecks },
    ],
  },
  { href: '/contienda', label: 'Cara a cara', icon: Swords },
  { href: '/temas', label: 'Mapa de temas', icon: Map },
  { href: '/voceros', label: 'Voceros y detractores', icon: Megaphone },
  { href: '/reporte', label: 'Reporte ejecutivo', icon: FileText },
  { href: '/arranque', label: 'Asistente de arranque', icon: Sparkles },
  {
    href: '/people',
    label: 'Audiencia',
    icon: UsersRound,
    children: [
      { href: '/people', label: 'Personas', icon: LayoutGrid },
      { href: '/segments', label: 'Segmentos', icon: Layers },
    ],
  },
  {
    href: '/alerts',
    label: 'Alertas',
    icon: Bell,
    children: [
      { href: '/alerts', label: 'Reglas', icon: Bell },
      { href: '/channels', label: 'Canales', icon: Webhook },
    ],
  },
  { href: '/settings/company', label: 'Ajustes', icon: Settings },
];

/** The settings pages, for the breadcrumb above them. */
export const SETTINGS: NavItem[] = [
  { href: '/settings/company', label: 'Perfil de la organización', icon: Building2 },
  { href: '/settings/groups', label: 'Campañas', icon: FolderTree },
  { href: '/settings/filters', label: 'Filtros de ruido', icon: Filter },
];

export const DOCS = { href: '#', label: 'Inteligencia política', icon: BookOpen };
