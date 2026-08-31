export const URL = {
    MAP: 'https://www.google.com/maps/',
    CONTACT_EMAIL: 'mailto:contact@kaelab.dev',
    UKIT_WEBSITE: 'https://ukit-bordeaux.fr',
    KAELAB_WEBSITE: 'https://kaelab.dev',
    LEGAL_NOTICE: 'https://github.com/KAE-Lab/UKit/blob/master/PRIVACY.md',
    CROUSTILLANT_WEBSITE: 'https://croustillant.menu',
};

// `VERSION_STORE`, `APPLE_APP` et `GOOGLE_APP` vivaient ici : le controle de mise a jour lisait le
// fichier VERSION sur GitHub raw et portait les liens des stores en dur. Le jalon 6-Z les a
// remplaces par la table `app_release` — version courante, lien du store et message par plateforme,
// publies sans release. L'adresse GitHub pointait d'ailleurs une branche `master` renommee depuis :
// le controle echouait en silence a chaque lancement.

// `WebApiURL` vivait ici : le domaine du relais Celcat et ses trois routes. Le jalon 6-E l'a retire
// avec ses deux derniers lecteurs. L'adresse de la source vit desormais dans les six Blueprints
// `ukit.celcat.*` (blueprints/), donc corrigeable sans release — et elle vise l'universite
// directement. Voir docs/sources-externes.md.
