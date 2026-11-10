/**
 * Les seances restantes d'un cours, pour sa fiche (lot 2). Le calcul est dans `seancesRestantes`.
 *
 * L'annee vient de `lireAnneeDesFavoris` : un run par etablissement et jeu de favoris toutes les six
 * heures, partage avec le Planning (journee vide) et les propositions du dossier. Ouvrir dix fiches ne
 * part donc qu'une fois, et pas du tout si l'annee est deja en memoire. Le run est `automatique` : un
 * hote que le disjoncteur a ouvert ne recoit rien (7-C), et la fiche se tait.
 *
 * Rien ne s'affiche tant que l'annee n'est pas lue, ni quand elle echoue : la ligne est un plus, et
 * son absence ne dit rien de faux. L'echec de la source est deja rapporte par le service.
 *
 * Voir docs/features/planning.md.
 */

import { useContext, useEffect, useState } from 'react';

import { sourceEdt } from '../../../shared/etablissements';
import { AppContext } from '../../../shared/services/AppCore';
import { maintenantMs } from '../../../shared/services/Temps';
import { lireAnneeDesFavoris } from '../services/anneeDesFavoris';
import { seancesRestantes } from '../services/seancesRestantes';
import type { CourseData } from '../components/CourseCard';

export function useSeancesRestantes(data: CourseData): number | null {
    const { favoriteGroups, filters } = useContext(AppContext);
    const [restantes, setRestantes] = useState<number | null>(null);

    useEffect(() => {
        setRestantes(null);
        if (data.source === 'telephone' || data.id === undefined) return undefined;

        const edt = sourceEdt();
        if (edt.kind !== 'celcat' && edt.kind !== 'ical' && edt.kind !== 'abonnement') return undefined;
        const source = edt.kind;
        // Un lien colle n'a pas de groupes : il est deja l'emploi du temps de l'etudiant.
        const favoris = favoriteGroups ?? [];
        if (source !== 'abonnement' && favoris.length === 0) return undefined;

        let actif = true;
        lireAnneeDesFavoris(favoris, { origine: 'automatique' }).then((annee) => {
            if (!actif || annee.ok === false) return;
            setRestantes(seancesRestantes({ cours: data, annee: annee.courses, source, filtres: filters ?? [], maintenant: maintenantMs() }));
        }, (erreur: unknown) => {
            console.warn('[fiche] annee des favoris en erreur', erreur);
        });
        return () => { actif = false; };
    }, [data, favoriteGroups, filters]);

    return restantes;
}
