/**
 * La feuille « Signaler » d'une fiche (docs/phase-8/2-signalements.md) : les types que le lieu propose,
 * en options-boutons, et la saisie que certains demandent — le jour de fin d'un etat date, les bons
 * horaires service par service, le niveau de l'attente ou de l'ambiance, le plat du menu du jour.
 * Toucher prepare, Envoyer applique (theme.md) ; aucun texte libre.
 *
 * Le gabarit est celui des modales de choix (`theme.settings.popup`), le seul dialecte de boite de
 * l'application. A la premiere contribution, la feuille montre elle-meme le rappel des regles, au lieu
 * d'ouvrir un second dialogue par-dessus le sien.
 */

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useContext, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View, useWindowDimensions } from 'react-native';

import { ecrireCorrection, formaterMinutes, type Creneau, type ServiceHoraire } from '../../../shared/communaute/horaires';
import { jourDeParis } from '../../../shared/communaute/donnees';
import type { SujetDeLieu } from '../../../shared/communaute/vocabulaire';
import Translator from '../../../shared/i18n/Translator';
import { AppContext } from '../../../shared/services/AppCore';
import { maintenant } from '../../../shared/services/Temps';
import { propsLibelleBouton, tokens, type AppThemeType } from '../../../shared/theme/Theme';
import { Icon } from '../../../shared/ui/Icon';
import { jourDeFin, libelleDeValeur, libelleDOption, nomDuService } from './textes';
import type { SurPlace } from './useSurPlace';

export interface HorairesASaisir {
    /** L'empreinte des horaires que la fiche affiche (horaires.ts). */
    readonly empreinte: string;
    readonly services: readonly ServiceHoraire[];
}

export interface FeuilleDeSignalementProps {
    theme: AppThemeType;
    visible: boolean;
    fermer: () => void;
    sujets: readonly SujetDeLieu[];
    horaires: HorairesASaisir | null;
    plats: readonly string[];
    surPlace: SurPlace;
    ouvrirLesRegles: () => void;
}

/** Ce qu'un etat date peut viser au plus loin, a l'ecran ; la base borne aussi, de son cote. */
const FIN_MAX_JOURS = 30;
/**
 * Des heures de depart plausibles, que l'etudiant corrige : un service de RU, une journee de BU. Elles ne
 * partent jamais telles quelles — un service qu'on n'a pas touche n'est pas dans la correction.
 */
const PAR_DEFAUT: Readonly<Record<ServiceHoraire, { debut: number; fin: number }>> = {
    midi: { debut: 11 * 60 + 30, fin: 13 * 60 + 45 },
    soir: { debut: 18 * 60 + 30, fin: 20 * 60 },
    jour: { debut: 8 * 60 + 30, fin: 19 * 60 },
};

type Saisie = Partial<Record<ServiceHoraire, Creneau>>;
type Selecteur = { readonly quoi: 'fin' } | { readonly quoi: 'heure'; readonly service: ServiceHoraire; readonly borne: 'debut' | 'fin' };

function demain(): string {
    const d = maintenant();
    d.setDate(d.getDate() + 1);
    return jourDeParis(d);
}

function enDate(jour: string): Date {
    const [a, m, j] = jour.split('-').map(Number);
    return new Date(a ?? 1970, (m ?? 1) - 1, j ?? 1);
}

function enHeure(minutes: number): Date {
    const d = maintenant();
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return d;
}

function Option({ theme, libelle, choisie, onPress }: { theme: AppThemeType; libelle: string; choisie: boolean; onPress: () => void }) {
    const popup = theme.settings.popup;
    return (
        <TouchableOpacity onPress={onPress} style={[popup.option, choisie ? popup.optionSelected : null] as never} accessibilityState={{ selected: choisie }}>
            <Text numberOfLines={2} style={[popup.optionText, choisie ? popup.optionTextSelected : null] as never}>{libelle}</Text>
            {/* L'emplacement de la coche est reserve meme au repos, comme aux Reglages. */}
            <View style={styles.coche}>
                {choisie ? <Icon icon={{ family: 'material', name: 'check' }} size={20} color={popup.optionCheckColor as string} /> : null}
            </View>
        </TouchableOpacity>
    );
}

