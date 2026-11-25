/**
 * Le sondage d'une annonce (phase 8, lot 4) : la question, deux a six choix, la cloture. Un choix garde
 * son identifiant quand son libelle change — ses voix le suivent — ; un choix neuf en tire un au hasard,
 * jamais celui d'un choix retire, dont les voix passeraient sinon au nouveau. « Retirer le sondage » vide
 * tout, et la colonne part nulle.
 */

import { Plus, X } from 'lucide-react';

import { BORNES_DU_SONDAGE } from '../../../../../src/shared/annonces/sondage';
import { lireSondageSaisi, SONDAGE_VIDE, type SondageSaisi } from '../../../schema/schemas';
import { Bouton } from '../../ui/Bouton';
import type { ChampProps } from './types';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Huit caracteres tires au hasard : un identifiant qu'aucun choix, present ou retire, n'a porte. */
function identifiantNeuf(): string {
    return [...crypto.getRandomValues(new Uint8Array(8))].map((octet) => ALPHABET[octet % ALPHABET.length]).join('');
}

export function ChampSondage({ id, saisie, onChange, desactive }: ChampProps) {
    const sondage = lireSondageSaisi(saisie);
    const poser = (partiel: Partial<SondageSaisi>) => onChange({ ...sondage, ...partiel });
    const vide = sondage.question === '' && sondage.choix.length === 0 && sondage.clos_le === '';
    const ajouter = () => poser({ choix: [...sondage.choix, { id: identifiantNeuf(), libelle: '' }] });

    if (vide) {
        return (
            <div className="boutons">
                <Bouton variante="tonal" compact disabled={desactive} icone={<Plus className="icone" aria-hidden="true" />}
                    onClick={() => onChange({ question: '', choix: [{ id: identifiantNeuf(), libelle: '' }, { id: identifiantNeuf(), libelle: '' }], clos_le: '' })}>
                    Ajouter un sondage
                </Bouton>
            </div>
        );
    }
    return (
        <div className="sondage">
            <label className="sous-champ">Question
                <input id={id} type="text" value={sondage.question} maxLength={BORNES_DU_SONDAGE.question.max} disabled={desactive} onChange={(e) => poser({ question: e.target.value })} />
            </label>
            <div className="sondage-choix" role="group" aria-label="Choix">
                {sondage.choix.map((c, rang) => (
                    <div key={c.id} className="sondage-choix-ligne">
                        <input type="text" value={c.libelle} placeholder={`Choix ${rang + 1}`} maxLength={BORNES_DU_SONDAGE.libelle.max} disabled={desactive} aria-label={`Choix ${rang + 1}`}
                            onChange={(e) => poser({ choix: sondage.choix.map((autre) => (autre.id === c.id ? { ...autre, libelle: e.target.value } : autre)) })} />
                        <Bouton variante="discret" compact disabled={desactive || sondage.choix.length <= BORNES_DU_SONDAGE.choix.min} aria-label={`Retirer le choix ${rang + 1}`}
                            onClick={() => poser({ choix: sondage.choix.filter((autre) => autre.id !== c.id) })} icone={<X className="icone" aria-hidden="true" />} />
                    </div>
                ))}
            </div>
            <label className="sous-champ">Clôture
                <input type="datetime-local" value={sondage.clos_le} disabled={desactive} onChange={(e) => poser({ clos_le: e.target.value })} />
            </label>
            <div className="boutons">
                <Bouton variante="tonal" compact disabled={desactive || sondage.choix.length >= BORNES_DU_SONDAGE.choix.max} onClick={ajouter} icone={<Plus className="icone" aria-hidden="true" />}>Un autre choix</Bouton>
                <Bouton variante="discret" compact disabled={desactive} onClick={() => onChange(SONDAGE_VIDE)} icone={<X className="icone" aria-hidden="true" />}>Retirer le sondage</Bouton>
            </div>
        </div>
    );
}
