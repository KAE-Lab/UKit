import React from 'react';
import { Animated, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

import { tokens } from '../../../shared/theme/Theme';
import { withHeaderAnimation } from '../../../shared/navigation/NavHelpers';
import { CourseGroupCarousel } from './CourseCard';
import { DayWeek } from './DayWeekCollapsible';
import { BandeauJourneeEntiere } from './BandeauJourneeEntiere';
import { groupOverlappingCourses } from './ScheduleListUtils';

import { ErrorAlert } from '../../../shared/ui/Alerts';
import { ApparitionEnFondu } from '../../../shared/ui/ApparitionEnFondu';
import { ChargementPlanning, EtatPlanning, FavorisVides, JourneeVide, NoticesPlanning } from './ScheduleListEtats';
import { SourceFailureNotice, type NoticeAction } from '../../../shared/ui/SourceFailureNotice';
import Translator from '../../../shared/i18n/Translator';
import { isConnected } from '../../../shared/services/AppCore'
import { ukitFailure, type UkitFailure } from '../../../shared/aetherius';
import { groupesRequis, lienEdtAttendu, planningAbsent, sourceEdt } from '../../../shared/etablissements';
import { PlanningApiService as FetchManager, type PlanningEvent, type PlanningWeekDay } from '../services/PlanningApiService';
import { PlanningDataManager as DataManager } from '../services/PlanningDataManager';
import { CourseManager, isArraysEquals, SettingsManager } from '../../../shared/services/AppCore';
import { NotificationManager } from '../../../shared/services/NotificationService';
import { fusionnerJour, fusionnerSemaine, joursDeLaSemaine, separerJourneeEntiere, TELEPHONE_VIDE, type TelephoneParJour } from '../services/FusionTelephone';
import { assemblerSemaine } from '../services/PlanningAssembly';
import { lireEvenementsDuTelephone } from '../services/TelephoneSource';
import { CLE_JOUR } from '../services/TelephoneMapping';

export interface ScheduleListProps {
    groupName: string | string[];
    mode: 'day' | 'week';
    target: moment.MomentInput | { week: number; year: number };
    navigation?: import('@react-navigation/native').NavigationProp<Record<string, unknown>>;
    filtersList?: string[];
    theme: import('../../../shared/theme/Theme').AppThemeType;
    onAnimatedScroll?: (event: import('react-native').NativeSyntheticEvent<import('react-native').NativeScrollEvent>) => void;
    /** Change quand le telephone est a relire, sans reseau : retour au premier plan, editeur ferme, choix des calendriers (6.1.x-D). */
    revisionTelephone?: number;
}

export interface ScheduleListState {
    /**
     * Le controleur du run en cours.
     *
     * Il remplace un `axios.CancelToken` qui etait cree, stocke et annule sans jamais etre transmis a
     * un appel : il n'annulait donc rien, et une reponse tardive pouvait ecrire dans l'etat d'un
     * composant demonte. Le moteur, lui, accepte le signal (docs/features/planning.md).
     */
    controller: AbortController | null;
    groupName: string | string[];
    target: moment.MomentInput | { week: number; year: number };
    schedule: import('../services/PlanningApiService').PlanningEvent[] | import('../services/PlanningApiService').PlanningWeekDay[] | null;
    cacheDate: moment.MomentInput | null;
    /** Les groupes favoris que le referentiel ne resout plus. Le planning des autres reste affiche. */
    manquants: readonly string[];
    /** L'echec a afficher quand il n'y a ni reponse ni cache. `null` le reste du temps. */
    failure: UkitFailure | null;
    loading: boolean;
}

type ScheduleData =
    | import('../services/PlanningApiService').PlanningEvent[]
    | import('../services/PlanningApiService').PlanningWeekDay[];

/**
 * L'issue d'un chargement, avant qu'elle ne devienne un etat.
 *
 * Les trois champs sont exclusifs deux a deux : une donnee fraiche (`cacheDate` nul), une donnee de
 * cache (`cacheDate` renseigne, bandeau affiche), ou un echec (`data` nul). Les nommer ensemble evite
 * la troisieme combinaison, celle qui laissait la vue en chargement pour toujours.
 */
interface ScheduleIssue {
    data: ScheduleData | null;
    cacheDate: moment.MomentInput | null;
    manquants?: readonly string[];
    failure: UkitFailure | null;
}

export class ScheduleList extends React.Component<ScheduleListProps, ScheduleListState> {
    _unsubscribe?: () => void;
    /** La derniere issue appliquee : ce que le telephone se remele a sa relecture. */
    private derniereIssue: ScheduleIssue | null = null;
    private demonte = false;

    constructor(props: ScheduleListProps) {
        super(props);
        this.state = {
            controller: null,
            groupName: this.props.groupName,
            target: this.props.mode === 'day' ? moment(this.props.target) : this.props.target,
            schedule: null,
            cacheDate: null,
            manquants: [],
            failure: null,
            loading: false,
        };
    }

    componentDidMount() {
        this.fetchSchedule();
        if (this.props.mode === 'day' && this.props.navigation) {
            this._unsubscribe = this.props.navigation.addListener('focus', () => {
                this.fetchSchedule();
            });
        }
    }

    componentDidUpdate(prevProps: ScheduleListProps, prevState: ScheduleListState) {
        if (this.state.groupName !== prevState.groupName) {
            this.fetchSchedule();
        } else if (this.props.mode === 'day' && this.state.target !== prevState.target) {
            this.fetchSchedule();
        } else if (this.props.mode === 'week' && (this.state.target as { week: number }).week !== (prevState.target as { week: number }).week) {
            this.fetchSchedule();
        } else if (!isArraysEquals(this.props.filtersList || [], prevProps.filtersList || [])) {
            this.fetchSchedule();
        } else if (this.props.revisionTelephone !== prevProps.revisionTelephone) {
            // En dernier : un changement de cible gagne, et charge le telephone avec le reste.
            void this.relireTelephone();
        }
    }

    static getDerivedStateFromProps(nextProps: ScheduleListProps, prevState: ScheduleListState) {
        const nextState: Partial<ScheduleListState> = {};
        if (nextProps.mode === 'day' && nextProps.target !== prevState.target) {
            nextState.target = nextProps.target;
        } else if (nextProps.mode === 'week' && (nextProps.target as { week: number }).week !== (prevState.target as { week: number }).week) {
            nextState.target = nextProps.target;
        }

        const isArrayNext = Array.isArray(nextProps.groupName);
        const isArrayPrev = Array.isArray(prevState.groupName);
        if (isArrayNext !== isArrayPrev) {
            nextState.groupName = nextProps.groupName;
        } else if (isArrayNext && isArrayPrev) {
            if (!isArraysEquals(nextProps.groupName as string[], prevState.groupName as string[])) {
                nextState.groupName = nextProps.groupName;
            }
        } else if (nextProps.groupName !== prevState.groupName) {
            nextState.groupName = nextProps.groupName;
        }

        return Object.keys(nextState).length > 0 ? nextState : null;
    }

    componentWillUnmount() {
        this.demonte = true;
        if (this.state.controller) this.state.controller.abort();
        if (this._unsubscribe) this._unsubscribe();
    }

    getCache = async (id: string) => {
        let cache = await AsyncStorage.getItem(id);
        if (cache !== null) return JSON.parse(cache);
        return null;
    };

    /** La cle de cache : le groupe — ou les favoris joints par `+` — puis la date ou la semaine. */
    cacheId(groupName: string | string[]): string {
        const groupPrefix = Array.isArray(groupName) ? groupName.join('+') : groupName;
        if (this.props.mode === 'day') {
            return `${groupPrefix}@${moment(this.state.target).format('YYYY/MM/DD')}`;
        }
        return `${groupPrefix}@Week${(this.state.target as { week: number }).week}`;
    }

    fetchSchedule = () => {
        if (this.state.loading && this.state.controller) this.state.controller.abort();

        const groupName = this.state.groupName;
        // Aucun favori et une source qui en attend : il n'y a rien a demander. Avec un abonnement
        // colle, en revanche, l'absence de favori est **normale** — le lien porte deja le planning de
        // l'etudiant — et sortir ici laisserait l'onglet vide pour toujours.
        if (groupesRequis() && Array.isArray(groupName) && groupName.length === 0) {
            // Rien a demander a la source — mais le telephone, lui, peut avoir de quoi remplir la
            // journee (6.1.x-D). Sans cette lecture, cocher un calendrier sans suivre un groupe ne
            // montrait jamais rien : l'etat « aucun favori » passait devant (mesure du 2026-09-08).
            const vide: ScheduleData = this.props.mode === 'day' ? [] : assemblerSemaine([], this.joursAffiches()[0]);
            this.setState({ schedule: vide, loading: false, controller: null, failure: null }, async () => {
                const telephone = await this.lireTelephone();
                if (this.demonte) return;
                this.applySchedule({ data: vide, cacheDate: null, manquants: [], failure: null }, telephone, false);
            });
            return;
        }

        const controller = new AbortController();
        const id = this.cacheId(groupName);

        /*
         * **Une relecture de ce qui est deja affiche ne vide pas l'ecran.**
         *
         * Revenir sur l'onglet Planning declenche un rafraichissement (`addListener('focus')`), et il
         * posait `schedule: null` comme n'importe quel chargement : la journee disparaissait, puis
         * revenait **identique**. Le defaut est ancien ; c'est le glissement entre onglets du jalon
         * 6.1-E qui l'a rendu visible, parce qu'on voit desormais la page d'arrivee **pendant** le
         * geste — un changement d'onglet instantane ne laissait pas le temps de voir l'avant.
         *
         * On ne vide donc que lorsque le chargement porte sur **autre chose** : un autre jour, une
         * autre semaine, un autre groupe. Relire la meme cle garde le contenu a l'ecran jusqu'a son
         * remplacement — il est juste, puisque c'est le meme jour —, et l'attente reste silencieuse :
         * ni indicateur, ni fondu, rien qui signale un travail dont le resultat ne changera pas.
         */
        const relecture = this.state.schedule !== null && id === this.idAffiche;

        // Sur une relecture, `schedule` est repose **a sa propre valeur** : rien ne disparait, et rien
        // n'est rendu a nouveau pour autant.
        this.setState({ schedule: relecture ? this.state.schedule : null, failure: null, loading: true, controller }, async () => {
            const issue = await this.loadSchedule(groupName, id, controller.signal);
            // Un run remplace par un plus recent, ou un composant demonte : l'etat ne nous appartient
            // plus, et c'est le run suivant qui l'ecrit.
            if (issue === null) return;
            const telephone = await this.lireTelephone();
            // La lecture du telephone elargit la fenetre d'annulation : le repli hors ligne rend le
            // cache sans regarder le signal, et un run remplace entre-temps ecrirait par-dessus.
            if (controller.signal.aborted || this.demonte) return;
            this.applySchedule(issue, telephone);
        });
    };

    /** Les jours a l'ecran : un seul, ou les six colonnes de la semaine. */
    joursAffiches(): moment.Moment[] {
        return this.props.mode === 'day'
            ? [moment(this.state.target)]
            : joursDeLaSemaine(this.state.target as { week: number; year: number });
    }

    /**
     * Les evenements du telephone pour ce qui est affiche — la vue des favoris seulement : le
     * planning d'un groupe cherche est celui de quelqu'un d'autre.
     */
    lireTelephone(): Promise<TelephoneParJour> {
        if (!Array.isArray(this.state.groupName)) return Promise.resolve(TELEPHONE_VIDE);
        return lireEvenementsDuTelephone(this.joursAffiches());
    }

    /**
     * Relit le telephone seul, sans reseau : au retour au premier plan, apres l'editeur du systeme,
     * quand le choix des calendriers change. Cede a un chargement en cours, qui le lira lui-meme.
     */
    relireTelephone = async () => {
        if (this.state.loading) return;
        // Rien a remeler : le dernier chargement a echoue, et il n'y a que le reseau pour en sortir.
        // Sans ce rattrapage, la vue semaine — qui n'a pas de relecture au focus — restait sur son
        // ecran d'echec meme apres avoir coche un calendrier.
        if (this.derniereIssue === null) {
            this.fetchSchedule();
            return;
        }
        const issue = this.derniereIssue;
        const telephone = await this.lireTelephone();
        if (this.demonte || this.derniereIssue !== issue) return;
        this.applySchedule(issue, telephone, false);
    };

    /**
     * Reseau d'abord des qu'une connexion est detectee, cache date en repli : le flux d'origine, a la
     * lettre. Seule la nature de l'appel du milieu a change.
     *
     * Rend `null` quand le run a ete annule — le seul cas ou il ne faut rien ecrire du tout.
     */
    loadSchedule = async (
        groupName: string | string[],
        id: string,
        signal: AbortSignal,
    ): Promise<ScheduleIssue | null> => {
        if (!(await isConnected())) {
            new ErrorAlert(Translator.get('NO_CONNECTION'), ErrorAlert.durations.SHORT).show();
            return this.cacheOrFailure(id, ukitFailure('unavailable', 'hors ligne, aucun cache pour cette date'));
        }

        if (this.props.mode === 'day') {
            const dateStr = moment(this.state.target).format('YYYY-MM-DD');
            const resultat = await FetchManager.fetchCalendarDay(groupName, dateStr, { signal });
            if (resultat.ok === false) {
                return resultat.failure.silent === true ? null : this.cacheOrFailure(id, resultat.failure);
            }
            return this.keep(id, resultat.courses, resultat.manquants ?? []);
        }

        const semaine = this.state.target as { week: number; year: number };
        const resultat = await FetchManager.fetchCalendarWeek(groupName, semaine, { signal });
        if (resultat.ok === false) {
            return resultat.failure.silent === true ? null : this.cacheOrFailure(id, resultat.failure);
        }
        return this.keep(id, resultat.week, resultat.manquants ?? []);
    };

    /** Une reponse fraiche : elle alimente le cache, comme avant. */
    keep(id: string, data: ScheduleData, manquants: readonly string[] = []): ScheduleIssue {
        AsyncStorage.setItem(id, JSON.stringify({ data, date: moment() }));
        return { data, cacheDate: null, manquants, failure: null };
    }

    /**
     * Le repli : le cache s'il existe, l'echec sinon.
     *
     * Un cache servi **efface** l'echec — l'utilisateur voit sa journee, datee, et n'a rien a faire de
     * la panne. C'est quand il n'y a rien a montrer que l'echec devient l'ecran, au lieu d'un
     * indicateur qui tournait indefiniment avant ce jalon.
     */
    cacheOrFailure = async (id: string, failure: UkitFailure): Promise<ScheduleIssue> => {
        const cache = await this.getCache(id);
        if (cache) {
            return { data: cache.data || cache.dayData || cache.weekData, cacheDate: cache.date, failure: null };
        }
        return { data: null, cacheDate: null, failure };
    };

    /**
     * `telephone` se mele **apres** la derivation, et jamais aux rappels : `preparerPourAffichage`
     * mute le sujet pour en extraire un code d'UE, l'indexation prendrait « 2B Dentiste » pour une UE,
     * et on ne notifie pas un rendez-vous personnel a la place de l'agenda (6.1.x-D).
     */
    applySchedule(issue: ScheduleIssue, telephone: TelephoneParJour = TELEPHONE_VIDE, rappels = true) {
        if (issue.data == null) {
            this.idAffiche = null;
            this.derniereIssue = null;
            this.setState({ schedule: null, loading: false, controller: null, cacheDate: null, manquants: [], failure: issue.failure });
            return;
        }

        // Alimente les suggestions de recherche d'UE.
        try {
            DataManager.extractUEsFromCourses(issue.data);
        } catch (e) {
            console.warn('Failed to extract UEs:', e);
        }

        const isFavorite = Array.isArray(this.state.groupName);
        // Jour et semaine sont derives **ici**, une fois, jamais au rendu : la vue semaine rejouait le
        // calcul d'UE et le filtrage de ses six jours a chaque rendu (6.1-C). Un changement de filtres
        // passe par `componentDidUpdate`, qui recharge — et les rappels de cours suivent desormais les
        // filtres dans les deux vues, la journee les suivait deja.
        const schedule: ScheduleData = this.props.mode === 'day'
            ? this.computeScheduleDay(issue.data as PlanningEvent[], isFavorite)
            : (issue.data as PlanningWeekDay[]).map((jour) => this.computeScheduleWeek(jour, isFavorite));

        if (isFavorite && rappels) {
            NotificationManager.scheduleCourseNotifications(schedule).catch(e => console.warn('Notification scheduling error:', e));
        }

        const affiche: ScheduleData = this.props.mode === 'day'
            ? fusionnerJour(schedule as PlanningEvent[], telephone.get(moment(this.state.target).format(CLE_JOUR)))
            : fusionnerSemaine(schedule as PlanningWeekDay[], this.joursAffiches(), telephone);

        // La cle de ce qui est desormais a l'ecran : c'est elle qui decidera si le prochain
        // chargement remplace le contenu ou se contente de le relire (voir `fetchSchedule`).
        this.idAffiche = this.cacheId(this.state.groupName);
        this.derniereIssue = issue;

        this.setState({
            schedule: affiche, loading: false, controller: null,
            cacheDate: issue.cacheDate, manquants: issue.manquants ?? [], failure: null,
        });
    }

    computeScheduleDay(schedule: PlanningEvent[], isFavorite: boolean): PlanningEvent[] {
        return CourseManager.preparerPourAffichage(schedule, isFavorite, this.props.filtersList);
    }

    computeScheduleWeek(schedule: PlanningWeekDay, isFavorite: boolean): PlanningWeekDay {
        return { ...schedule, courses: this.computeScheduleDay(schedule.courses, isFavorite) };
    }


    /** Les bandeaux et les etats plein ecran vivent dans ScheduleListEtats : ici, seulement leurs appels. */
    renderEtat(contenu: React.ReactNode) {
        return <EtatPlanning theme={this.props.theme}>{contenu}</EtatPlanning>;
    }

    renderEmptyDay(listHeader: React.ReactNode) {
        return <JourneeVide theme={this.props.theme} listHeader={listHeader} />;
    }

    renderDayMode(listHeader: React.ReactNode) {
        const { theme } = this.props;
        const daySchedule = this.state.schedule as import('../services/PlanningApiService').PlanningEvent[];

        // La journee vide etait rendue en **injectant un faux cours** de categorie `nocourse`, que
        // `CourseRow` reconnaissait pour afficher le message a la place d'une carte. Le detour coutait
        // cher : le bloc se retrouvait dans une cellule de liste, qui ne s'etire pas, donc il se posait
        // la ou la cellule tombait — d'ou sa hauteur imprevisible. Il est desormais un etat d'ecran
        // comme les deux autres, et la categorie fantome a disparu du depot.
        //
        // Le **dimanche** ne court-circuite plus : il n'a jamais de cours, donc la liste est vide et
        // le message parait de lui-meme — mais un rendez-vous du telephone tombe un dimanche comme un
        // autre jour, et le court-circuit le rendait invisible (mesure du 2026-09-08). La limite des
        // six colonnes ne vaut que pour la vue semaine.
        if (daySchedule.length === 0) {
            return this.renderEmptyDay(listHeader);
        }

        // Les journees entieres du telephone en tete, hors carrousel (6.1.x-D).
        const { bandeaux, horaires } = separerJourneeEntiere(daySchedule);
        const groupedDaySchedule = groupOverlappingCourses(horaires);
        const enTete = (
            <>
                {listHeader}
                {bandeaux.map((evenement) => <BandeauJourneeEntiere key={evenement.id} evenement={evenement} theme={theme} />)}
            </>
        );

        return (
            <Animated.FlatList
                data={groupedDaySchedule}
                extraData={this.state}
                ListHeaderComponent={enTete as never}
                renderItem={({ item }) => <CourseGroupCarousel coursesGroup={item as import('../services/PlanningApiService').PlanningEvent[]} theme={theme} />}
                keyExtractor={(item, index) => String(index)}
                style={{ backgroundColor: theme.courseBackground }}
                contentContainerStyle={{ paddingTop: tokens.space.sm, paddingBottom: tokens.space.xxl + 80 }}
                showsVerticalScrollIndicator={false}
                onScroll={this.props.onAnimatedScroll}
                scrollEventThrottle={16}
            />
        );
    }

    renderWeekMode(listHeader: React.ReactNode) {
        const { theme, navigation } = this.props;
        const targetObject = this.state.target as { week: number; year: number };
        const targetYear = targetObject.year || moment().year();
        const targetWeek = targetObject.week;
        const weekSchedule = this.state.schedule as PlanningWeekDay[];

        return (
            <Animated.ScrollView 
                showsVerticalScrollIndicator={false} 
                style={{ flex: 1, backgroundColor: theme.courseBackground }}
                contentContainerStyle={{ paddingTop: tokens.space.sm, paddingBottom: tokens.space.xxl + 80 }}
                onScroll={this.props.onAnimatedScroll}
                scrollEventThrottle={16}
            >
                {listHeader}
                {weekSchedule.map((scheduleItem, index) => {
                    const fallbackDate = moment().year(targetYear).isoWeek(targetWeek).isoWeekday(index + 1);
                    return (
                        <DayWeek
                            key={index}
                            schedule={scheduleItem}
                            navigation={navigation}
                            theme={theme}
                            fallbackDate={fallbackDate}
                        />
                    );
                })}
            </Animated.ScrollView>
        );
    }

    /**
     * L'echec, quand il ne reste ni reponse ni cache.
     *
     * Avant ce jalon, ce cas laissait l'indicateur de chargement tourner indefiniment : une source en
     * panne et un chargement lent etaient le meme ecran. Le bouton Reessayer n'apparait que si la
     * famille le justifie — c'est la table de shared/aetherius/failures.ts qui decide.
     *
     * `action` porte le geste **qui remplirait l'ecran** quand il en existe un, et il n'a rien a voir
     * avec une reprise : reessayer repare une panne, une action repare une absence.
     */
    renderFailure(failure: UkitFailure, action?: NoticeAction) {
        return this.renderEtat(
            <SourceFailureNotice
                variant="plain"
                failure={failure}
                theme={this.props.theme}
                onRetry={this.fetchSchedule}
                {...(action !== undefined ? { action } : {})}
            />
        );
    }

    /** La cle de ce qui est **affiche** : elle dit si un chargement remplace le contenu ou le relit. */
    private idAffiche: string | null = null;

    renderContent(listHeader: React.ReactNode) {
        // Ce que l'etablissement publie gagne sur tout le reste, et l'ordre n'est pas indifferent :
        // une universite sans emploi du temps n'a jamais de groupes favoris, donc l'ecran « ton
        // planning est vide » s'afficherait toujours — avec un bouton menant a une recherche de
        // groupes qui ne peut rien trouver. Constate sur appareil en verifiant le jalon 6-G.
        //
        // Le jalon 6-J y ajoute la distinction qui manquait : « cette universite n'a pas d'emploi du
        // temps » et « elle en a un, il te manque un geste » sont deux ecrans, parce qu'ils appellent
        // deux gestes opposes. Le second porte donc un bouton la ou le premier n'en a aucun.
        const source = sourceEdt();
        if (source.kind === 'aucun') {
            return this.renderFailure(planningAbsent());
        }
        if (source.kind === 'lien-attendu') {
            return this.renderFailure(lienEdtAttendu(), {
                label: Translator.get('TIMETABLE_LINK_ADD'),
                onPress: () => this.props.navigation?.navigate('LienEdt'),
                icon: 'link-variant-plus',
            });
        }
        // Un abonnement colle **est** l'emploi du temps de cet etudiant-la : il n'y a pas de groupe a
        // choisir, donc pas d'etat « aucun favori » a afficher. Sans cette garde, l'ecran inviterait a
        // chercher un groupe dans une liste vide par construction.
        //
        // Et seulement si **rien n'est configure** : un etudiant qui a coche des calendriers a fait
        // son choix de planning, et lui redemander un groupe a chaque jour creux est du bruit — ses
        // journees vides sont des journees libres comme les autres. L'invitation reste a un toucher,
        // dans la barre d'onglets (retour du 2026-09-08).
        if (groupesRequis() && Array.isArray(this.state.groupName) && this.state.groupName.length === 0
            && SettingsManager.getCalendriersAffiches().length === 0) {
            return <FavorisVides theme={this.props.theme} onChercher={() => this.props.navigation?.navigate('GroupSearch')} />;
        }
        if (this.state.failure !== null && this.state.failure.silent !== true) {
            return this.renderFailure(this.state.failure);
        }
        if (this.state.schedule === null) {
            return <ChargementPlanning theme={this.props.theme} />;
        }
        if (this.state.schedule instanceof Array) {
            const contenu = this.props.mode === 'day' ? this.renderDayMode(listHeader) : this.renderWeekMode(listHeader);
            return this.enveloppeApresAttente(contenu);
        }
        return null;
    }

    /**
     * Le planning revient **en fondu a chaque jour affiche**.
     *
     * 6.1-E ne fondait que si l'attente s'etait vue ; sur appareil, ca se lisait comme une animation
     * qui joue une fois sur deux. Tranche par le proprietaire du produit le 2026-09-06 : chaque
     * chargement vide la liste puis la remplit, c'est une couture a chaque fois. La cle est
     * l'identifiant du contenu affiche : un autre jour remonte l'enveloppe et rejoue l'entree, une
     * relecture du meme jour ne clignote pas. `flex: 1` parce que le contenu s'etire dans sa boite,
     * et qu'une enveloppe sans hauteur lui en donnait une nulle.
     */
    enveloppeApresAttente(contenu: React.ReactNode) {
        return (
            <ApparitionEnFondu key={this.idAffiche ?? 'planning'} style={{ flex: 1 }}>
                {contenu}
            </ApparitionEnFondu>
        );
    }

    render() {
        const { theme } = this.props;
        const listHeader = <NoticesPlanning cacheDate={this.state.cacheDate} manquants={this.state.manquants} mode={this.props.mode} theme={theme} />;

        return (
            <View style={{ flex: 1, backgroundColor: theme.courseBackground }}>
                {this.renderContent(listHeader)}
            </View>
        );
    }
}

const AnimatedScheduleList = withHeaderAnimation(ScheduleList);

export const DayComponent = (props: Omit<ScheduleListProps, 'mode' | 'target'> & { day: moment.MomentInput }) => <AnimatedScheduleList mode="day" target={props.day} {...props} />;
export const WeekComponent = (props: Omit<ScheduleListProps, 'mode' | 'target'> & { week: { week: number; year: number } }) => <AnimatedScheduleList mode="week" target={props.week} {...props} />;