/**
 * `ukit/no-style-literals` — la regle qui rend la derive visuelle impossible.
 *
 * Le README et le CONTRIBUTING demandent depuis toujours qu'aucune valeur de style ne soit ecrite en
 * dur. Cette regle-la etait ecrite dans un document, et un document ne tient pas : au 2026-08-16 le
 * depot portait 53 couleurs hexadecimales et 142 valeurs numeriques en dur
 * (docs/inventaire-visuel.md). Elle est desormais executable.
 *
 * **Elle nomme le remplacement.** Un `no-restricted-syntax` aurait suffi a interdire ; une regle qui
 * dit « 4 : utiliser tokens.space.xs » se corrige au lieu de se desactiver. C'est la seule raison pour
 * laquelle elle est ecrite a la main plutot que configuree.
 *
 * **Ce qu'elle ne couvre pas, et pourquoi.** Ni `width`, ni `height`, ni les tailles d'icone : le
 * depot n'a **aucune echelle** pour eux, et en inventer une depasserait le mandat du jalon 6-K —
 * extraire ce qui est la, pas dessiner ce qui manque. Les 13 tailles d'icone mesurees sont consignees
 * dans l'inventaire et laissees aux sessions d'ecran.
 *
 * Zero dependance ajoutee : elle est branchee en plugin inline dans `eslint.config.mjs`.
 */

/**
 * Les echelles, **miroir** de `tokens` dans `src/shared/theme/Theme.ts`.
 *
 * Une copie ne peut pas deriver en silence : `no-style-literals.test.ts` importe les deux et echoue
 * si elles divergent. Meme reflexe que le fuseau fige de `vitest.config.ts` — verrouiller ce qui
 * casserait sans bruit.
 */
export const ECHELLES = {
    space: { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
    fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, title: 34 },
};

/** La propriete de style → l'echelle qui la gouverne. */
const PROPRIETES = new Map([
    ...['padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
        'paddingHorizontal', 'paddingVertical', 'paddingStart', 'paddingEnd',
        'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
        'marginHorizontal', 'marginVertical', 'marginStart', 'marginEnd',
        'gap', 'rowGap', 'columnGap'].map((p) => [p, 'space']),
    ['borderRadius', 'radius'],
    ['borderTopLeftRadius', 'radius'],
    ['borderTopRightRadius', 'radius'],
    ['borderBottomLeftRadius', 'radius'],
    ['borderBottomRightRadius', 'radius'],
    ['fontSize', 'fontSize'],
]);

const HEXADECIMAL = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Le nom de token qui vaut exactement cette valeur, s'il existe. */
function tokenExact(echelle, valeur) {
    const entree = Object.entries(ECHELLES[echelle]).find(([, v]) => v === valeur);
    return entree ? `tokens.${echelle}.${entree[0]}` : null;
}

/** Les deux pas les plus proches, quand aucun ne tombe juste. */
function tokensVoisins(echelle, valeur) {
    return Object.entries(ECHELLES[echelle])
        .sort((a, b) => Math.abs(a[1] - valeur) - Math.abs(b[1] - valeur))
        .slice(0, 2)
        .map(([nom, v]) => `tokens.${echelle}.${nom} (${v})`)
        .join(' ou ');
}

/** Le nom d'une propriete d'objet, quelle que soit sa forme d'ecriture. */
function nomDePropriete(node) {
    if (node.computed) return null;
    if (node.key.type === 'Identifier') return node.key.name;
    if (node.key.type === 'Literal' && typeof node.key.value === 'string') return node.key.value;
    return null;
}

/** La valeur numerique d'un noeud, y compris ecrite en negatif. */
function valeurNumerique(node) {
    if (node.type === 'Literal' && typeof node.value === 'number') return node.value;
    if (node.type === 'UnaryExpression' && node.operator === '-') {
        const interne = valeurNumerique(node.argument);
        return interne === null ? null : -interne;
    }
    return null;
}

export const noStyleLiterals = {
    meta: {
        type: 'suggestion',
        docs: {
            description:
                "Refuse les valeurs de style ecrites en dur : couleurs hexadecimales, et valeurs de "
                + "marge, de rayon ou de taille de texte hors de l'echelle de tokens.",
        },
        schema: [],
        messages: {
            couleur:
                "Couleur en dur « {{valeur}} » : utiliser une cle du theme (docs/theme.md). "
                + "Pour un etat, `theme.success`, `theme.warning`, `theme.danger` ou `theme.neutral`.",
            tokenExact: "« {{propriete}}: {{valeur}} » : utiliser {{token}}.",
            tokenAbsent:
                "« {{propriete}}: {{valeur}} » : aucun token ne vaut cette valeur. "
                + "Utiliser {{voisins}}, ou justifier par une desactivation locale commentee.",
        },
    },

    create(context) {
        return {
            Literal(node) {
                if (typeof node.value !== 'string' || !HEXADECIMAL.test(node.value)) return;
                context.report({ node, messageId: 'couleur', data: { valeur: node.value } });
            },

            Property(node) {
                const propriete = nomDePropriete(node);
                if (propriete === null) return;

                const echelle = PROPRIETES.get(propriete);
                if (echelle === undefined) return;

                const valeur = valeurNumerique(node.value);
                if (valeur === null) return;

                // `0` neutralise une mise en page heritee — un rembourrage de `TextInput`, une marge
                // que l'on annule. Ce n'est pas un pas d'echelle et lui en donner un serait faux.
                if (valeur === 0) return;

                const token = tokenExact(echelle, valeur);
                if (token !== null) {
                    context.report({
                        node: node.value,
                        messageId: 'tokenExact',
                        data: { propriete, valeur, token },
                    });
                    return;
                }

                context.report({
                    node: node.value,
                    messageId: 'tokenAbsent',
                    data: { propriete, valeur, voisins: tokensVoisins(echelle, valeur) },
                });
            },
        };
    },
};

export default { rules: { 'no-style-literals': noStyleLiterals } };