/** Une heure ou un jour a toucher : le selecteur du systeme s'ouvre. */
function Puce({ theme, libelle, onPress, actif = true, choisie = false, estimee = false }: {
    theme: AppThemeType; libelle: string; onPress: () => void; actif?: boolean; choisie?: boolean;
    /** Une heure proposee, pas encore choisie : elle se lit en retrait et ne part pas. */
    estimee?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={!actif}
            hitSlop={tokens.space.xs}
            accessibilityRole="button"
            accessibilityState={{ selected: choisie, disabled: !actif }}
            style={[styles.puce, { backgroundColor: choisie ? theme.primarySoft : theme.greyBackground, borderColor: choisie ? theme.accent : theme.greyBackground, opacity: actif ? 1 : 0.4 }]}
        >
            <Text style={[styles.libelleDePuce, tokens.texte.chiffres, { color: estimee ? theme.fontSecondary : theme.accent }]}>{libelle}</Text>
        </Pressable>
    );
}

/** L'etat de la feuille : le choix, sa saisie, le selecteur du systeme, et l'etape du rappel des regles. */
function useFeuille({ visible, horaires, surPlace, fermer }: Pick<FeuilleDeSignalementProps, 'visible' | 'horaires' | 'surPlace' | 'fermer'>) {
    const [choisi, setChoisi] = useState<SujetDeLieu | null>(null);
    const [niveau, setNiveau] = useState<string | null>(null);
    const [fin, setFin] = useState(demain);
    const [saisie, setSaisie] = useState<Saisie>({});
    const [selecteur, setSelecteur] = useState<Selecteur | null>(null);
    const [regles, setRegles] = useState(false);

    // Une feuille rouverte repart de zero : un choix d'hier ne doit pas partir d'un toucher. A
    // l'ouverture seulement : un rendu de l'ecran hote (le tic de la demi-minute) ne doit rien effacer.
    useEffect(() => {
        if (!visible) return;
        setChoisi(null);
        setNiveau(null);
        setFin(demain());
        setSaisie({});
        setSelecteur(null);
        setRegles(false);
    }, [visible]);

    /** La valeur a envoyer pour le choix courant, ou `null` tant qu'il manque quelque chose. */
    const valeur = (): string | null => {
        if (choisi === null) return null;
        if (choisi.sujet.endsWith('.horaires')) {
            return horaires === null ? null : ecrireCorrection({ empreinte: horaires.empreinte, source: false, services: saisie });
        }
        return choisi.valeurs === null || choisi.normale === null ? niveau : 'oui';
    };

    const creneauDe = (service: ServiceHoraire): { debut: number; fin: number } => {
        const c = saisie[service];
        return c === undefined || c === 'ferme' ? PAR_DEFAUT[service] : c;
    };

    return {
        choisi, niveau, fin, saisie, selecteur, regles, creneauDe,
        pret: valeur() !== null && !surPlace.envoiEnCours,
        choisir: (sujet: SujetDeLieu) => { setChoisi(sujet); setNiveau(null); },
        setNiveau,
        setSelecteur,
        basculerFerme: (service: ServiceHoraire) => setSaisie((s) => {
            const { [service]: avant, ...autres } = s;
            return avant === 'ferme' ? autres : { ...autres, [service]: 'ferme' };
        }),
        quitter: () => {
            if (regles) surPlace.renoncer();
            fermer();
        },
        envoyer: async () => {
            const v = valeur();
            if (choisi === null || v === null) return;
            const resultat = await surPlace.contribuer(choisi.sujet, v, choisi.famille === 'date' ? fin : null);
            if (resultat === 'regles') setRegles(true);
            else fermer();
        },
        surLeSelecteur: (evenement: DateTimePickerEvent, date?: Date) => {
            const courant = selecteur;
            // Android ferme son dialogue de lui-meme ; iOS garde la roue ouverte jusqu'a « Confirmer ».
            if (Platform.OS === 'android') setSelecteur(null);
            if (evenement.type === 'dismissed' || date === undefined || courant === null) return;
            if (courant.quoi === 'fin') {
                setFin(jourDeParis(date));
                return;
            }
            const minutes = date.getHours() * 60 + date.getMinutes();
            setSaisie((s) => ({ ...s, [courant.service]: { ...creneauDe(courant.service), [courant.borne]: minutes } }));
        },
    };
}

type Feuille = ReturnType<typeof useFeuille>;

