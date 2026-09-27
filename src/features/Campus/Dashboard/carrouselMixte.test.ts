/**
 * Le carrousel mixte d'une section de lieux : ses cartes speciales en tete, jamais seules.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { annonceDElement, cartesSpeciales, composerCarrousel } from './carrouselMixte';
import type { BdeAnnonce } from '../services/BdeMapping';

/** Le strict necessaire d'une annonce : ce module ne lit que l'identifiant et les emplacements. */
function annonce(id: string, emplacements: BdeAnnonce['emplacements']): BdeAnnonce {
    return { id, emplacements } as BdeAnnonce;
}

const lieux = [{ id: 'ru-1' }, { id: 'ru-2' }];
const cle = (lieu: { id: string }) => lieu.id;

test('une annonce est speciale dans les carrousels de lieux qu elle nomme, pas dans celui des annonces', () => {
    const annonces = [
        annonce('a', ['annonces']),
        annonce('b', ['annonces', 'restaurants']),
        annonce('c', ['bibliotheques']),
        annonce('d', ['restaurants', 'salles']),
    ];
    expect(cartesSpeciales(annonces, 'restaurants').map((a) => a.id)).toEqual(['b', 'd']);
    expect(cartesSpeciales(annonces, 'bibliotheques').map((a) => a.id)).toEqual(['c']);
    expect(cartesSpeciales(annonces, 'salles').map((a) => a.id)).toEqual(['d']);
});

test('les speciales passent en tete, dans l ordre recu, puis les lieux', () => {
    const elements = composerCarrousel([annonce('x', ['restaurants']), annonce('y', ['restaurants'])], lieux, cle);
    expect(elements.map((e) => e.cle)).toEqual(['annonce:x', 'annonce:y', 'lieu:ru-1', 'lieu:ru-2']);
    expect(elements.map((e) => e.nature)).toEqual(['annonce', 'annonce', 'lieu', 'lieu']);
});

test('une carte speciale n est jamais seule : sans lieu, pas de carrousel', () => {
    expect(composerCarrousel([annonce('x', ['restaurants'])], [], cle)).toEqual([]);
});

test('une annonce et un lieu de meme identifiant gardent des cles distinctes', () => {
    const elements = composerCarrousel([annonce('ru-1', ['restaurants'])], lieux, cle);
    expect(new Set(elements.map((e) => e.cle)).size).toBe(elements.length);
});

test('seule une annonce compte pour les impressions', () => {
    const [speciale, lieu] = composerCarrousel([annonce('x', ['restaurants'])], lieux, cle);
    expect(annonceDElement(speciale)).toBe('x');
    expect(annonceDElement(lieu)).toBeNull();
});
