/**
 * Ce que le choix de la source et la resolution des ressources doivent tenir.
 *
 * Deux cas viennent de defauts trouves sur appareil au jalon 6-I, et aucun des deux ne se voit a la
 * relecture : la resolution etait en **tout ou rien**, si bien qu'un unique favori perime vidait tout
 * le planning agrege sans dire lequel etait en cause ; et un referentiel se perime a chaque rentree,
 * donc ce cas est ordinaire, pas theorique.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { groupesRequis, planningDisponible, resoudreRessources, sourceEdt } from './edt';
import { appliquerCatalogue, projeterEtablissement, setCodeEtablissementActif, ETABLISSEMENT_DEFAUT } from './catalogue';
import type { EdtIcal } from './catalogue';
import { appliquerEdtsPersonnels } from './edtPersonnel';
import { appliquerLiensEdt } from './lienEdt';
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
    appliquerEdtsPersonnels(null);
    appliquerLiensEdt(null);
    setCodeEtablissementActif(ETABLISSEMENT_DEFAUT);
});

describe('sourceEdt', () => {
    it('rend « aucun » quand l etablissement ne publie rien', () => {
        publier({});
        expect(sourceEdt().kind).toBe('aucun');
        expect(planningDisponible()).toBe(false);
    });

    it('rend la source iCalendar quand elle est seule', () => {
        publier({ edt: { blueprint: 'a', blueprint_annee: 'b', groupes: [] } });
        expect(sourceEdt().kind).toBe('ical');
        expect(planningDisponible()).toBe(true);
    });

    /**
     * Le groupe personnel trouve dans le dossier, vu **par le chemin reel**.
     *
     * C'est la seule ligne dont depend toute la proposition d'emploi du temps : `sourceEdt()` est le
     * passage que tous les lecteurs du referentiel traversent. Si la fusion n'a pas lieu ici, l'ecran
     * de choix ne montre pas le groupe et un favori accepte rend « groupe inconnu » — deux symptomes
     * qui n'ont pas l'air d'avoir la meme cause.
     */
    it('fusionne l emploi du temps personnel au referentiel publie', () => {
        publier({ edt: { blueprint: 'a', blueprint_annee: 'b', groupes: [{ nom: 'ENSC 1A', ressource: '2' }] } });
        appliquerEdtsPersonnels({ essai: { nom: 'Belharet Damien', ressource: '4087' } });

        const source = sourceEdt();
        if (source.kind !== 'ical') throw new Error('source attendue iCalendar');

        expect(source.config.groupes[0]).toEqual({ nom: 'Belharet Damien', ressource: '4087' });
        // Et il se resout comme un autre : c'est tout l'objet de la fusion.
        expect(resoudreRessources(source.config, 'Belharet Damien').ressources).toBe('4087');
    });

    it('ne fait pas fuir l emploi du temps personnel d un autre etablissement', () => {
        publier({ edt: { blueprint: 'a', blueprint_annee: 'b', groupes: [] } });
        appliquerEdtsPersonnels({ 'une-autre-fac': { nom: 'Belharet Damien', ressource: '4087' } });

        const source = sourceEdt();
        if (source.kind !== 'ical') throw new Error('source attendue iCalendar');
        expect(source.config.groupes).toEqual([]);
    });

    it('prefere Celcat quand les deux sont declares', () => {
        // Un serveur interrogeable a une liste de groupes vivante ; un referentiel iCalendar est un
        // releve d'auteur, forcement partiel. Preferer la source qui se corrige toute seule.
        publier({
            celcat_domaine: 'https://celcat.exemple.fr/calendar',
            edt: { blueprint: 'a', blueprint_annee: 'b', groupes: [] },
        });
        expect(sourceEdt().kind).toBe('celcat');
    });

    /**
     * Le coeur du jalon 6-J : « cette universite n'a pas d'emploi du temps » et « elle en a un, il te
     * manque un geste » sont **deux etats**, pas un seul. Les confondre afficherait une phrase
     * d'excuse la ou il faut un bouton — deux gestes opposes de la part d'un etudiant.
     */
    it('distingue un lien attendu d une absence d emploi du temps', () => {
        publier({ edt: { abonnement: {} } });

        expect(sourceEdt().kind).toBe('lien-attendu');
        // Disponible, et c'est voulu : l'universite en a bien un. Ce qui change est le contenu de
        // l'etape d'accueil, pas sa presence.
        expect(planningDisponible()).toBe(true);
    });

    it('rend l abonnement des qu un lien est pose', () => {
        publier({ edt: { abonnement: { aide: 'ADE, Exporter mon agenda' } } });
        appliquerLiensEdt({ essai: 'https://exemple.fr/agenda.ics' });

        const source = sourceEdt();
        expect(source.kind).toBe('abonnement');
        expect(source.kind === 'abonnement' && source.lien).toBe('https://exemple.fr/agenda.ics');
        expect(source.kind === 'abonnement' && source.config.aide).toBe('ADE, Exporter mon agenda');
    });

    it('ne prend pas le lien d un autre etablissement', () => {
        // Le cloisonnement, vu depuis la source : un lien colle chez une fac ne doit jamais servir
        // sous une autre, sans quoi on afficherait le planning de l'universite quittee.
        publier({ edt: { abonnement: {} } });
        appliquerLiensEdt({ 'une-autre-fac': 'https://exemple.fr/agenda.ics' });

        expect(sourceEdt().kind).toBe('lien-attendu');
    });

    it('prefere le referentiel a l abonnement quand les deux existent', () => {
        // Du plus automatique au plus manuel : coller un lien coute un geste que personne n'a envie de
        // faire, il ne doit donc jamais gagner sur une liste de groupes qui marche.
        publier({ edt: { blueprint: 'a', blueprint_annee: 'b', groupes: [], abonnement: {} } });
        expect(sourceEdt().kind).toBe('ical');
    });
});

describe('groupesRequis', () => {
    it('est faux pour un abonnement : le lien EST le planning de cet etudiant', () => {
        // Sans cette distinction, l'onglet Planning afficherait « ton planning est vide, cherche un
        // groupe » a quelqu'un dont la source n'a aucune notion de groupe.
        publier({ edt: { abonnement: {} } });
        appliquerLiensEdt({ essai: 'https://exemple.fr/agenda.ics' });
        expect(groupesRequis()).toBe(false);
    });

    it('est vrai pour Celcat et pour un referentiel iCalendar', () => {
        publier({ celcat_domaine: 'https://celcat.exemple.fr/calendar' });
        expect(groupesRequis()).toBe(true);

        publier({ edt: { blueprint: 'a', blueprint_annee: 'b', groupes: [] } });
        expect(groupesRequis()).toBe(true);
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
