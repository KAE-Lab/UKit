/**
 * Ce que le catalogue des etablissements doit tenir.
 *
 * Deux risques, tous deux silencieux, et ce sont eux qui ont decide de la forme du module :
 *
 *   - **un nul qui ne gagne pas.** Une ligne publiee avec `portail_messagerie` a `null` retire un
 *     service ; si la projection le fusionnait avec le socle — comme le fait `projeterBatiment`, et
 *     pour de bonnes raisons la-bas — on ne pourrait jamais **retirer** une messagerie devenue
 *     inextractible, et l'application echouerait a chaque lancement sur un service qui n'existe plus ;
 *   - **un socle qui disparait.** Si une surcouche pouvait effacer l'etablissement historique, un
 *     premier lancement hors ligne offrirait un ecran de choix vide, c'est-a-dire une application
 *     inutilisable.
 *
 * Le reste — l'ordre stable, le repli d'un code inconnu — evite des defauts qu'on ne verrait qu'en
 * production, sur l'appareil de quelqu'un.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
    ETABLISSEMENT_DEFAUT,
    appliquerCatalogue,
    etablissementRetire,
    getEtablissement,
    getEtablissementActif,
    libelleEtablissement,
    listeEtablissements,
    projeterEtablissement,
    setCodeEtablissementActif,
    type Etablissement,
} from './catalogue';
import type { EtablissementRow } from '../supabase/types';

function ligne(partial: Partial<EtablissementRow>): EtablissementRow {
    return {
        code: 'essai',
        nom: 'Universite d essai',
        ville: null,
        logo_url: null,
        actif: true,
        portail_dossier: null,
        portail_messagerie: null,
        celcat_domaine: null,
        celcat_res_types: null,
        bibliotheques_points: null,
        libelles: null,
        ordre: 0,
        ...partial,
    } as EtablissementRow;
}

/** Un etablissement publie : tout a `null` sauf ce que le cas nomme, comme une vraie ligne minimale. */
function etablissement(partial: Partial<Etablissement>): Etablissement {
    return { ...projeterEtablissement(ligne({})), ...partial };
}

afterEach(() => {
    appliquerCatalogue(null);
    setCodeEtablissementActif(ETABLISSEMENT_DEFAUT);
});

describe('projeterEtablissement', () => {
    it('porte les services absents a null plutot que de les inventer', () => {
        const projete = projeterEtablissement(ligne({ code: 'bordeaux-inp' }));

        expect(projete.portailDossier).toBeNull();
        expect(projete.portailMessagerie).toBeNull();
        expect(projete.celcatDomaine).toBeNull();
    });

    it('traite une chaine vide comme une absence', () => {
        // PostgREST rend une colonne texte vide plutot que nulle quand elle a ete ecrite ainsi : les
        // deux disent la meme chose, et un nom de Blueprint vide serait joue puis introuvable.
        expect(projeterEtablissement(ligne({ portail_messagerie: '' })).portailMessagerie).toBeNull();
    });

    it('retombe sur les res_types conventionnels quand la ligne n en porte pas', () => {
        expect(projeterEtablissement(ligne({})).celcatResTypes).toEqual({ groupes: '103', salles: '102' });
    });

    it('complete un res_types partiel sans perdre l autre role', () => {
        const projete = projeterEtablissement(ligne({ celcat_res_types: { groupes: '203' } }));
        expect(projete.celcatResTypes).toEqual({ groupes: '203', salles: '102' });
    });

    it('ignore un point de balayage qui n est pas un couple de nombres', () => {
        // La colonne est libre cote base : une entree malformee ne doit pas faire partir une requete
        // de balayage sur `undefined`, ce qui rendrait un secteur muet sans raison lisible.
        const projete = projeterEtablissement(ligne({
            bibliotheques_points: [{ lat: 44.8, lng: -0.5 }, { lat: 'nord', lng: -0.5 }, null, { lat: 1 }],
        }));

        expect(projete.bibliothequesPoints).toEqual([{ lat: 44.8, lng: -0.5 }]);
    });

    it('ne retient des libelles que les paires de chaines', () => {
        const projete = projeterEtablissement(ligne({ libelles: { ine: 'NNE', ordre: 4, vide: '' } }));
        expect(projete.libelles).toEqual({ ine: 'NNE' });
    });
});

