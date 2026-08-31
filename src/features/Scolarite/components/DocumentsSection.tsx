/**
 * Les documents : ce qui est **range** sur l'appareil.
 *
 * C'est la seule partie de l'onglet qui **fonctionne sans compte**, et c'est ce qui la justifie :
 * l'onglet ne servait a rien a qui ne se connectait pas, et il etait entierement mort chez un
 * etablissement sans portail publie — « Autre universite ». Elle s'affiche donc **toujours**, quel
 * que soit l'etat de la session.
 *
 * **Le certificat de scolarite s'y range tout seul** chez les etablissements dont l'adresse des
 * pieces est rejouable (`CertificatService`). Tout le reste est ajoute a la main, et ca reste une
 * limite ecrite : un Blueprint n'ecrit pas de fichier, et les PDF de Bordeaux INP portent une adresse
 * regeneree a chaque rendu de page (docs/features/scolarite.md).
 *
 * **Une piece s'ouvre dans l'application** depuis le 2026-08-29 (`DocumentViewerScreen`), et la
 * feuille de partage devient un second geste au lieu d'etre le seul.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as DocumentPicker from 'expo-document-picker';
import moment from 'moment';

import Translator from '../../../shared/i18n/Translator';
import { tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { ActionButton } from '../../../shared/ui/ActionButton';
import { ErrorAlert } from '../../../shared/ui/Alerts';
import type { DocumentScolarite } from '../services/DocumentsService';
import { useDocuments } from '../hooks/useDocuments';
import { GroupeScolarite, LigneScolarite } from './LigneScolarite';
import { ConfirmationScolarite } from './ConfirmationScolarite';
import type { IconSpec } from '../../../shared/ui/Icon';
import type { RootStackParamList } from '../../../shared/navigation/StackNavigator';

/** L'extension d'un nom de fichier, en minuscules et sans le point. Vide s'il n'y en a pas. */
function extension(nom: string): string {
    const point = nom.lastIndexOf('.');
    return point <= 0 ? '' : nom.slice(point + 1).toLowerCase();
}

/** Le glyphe d'une piece, d'apres son extension. Le PDF domine ; le reste retombe sur un generique. */
function icone(nom: string): IconSpec {
    const type = extension(nom);
    if (type === 'pdf') return { name: 'file-pdf-box' };
    if (['png', 'jpg', 'jpeg', 'heic', 'webp'].includes(type)) return { name: 'file-image-outline' };
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
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

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
     * Ouvrir une piece, c'est desormais l'**afficher**, pas la sortir.
     *
     * L'ecran de lecture s'appuie sur la WebView deja au projet : aucune dependance de rendu ajoutee,
     * et le systeme fait le travail qu'il sait faire. La feuille de partage reste accessible depuis
     * la-bas — elle devient un second geste au lieu d'etre le seul (`DocumentViewerScreen`).
     */
    const ouvrir = (document: DocumentScolarite) => {
        navigation.navigate('DocumentViewer', { uri: document.uri, nom: document.nom });
    };

    return (
        <>
            {/* Plus d'en-tete de section : cette liste a son propre ecran depuis que les documents
                sont entres dans la grille, et la barre de navigation porte deja le titre. */}
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
                                onPress={() => ouvrir(document)}
                                droite={
                                    <ActionButton
                                        theme={theme}
                                        variant="destructive"
                                        icon={{ name: 'trash-can-outline' }}
                                        label=""
                                        onPress={() => setASupprimer(document.nom)}
                                        style={styles.supprimer}
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

const styles = StyleSheet.create({
    supprimer: {
        // Un carre : le bouton n'a pas de libelle, donc rien ne doit l'etirer dans un sens plutot que
        // dans l'autre. `minHeight: 0` seul le laissait plus large que haut.
        width: 36,
        height: 36,
        minHeight: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
});
