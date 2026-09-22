/**
 * Sous 800 px, la navigation laterale devient un menu (Base UI), sections comprises, au clavier
 * comme au doigt (defaut 14 du jalon 7-E).
 */

import { Menu } from '@base-ui/react/menu';
import { Menu as IconeMenu } from 'lucide-react';

import { estActif, iconeDe, NAVIGATION } from './Coque';

export function NavigationMobile({ chemin }: { readonly chemin: string }) {
    return (
        <Menu.Root>
            <Menu.Trigger className="bouton discret icone-seule menu-mobile" aria-label="Menu de navigation">
                <IconeMenu className="icone grande" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner sideOffset={8} align="start">
                    <Menu.Popup className="menu-popup">
                        {NAVIGATION.map((section) => (
                            <Menu.Group key={section.titre}>
                                <Menu.GroupLabel className="menu-groupe">{section.titre}</Menu.GroupLabel>
                                {section.entrees.map((entree) => {
                                    const Icone = iconeDe(entree.vers);
                                    return (
                                        <Menu.LinkItem key={entree.vers} href={`#${entree.vers}`} className="menu-item" aria-current={estActif(entree.vers, chemin) ? 'page' : undefined}>
                                            {Icone === undefined ? null : <Icone className="icone" aria-hidden="true" />}{entree.libelle}
                                        </Menu.LinkItem>
                                    );
                                })}
                            </Menu.Group>
                        ))}
                        <Menu.Separator className="menu-separateur" />
                        <Menu.LinkItem href="#/compte" className="menu-item">Compte</Menu.LinkItem>
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}
