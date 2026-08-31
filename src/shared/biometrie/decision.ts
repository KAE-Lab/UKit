/**
 * La seule decision de la biometrie, isolee de la plateforme : apres un echec, propose-t-on le code ?
 *
 * Elle vit a part parce qu'elle doit se verifier sans appareil. `expo-local-authentication` tire
 * `react-native`, donc tout module qui l'importe est injouable sous Node — c'est la meme frontiere
 * que celle qui separe `referentiel.ts` d'`index.ts` du cote des lieux et des visuels
 * (docs/qualite.md). Ce fichier n'importe **rien**.
 *
 * Et c'est bien la chose a verrouiller : une erreur ici ne se voit pas, elle se subit. Trop large,
 * elle ouvre un clavier a quelqu'un qui vient d'appuyer sur Annuler ; trop etroite, elle enferme
 * dehors quelqu'un dont le visage n'a pas ete reconnu.
 *
 * Voir docs/features/scolarite.md.
 */

/**
 * Les codes d'echec, tels que `expo-local-authentication` 17 les nomme.
 *
 * Recopies plutot qu'importes, pour que ce fichier reste sans dependance. La recopie est en partie
 * **verrouillee par le compilateur** : `index.ts` affecte le `error` rendu par la bibliotheque dans un
 * champ de ce type, donc une version qui **ajouterait un code a sa declaration** casserait la
 * compilation plutot que de le laisser tomber en silence dans le repli par defaut (verifie en
 * ajoutant un code fictif : quatre erreurs).
 *
 * **Ce garde a une limite, et elle a servi des la premiere campagne de sonde** : il ne voit que la
 * declaration. La couche native iOS emet `missing_usage_description`, que le `.d.ts` de la version 17
 * **ne declare pas** — mesure sur iPhone le 2026-08-22. Un code sorti de nulle part tombe donc dans le
 * repli, ce qui reste le bon comportement ici, mais silencieusement. D'ou la regle : ce qu'une sonde
 * rapporte prime sur ce qu'un type declare.
 *
 * Attention en lisant d'anciennes notes : `biometry_not_available` et `biometry_lockout`, qui
 * circulent dans la documentation d'iOS et dans les versions anciennes, **n'existent pas** ici. Ce
 * sont `not_available` et `lockout`.
 */
export type ErreurBiometrie =
    | 'not_enrolled'
    | 'user_cancel'
    | 'app_cancel'
    | 'not_available'
    | 'lockout'
    | 'no_space'
    | 'timeout'
    | 'unable_to_process'
    | 'unknown'
    | 'system_cancel'
    | 'user_fallback'
    | 'invalid_context'
    | 'passcode_not_set'
    | 'authentication_failed'
    /**
     * `NSFaceIDUsageDescription` absente de l'`Info.plist` du **conteneur qui execute**.
     *
     * Absent du type publie par la bibliotheque, mais bien emis par sa couche native — et sur ce
     * chemin-la, elle ne demande **rien** au systeme : elle rend l'echec immediatement, sans ouvrir la
     * moindre fenetre. C'est ce qui explique qu'on ne voie jamais Face ID essayer.
     *
     * Ne se produit que sur la politique biometrique seule (`disableDeviceFallback: true`) : avec le
     * repli, la bibliotheque va directement a `deviceOwnerAuthentication`, qui presente le code.
     *
     * **Sous Expo Go, ce verdict ne dit rien de l'application reelle** : le conteneur est Expo Go, avec
     * son propre `Info.plist`. Celui de UKit porte la cle, par `ios.infoPlist` et par la configuration
     * du greffon `expo-local-authentication` (app.config.ts).
     */
    | 'missing_usage_description';

/**
 * Les trois interruptions qui **arretent** la sequence.
 *
 * `user_cancel` est le cas qui decide de la forme du remede : quelqu'un a appuye sur Annuler.
 * Enchainer sur le code transformerait son refus en une seconde demande — c'est-a-dire exactement le
 * comportement qu'on reproche a iOS dans l'autre sens, et un remede qui reproduit le mal n'en est
 * pas un. `app_cancel` et `system_cancel` disent qu'un appel entrant ou une bascule d'application a
 * interrompu la demande : plus personne ne regarde l'ecran.
 */
export const ANNULATIONS: readonly ErreurBiometrie[] = ['user_cancel', 'app_cancel', 'system_cancel'];

/**
 * Faut-il proposer le code de l'appareil apres un echec de la biometrie ?
 *
 * Tout ce qui n'est pas une interruption le merite, et cette largeur est deliberee :
 *
 *   - `user_fallback` — « Utiliser le code ». Le cas nominal, celui pour lequel le second temps
 *     existe ;
 *   - `authentication_failed` — le visage ou le doigt n'a pas ete reconnu ;
 *   - `lockout` — trop d'echecs, le systeme n'accepte plus que le code ;
 *   - `not_enrolled`, `passcode_not_set` — rien n'est enrole ;
 *   - `not_available` — Face ID refuse a l'application, ou cle `NSFaceIDUsageDescription` absente du
 *     conteneur qui execute (Expo Go a le sien, distinct de celui de l'application) ;
 *   - `timeout`, `unable_to_process`, `no_space`, `invalid_context`, `unknown` — la biometrie n'a pas
 *     pu se prononcer.
 *
 * Dans chacun de ces cas le code est la seule porte restante, et la refuser enfermerait dehors
 * quelqu'un qui a le droit d'entrer.
 */
export function doitProposerLeCode(error: ErreurBiometrie | undefined): boolean {
    if (error === undefined) return false;
    return !ANNULATIONS.includes(error);
}
