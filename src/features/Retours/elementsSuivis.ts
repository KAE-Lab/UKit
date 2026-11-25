/**
 * Un probleme connu ou une idee, tels que la liste a gestes les montre (`ElementsSuivis`) : l'etat d'un
 * element qu'on ne soutient plus, a la place des gestes, et celui d'une idee deja en cours.
 */

import Translator from '../../shared/i18n/Translator';
import type { Idee, ProblemeConnu } from '../../shared/retours/donnees';
import type { ElementSuivi } from './components/ElementsSuivis';

export function elementDeProbleme(p: ProblemeConnu): ElementSuivi {
    const fin = p.statut !== 'corrige' ? null
        : p.versionCorrigee !== null ? Translator.get('PROBLEME_CORRIGE', p.versionCorrigee) : Translator.get('PROBLEME_CORRIGE_SANS_VERSION');
    return { id: p.id, titre: p.titre, detail: p.detail, fin };
}

/** `enCours` : dire « En cours » sur l'element — faux dans la boite, qui range deja ses idees par statut. */
export function elementDIdee(i: Idee, enCours = true): ElementSuivi {
    const fin = i.statut !== 'livree' ? null
        : i.versionLivree !== null ? Translator.get('IDEE_LIVREE', i.versionLivree) : Translator.get('IDEE_LIVREE_SANS_VERSION');
    return { id: i.id, titre: i.titre, detail: i.detail, fin, ...(enCours && i.statut === 'en_cours' ? { etat: Translator.get('IDEE_EN_COURS') } : {}) };
}
