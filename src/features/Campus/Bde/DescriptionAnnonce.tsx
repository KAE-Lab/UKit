/**
 * La description d'une annonce : un mini-langage publiable, rendu dans le vocabulaire des fiches.
 *
 * Un paragraphe nu ne donne pas envie d'etre lu, et un simple encadre n'y changeait rien : ce qui
 * aiguille dans le reste de l'application, ce sont les **tetes de section colorees** (l'icone dans
 * son carre teinte des fiches de restaurant et de BU) et les **lignes a puce** des menus. La
 * description parle donc cette langue-la — et comme tout vient du texte publie, un BDE peut
 * structurer et colorer son annonce **sans release**.
 *
 * ## La grammaire (une ligne = une regle, tout le reste est du texte)
 *
 *   | ligne             | rendu |
 *   |-------------------|-------|
 *   | `# Titre`         | une section : tete coloree, icone par defaut |
 *   | `# icone\|Titre`  | idem, avec l'icone MaterialCommunityIcons nommee (`calendar-check`, `map-marker`…) |
 *   | `- element`       | une puce, rendue comme les plats d'un menu |
 *   | `-- element`      | une sous-puce, indentee, au point plus discret |
 *   | `--- element`     | un troisieme niveau, au tiret — la profondeur s'arrete la |
 *   | `> phrase`        | une exergue : la citation en grand, filet teinte a gauche — le pull-quote de presse |
 *   | `= phrase`        | une transition : la phrase calee a droite, en plus grand — le contrepoint qui relance la lecture |
 *   | `~ nom`           | une signature : alignee a droite, teintee — la fin d'une lettre |
 *   | ligne vide        | separation de paragraphes |
 *
 * Et dans le corps — paragraphes et puces — `**mots**` passent en gras : le seul enrichissement en
 * ligne, pour appuyer un mot sans changer de registre.
 *
 * L'article se clot sur une marque de fin (le point teinte des colonnes de presse) — sauf quand une
 * signature termine le texte : un nom qui signe est deja une fin, deux marqueurs se disputeraient
 * la derniere ligne.
 *
 * Une icone inconnue rend le glyphe `?` de la famille — visible a la relecture de l'annonce, donc
 * corrigeable a la publication, jamais un plantage.
 *
 * ## Une annonce, une couleur
 *
 * Toutes les tetes prennent la couleur d'identite de l'annonce (`couleur` en base) — celle de la
 * pastille d'emetteur et de l'accroche. Le **cycle** de palette a ete essaye et defait (2026-08-31) :
 * sur une annonce longue il balayait la palette entiere, sept sections sept couleurs, et le rouge —
 * la couleur de danger de l'application — tombait sur des contenus neutres. L'index 4 reste interdit,
 * comme partout : il duplique le 0 en theme sombre.
 *
 * ## Le texte se pose sur le fond, pas dans des cartes
 *
 * La carte grise autour de chaque contenu de section a ete essayee et defaite (2026-08-31) : sur
 * une annonce longue, l'empilement de rectangles bordes se lisait comme un tableau de bord de
 * widgets, pas comme un texte. Les tetes colorees suffisent a structurer — c'est une page qui se
 * lit, la grammaire est celle d'un article.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { GlypheFiligrane } from '../../../shared/ui/GlypheFiligrane';
import { CampusSectionHeader } from '../components/CampusSectionHeader';

/** Les index utilisables de `sectionsHeaders` — le 4 duplique le 0 en theme sombre. */
const PALETTE = [0, 1, 2, 3, 5] as const;
const ICONE_PAR_DEFAUT = 'text-box-outline';

type ElementDeBloc =
    | { type: 'paragraphe'; texte: string }
    | { type: 'puce'; texte: string; niveau: 1 | 2 | 3 }
    | { type: 'exergue'; texte: string }
    | { type: 'transition'; texte: string }
    | { type: 'signature'; texte: string };

interface BlocAnnonce {
    titre: string | null;
    icone: string | null;
    contenu: ElementDeBloc[];
}

/** La couleur des sections : l'identite de l'annonce, validee contre la palette (4 interdit). */
function couleurDIdentite(depart: number | undefined): number {
    return PALETTE.includes(depart as typeof PALETTE[number]) ? (depart as number) : PALETTE[0];
}

