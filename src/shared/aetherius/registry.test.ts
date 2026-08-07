/**
 * Le registre : le socle embarque resout, sans reseau, et valide ce qu'il rend.
 *
 * Jouable hors appareil parce que la resolution ne depend que du moteur neutre plateforme et des
 * fichiers JSON du socle. Au jalon 6-A il n'y a qu'une source ; ces tests decrivent le contrat que
 * le jalon 6-C devra continuer d'honorer avec deux.
 *
 *     npm test
 */

import { afterEach, expect, test } from 'vitest';

import { ALLOWED_SECRETS, BLUEPRINT, BUNDLED, type BlueprintName } from '../../../blueprints';
import { resolveBlueprint } from './registry';

const NOMS = Object.values(BLUEPRINT) as BlueprintName[];

/** La table est figee par le typage, pas au runtime : quelques tests la detournent puis la rendent. */
type TableMutable = Record<string, { version: string; document: unknown }>;
const INTACT: TableMutable = { ...(BUNDLED as unknown as TableMutable) };

afterEach(() => {
    Object.assign(BUNDLED as unknown as TableMutable, INTACT);
});

test('les six Blueprints du socle resolvent et sont valides', async () => {
    for (const nom of NOMS) {
        const resolved = await resolveBlueprint(nom);

        expect(resolved.name).toBe(nom);
        expect(resolved.origin).toBe('bundled');
        expect(resolved.version).toBe(BUNDLED[nom].version);
        // La validation a lieu a la resolution : un document embarque casse doit echouer ici, ou le
        // diagnostic du jalon 6-C ne saurait pas distinguer un fichier faux d'un run rate.
        expect(resolved.blueprint.name).toBe(nom);
    }
});

test('la resolution ne touche jamais au reseau', async () => {
    const vrai = globalThis.fetch;
    globalThis.fetch = (() => {
        throw new Error('la resolution a appele le reseau');
    }) as typeof fetch;

    try {
        // Un run n'attend pas un CDN pour savoir quoi jouer. La regle sera tentante a violer en 6-C.
        await Promise.all(NOMS.map((nom) => resolveBlueprint(nom)));
    } finally {
        globalThis.fetch = vrai;
    }
});

test('un document invalide echoue a la resolution', async () => {
    const nom = BLUEPRINT.CAMPUS_ANNONCES;
    (BUNDLED as unknown as TableMutable)[nom] = {
        version: '99',
        document: { aetherius: '1.0', name: nom, act: 'vector' },
    };

    await expect(resolveBlueprint(nom)).rejects.toThrow();
});

test('aucun Blueprint embarque ne declare un secret hors du perimetre de l application', async () => {
    for (const nom of NOMS) {
        const { blueprint } = await resolveBlueprint(nom);
        for (const secret of blueprint.secrets ?? []) {
            // Sans cette borne, un fichier publie pourrait reclamer le trousseau et l'exfiltrer par
            // une simple requete. Le socle embarque doit deja la respecter.
            expect(
                (ALLOWED_SECRETS as readonly string[]).includes(secret),
                `${nom} declare un secret hors perimetre : ${secret}`,
            ).toBe(true);
        }
    }
});

test('les annonces embarquent la version corrigee au jalon 6-A', async () => {
    const { blueprint, version } = await resolveBlueprint(BLUEPRINT.CAMPUS_ANNONCES);

    // La version decide de tout en 6-C : le distant ne gagne que s'il est strictement superieur.
    // Une correction embarquee sans montee de version ne pourrait plus etre departagee.
    expect(version).toBe('2');

    const requete = blueprint.steps.find((step) => step.id === 'annonces');
    const champs = (requete as unknown as { extract: { publiees: { fields: Record<string, string> } } })
        .extract.publiees.fields;
    // Le champ que la fiche affiche, et que le fichier d'origine n'extrayait pas.
    expect(champs.desc_longue).toBe('$.long_desc');

    // L'assert de forme : sans lui, une reponse valide sans la cle `annonces` rendrait un succes a
    // liste vide, indistinguable d'une liste legitimement vide.
    expect(blueprint.steps.some((step) => step.action === 'assert')).toBe(true);
});
