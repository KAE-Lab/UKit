/**
 * Le formulaire de retours, pre-rempli : la couture entre le catalogue, l'appareil et le navigateur.
 *
 * Trois portes y menent — la pastille grise de chaque onglet, la modale d'un campus non relie, la page
 * Scolarite d'un campus non relie — et toutes passent ici (jalon 7-C). Le catalogue porte deux
 * gabarits : `services.formulaire` pour la pastille, ou l'application ecrit l'onglet d'ou l'on vient,
 * l'appareil, le systeme, sa version et l'etablissement actif ; `services.formulaire_campus` pour les deux portes du campus,
 * qui cochent « Demander un campus ». Un catalogue sans gabarit retombe sur `services.adaptation`, le
 * formulaire nu — c'est ce que les versions anterieures ouvrent, et il ne change pas.
 *
 * L'appareil et le systeme viennent d'expo-device ; la version, de `contexte.ts`. Ils partent chez
 * Google a l'ouverture du formulaire, comme les champs qu'il demande deja (PRIVACY.md, 5 bis).
 */

import * as Device from 'expo-device';

import { versionApplication } from '../ciblage/contexte';
import { getEtablissementActif, serviceEtablissement } from '../etablissements/catalogue';
import { parametresDuFormulaire, remplirGabarit } from './liensDuFormulaire';

/** Les intitules exacts des options de la question « section », tels que le formulaire les ecrit. */
export type SectionDuFormulaire = 'Planning' | 'Campus' | 'Scolarité' | 'Settings' | 'Onboarding';

export type PorteDuFormulaire =
    | { readonly porte: 'pastille'; readonly onglet: SectionDuFormulaire }
    | { readonly porte: 'campus' };

/** « iOS 18.5 », « Android 9 » ; `null` quand l'appareil ne se nomme pas. */
function systeme(): string | null {
    const parties = [Device.osName, Device.osVersion].filter((partie): partie is string => typeof partie === 'string' && partie !== '');
    return parties.length === 0 ? null : parties.join(' ');
}

/** L'adresse a ouvrir pour une porte, ou `null` quand le catalogue ne publie aucun formulaire. */
export function lienDuFormulaire(porte: PorteDuFormulaire): string | null {
    const gabarit = serviceEtablissement(porte.porte === 'campus' ? 'formulaire_campus' : 'formulaire') ?? serviceEtablissement('adaptation');
    if (gabarit === null) return null;
    return remplirGabarit(gabarit, {
        onglet: porte.porte === 'pastille' ? porte.onglet : null,
        appareil: Device.modelName,
        systeme: systeme(),
        version: versionApplication(),
        // Le nom affiche, pas le code : c'est une personne qui lira la feuille (idee du 2026-09-21).
        etablissement: getEtablissementActif().nom,
    });
}

/** Ce que les trois portes savent du navigateur : la route `WebBrowser` vit dans la pile racine. */
export interface NavigateurDuFormulaire {
    navigate(name: string, params?: object): void;
}

/** Ouvre le formulaire dans le navigateur integre, avec la regle des domaines internes ; rien sans lien publie. */
export function ouvrirLeFormulaire(navigation: NavigateurDuFormulaire, porte: PorteDuFormulaire): void {
    const lien = lienDuFormulaire(porte);
    if (lien === null) return;
    navigation.navigate('WebBrowser', parametresDuFormulaire(lien));
}