/** `icone|Titre` ou `Titre` seul : le pipe separe, il ne s'ecrit pas dans un intitule. */
function lireTitre(brut: string): { titre: string; icone: string | null } {
    const separateur = brut.indexOf('|');
    if (separateur === -1) return { titre: brut.trim(), icone: null };
    return { titre: brut.slice(separateur + 1).trim(), icone: brut.slice(0, separateur).trim() || null };
}

/** Les regles a prefixe simple — une ligne, un type. Les titres et les puces ont leur analyse. */
const REGLES_DE_LIGNE = [
    { prefixe: '> ', type: 'exergue' },
    { prefixe: '= ', type: 'transition' },
    { prefixe: '~ ', type: 'signature' },
] as const;

function regleDeLigne(ligne: string): (typeof REGLES_DE_LIGNE)[number] | null {
    return REGLES_DE_LIGNE.find((regle) => ligne.startsWith(regle.prefixe)) ?? null;
}

/**
 * Decoupe la description en blocs. Le tampon de paragraphe se vide a chaque puce, ligne vide, titre
 * ou fin — c'est ce qui permet de melanger librement paragraphes et puces dans une meme section.
 */
export function decouperEnBlocs(texte: string): BlocAnnonce[] {
    const blocs: BlocAnnonce[] = [{ titre: null, icone: null, contenu: [] }];
    let tampon: string[] = [];

    const vider = () => {
        const paragraphe = tampon.join('\n').trim();
        if (paragraphe !== '') blocs[blocs.length - 1].contenu.push({ type: 'paragraphe', texte: paragraphe });
        tampon = [];
    };

    for (const ligne of texte.split('\n')) {
        if (ligne.startsWith('# ')) {
            vider();
            blocs.push({ ...lireTitre(ligne.slice(2)), contenu: [] });
        } else if (ligne.startsWith('- ') || ligne.startsWith('-- ') || ligne.startsWith('--- ')) {
            vider();
            // Le nombre de tirets fait la profondeur — le plus long se teste en premier.
            const niveau = ligne.startsWith('--- ') ? 3 : ligne.startsWith('-- ') ? 2 : 1;
            const puce = ligne.slice(niveau + 1).trim();
            if (puce !== '') blocs[blocs.length - 1].contenu.push({ type: 'puce', texte: puce, niveau });
        } else if (regleDeLigne(ligne) !== null) {
            vider();
            const regle = regleDeLigne(ligne) as (typeof REGLES_DE_LIGNE)[number];
            const contenu = ligne.slice(regle.prefixe.length).trim();
            if (contenu !== '') blocs[blocs.length - 1].contenu.push({ type: regle.type, texte: contenu });
        } else if (ligne.trim() === '') {
            vider();
        } else {
            tampon.push(ligne);
        }
    }
    vider();

    return blocs.filter((bloc) => bloc.titre !== null || bloc.contenu.length > 0);
}

/**
 * Le gras en ligne : `**mots**` dans un texte de corps.
 *
 * Le seul enrichissement au fil du texte — appuyer un mot sans changer de registre. Les `Text`
 * imbriques heritent du style parent, seule la graisse change.
 */
function segmentsDeTexte(texte: string): { gras: boolean; texte: string }[] {
    const segments: { gras: boolean; texte: string }[] = [];
    const motif = /\*\*(.+?)\*\*/g;
    let curseur = 0;
    for (let trouve = motif.exec(texte); trouve !== null; trouve = motif.exec(texte)) {
        if (trouve.index > curseur) segments.push({ gras: false, texte: texte.slice(curseur, trouve.index) });
        segments.push({ gras: true, texte: trouve[1] });
        curseur = trouve.index + trouve[0].length;
    }
    if (curseur < texte.length) segments.push({ gras: false, texte: texte.slice(curseur) });
    return segments;
}

function TexteRiche({ texte, style }: { texte: string; style: import('react-native').TextStyle }) {
    return (
        <Text style={style}>
            {segmentsDeTexte(texte).map((segment, rang) => (
                <Text key={rang} style={segment.gras ? { fontWeight: tokens.fontWeight.bold } : null}>
                    {segment.texte}
                </Text>
            ))}
        </Text>
    );
}

