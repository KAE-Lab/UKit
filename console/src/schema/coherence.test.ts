/**
 * La coherence des descripteurs : chaque colonne citee — en liste, en cle, en tri, en filtre, en
 * recherche, en campus, en colonne soeur d'une image — designe un champ reel, du bon type ; les
 * chemins et les tables sont uniques. Sans ce test, un nom errone s'affichait en silence.
 *
 *     npm test   (a la racine du depot)
 */

import { expect, test } from 'vitest';

import { champDe, colonnesTriables, type Descripteur } from './descripteurs';
import { RESSOURCES } from './tables';
import { JOURNAL } from './tables/suivi';

const TYPES_DE_FILTRE = new Set(['booleen', 'choix']);
const TYPES_DE_RECHERCHE = new Set(['texte', 'zone', 'description', 'uuid', 'version']);

test('les chemins et les tables sont uniques', () => {
    expect(new Set(RESSOURCES.map((r) => r.chemin)).size).toBe(RESSOURCES.length);
    expect(new Set(RESSOURCES.map((r) => r.table)).size).toBe(RESSOURCES.length);
});

const CAS = [...RESSOURCES, JOURNAL].map((r) => [r.chemin, r] as const);

function nomsDe(ressource: Descripteur): ReadonlySet<string> {
    return new Set(ressource.champs.map((champ) => champ.nom));
}

test.each(CAS)('%s : chaque colonne citee est un champ', (_chemin, ressource) => {
    const noms = nomsDe(ressource);
    expect(noms.size, 'champs en double').toBe(ressource.champs.length);
    const citees = [...ressource.liste, ...ressource.cle, ...(ressource.recherche ?? []), ...(ressource.filtres ?? []), ...(ressource.triables ?? []), ...(ressource.tri === undefined ? [] : [ressource.tri.colonne])];
    for (const nom of citees) expect(noms.has(nom), `${nom} n'est pas un champ`).toBe(true);
    expect(colonnesTriables(ressource).every((nom) => noms.has(nom))).toBe(true);
});

test.each(CAS)('%s : les filtres, la recherche et le campus visent des champs du bon type', (_chemin, ressource) => {
    for (const nom of ressource.filtres ?? []) expect(TYPES_DE_FILTRE.has(champDe(ressource, nom)?.type.type ?? ''), `filtre ${nom}`).toBe(true);
    for (const nom of ressource.recherche ?? []) expect(TYPES_DE_RECHERCHE.has(champDe(ressource, nom)?.type.type ?? ''), `recherche ${nom}`).toBe(true);
    if (ressource.campus !== undefined) {
        const champ = champDe(ressource, ressource.campus.colonne);
        expect(champ?.type.type, `campus sur ${ressource.campus.colonne}`).toBe(ressource.campus.type === 'ciblage' ? 'etablissements' : 'texte');
    }
});

test.each(CAS)('%s : la colonne soeur d une image existe', (_chemin, ressource) => {
    const noms = nomsDe(ressource);
    for (const champ of ressource.champs) {
        if (champ.type.type === 'image' && champ.type.blurhash !== undefined) expect(noms.has(champ.type.blurhash), `blurhash de ${champ.nom}`).toBe(true);
    }
});

test.each(CAS)('%s : une focale vise une image et un ajustement a choix, qui s ecrivent', (_chemin, ressource) => {
    for (const champ of ressource.champs) {
        if (champ.type.type !== 'focale') continue;
        expect(champDe(ressource, champ.type.image)?.type.type, `image de ${champ.nom}`).toBe('image');
        const ajustement = champDe(ressource, champ.type.ajustement);
        expect(ajustement?.type.type, `ajustement de ${champ.nom}`).toBe('choix');
        expect(ajustement?.lectureSeule, `ajustement de ${champ.nom} doit s'ecrire`).not.toBe(true);
    }
});
