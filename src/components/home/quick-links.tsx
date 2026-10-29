import { ArrowRight, Compass, FileText, Map, Megaphone, Swords } from 'lucide-react';
import Link from 'next/link';
import { SectionHeading } from '@/components/ui';

const links = [
  { href: '/contienda', title: 'Cara a cara', description: 'Compara a tu candidato con sus adversarios.', icon: Swords },
  { href: '/temas', title: 'Temas', description: 'Descubre qué asuntos mueven la conversación.', icon: Map },
  { href: '/voceros', title: 'Voceros', description: 'Ubica a las personas que amplifican cada tema.', icon: Megaphone },
  { href: '/reporte', title: 'Reporte ejecutivo', description: 'Consulta los hallazgos clave de la campaña.', icon: FileText },
];

export function QuickLinks() {
  return (
    <section aria-labelledby="home-tools-title" className="space-y-3">
      <SectionHeading id="home-tools-title" icon={Compass} title="Explora tu campaña" description="Abre un resumen visual para entender mejor lo que está pasando." />
      <ul className="grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
        {links.map(({ href, title, description, icon: Icon }) => (
          <li key={href} className="min-w-0">
            <Link
              href={href}
              className="group flex h-full items-start gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-primary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="truncate">{title}</span>
                  <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5" />
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-pretty text-muted-foreground">{description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