/**
 * L'exergue : le pull-quote — la phrase en grand, texte du theme, un filet teinte a gauche.
 *
 * La regle d'ensemble des emphases (2026-08-31) : les TEXTES ne jouent que sur la taille et la
 * graisse, dans la couleur du texte ; la couleur vit dans de petits elements — filets et traits.
 * Trois formes defaites avant celle-ci : texte teinte + guillemet geant en filigrane (trois signes
 * a la fois, le guillemet rogne par la hauteur du bloc, l'ensemble en brouillon de styles), puis la
 * phrase centree entre deux filets horizontaux — trop ceremonielle au milieu d'une lettre.
 */
function Exergue({ texte, teinte, theme }: { texte: string; teinte: string; theme: AppThemeType }) {
    return (
        <View style={{
            borderLeftWidth: 3,
            borderLeftColor: teinte,
            paddingLeft: tokens.space.md,
            marginVertical: tokens.space.sm,
        }}>
            <Text style={{
                fontSize: tokens.fontSize.xl,
                fontWeight: tokens.fontWeight.semibold,
                color: theme.font,
                lineHeight: 30,
            }}>
                {texte}
            </Text>
        </View>
    );
}

/**
 * La transition : la phrase en plus grand, sous un court trait teinte — le « crosshead » de presse.
 *
 * L'emphase moyenne entre le paragraphe et l'exergue, nee d'une phrase de liaison trop longue pour
 * l'une et trop importante pour le corps (« Maintenant, passons aux fameuses sections »). Deux
 * formes essayees et defaites le meme jour : le surligneur a fond teinte faisait etiquette, pas
 * emphase ; la bascule a droite ne passait pas a la lecture. C'est l'ESPACE qui fait le travail —
 * la phrase respire plus que le corps — et le trait teinte l'annonce sans crier.
 */
function Transition({ texte, teinte, theme }: { texte: string; teinte: string; theme: AppThemeType }) {
    return (
        // Asymetrique a dessein : collee au texte qu'elle conclut (l'ecart du conteneur suffit),
        // detachee de ce qui suit — symetrique, elle flottait entre les deux sans appartenir a rien.
        <View style={{ marginBottom: tokens.space.md, gap: tokens.space.sm }}>
            <View style={{ width: 32, height: 3, borderRadius: tokens.radius.pill, backgroundColor: teinte }} />
            <Text style={{
                fontSize: tokens.fontSize.lg,
                fontWeight: tokens.fontWeight.semibold,
                color: theme.font,
                lineHeight: 26,
            }}>
                {texte}
            </Text>
        </View>
    );
}

/**
 * La signature : la fin d'une lettre — alignee a droite, teintee, en semibold.
 *
 * Rendue comme un texte de corps la formule de conge se noyait dans le dernier paragraphe ; une
 * lettre se termine par un nom qui se detache, pas par une ligne de plus.
 */
function Signature({ texte, teinte }: { texte: string; teinte: string }) {
    return (
        <Text style={{
            alignSelf: 'flex-end',
            fontSize: tokens.fontSize.lg,
            fontWeight: tokens.fontWeight.semibold,
            color: teinte,
            marginTop: tokens.space.xs,
        }}>
            {texte}
        </Text>
    );
}

/**
 * Une puce : la grammaire des plats d'un menu — le point prend la teinte de sa section.
 *
 * Trois profondeurs, degressives : point, petit point, tiret — chaque niveau s'indente et son
 * signe s'efface un peu, pour que la hierarchie se lise sans compter les retraits.
 */
function Puce({ texte, niveau, teinte, theme }: { texte: string; niveau: 1 | 2 | 3; teinte: string; theme: AppThemeType }) {
    const glyphe = niveau === 1 ? 'circle-medium' : niveau === 2 ? 'circle-small' : 'minus';
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginLeft: (niveau - 1) * tokens.space.lg }}>
            <MaterialCommunityIcons name={glyphe} size={20} color={teinte} style={{ marginTop: tokens.space.xxs, opacity: niveau === 1 ? 1 : 0.7 }} />
            {/* `md`, comme le corps : une puce d'article est du texte de lecture, pas une ligne de
                menu — en `sm` il fallait plisser les yeux. */}
            <TexteRiche
                texte={texte}
                style={{ fontSize: tokens.fontSize.md, color: theme.font, flex: 1, lineHeight: 24, marginLeft: tokens.space.xs }}
            />
        </View>
    );
}

