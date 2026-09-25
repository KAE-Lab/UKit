/**
 * L'en-tete d'un formulaire : ce qu'on edite — le titre de la ligne, son etat quand la page sait le
 * dire — et les gestes sur la ligne enregistree, en haut, la ou on les cherche. « Enregistrer » vit
 * en bas, dans la barre qui suit le defilement (BarreDEnregistrement.tsx).
 */

import { Archive, Copy, KeyRound, Send, Smartphone, Trash2, UserX, Users, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ActionDeLigne } from '../../schema/descripteurs';
import { Bouton } from '../ui/Bouton';

const ICONES: Readonly<Record<NonNullable<ActionDeLigne['icone']>, LucideIcon>> = {
    copier: Copy, telephone: Smartphone, tous: Users, archiver: Archive, envoyer: Send, cle: KeyRound,
};

export interface EnTeteProps {
    readonly titre: string;
    /** Le titre de la page elle-meme (`h1`), quand l'en-tete de la page n'en porte pas. */
    readonly titreDePage: boolean;
    readonly etat: ReactNode;
    readonly actions: readonly ActionDeLigne[];
    readonly suppression: boolean;
    /** Le libelle du geste qui retire la ligne, quand ce n'est pas une suppression : « Révoquer » (7-H). */
    readonly libelleDeSuppression?: string;
    readonly actionEnCours: string | null;
    readonly suppressionEnCours: boolean;
    /** Occupe ou sans droits : rien ne s'actionne. */
    readonly inerte: boolean;
    /** Une saisie non enregistree : les gestes agissent sur la ligne enregistree, ils attendent. */
    readonly modifie: boolean;
    readonly agir: (geste: ActionDeLigne) => void;
    readonly supprimer: () => void;
}

export function EnTeteDeFormulaire({ titre, titreDePage, etat, actions, suppression, libelleDeSuppression, actionEnCours, suppressionEnCours, inerte, modifie, agir, supprimer }: EnTeteProps) {
    const IconeDeSuppression = libelleDeSuppression === undefined ? Trash2 : UserX;
    const Titre = titreDePage ? 'h1' : 'h2';
    return (
        <header className="formulaire-entete">
            <div className="formulaire-titre">
                <Titre>{titre}</Titre>
                {etat}
            </div>
            {actions.length > 0 || suppression ? (
                <div className="boutons">
                    {actions.map((geste) => {
                        const Icone = ICONES[geste.icone ?? 'envoyer'];
                        return (
                            <Bouton
                                key={geste.libelle}
                                variante="tonal"
                                compact
                                onClick={() => agir(geste)}
                                enAttente={actionEnCours === geste.libelle}
                                disabled={inerte || modifie}
                                title={modifie ? 'Enregistre d’abord : ce geste agit sur la ligne enregistrée.' : undefined}
                                icone={<Icone className="icone" aria-hidden="true" />}
                            >
                                {geste.libelle}
                            </Bouton>
                        );
                    })}
                    {suppression ? (
                        <Bouton variante="destructif" compact onClick={supprimer} enAttente={suppressionEnCours} disabled={inerte} icone={<IconeDeSuppression className="icone" aria-hidden="true" />}>{libelleDeSuppression ?? 'Supprimer'}</Bouton>
                    ) : null}
                </div>
            ) : null}
        </header>
    );
}
