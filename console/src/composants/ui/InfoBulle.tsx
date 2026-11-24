/**
 * L'aide d'un champ, a la demande : une icone a cote de son etiquette ouvre le texte (Base UI
 * Popover, au survol, au clic et au clavier). Rien n'est ecrit sous le controle (design.md) ; le
 * texte reste porte par `aria-describedby` pour un lecteur d'ecran, via `id`.
 */

import { Popover } from '@base-ui/react/popover';
import { Info } from 'lucide-react';

export function InfoBulle({ id, libelle, texte }: { readonly id: string; readonly libelle: string; readonly texte: string }) {
    return (
        <>
            <span className="visuellement-cache" id={id}>{texte}</span>
            <Popover.Root>
                <Popover.Trigger openOnHover delay={150} className="info-declencheur" aria-label={`Aide : ${libelle}`}>
                    <Info className="icone" aria-hidden="true" />
                </Popover.Trigger>
                <Popover.Portal>
                    <Popover.Positioner sideOffset={6} align="start" className="selecteur-positionneur">
                        <Popover.Popup className="menu-popup info-popup">{texte}</Popover.Popup>
                    </Popover.Positioner>
                </Popover.Portal>
            </Popover.Root>
        </>
    );
}
