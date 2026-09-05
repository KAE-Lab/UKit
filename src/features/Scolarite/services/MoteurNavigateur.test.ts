import { describe, expect, it } from 'vitest';

import { surLeNavigateur } from './MoteurNavigateur';

/**
 * Ces tests existent parce que la regle qu'ils tiennent a casse quelque chose de visible.
 *
 * Le 2026-08-29, sur appareil : une connexion refusee parce qu'une chronologie Moodle se
 * rafraichissait, et un widget rendant `LOGIN_FAILED` sur des identifiants valides parce que la
 * deconnexion naviguait la vue partagee sous lui. Rien de tout ca n'etait couvert — le verrou n'avait
 * pas de test, et sa politique tenait dans un booleen.
 */

/** Un run qui dure jusqu'a ce qu'on le libere, et qui dit s'il a ete abandonne. */
function runPilote() {
    let liberer: () => void = () => undefined;
    const fini = new Promise<void>((resolve) => { liberer = resolve; });
    const vu = { abandonne: false, joue: false };

    const tache = async (signal: AbortSignal) => {
        vu.joue = true;
        signal.addEventListener('abort', () => { vu.abandonne = true; });
        await fini;
        return 'fini';
    };

    return { tache, liberer: () => liberer(), vu };
}

/** Laisse la boucle d'evenements tourner, pour qu'une reservation en attente puisse se poser. */
const tourDeBoucle = () => new Promise((resolve) => { setTimeout(resolve, 0); });

describe('surLeNavigateur', () => {
    it('joue quand le moteur est libre', async () => {
        const resultat = await surLeNavigateur('seul', async () => 'valeur');

        expect(resultat).toEqual({ ok: true, valeur: 'valeur' });
    });

    it('libere le moteur meme quand la tache leve', async () => {
        await expect(surLeNavigateur('casse', async () => { throw new Error('boum'); }))
            .rejects.toThrow('boum');

        // Sans le `finally`, le moteur resterait pris pour toujours apres le premier echec.
        await expect(surLeNavigateur('ensuite', async () => 'ok'))
            .resolves.toEqual({ ok: true, valeur: 'ok' });
    });

    it('fait patienter une lecture d’arriere-plan derriere une autre', async () => {
        const premier = runPilote();
        const enVol = surLeNavigateur('widget-1', premier.tache);
        await tourDeBoucle();

        const second = runPilote();
        const attente = surLeNavigateur('widget-2', second.tache);
        await tourDeBoucle();
        expect(second.vu.joue).toBe(false);

        premier.liberer();
        await enVol;
        await tourDeBoucle();
        expect(second.vu.joue).toBe(true);
        expect(premier.vu.abandonne).toBe(false);

        second.liberer();
        await attente;
    });

    it('**une session prend la main sur une lecture d’arriere-plan**', async () => {
        const lecture = runPilote();
        const enVol = surLeNavigateur('widget', lecture.tache);
        await tourDeBoucle();

        const session = surLeNavigateur('connexion', async () => 'connecte', { priorite: 'session' });

        // La lecture est priee de s'arreter ; elle ne se termine ici que parce que le double la
        // libere, mais le signal, lui, est bien parti.
        await tourDeBoucle();
        expect(lecture.vu.abandonne).toBe(true);
        lecture.liberer();
        await enVol;

        expect(await session).toEqual({ ok: true, valeur: 'connecte' });
    });

    it('**une session n’est pas doublee** par la lecture qui attendait derriere celle qu’elle interrompt', async () => {
        const premiere = runPilote();
        const enVol1 = surLeNavigateur('documents', premiere.tache);
        await tourDeBoucle();

        // Cette lecture-ci attend deja : inscrite sur le run en vol AVANT la session, elle sera donc
        // reveillee AVANT elle quand la premiere cedera.
        const seconde = runPilote();
        const enVol2 = surLeNavigateur('moodle', seconde.tache);
        await tourDeBoucle();
        expect(seconde.vu.joue).toBe(false);

        const session = surLeNavigateur('deconnexion', async () => 'fermee', { priorite: 'session' });
        await tourDeBoucle();
        expect(premiere.vu.abandonne).toBe(true);

        premiere.liberer();
        await enVol1;
        await tourDeBoucle();

        /*
         * La course du 2026-09-04, telle qu'elle se joue : `moodle` se reveille en premier et
         * reserve, et la session — qui avait vu le moteur libre le temps d'un tour de micro-taches —
         * rendait `{ ok: false, occupePar: 'moodle' }` sans avoir jamais joue son Blueprint. Elle doit
         * au contraire faire ceder cette lecture-la aussi : c'est un geste de l'utilisateur, et il
         * n'a pas de seconde chance.
         */
        expect(seconde.vu.joue).toBe(true);
        expect(seconde.vu.abandonne).toBe(true);
        seconde.liberer();
        await enVol2;

        expect(await session).toEqual({ ok: true, valeur: 'fermee' });
    });

    it('**une session refuse une autre session**, et le dit', async () => {
        const premiere = runPilote();
        const enVol = surLeNavigateur('session-1', premiere.tache, { priorite: 'session' });
        await tourDeBoucle();

        const seconde = await surLeNavigateur('session-2', async () => 'jamais', { priorite: 'session' });

        // Deux sessions concurrentes restent une erreur de programmation : le refus doit rester
        // bruyant, et nommer le conflit plutot que de faire patienter en silence.
        expect(seconde).toEqual({ ok: false, occupePar: 'session-1' });
        expect(premiere.vu.abandonne).toBe(false);

        premiere.liberer();
        await enVol;
    });

    it('relaie l’annulation de l’appelant a la tache', async () => {
        const controleur = new AbortController();
        const run = runPilote();
        const enVol = surLeNavigateur('widget', run.tache, { signal: controleur.signal });
        await tourDeBoucle();

        controleur.abort();
        expect(run.vu.abandonne).toBe(true);

        run.liberer();
        await enVol;
    });

    it('remet un signal deja arme quand l’appelant a annule avant l’appel', async () => {
        const controleur = new AbortController();
        controleur.abort();
        let dejaArme: boolean | null = null;

        const resultat = await surLeNavigateur(
            'widget',
            async (signal) => { dejaArme = signal.aborted; return 'joue'; },
            { signal: controleur.signal },
        );

        // La tache est bien jouee — constater l'annulation est le travail du moteur, pas du verrou —
        // mais elle recoit un signal **deja** arme. L'ecouter ne suffirait pas : un `abort` anterieur
        // ne declenche aucun evenement, il faut lire `aborted`.
        expect(resultat).toEqual({ ok: true, valeur: 'joue' });
        expect(dejaArme).toBe(true);
    });
});