export interface DescriptionAnnonceProps {
    texte: string;
    /** L'identite de l'annonce (`couleur` en base) : la couleur de toutes ses sections. */
    couleurDepart?: number;
    theme: AppThemeType;
}

export function DescriptionAnnonce({ texte, couleurDepart, theme }: DescriptionAnnonceProps) {
    const couleur = couleurDIdentite(couleurDepart);
    const teinte = theme.sectionsHeaders[couleur] ?? theme.accent ?? theme.primary;

    const blocs = decouperEnBlocs(texte);
    // Une signature qui clot le texte EST la fin : la marque de fin s'efface devant elle — deux
    // marqueurs se disputeraient la derniere ligne (voir l'en-tete).
    const dernierBloc = blocs[blocs.length - 1];
    const dernierElement = dernierBloc?.contenu[dernierBloc.contenu.length - 1];
    const signatureClot = dernierElement?.type === 'signature';

    return (
        // `xl` entre sections : le rythme d'un article, pas d'un formulaire — sans cartes pour
        // separer, c'est le blanc qui fait les chapitres.
        <View style={{ gap: tokens.space.xl }}>
            {blocs.map((bloc, index) => {
                // Le premier bloc sans titre est le **lead** : le paragraphe d'ouverture, en plus
                // grand que le corps — c'est lui qui embarque la lecture apres le chapeau.
                const estLeLead = index === 0 && bloc.titre === null;
                // Le bloc qui porte la signature est le pied de la lettre : il recoit la plume en
                // filigrane — une surface unique par annonce, comme le heros et l'exergue, jamais
                // un motif repete.
                const porteLaSignature = bloc.contenu.some((element) => element.type === 'signature');
                return (
                    <View key={index}>
                        {porteLaSignature ? (
                            <GlypheFiligrane icone={{ name: 'feather' }} couleur={teinte} size={64} rayon={0} />
                        ) : null}
                        {bloc.titre !== null ? (
                            <CampusSectionHeader
                                icone={(bloc.icone ?? ICONE_PAR_DEFAUT) as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                                titre={bloc.titre}
                                couleur={couleur}
                                theme={theme}
                                style={{ marginBottom: tokens.space.sm }}
                            />
                        ) : null}
                        {bloc.contenu.length > 0 ? (
                            <View style={{ gap: tokens.space.sm }}>
                                {bloc.contenu.map((element, rang) => {
                                    if (element.type === 'puce') return <Puce key={rang} texte={element.texte} niveau={element.niveau} teinte={teinte} theme={theme} />;
                                    if (element.type === 'exergue') return <Exergue key={rang} texte={element.texte} teinte={teinte} theme={theme} />;
                                    if (element.type === 'transition') return <Transition key={rang} texte={element.texte} teinte={teinte} theme={theme} />;
                                    if (element.type === 'signature') return <Signature key={rang} texte={element.texte} teinte={teinte} />;
                                    return (
                                        // La taille de LECTURE, pas d'etiquette : le corps en `md`
                                        // interligne 26, le lead en `lg` — la typo de presse. En
                                        // `sm` il fallait plisser les yeux sur un texte long.
                                        <TexteRiche
                                            key={rang}
                                            texte={element.texte}
                                            style={estLeLead
                                                ? { fontSize: tokens.fontSize.lg, color: theme.font, lineHeight: 28 }
                                                : { fontSize: tokens.fontSize.md, color: theme.font, lineHeight: 26 }}
                                        />
                                    );
                                })}
                            </View>
                        ) : null}
                    </View>
                );
            })}

            {/* La marque de fin — le « tombstone » des colonnes de presse : un point teinte qui dit
                que l'article est fini, avant que la galerie ou la carte prennent la suite. */}
            {!signatureClot && (
                <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 6, height: 6, borderRadius: tokens.radius.pill, backgroundColor: teinte, opacity: 0.6 }} />
                </View>
            )}
        </View>
    );
}
