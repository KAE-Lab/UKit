/**
 * « Tes documents » : ce que l'etudiant a **range**, sur son appareil.
 *
 * C'est la seule partie de l'onglet qui **fonctionne sans compte**, et c'est ce qui la justifie :
 * l'onglet ne servait a rien a qui ne se connectait pas, et il etait entierement mort chez un
 * etablissement sans portail publie — « Autre universite ». Elle s'affiche donc **toujours**, quel
 * que soit l'etat de la session.
 *
 * Rien n'est recupere automatiquement, et c'est une limite ecrite, pas un oubli : un Blueprint ne
 * sait pas telecharger un binaire, et les PDF que Bordeaux INP publie portent une URL regeneree a
 * chaque rendu de page (docs/features/scolarite.md). L'etudiant ajoute ses pieces lui-meme.
 */

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import moment from 'moment';

import Translator from '../../../shared/i18n/Translator';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import type { DocumentScolarite } from '../services/DocumentsService';
import { useDocuments } from '../hooks/useDocuments';
import { GroupeScolarite, LigneScolarite } from './LigneScolarite';
import { ConfirmationScolarite } from './ConfirmationScolarite';
import type { IconSpec } from '../../../shared/ui/Icon';

/** Le glyphe d'une piece, d'apres son extension. Le PDF domine ; le reste retombe sur un generique. */
function icone(nom: string): IconSpec {
    const extension = nom.slice(nom.lastIndexOf('.') + 1).toLowerCase();
    if (extension === 'pdf') return { name: 'file-pdf-box' };
    if (['png', 'jpg', 'jpeg', 'heic', 'webp'].includes(extension)) return { name: 'file-image-outline' };
    return { name: 'file-document-outline' };
}

/**
 * Le sous-titre d'une piece : sa date, puis sa taille.
 *
 * Les deux peuvent manquer — le systeme ne les promet pas — et ce qui manque ne s'ecrit pas. Un
 * « 0 Ko » invente serait pire qu'un sous-titre plus court.
 */
function sousTitre(document: DocumentScolarite): string | null {
    const morceaux: string[] = [];
    if (document.ajouteLe !== null) morceaux.push(moment(document.ajouteLe).format('LL'));
    if (document.taille !== null) morceaux.push(`${Math.max(1, Math.round(document.taille / 1024))} Ko`);
    return morceaux.length > 0 ? morceaux.join(' · ') : null;
}

export interface DocumentsSectionProps {
    theme: AppThemeType;
    teinte: string;
}

export function DocumentsSection({ theme, teinte }: DocumentsSectionProps) {
    const { documents, echec, oublierEchec, ajouter, supprimer } = useDocuments(
        Translator.get('DOCUMENT_ADD_FAILED'),
    );
    const [aSupprimer, setASupprimer] = useState<string | null>(null);

    /*
     * Un geste de fichier qui echoue est **transitoire** : il se dit et s'oublie, il ne merite pas un
     * etat d'ecran. `ErrorAlert` est le mecanisme que le depot emploie deja pour ca — et une modale
     * detournee en porte-message aurait demande a l'utilisateur de confirmer une mauvaise nouvelle.
     */
    useEffect(() => {
        if (echec === null) return;
        new ErrorAlert(echec).show();
        oublierEchec();
    }, [echec, oublierEchec]);

    const choisir = async () => {
        const choix = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        // `canceled` est le cas nominal, pas un echec : quelqu'un a ferme le selecteur.
        if (choix.canceled || choix.assets.length === 0) return;
        const piece = choix.assets[0];
        ajouter(piece.uri, piece.name);
    };

    /**
     * Ouvrir une piece, c'est la confier a une autre application.
     *
     * `Sharing` et non un visualiseur maison : afficher un PDF demanderait une dependance de rendu
     * pour refaire ce que le systeme fait deja, et mal. Le fichier ne quitte pas l'appareil — la
     * feuille de partage est locale tant que l'utilisateur ne choisit pas une destination distante.
     */
    const ouvrir = async (document: DocumentScolarite) => {
        if (!(await Sharing.isAvailableAsync())) return;
        await Sharing.shareAsync(document.uri);
    };

    return (
        <>
            <SectionHeader title={Translator.get('MY_DOCUMENTS')} theme={theme} />

            {documents.length === 0 ? (
                <View style={{ marginHorizontal: tokens.space.md }}>
                    {/*
                      * L'etat vide **propose une action**, jamais un bouton Reessayer : reessayer
                      * repare une panne, et il n'y a pas de panne — il n'y a rien encore
                      * (recette d'ecran, point 4).
                      */}
                    <EmptyState
                        icon="folder-outline"
                        title={Translator.get('NO_DOCUMENTS_TITLE')}
                        message={Translator.get('NO_DOCUMENTS')}
                        theme={theme}
                        variant="card"
                        action={{ label: Translator.get('ADD_DOCUMENT'), onPress: choisir }}
                    />
                </View>
            ) : (
                <>
                    <GroupeScolarite theme={theme}>
                        {documents.map((document) => (
                            <LigneScolarite
                                key={document.nom}
                                theme={theme}
                                icon={icone(document.nom)}
                                teinte={teinte}
                                titre={document.nom}
                                sousTitre={sousTitre(document)}
                                onPress={() => { void ouvrir(document); }}
                                droite={
                                    <ActionButton
                                        theme={theme}
                                        variant="destructive"
                                        icon={{ name: 'trash-can-outline' }}
                                        label=""
                                        onPress={() => setASupprimer(document.nom)}
                                        style={{ paddingHorizontal: tokens.space.sm, minHeight: 0 }}
                                    />
                                }
                            />
                        ))}
                    </GroupeScolarite>

                    <ActionButton
                        theme={theme}
                        variant="tonal"
                        icon={{ name: 'plus' }}
                        label={Translator.get('ADD_DOCUMENT')}
                        onPress={() => { void choisir(); }}
                        style={{ marginHorizontal: tokens.space.md, marginTop: tokens.space.sm }}
                    />
                </>
            )}

            <ConfirmationScolarite
                theme={theme}
                visible={aSupprimer !== null}
                titre={Translator.get('DELETE_DOCUMENT')}
                description={Translator.get('CONFIRM_DELETE_DOCUMENT')}
                confirmer={Translator.get('CONFIRM')}
                onClose={() => setASupprimer(null)}
                onConfirm={() => {
                    if (aSupprimer !== null) supprimer(aSupprimer);
                    setASupprimer(null);
                }}
                destructif
            />

        </>
    );
}
