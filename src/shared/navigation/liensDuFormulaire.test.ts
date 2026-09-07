import { describe, expect, it } from 'vitest';

import { DOMAINES_DU_FORMULAIRE, parametresDuFormulaire, resteDansLaVue } from './liensDuFormulaire';

describe('resteDansLaVue', () => {
    it('garde Google et ses sous-domaines, et la redirection de forms.gle', () => {
        expect(resteDansLaVue('https://forms.gle/c8vpwBu1QpowkAKC8', DOMAINES_DU_FORMULAIRE)).toBe(true);
        expect(resteDansLaVue('https://docs.google.com/forms/d/e/x/viewform', DOMAINES_DU_FORMULAIRE)).toBe(true);
        expect(resteDansLaVue('https://accounts.google.com/signin', DOMAINES_DU_FORMULAIRE)).toBe(true);
        expect(resteDansLaVue('https://www.gstatic.com/x.js', DOMAINES_DU_FORMULAIRE)).toBe(true);
    });

    it('envoie dehors ce qui n est pas chez Google', () => {
        expect(resteDansLaVue('https://ukit-bordeaux.fr/engagement.html', DOMAINES_DU_FORMULAIRE)).toBe(false);
        expect(resteDansLaVue('https://github.com/KAE-Lab/UKit', DOMAINES_DU_FORMULAIRE)).toBe(false);
        expect(resteDansLaVue('https://notgoogle.com/', DOMAINES_DU_FORMULAIRE)).toBe(false);
        expect(resteDansLaVue('https://google.com.exemple.test/', DOMAINES_DU_FORMULAIRE)).toBe(false);
    });

    it('laisse la vue decider d une adresse sans hote', () => {
        expect(resteDansLaVue('about:blank', DOMAINES_DU_FORMULAIRE)).toBe(true);
    });
});

describe('parametresDuFormulaire', () => {
    it('porte l adresse et les domaines internes', () => {
        expect(parametresDuFormulaire('https://forms.gle/x')).toEqual({ href: 'https://forms.gle/x', domainesInternes: DOMAINES_DU_FORMULAIRE });
    });
});