/** Ce que le choix courant demande de plus : un jour, des horaires, un niveau, un plat. */
function SaisieDuChoix({ theme, feuille, horaires, plats }: { theme: AppThemeType; feuille: Feuille; horaires: HorairesASaisir | null; plats: readonly string[] }) {
    const choisi = feuille.choisi;
    const separateur = Translator.get('TIME_SEPARATOR');
    if (choisi === null) return null;
    if (choisi.famille === 'date') {
        return (
            <View style={styles.saisie}>
                <Text style={[styles.libelleDeSaisie, { color: theme.fontSecondary }]}>{Translator.get('SIGNAL_JUSQU_AU')}</Text>
                <Puce theme={theme} libelle={jourDeFin(feuille.fin)} onPress={() => feuille.setSelecteur({ quoi: 'fin' })} />
            </View>
        );
    }
    if (choisi.sujet.endsWith('.horaires')) {
        return (
            <>
                {(horaires?.services ?? []).map((service) => {
                    const ferme = feuille.saisie[service] === 'ferme';
                    const estimee = feuille.saisie[service] === undefined;
                    const creneau = feuille.creneauDe(service);
                    // Le service et « Ferme » sur une ligne, ses heures dessous : a 360 points, les quatre ne
                    // tiennent pas cote a cote, et « Ferme » partait seul a la ligne.
                    return (
                        <View key={service} style={styles.service}>
                            <View style={styles.saisie}>
                                <Text style={[styles.libelleDeSaisie, { color: theme.fontSecondary }]}>{nomDuService(service)}</Text>
                                <Puce theme={theme} choisie={ferme} libelle={Translator.get('SIGNAL_SERVICE_FERME')} onPress={() => feuille.basculerFerme(service)} />
                            </View>
                            <View style={styles.saisie}>
                                <Puce theme={theme} actif={!ferme} estimee={estimee} libelle={formaterMinutes(creneau.debut, separateur)} onPress={() => feuille.setSelecteur({ quoi: 'heure', service, borne: 'debut' })} />
                                <Text style={{ color: theme.fontSecondary }}>–</Text>
                                <Puce theme={theme} actif={!ferme} estimee={estimee} libelle={formaterMinutes(creneau.fin, separateur)} onPress={() => feuille.setSelecteur({ quoi: 'heure', service, borne: 'fin' })} />
                            </View>
                        </View>
                    );
                })}
            </>
        );
    }
    const plat = choisi.sujet === 'restaurant.plat';
    const sous = plat ? plats : choisi.normale === null ? (choisi.valeurs ?? []) : [];
    return (
        <>
            {sous.map((v) => (
                <Option key={v} theme={theme} libelle={plat ? v : libelleDeValeur(choisi, v)} choisie={feuille.niveau === v} onPress={() => feuille.setNiveau(v)} />
            ))}
        </>
    );
}

/** Le selecteur du systeme : un dialogue sur Android, une roue dans la feuille sur iOS. */
function Selecteur({ feuille }: { feuille: Feuille }) {
    const { themeName } = useContext(AppContext);
    const s = feuille.selecteur;
    if (s === null) return null;
    const max = maintenant();
    max.setDate(max.getDate() + FIN_MAX_JOURS);
    return (
        <DateTimePicker
            value={s.quoi === 'fin' ? enDate(feuille.fin) : enHeure(feuille.creneauDe(s.service)[s.borne])}
            mode={s.quoi === 'fin' ? 'date' : 'time'}
            is24Hour
            minimumDate={s.quoi === 'fin' ? enDate(demain()) : undefined}
            maximumDate={s.quoi === 'fin' ? max : undefined}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            // Sans lui, la roue d'iOS suit l'apparence du systeme, pas celle de l'application (ModMenu).
            themeVariant={themeName === 'dark' ? 'dark' : 'light'}
            onChange={feuille.surLeSelecteur}
        />
    );
}

