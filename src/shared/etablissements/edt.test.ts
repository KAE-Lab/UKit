/**
 * Ce que le choix de la source et la resolution des ressources doivent tenir.
 *
 * Deux cas viennent de defauts trouves sur appareil au jalon 6-I, et aucun des deux ne se voit a la
 * relecture : la resolution etait en **tout ou rien**, si bien qu'un unique favori perime vidait tout
 * le planning agrege sans dire lequel etait en cause ; et un referentiel se perime a chaque rentree,
 * donc ce cas est ordinaire, pas theorique.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { planningDisponible, resoudreRessources, sourceEdt } from './edt';
import { appliquerCatalogue, projeterEtablissement, setCodeEtablissementActif, ETABLISSEMENT_DEFAUT } from './catalogue';
import type { EdtIcal } from './catalogue';
import type { EtablissementRow } from '../supabase/types';

const CONFIG: EdtIcal = {
    blueprint: 'ukit.portail.x.edt',
    blueprintAnnee: 'ukit.portail.x.edt.annee',
    params: { projet: '1' },
    groupes: [
        { nom: 'ENSC 1A', ressource: '2' },
        { nom: 'ENSC 2A GR1', ressource: '7' },
    ],
};

/** Installe un etablissement publie, par le vrai chemin du catalogue. */
function publier(partial: Partial<EtablissementRow>): void {
    appliquerCatalogue({
        essai: projeterEtablissement({ code: 'essai', nom: 'Essai', ...partial } as EtablissementRow),
    });
    setCodeEtablissementActif('essai');
}

afterEach(() => {
    appliquerCatalogue(null);
    setCodeEtablissementActif(ETABLISSEMENT_DEFAUT);
});

describe('sourceEdt', () => {
    it('rend null quand l etablissement ne publie ni Celcat ni iCalendar', () => {
        publier({});
        expect(sourceEdt()).toBeNull();
        expect(planningDisponible()).toBe(false);
    });

    it('rend la source iCalendar quand elle est seule', () => {
        publier({ edt: { blueprint: 'a', blueprint_annee: 'b', groupes: [] } });
        expect(sourceEdt()?.kind).toBe('ical');
        expect(planningDisponible()).toBe(true);
    });

    it('prefere Celcat quand les deux sont declares', () => {
        // Un serveur interrogeable a une liste de groupes vivante ; un referentiel iCalendar est un
        // releve d'auteur, forcement partiel. Preferer la source qui se corrige toute seule.
        publier({
            celcat_domaine: 'https://celcat.exemple.fr/calendar',
            edt: { blueprint: 'a', blueprint_annee: 'b', groupes: [] },
        });
        expect(sourceEdt()?.kind).toBe('celcat');
    });
});

describe('resoudreRessources', () => {
    it('resout un groupe seul', () => {
        expect(resoudreRessources(CONFIG, 'ENSC 1A')).toEqual({ ressources: '2', manquants: [] });
    });

    it('joint les favoris dans l ordre demande, en une seule cible', () => {
        // `resources` accepte une liste separee par des virgules : le planning agrege tient en UNE
        // requete, comme `federationIds[]` chez Celcat.
        expect(resoudreRessources(CONFIG, ['ENSC 2A GR1', 'ENSC 1A'])).toEqual({
            ressources: '7,2',
            manquants: [],
        });
    });

    it('joue ce qui resout et **nomme** ce qui manque', () => {
        // Le defaut trouve sur appareil : avant, cet appel ne rendait rien du tout, et l'ecran
        // affichait « ce groupe n'existe plus » pour un planning dont la moitie etait disponible.
        expect(resoudreRessources(CONFIG, ['ENSC 1A', 'ENSC 3A', 'ENSC 2A GR1'])).toEqual({
            ressources: '2,7',
            manquants: ['ENSC 3A'],
        });
    });

    it('ne resout rien quand aucun favori n existe : il n y a rien a demander', () => {
        expect(resoudreRessources(CONFIG, ['ENSC 3A', 'ENSEIRB E2'])).toEqual({
            ressources: '',
            manquants: ['ENSC 3A', 'ENSEIRB E2'],
        });
    });
});
