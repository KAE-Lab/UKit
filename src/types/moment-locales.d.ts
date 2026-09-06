/**
 * Les locales de `moment` sont importees pour leur seul effet de bord (`import 'moment/locale/fr'`)
 * et le paquet ne les accompagne d'aucune declaration. TypeScript 6 verifie desormais qu'un import
 * a effet de bord resout vers un module connu (`noUncheckedSideEffectImports`) : cette declaration
 * les nomme, plutot que de desactiver un controle qui attrape une faute de frappe dans un chemin.
 */
declare module 'moment/locale/*';
