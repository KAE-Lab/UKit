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
    widgetPublie,
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
        edt: null,
        salles: null,
        salles_libres: null,
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

describe('projeterEdt', () => {
    it('rend null quand la ligne ne declare pas d export iCalendar', () => {
        expect(projeterEtablissement(ligne({})).edt).toBeNull();
    });

    it('refuse un export a moitie declare', () => {
        // Sans les deux noms de Blueprint il n'y a rien a jouer. Rendre un objet ampute ferait
        // echouer un run, la ou `null` fait dire a l'ecran « pas d'emploi du temps ici » — deux
        // ecrans opposes pour deux situations opposees.
        expect(projeterEtablissement(ligne({ edt: { blueprint: 'ukit.portail.x.edt' } })).edt).toBeNull();
        expect(projeterEtablissement(ligne({ edt: { blueprint_annee: 'ukit.portail.x.edt.annee' } })).edt).toBeNull();
        expect(projeterEtablissement(ligne({ edt: [] })).edt).toBeNull();
    });

    it('projette les parametres d annee et le referentiel des groupes', () => {
        const edt = projeterEtablissement(
            ligne({
                edt: {
                    blueprint: 'ukit.portail.x.edt',
                    blueprint_annee: 'ukit.portail.x.edt.annee',
                    params: { projet: '1', bruit: 42 },
                    groupes: [{ nom: '1A', ressource: '2' }, { nom: '2A', ressource: '3' }],
                },
            }),
        ).edt;

        expect(edt?.blueprint).toBe('ukit.portail.x.edt');
        expect(edt?.blueprintAnnee).toBe('ukit.portail.x.edt.annee');
        // Une valeur qui n'est pas une chaine ne peut pas devenir une entree de Blueprint.
        expect(edt?.params).toEqual({ projet: '1' });
        expect(edt?.groupes).toEqual([{ nom: '1A', ressource: '2' }, { nom: '2A', ressource: '3' }]);
    });

    it('ecarte les doublons de nom, et le premier gagne', () => {
        // Le releve en produit reellement : mesure du 2026-08-15, `S3` designe cinq index differents.
        // Deux ressources sous un meme nom rendraient le planning dependant de l'ordre de lecture.
        const edt = projeterEtablissement(
            ligne({
                edt: {
                    blueprint: 'ukit.portail.x.edt',
                    blueprint_annee: 'ukit.portail.x.edt.annee',
                    groupes: [{ nom: 'S3', ressource: '65' }, { nom: 'S3', ressource: '66' }, { nom: null }],
                },
            }),
        ).edt;

        expect(edt?.groupes).toEqual([{ nom: 'S3', ressource: '65' }]);
    });
});

describe('projeterSalles', () => {
    it('retombe sur le comportement historique quand la colonne est absente', () => {
        // Une base qui n'a pas encore recu la colonne doit se comporter **exactement** comme avant.
        expect(projeterEtablissement(ligne({})).salles).toEqual({
            separateurs: [' | ', '/'],
            motif: '([A-Z][0-9]+)',
            depuis: 2,
        });
    });

    it('lit le format publie, champ par champ', () => {
        const salles = projeterEtablissement(
            ligne({ salles: { separateurs: [','], motif: '^([A-Z]{2})-', depuis: 0 } }),
        ).salles;

        expect(salles).toEqual({ separateurs: [','], motif: '^([A-Z]{2})-', depuis: 0 });
    });

    it('ignore un champ inexploitable sans jeter les autres', () => {
        const salles = projeterEtablissement(
            ligne({ salles: { separateurs: [], motif: '^(X)-', depuis: -1 } }),
        ).salles;

        expect(salles.separateurs).toEqual([' | ', '/']);
        expect(salles.motif).toBe('^(X)-');
        expect(salles.depuis).toBe(2);
    });

    it('rend null quand l etablissement declare n avoir aucun referentiel de lieux', () => {
        // Le cas de « Mon universite n'est pas dans la liste » (jalon 6-J). A distinguer d'une colonne
        // **absente**, qui vaut le comportement bordelais : ici c'est une decision, la c'est un
        // silence. Voir salles.test.ts pour ce que ce nul produit a l'ecran.
        expect(projeterEtablissement(ligne({ salles: { reconnaissance: false } })).salles).toBeNull();
    });
});

