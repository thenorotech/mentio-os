import Page from '@/app/(dashboard)/redes/recolecciones/[source]/[id]/page';

export const dynamic = 'force-dynamic';

/** /redes/recolecciones/[source]/[id] opened from the list: the same page, in the drawer (layout.tsx). */
export default function Drawer(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
