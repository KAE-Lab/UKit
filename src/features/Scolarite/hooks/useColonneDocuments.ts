/**
 * La colonne des documents de l'instrument (7-J, deuxieme passe) : ce que la tuile des documents
 * calculait, sans la tuile. Les documents sont locaux : leur compte vient du stockage de l'appareil,
 * pas d'un run, et il se relit quand le certificat automatique finit de se ranger.
 */

import { useEffect, useRef } from 'react';

import Translator from '../../../shared/i18n/Translator';
import type { ColonneInstrument } from '../components/InstrumentScolarite';
import { useDocuments } from './useDocuments';

export function useColonneDocuments({ chargement, onPress }: { chargement: boolean; onPress: () => void }): ColonneInstrument {
    const { documents, relire } = useDocuments(Translator.get('DOCUMENT_ADD_FAILED'));
    const nombre = documents.length;

    // Le certificat se range **apres** la barre du parcours froid, une vingtaine de secondes : la
    // colonne montre qu'elle lit, puis se relit a la fin (constat du 2026-08-29, tuile des documents).
    const precedent = useRef(chargement);
    useEffect(() => {
        if (precedent.current && !chargement) relire();
        precedent.current = chargement;
    }, [chargement, relire]);

    const texte = Translator.get(nombre === 0 ? 'NO_DOCUMENTS_TITLE' : nombre === 1 ? 'DOCUMENT_UNIT_ONE' : 'DOCUMENTS_UNIT');
    return {
        cle: 'documents',
        icone: { name: 'folder-outline' },
        chiffre: nombre,
        texte,
        chargement,
        onPress,
        accessibilite: nombre > 0 ? `${nombre} ${texte}` : texte,
    };
}