describe('projeterEdtAbonnement', () => {
    it('rend null quand la ligne n en declare pas', () => {
        expect(projeterEtablissement(ligne({})).edtAbonnement).toBeNull();
        expect(projeterEtablissement(ligne({ edt: { blueprint: 'a', blueprint_annee: 'b' } })).edtAbonnement).toBeNull();
    });

    it('suffit a etre declare par un objet vide : ce qui compte est le fait', () => {
        expect(projeterEtablissement(ligne({ edt: { abonnement: {} } })).edtAbonnement).toEqual({ aide: null });
    });

    it('porte l aide du catalogue, telle quelle', () => {
        // Un libelle de donnee, comme le nom de l'universite : le chemin vers un lien d'abonnement est
        // propre a chaque etablissement, et le traduire n'aurait aucun sens.
        const abonnement = projeterEtablissement(
            ligne({ edt: { abonnement: { aide: 'ADE → Exporter mon agenda' } } }),
        ).edtAbonnement;

        expect(abonnement).toEqual({ aide: 'ADE → Exporter mon agenda' });
    });

    it('coexiste avec un referentiel iCalendar dans la meme colonne', () => {
        const etablissement = projeterEtablissement(
            ligne({ edt: { blueprint: 'a', blueprint_annee: 'b', groupes: [], abonnement: {} } }),
        );

        expect(etablissement.edt?.blueprint).toBe('a');
        expect(etablissement.edtAbonnement).toEqual({ aide: null });
    });
});

describe('crousRegion', () => {
    it('vaut null quand la colonne est absente, et la section disparait', () => {
        // Volontairement **pas** de repli bordelais : une ligne qui ne declare pas de region ne doit
        // pas se voir servir les restaurants d'une autre ville. Le socle embarque, lui, porte la
        // sienne en dur — c'est lui qui garantit le comportement historique hors ligne.
        expect(projeterEtablissement(ligne({})).crousRegion).toBeNull();
    });

    it('lit la region publiee', () => {
        expect(projeterEtablissement(ligne({ crous_region: '1' })).crousRegion).toBe('1');
    });
});

/**
 * Les widgets publies, et le repli qui evite une regression a la mise a jour.
 *
 * Le cas qui compte est le dernier : la surcouche de catalogue s'applique en **asynchrone**, donc un
 * appareil peut tres bien porter cette version de l'application et une ligne de catalogue d'avant.
 * Sans le repli sur `portail_messagerie`, mettre a jour eteindrait le compteur de messages jusqu'au
 * prochain rafraichissement — une regression invisible, introduite par une amelioration.
 */
describe('les widgets d une ligne', () => {
    it('retient un descripteur complet', () => {
        const table = projeterEtablissement(ligne({
            portail_widgets: { moodle: { blueprint: 'ukit.portail.essai.moodle', peremption_min: 90 } },
        })).portailWidgets;
        expect(table.moodle).toEqual({ blueprint: 'ukit.portail.essai.moodle', peremptionMin: 90 });
    });

    it('accepte un descripteur sans peremption : celle de l application fait foi', () => {
        const table = projeterEtablissement(ligne({
            portail_widgets: { moodle: { blueprint: 'ukit.portail.essai.moodle' } },
        })).portailWidgets;
        expect(table.moodle?.peremptionMin).toBeNull();
    });

    it('ecarte une peremption absurde plutot que de la suivre', () => {
        const table = projeterEtablissement(ligne({
            portail_widgets: {
                a: { blueprint: 'ukit.portail.essai.a', peremption_min: 0 },
                b: { blueprint: 'ukit.portail.essai.b', peremption_min: -5 },
                c: { blueprint: 'ukit.portail.essai.c', peremption_min: 'souvent' },
            },
        })).portailWidgets;
        // Zero ferait rejouer le widget a chaque evaluation : le seul reglage capable de vider une
        // batterie.
        expect([table.a?.peremptionMin, table.b?.peremptionMin, table.c?.peremptionMin])
            .toEqual([null, null, null]);
    });

    it('ignore une entree sans nom de Blueprint plutot que de la retenir vide', () => {
        const table = projeterEtablissement(ligne({
            portail_widgets: { moodle: { peremption_min: 30 }, notes: null, examens: 'oui' },
        })).portailWidgets;
        expect(Object.keys(table)).toEqual([]);
    });

    it('ne tombe pas sur une colonne d une autre forme', () => {
        expect(projeterEtablissement(ligne({ portail_widgets: null })).portailWidgets).toEqual({});
        expect(projeterEtablissement(ligne({ portail_widgets: ['moodle'] })).portailWidgets).toEqual({});
    });

    it('replie la messagerie sur l ancienne colonne quand la nouvelle est vide', () => {
        appliquerCatalogue({ repli: etablissement({
            code: 'repli',
            portailMessagerie: 'ukit.portail.repli.messagerie',
            portailWidgets: {},
        }) });
        setCodeEtablissementActif('repli');
        expect(widgetPublie('messagerie')?.blueprint).toBe('ukit.portail.repli.messagerie');
        // Le repli ne vaut **que** pour la messagerie : les autres points n'ont pas d'ancienne colonne.
        expect(widgetPublie('moodle')).toBeNull();
    });

    it('laisse la nouvelle colonne gagner sur l ancienne', () => {
        appliquerCatalogue({ recent: etablissement({
            code: 'recent',
            portailMessagerie: 'ukit.portail.recent.ancienne',
            portailWidgets: { messagerie: { blueprint: 'ukit.portail.recent.messagerie', peremptionMin: null } },
        }) });
        setCodeEtablissementActif('recent');
        expect(widgetPublie('messagerie')?.blueprint).toBe('ukit.portail.recent.messagerie');
    });
});
