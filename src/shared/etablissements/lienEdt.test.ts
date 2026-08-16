/**
 * Ce que le cloisonnement des liens d'abonnement doit tenir.
 *
 * Ce module est teste pour la meme raison que `reglagesParEtablissement` : **une regle de
 * cloisonnement qui se trompe fait perdre le lien de quelqu'un sans rien dire.** Le symptome serait un
 * onglet Planning qui redemande un lien deja colle, ou pire, qui en sert un d'une autre universite.
 * Aucun des deux ne se voit a la relecture.
 *
 * La forme du defaut est connue et s'est deja produite deux fois dans cette phase, sur les groupes
 * favoris (jalons 6-G puis 6-I) : ecrire la seule entree courante et effacer les autres.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { appliquerLiensEdt, fusionnerLiens, lienEdtActif, liensEdt, lireLiens } from './lienEdt';
import { ETABLISSEMENT_DEFAUT, setCodeEtablissementActif } from './catalogue';

afterEach(() => {
    appliquerLiensEdt(null);
    setCodeEtablissementActif(ETABLISSEMENT_DEFAUT);
});

describe('lireLiens', () => {
    it('rend une table vide plutot que de lever, quel que soit le contenu', () => {
        // Le trousseau n'est ecrit que par nous : un contenu aberrant veut dire qu'une version
        // anterieure ecrivait autre chose. Le bon comportement est de redemander le lien, pas
        // d'empecher l'application de demarrer.
        expect(lireLiens(null)).toEqual({});
        expect(lireLiens('')).toEqual({});
        expect(lireLiens('pas du json')).toEqual({});
        expect(lireLiens('[1, 2]')).toEqual({});
        expect(lireLiens('null')).toEqual({});
    });

    it('ecarte les entrees qui ne sont pas des liens', () => {
        expect(lireLiens('{"a": "https://x.fr/a.ics", "b": 42, "c": "", "d": null}')).toEqual({
            a: 'https://x.fr/a.ics',
        });
    });
});

describe('fusionnerLiens', () => {
    it('pose un lien sans toucher a ceux des autres etablissements', () => {
        // **La regle du jalon.** Ecrire la seule entree courante effacerait les autres, et un
        // aller-retour entre deux facs ferait recoller un lien deja donne.
        const table = fusionnerLiens({ bordeaux: 'https://x.fr/b.ics' }, 'autre', 'https://y.fr/a.ics');

        expect(table).toEqual({ bordeaux: 'https://x.fr/b.ics', autre: 'https://y.fr/a.ics' });
    });

    it('remplace le lien d un etablissement qui en avait deja un', () => {
        const table = fusionnerLiens({ autre: 'https://y.fr/vieux.ics' }, 'autre', 'https://y.fr/neuf.ics');
        expect(table).toEqual({ autre: 'https://y.fr/neuf.ics' });
    });

    it('retire l entree sur `null`, et elle seule', () => {
        const table = fusionnerLiens({ bordeaux: 'https://x.fr/b.ics', autre: 'https://y.fr/a.ics' }, 'autre', null);
        expect(table).toEqual({ bordeaux: 'https://x.fr/b.ics' });
    });

    it('ne mute pas la table qu on lui donne', () => {
        // Elle est celle qui est en memoire : la muter poserait le lien avant l'ecriture du trousseau,
        // donc laisserait un etat different selon que l'ecriture a abouti ou non.
        const avant = { bordeaux: 'https://x.fr/b.ics' };
        fusionnerLiens(avant, 'autre', 'https://y.fr/a.ics');
        expect(avant).toEqual({ bordeaux: 'https://x.fr/b.ics' });
    });
});

describe('lienEdtActif', () => {
    it('rend le lien de l etablissement selectionne, et jamais celui d un autre', () => {
        appliquerLiensEdt({ bordeaux: 'https://x.fr/b.ics', autre: 'https://y.fr/a.ics' });

        setCodeEtablissementActif('autre');
        expect(lienEdtActif()).toBe('https://y.fr/a.ics');

        setCodeEtablissementActif('bordeaux');
        expect(lienEdtActif()).toBe('https://x.fr/b.ics');
    });

    it('rend null quand cet etablissement n en a pas', () => {
        appliquerLiensEdt({ bordeaux: 'https://x.fr/b.ics' });
        setCodeEtablissementActif('jamais-vue');
        expect(lienEdtActif()).toBeNull();
    });

    it('retrouve le lien apres un aller-retour entre deux etablissements', () => {
        // Le scenario complet, celui qui a motive le cloisonnement plutot que l'effacement : partir,
        // revenir, et ne rien avoir a recoller.
        appliquerLiensEdt(fusionnerLiens(liensEdt(), 'autre', 'https://y.fr/a.ics'));

        setCodeEtablissementActif('bordeaux');
        expect(lienEdtActif()).toBeNull();

        setCodeEtablissementActif('autre');
        expect(lienEdtActif()).toBe('https://y.fr/a.ics');
    });
});