describe('appliquerCatalogue', () => {
    it('garde l etablissement historique quand la surcouche ne le mentionne pas', () => {
        // La sonde du jalon : le socle n'est jamais optionnel. Une base qui ne publierait que le
        // second etablissement ne doit pas faire disparaitre le premier.
        appliquerCatalogue({ inp: etablissement({ code: 'inp', nom: 'INP' }) });

        expect(getEtablissement(ETABLISSEMENT_DEFAUT)).not.toBeNull();
        expect(getEtablissement('inp')).not.toBeNull();
    });

    it('remplace une entree du socle au lieu de la fusionner', () => {
        // L'inverse exact de `fusionner` cote batiments, et c'est voulu : ici un nul veut dire « ce
        // service n'existe pas », et doit donc gagner sur le socle.
        appliquerCatalogue({
            [ETABLISSEMENT_DEFAUT]: etablissement({ code: ETABLISSEMENT_DEFAUT, nom: 'Bordeaux' }),
        });

        expect(getEtablissement(ETABLISSEMENT_DEFAUT)?.portailMessagerie).toBeNull();
        expect(getEtablissement(ETABLISSEMENT_DEFAUT)?.celcatDomaine).toBeNull();
    });

    it('revient au socle seul sans argument', () => {
        appliquerCatalogue({ inp: etablissement({ code: 'inp', nom: 'INP' }) });
        appliquerCatalogue(null);

        expect(listeEtablissements().map((e) => e.code)).toEqual([ETABLISSEMENT_DEFAUT]);
        expect(getEtablissement(ETABLISSEMENT_DEFAUT)?.celcatDomaine).toBe('https://celcat.u-bordeaux.fr/calendar');
    });
});

describe('listeEtablissements', () => {
    it('trie par ordre puis par nom, jamais par ce que la base rend', () => {
        appliquerCatalogue({
            c: etablissement({ code: 'c', nom: 'Zenith', ordre: 1 }),
            b: etablissement({ code: 'b', nom: 'Alpha', ordre: 1 }),
            a: etablissement({ code: 'a', nom: 'Premier', ordre: -1 }),
        });

        expect(listeEtablissements().map((e) => e.code)).toEqual(['a', 'bordeaux', 'b', 'c']);
    });
});

describe('getEtablissementActif', () => {
    it('rend l etablissement selectionne', () => {
        appliquerCatalogue({ inp: etablissement({ code: 'inp', nom: 'INP' }) });
        setCodeEtablissementActif('inp');

        expect(getEtablissementActif().code).toBe('inp');
    });

    it('retombe sur le socle historique quand le code ne resout plus', () => {
        // Un etablissement retire de la base et absent du cache : mieux vaut le socle qu'une
        // application sans reference, qui n'aurait plus ni portail ni points de balayage.
        setCodeEtablissementActif('disparu');

        expect(getEtablissementActif().code).toBe(ETABLISSEMENT_DEFAUT);
    });

    it('traite un code vide comme l etablissement par defaut', () => {
        setCodeEtablissementActif('');
        expect(getEtablissementActif().code).toBe(ETABLISSEMENT_DEFAUT);
    });
});

describe('libelleEtablissement', () => {
    it('rend le libelle du catalogue quand l etablissement en declare un', () => {
        appliquerCatalogue({ inp: etablissement({ code: 'inp', nom: 'INP', libelles: { ine: 'NNE' } }) });
        setCodeEtablissementActif('inp');

        expect(libelleEtablissement('ine', 'INE')).toBe('NNE');
    });

    it('rend le libelle traduit quand le catalogue se tait', () => {
        // La regle a ne pas confondre : le defaut vient de Translator, l'exception du catalogue.
        expect(libelleEtablissement('ine', 'INE')).toBe('INE');
    });
});

describe('etablissementRetire', () => {
    it('est faux tant que l etablissement selectionne est publie', () => {
        appliquerCatalogue({ inp: etablissement({ code: 'inp', nom: 'INP' }) });
        setCodeEtablissementActif('inp');

        expect(etablissementRetire()).toBe(false);
    });

    it('se dit retire sans cesser de resoudre', () => {
        // La couture reporte l'entree depuis le cache precedent (index.ts) : l'etablissement continue
        // donc de resoudre, et le drapeau est ce qui distingue « il marche encore » de « il est encore
        // propose ». Sans lui, l'application basculerait quelqu'un en silence sur le socle historique.
        appliquerCatalogue({ inp: etablissement({ code: 'inp', nom: 'INP' }) }, true);
        setCodeEtablissementActif('inp');

        expect(etablissementRetire()).toBe(true);
        expect(getEtablissementActif().code).toBe('inp');
    });

    it('se dit retire quand le code ne resout plus du tout', () => {
        // Le cas que le report ne couvre pas : un cache qui a perdu l'entree. `getEtablissementActif`
        // rend alors le socle historique — le seul comportement possible — et ce serait une bascule
        // **silencieuse** sans ce signal. Mesure sur appareil : au redemarrage, l'application s'etait
        // posee toute seule sur l'autre universite.
        setCodeEtablissementActif('disparu');

        expect(etablissementRetire()).toBe(true);
        expect(getEtablissementActif().code).toBe(ETABLISSEMENT_DEFAUT);
    });

    it('retombe a faux des qu une nouvelle surcouche le republie', () => {
        appliquerCatalogue({ inp: etablissement({ code: 'inp', nom: 'INP' }) }, true);
        setCodeEtablissementActif('inp');
        appliquerCatalogue({ inp: etablissement({ code: 'inp', nom: 'INP' }) });

        expect(etablissementRetire()).toBe(false);
    });
});
