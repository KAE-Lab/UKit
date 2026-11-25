/** Le code QR d'un lien d'ami : il se trace sans le decodeur Shift-JIS, absent de Hermes. */

import { afterEach, describe, expect, it } from 'vitest';

import { MARGE, traceDuCodeQr } from './codeQr';

const Origine = globalThis.TextDecoder;

afterEach(() => {
    globalThis.TextDecoder = Origine;
});

describe('traceDuCodeQr', () => {
    it('trace un lien de deux semaines chargees quand le systeme ne connait que l UTF-8, comme Hermes', () => {
        globalThis.TextDecoder = class extends Origine {
            constructor(encodage?: string) {
                if (encodage !== undefined && !/^utf-?8$/i.test(encodage)) throw new RangeError(`Unknown encoding: ${encodage}`);
                super(encodage);
            }
        } as typeof TextDecoder;
        const lien = `https://ukit-bordeaux.fr/ami#v=1&e=bordeaux-inp&n=L%C3%A9a&d=20261125&o=${'AeAo'.repeat(40)}`;
        const { trace, cote } = traceDuCodeQr(lien);
        expect(trace.startsWith(`M${MARGE} ${MARGE}h1v1h-1z`)).toBe(true);
        // La version 11 (61 modules) au niveau M porte jusqu'a 251 octets : deux semaines chargees y tiennent.
        expect(cote).toBe(61 + MARGE * 2);
    });
});
