/**
 * `graisse-du-systeme` — l'application ignore le reglage Android « Texte en gras », pour que chaque
 * texte soit dessine a la largeur ou React Native l'a mesure.
 *
 * **Le probleme, reproduit au banc le 2026-11-16.** Depuis Android 12, « Texte en gras »
 * (Accessibilite, ou l'equivalent du constructeur) pose `Configuration.fontWeightAdjustment` a 300 :
 * chaque `TextView` epaissit sa police au moment de dessiner. Or React Native mesure le texte de son
 * cote (`TextLayoutManager`, avec sa propre `TextPaint`) et cette mesure ignore l'ajustement : aucune
 * source de React Native 0.86 ne le lit. Le texte dessine en gras est plus large que la boite
 * mesuree, et Android coupe ce qui depasse. Sur `ukit` avec le reglage : « Agend », « Apparenc »,
 * « Confidentialit », « Langu », « Etablissemen », et « Reinitialiser l'application » reduit a son
 * premier mot (la fin passe a une ligne que la boite n'a pas). Sans le reglage, rien de coupe : c'est
 * pourquoi le banc ne le voyait pas et les vrais telephones si, la ou leur proprietaire l'a active.
 *
 * **Pourquoi ce n'est pas un defaut d'ecran.** Tous les textes sont touches, et les corrections
 * passees, ecran par ecran (une largeur ici, un `flex` la), deplacaient le symptome sans toucher la
 * cause : aucun style ne rattrape une mesure fausse. La regle qui en decoule est dans
 * docs/qualite.md, « Le texte coupe sur Android ».
 *
 * **Le remede.** L'activite recoit un contexte dont la configuration remet l'ajustement a 0 : le
 * dessin redevient celui de la mesure, partout, saisies comprises. Le prix : sur Android, UKit
 * s'affiche dans la graisse prevue meme quand l'utilisateur a demande du gras au systeme. La taille
 * de police du systeme, elle, reste suivie : React Native la mesure correctement.
 *
 * **Pourquoi pas l'inverse**, mesurer avec l'ajustement : il faudrait corriger `TextLayoutManager`,
 * compile dans l'artefact de React Native qu'Expo telecharge ; un plugin n'y a pas prise. A revoir si
 * React Native lit un jour `fontWeightAdjustment` dans sa mesure.
 *
 * **iOS n'a pas ce probleme** : « Texte en gras » y passe par UIKit, qui mesure et dessine de la meme
 * facon.
 */

const { withMainActivity } = require('expo/config-plugins');

const MARQUE = 'graisse-du-systeme';

const IMPORTS = [
    'import android.content.Context',
    'import android.content.res.Configuration',
    'import android.os.Build',
];

const SURCHARGE = `
  // ${MARQUE} : le dessin du texte a la largeur de la mesure de React Native (tools/expo/graisse-du-systeme.js).
  override fun attachBaseContext(newBase: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && newBase.resources.configuration.fontWeightAdjustment != 0) {
      val configuration = Configuration(newBase.resources.configuration)
      configuration.fontWeightAdjustment = 0
      super.attachBaseContext(newBase.createConfigurationContext(configuration))
      return
    }
    super.attachBaseContext(newBase)
  }
`;

/** Ajoute les imports qui manquent, juste sous la declaration du paquet. */
function ajouterImports(source) {
    const manquants = IMPORTS.filter((ligne) => !source.includes(ligne));
    if (manquants.length === 0) return source;
    return source.replace(/^(package [^\n]+\n)/m, `$1\n${manquants.join('\n')}\n`);
}

function surchargerActivite(source) {
    if (source.includes(MARQUE)) return source;
    const ouverture = /class MainActivity\s*:\s*ReactActivity\(\)\s*\{\n/;
    if (!ouverture.test(source)) {
        // Un gabarit qui a change ne doit pas produire un binaire sans le remede, en silence.
        throw new Error(`[${MARQUE}] MainActivity introuvable : le gabarit d'Expo a change, le plugin est a reprendre.`);
    }
    return ajouterImports(source).replace(ouverture, (debut) => `${debut}${SURCHARGE}`);
}

module.exports = function graisseDuSysteme(config) {
    return withMainActivity(config, (mod) => {
        if (mod.modResults.language !== 'kt') {
            throw new Error(`[${MARQUE}] MainActivity en ${mod.modResults.language}, le plugin n'ecrit que du Kotlin.`);
        }
        mod.modResults.contents = surchargerActivite(mod.modResults.contents);
        return mod;
    });
};

module.exports.surchargerActivite = surchargerActivite;
