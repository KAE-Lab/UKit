import { describe, expect, it } from 'vitest';

import { DOMAINES_DU_FORMULAIRE, destinationReelle, parametresDuFormulaire, remplirGabarit, resteDansLaVue } from './liensDuFormulaire';

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

    // Le cas qui a coute le formulaire : Google Forms ne pose jamais l'adresse ecrite, il pose son
    // redirecteur — qui est chez google.com, donc « interne » pour une regle qui ne lit que l'hote.
    it('juge la destination et non le redirecteur de Google', () => {
        const enveloppe = 'https://www.google.com/url?q=https%3A%2F%2Fukit-bordeaux.fr%2Fengagement.html&sa=D&source=editors';
        expect(resteDansLaVue(enveloppe, DOMAINES_DU_FORMULAIRE)).toBe(false);
    });

    it('garde le redirecteur quand il mene chez Google', () => {
        expect(resteDansLaVue('https://www.google.com/url?q=https%3A%2F%2Fdocs.google.com%2Fforms%2Fx', DOMAINES_DU_FORMULAIRE)).toBe(true);
    });
});

describe('destinationReelle', () => {
    it('rend l adresse telle quelle quand elle n est pas un redirecteur', () => {
        expect(destinationReelle('https://ukit-bordeaux.fr/engagement.html')).toBe('https://ukit-bordeaux.fr/engagement.html');
        expect(destinationReelle('about:blank')).toBe('about:blank');
        // `google.com` sans le chemin `/url` n'est pas un redirecteur : une recherche reste une page.
        expect(destinationReelle('https://www.google.com/search?q=https://ailleurs.test')).toBe('https://www.google.com/search?q=https://ailleurs.test');
    });

    it('defait le redirecteur, quel que soit le nom du parametre', () => {
        expect(destinationReelle('https://www.google.com/url?q=https%3A%2F%2Fexemple.test%2Fa%3Fb%3D1&sa=D'))
            .toBe('https://exemple.test/a?b=1');
        expect(destinationReelle('https://google.fr/url?sa=t&url=https%3A%2F%2Fexemple.test%2F'))
            .toBe('https://exemple.test/');
    });

    it('ne suit rien qui ne soit pas une adresse http', () => {
        expect(destinationReelle('https://www.google.com/url?q=javascript%3Aalert(1)'))
            .toBe('https://www.google.com/url?q=javascript%3Aalert(1)');
        expect(destinationReelle('https://www.google.com/url?q=%E0%A4%A'))
            .toBe('https://www.google.com/url?q=%E0%A4%A');
    });
});

describe('parametresDuFormulaire', () => {
    it('porte l adresse et les domaines internes', () => {
        expect(parametresDuFormulaire('https://forms.gle/x')).toEqual({ href: 'https://forms.gle/x', domainesInternes: DOMAINES_DU_FORMULAIRE });
    });
});

const LONGUE = 'https://docs.google.com/forms/d/e/1FAIpQLScLRZZ5VD3__Zq8pIXuezfacCvSzBHAALHyKq98iM2LzQ6rUg/viewform';
const GABARIT = `${LONGUE}?usp=pp_url&entry.408146347={onglet}&entry.403643659={appareil}&entry.558675343={systeme}&entry.1090115049={version}`;

describe('remplirGabarit', () => {
    it('substitue chaque cle et encode espaces et accents', () => {
        expect(remplirGabarit(GABARIT, { onglet: 'Scolarité', appareil: 'iPhone 13 Pro', systeme: 'iOS 18.5', version: '6.2.2' })).toBe(
            `${LONGUE}?usp=pp_url&entry.408146347=Scolarit%C3%A9&entry.403643659=iPhone%2013%20Pro&entry.558675343=iOS%2018.5&entry.1090115049=6.2.2`,
        );
    });

    it('retire en entier un parametre dont la valeur manque, au milieu comme en fin', () => {
        expect(remplirGabarit(GABARIT, { onglet: 'Campus', appareil: null, systeme: undefined, version: '' })).toBe(
            `${LONGUE}?usp=pp_url&entry.408146347=Campus`,
        );
        expect(remplirGabarit(`${LONGUE}?entry.1={a}`, {})).toBe(LONGUE);
    });

    it('recopie un parametre qui n est pas un gabarit, et laisse intact un gabarit sans accolade', () => {
        const campus = `${LONGUE}?usp=pp_url&entry.82564016=Demander%20un%20campus`;
        expect(remplirGabarit(campus, { onglet: 'Planning' })).toBe(campus);
        expect(remplirGabarit('https://forms.gle/c8vpwBu1QpowkAKC8', { onglet: 'Planning' })).toBe('https://forms.gle/c8vpwBu1QpowkAKC8');
    });

    it('ne touche pas au fragment, et l adresse obtenue reste dans la vue', () => {
        expect(remplirGabarit(`${LONGUE}?entry.1={a}#haut`, { a: 'x' })).toBe(`${LONGUE}?entry.1=x#haut`);
        expect(resteDansLaVue(remplirGabarit(GABARIT, { onglet: 'Planning' }), DOMAINES_DU_FORMULAIRE)).toBe(true);
    });
});
