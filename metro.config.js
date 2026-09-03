/**
 * La configuration Metro : celle d'Expo, plus une extension d'asset.
 *
 * Metro traite `.mjs` comme du **source** — il le compilerait et l'embarquerait dans le bundle de
 * l'application. Or pdf.js ne s'execute pas dans l'application : il s'execute dans la WebView du
 * lecteur de documents (features/Scolarite/screens/DocumentViewerScreen.tsx), qui a besoin du texte
 * de la bibliotheque tel quel. Un fichier servi tel quel est un asset, et `txt` est la seule extension
 * neutre qu'un asset de texte puisse porter : les deux fichiers vendorises de `assets/pdfjs/` sont
 * donc des `.txt`, octet pour octet ceux du paquet (tools/pdfjs/vendor.mjs, et un test le verifie).
 *
 * Rien d'autre n'est configure, et c'est deliberé : Metro n'avait besoin d'aucune configuration
 * jusqu'ici (docs/phase-6/6-a-socle.md), et ce fichier ne doit pas devenir l'endroit ou l'on empile.
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('txt');

module.exports = config;
