/**
 * The government entity this dashboard listens to. The setup wizard, the
 * scrape drawer and the setup guide read it, so changing it here re-aims the
 * whole app. Every term is editable in the UI before it is saved.
 */
export const entity = {
  /** The official name: the main brand keyword in Mentio. */
  name: 'Fideicomiso de Puentes Fronterizos de Chihuahua',
  /** How the group (campaign) is named in Mentio. */
  shortName: 'Puentes Fronterizos de Chihuahua',
  /** Other ways people write it; each one becomes its own brand keyword. */
  aliases: ['Puentes Fronterizos de Chihuahua', 'Fideicomiso de Puentes Fronterizos', 'Puentes Fronterizos', 'FPFCH'],
  /** What the scrape drawer searches for posts by default: phrases, hashtags and the bridges it runs. */
  searches: [
    '"Puentes Fronterizos de Chihuahua"',
    '"Fideicomiso de Puentes Fronterizos"',
    '#PuentesFronterizos',
    '"Puente Zaragoza"',
    '"Puente Guadalupe Tornillo"',
  ],
  /** Topics preselected in the wizard: what the conversation about the bridges is about. */
  topics: ['Peaje', 'Tiempos de espera', 'Cruces fronterizos', 'Obras y mantenimiento', 'Transparencia', 'Transporte de carga', 'Seguridad', 'Tarifas'],
};
