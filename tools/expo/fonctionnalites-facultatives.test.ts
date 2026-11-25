import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
type Fonctionnalite = { $: Record<string, string> };
type Manifeste = { manifest: { 'uses-feature'?: Fonctionnalite[] } };
const { declarerFacultatives } = require('./fonctionnalites-facultatives.js') as {
    declarerFacultatives: (manifeste: Manifeste) => Manifeste;
};

const nommees = (manifeste: Manifeste) => manifeste.manifest['uses-feature'] ?? [];

describe('fonctionnalites-facultatives', () => {
    it('declare le portrait et le Wi-Fi facultatifs dans un manifeste qui n\'en dit rien', () => {
        const manifeste = declarerFacultatives({ manifest: {} });
        expect(nommees(manifeste)).toEqual([
            { $: { 'android:name': 'android.hardware.screen.portrait', 'android:required': 'false' } },
            { $: { 'android:name': 'android.hardware.wifi', 'android:required': 'false' } },
        ]);
    });

    it('remplace une declaration qui les exigerait, et garde les autres', () => {
        const manifeste = declarerFacultatives({
            manifest: {
                'uses-feature': [
                    { $: { 'android:name': 'android.hardware.wifi', 'android:required': 'true' } },
                    { $: { 'android:name': 'android.hardware.camera', 'android:required': 'false' } },
                ],
            },
        });
        const wifi = nommees(manifeste).filter((f) => f.$['android:name'] === 'android.hardware.wifi');
        expect(wifi).toEqual([{ $: { 'android:name': 'android.hardware.wifi', 'android:required': 'false' } }]);
        expect(nommees(manifeste).some((f) => f.$['android:name'] === 'android.hardware.camera')).toBe(true);
    });

    it('ne s\'applique qu\'une fois', () => {
        const une = declarerFacultatives({ manifest: {} });
        expect(nommees(declarerFacultatives(structuredClone(une)))).toEqual(nommees(une));
    });
});
