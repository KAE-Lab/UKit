/**
 * La session : une impression d'annonce ne compte qu'une fois par session, et une session neuve oublie.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { impressionsNouvelles, nouvelleSession } from './session';

test('une impression ne compte qu une fois par session, et une session neuve oublie', () => {
    const session = nouvelleSession();
    expect(impressionsNouvelles(session, ['a', 'b', 'a'])).toEqual(['a', 'b']);
    expect(impressionsNouvelles(session, ['b', 'c'])).toEqual(['c']);
    expect(impressionsNouvelles(session, [])).toEqual([]);
    expect(impressionsNouvelles(nouvelleSession(), ['a'])).toEqual(['a']);
});