function PiedDeFeuille({ theme, feuille, surPlace, fermer }: { theme: AppThemeType; feuille: Feuille; surPlace: SurPlace; fermer: () => void }) {
    const popup = theme.settings.popup;
    if (Platform.OS === 'ios' && feuille.selecteur !== null) {
        return (
            <View style={popup.buttonContainer as never}>
                <TouchableOpacity style={popup.buttonMain as never} onPress={() => feuille.setSelecteur(null)}>
                    <Text {...propsLibelleBouton} style={popup.buttonTextMain as never}>{Translator.get('CONFIRM')}</Text>
                </TouchableOpacity>
            </View>
        );
    }
    const inerte = !feuille.regles && !feuille.pret;
    return (
        <View style={popup.buttonContainer as never}>
            <TouchableOpacity style={popup.buttonSecondary as never} onPress={feuille.quitter}>
                <Text {...propsLibelleBouton} style={popup.buttonTextSecondary as never}>{Translator.get('CANCEL')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[popup.buttonMain, inerte ? styles.inerte : null] as never}
                disabled={inerte}
                onPress={() => {
                    if (feuille.regles) void surPlace.confirmerLesRegles().then(fermer);
                    else void feuille.envoyer();
                }}
            >
                <Text {...propsLibelleBouton} style={popup.buttonTextMain as never}>{Translator.get(feuille.regles ? 'REGLES_COMPRIS' : 'SIGNAL_ENVOYER')}</Text>
            </TouchableOpacity>
        </View>
    );
}

export function FeuilleDeSignalement({ theme, visible, fermer, sujets, horaires, plats, surPlace, ouvrirLesRegles }: FeuilleDeSignalementProps) {
    const popup = theme.settings.popup;
    const { height } = useWindowDimensions();
    const feuille = useFeuille({ visible, horaires, surPlace, fermer });

    return (
        <Modal animationType="fade" transparent visible={visible} onRequestClose={feuille.quitter}>
            <TouchableWithoutFeedback onPress={feuille.quitter}>
                <View style={popup.background as never}>
                    <TouchableWithoutFeedback>
                        <View style={popup.container as never}>
                            <View style={popup.header as never}>
                                <Text style={popup.textHeader as never}>{Translator.get(feuille.regles ? 'REGLES_TITRE' : 'SIGNALER')}</Text>
                                <TouchableOpacity onPress={feuille.quitter} hitSlop={tokens.space.sm + tokens.space.xs}>
                                    <Icon icon={{ family: 'material', name: 'close' }} size={24} color={theme.fontSecondary} />
                                </TouchableOpacity>
                            </View>

                            {feuille.regles ? (
                                <>
                                    <Text style={popup.textDescription as never}>{Translator.get('REGLES_CORPS')}</Text>
                                    <TouchableOpacity onPress={() => { feuille.quitter(); ouvrirLesRegles(); }} hitSlop={tokens.space.sm} style={styles.lien}>
                                        <Text style={[styles.texteDuLien, { color: theme.primary }]}>{Translator.get('REGLES_LIRE')}</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <ScrollView style={{ maxHeight: height * 0.55 }} contentContainerStyle={styles.liste}>
                                    {sujets.map((sujet) => (
                                        <React.Fragment key={sujet.sujet}>
                                            <Option theme={theme} libelle={libelleDOption(sujet)} choisie={feuille.choisi?.sujet === sujet.sujet} onPress={() => feuille.choisir(sujet)} />
                                            {feuille.choisi?.sujet === sujet.sujet ? (
                                                <View style={styles.detail}><SaisieDuChoix theme={theme} feuille={feuille} horaires={horaires} plats={plats} /></View>
                                            ) : null}
                                        </React.Fragment>
                                    ))}
                                </ScrollView>
                            )}

                            <Selecteur feuille={feuille} />
                            <PiedDeFeuille theme={theme} feuille={feuille} surPlace={surPlace} fermer={fermer} />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    coche: {
        width: 20,
        marginLeft: tokens.space.sm,
        alignItems: 'flex-end',
    },
    liste: {
        paddingBottom: tokens.space.sm,
    },
    detail: {
        paddingLeft: tokens.space.md,
    },
    saisie: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: tokens.space.sm,
        marginTop: tokens.space.sm,
    },
    libelleDeSaisie: {
        flex: 1,
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
    },
    service: {
        marginTop: tokens.space.sm,
    },
    puce: {
        minHeight: 36,
        borderWidth: 1.5,
        justifyContent: 'center',
        paddingHorizontal: tokens.space.sm + tokens.space.xs,
        borderRadius: tokens.radius.md,
    },
    libelleDePuce: {
        fontSize: tokens.fontSize.md,
        fontWeight: tokens.fontWeight.semibold,
    },
    lien: {
        marginBottom: tokens.space.sm,
    },
    texteDuLien: {
        fontSize: tokens.fontSize.sm,
        fontWeight: tokens.fontWeight.semibold,
    },
    inerte: {
        opacity: 0.4,
    },
});
