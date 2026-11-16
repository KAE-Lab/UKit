import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { surchargerActivite } = require('./graisse-du-systeme.js') as { surchargerActivite: (source: string) => string };

const GABARIT = `package com.bordeaux1.emplois

import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}
`;

describe('graisse-du-systeme', () => {
    it('remet fontWeightAdjustment a 0 dans le contexte de l\'activite', () => {
        const source = surchargerActivite(GABARIT);
        expect(source).toContain('override fun attachBaseContext(newBase: Context)');
        expect(source).toContain('configuration.fontWeightAdjustment = 0');
        expect(source).toContain('import android.content.res.Configuration');
        // La surcharge entre dans la classe, avant le reste de son corps.
        expect(source.indexOf('attachBaseContext')).toBeLessThan(source.indexOf('override fun onCreate'));
    });

    it('ne s\'applique qu\'une fois', () => {
        const une = surchargerActivite(GABARIT);
        expect(surchargerActivite(une)).toBe(une);
    });

    it('refuse un gabarit qu\'il ne reconnait pas plutot que de livrer sans le remede', () => {
        expect(() => surchargerActivite('package x\n\nclass Autre : Activity() {\n}\n')).toThrow(/MainActivity introuvable/);
    });
});
