/**
 * La tuile des documents : combien de pieces sont rangees, et la porte vers l'ecran qui les porte.
 *
 * **Sa valeur ne vient pas d'un run**, et c'est ce qui la distingue des trois autres tuiles : elle
 * compte des fichiers presents sur l'appareil. Elle passe donc a cote de la machinerie de widgets —
 * peremption, cache, verrou du moteur — dont rien ne lui servirait, et emprunte seulement le chassis
 * visuel (`TuileScolarite`). Faire entrer un cas local dans une machinerie qui ne connait que des
 * Blueprints l'aurait alourdie pour un seul appelant.
 *
 * Elle ne peut pas echouer, et elle n'a pas d'etat vide a part : zero piece est une reponse, pas une
 * panne. C'est l'ecran qui porte l'invitation a en ajouter une.
 */

import React, { useEffect, useRef } from 'react';

import Translator from '../../../shared/i18n/Translator';
import { type AppThemeType } from '../../../shared/theme/Theme';
import { useDocuments } from '../hooks/useDocuments';
import { TuileScolarite } from './TuileScolarite';

/**
 * Sa couleur, en index dans `theme.sectionsHeaders` — comme les widgets.
 *
 * Elle vit ici et non dans la table des widgets parce que les documents n'en font pas partie : leur
 * valeur vient de l'appareil, pas d'un run. L'index `5` est le dernier libre de la palette une fois
 * les quatre services servis, et il reste distinct en theme sombre — ou les index 0 et 4 portent la
 * meme valeur.
 */
const COULEUR = 5;

export interface DocumentsTileProps {
    theme: AppThemeType;
    teinte: string;
    /**
     * Le certificat automatique est en train de se ranger.
     *
     * Le meme indicateur que celui d'un widget en lecture, et pour la meme raison : ce run continue
     * **apres** la barre du parcours froid, une vingtaine de secondes, et sans signe l'utilisateur
     * concluait a un echec (signale sur appareil le 2026-08-29). La tuile ne dit toujours rien en
     * mots — elle montre qu'elle lit, comme ses voisines.
     */
    chargement?: boolean;
    onPress: () => void;
}

export function DocumentsTile({ theme, teinte, chargement = false, onPress }: DocumentsTileProps) {
    // Le message d'echec du hook ne sert qu'aux **gestes** — ajouter, supprimer —, et la tuile n'en
    // fait aucun : elle se contente de compter ce qui est deja la.
    const { documents, relire } = useDocuments(Translator.get('DOCUMENT_ADD_FAILED'));
    const nombre = documents.length;

    // A la fin du rangement, relire : la piece vient d'atterrir pendant que l'ecran etait visible,
    // et le focus — qui couvre la navigation — ne se redeclenche pas pour un travail d'arriere-plan.
    const precedent = useRef(chargement);
    useEffect(() => {
        if (precedent.current && !chargement) relire();
        precedent.current = chargement;
    }, [chargement, relire]);

    return (
        <TuileScolarite
            theme={theme}
            teinte={theme.sectionsHeaders[COULEUR] ?? teinte}
            icone={{ name: 'folder-outline' }}
            nombre={nombre > 0 ? nombre : null}
            libelle={Translator.get(nombre > 0 ? 'DOCUMENTS_UNIT' : 'NO_DOCUMENTS_TITLE')}
            contexte={Translator.get('DOCUMENTS_SUBTITLE')}
            chargement={chargement}
            onPress={onPress}
        />
    );
}

export default DocumentsTile;
