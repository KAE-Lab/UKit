import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { tokens } from '../../../shared/theme/Theme';
import { cleDeGroupe, empreinteDeCours, indexDuSouvenir, type CoursDeGroupe } from '../services/MemoireCarrousel';
import { CourseData } from './CourseCard';
import { CourseRowWithNavigation } from './CourseRow';

const screenWidth = Dimensions.get('window').width;

/**
 * La memoire des carrousels : quelle matiere l'etudiant regarde sur chaque creneau superpose.
 *
 * Elle nourrit le carrousel ET les notifications (le cours consulte est le seul notifie), et elle
 * est persistee : une memoire vive retombait sur le premier cours du groupe a chaque fermeture de
 * l'application. La cle et le souvenir viennent de `MemoireCarrousel` (cle canonique sans date : le
 * choix se projette sur tous les jours au meme creneau ; souvenir = la matiere, pas un rang).
 *
 * `memoireCarrouselChargee` expose la fin du chargement : les composants se montent souvent AVANT
 * que la lecture du stockage aboutisse — au rechargement Metro, toujours — et l'index initial lu a
 * ce moment-la vaut zero. Chaque carrousel se resynchronise a la resolution, et les notifications
 * l'attendent avant de filtrer.
 */
const memoire = new Map<string, string>();
const CLE_STOCKAGE = 'carouselChoices';

export const memoireCarrouselChargee: Promise<void> = AsyncStorage.getItem(CLE_STOCKAGE)
    .then((brut) => {
        if (!brut) return;
        try {
            for (const [cle, matiere] of Object.entries(JSON.parse(brut) as Record<string, string>)) {
                if (!memoire.has(cle)) memoire.set(cle, matiere);
            }
        } catch {
            // Rien a rattraper : la memoire repart de zero et se reecrira au prochain geste.
        }
    })
    .catch(() => undefined)
    // L'ancien magasin (des rangs par cle dependante de l'ordre du serveur) est retire au passage.
    .then(() => { void AsyncStorage.removeItem('carouselIndices').catch(() => undefined); });

function memoriser(groupe: readonly CoursDeGroupe[], index: number) {
    const cours = groupe[index];
    if (cours === undefined) return;
    memoire.set(cleDeGroupe(groupe), empreinteDeCours(cours));
    void AsyncStorage.setItem(CLE_STOCKAGE, JSON.stringify(Object.fromEntries(memoire))).catch(() => undefined);
}

/** L'index consulte d'un groupe de cours superposes — celui que le carrousel affiche. */
export function indexConsulte(groupe: readonly CoursDeGroupe[]): number {
    return indexDuSouvenir(groupe, memoire.get(cleDeGroupe(groupe)));
}

export function CourseGroupCarousel({ coursesGroup, theme }: { coursesGroup: CourseData[], theme: import('../../../shared/theme/Theme').AppThemeType }) {
	const initialIndex = indexConsulte(coursesGroup ?? []);

	// Seul le setter sert : l'index vit dans la memoire du module, qui survit au demontage. L'etat
	// n'est la que pour reprovoquer un rendu.
	const [, setCurrentIndex] = useState(initialIndex);
	const listeRef = useRef<FlatList>(null);

	// La resynchronisation apres chargement : monte avant que le stockage ait repondu, ce carrousel
	// est parti de zero — il rejoint le souvenir des que la memoire est prete, sans animation.
	useEffect(() => {
		let vivant = true;
		void memoireCarrouselChargee.then(() => {
			if (!vivant || !coursesGroup || coursesGroup.length < 2) return;
			const index = indexConsulte(coursesGroup);
			if (index !== initialIndex && index < coursesGroup.length) {
				setCurrentIndex(index);
				listeRef.current?.scrollToIndex({ index, animated: false });
			}
		});
		return () => { vivant = false; };
		// Dependances vides a dessein : un rattrapage unique au montage.
	}, []);

	if (!coursesGroup || coursesGroup.length === 0) return null;

	if (coursesGroup.length === 1) {
		return <CourseRowWithNavigation data={coursesGroup[0]} theme={theme} />;
	}

	return (
		<View>
			<FlatList
				ref={listeRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				data={coursesGroup}
				keyExtractor={(item, index) => (item.schedule || '') + String(index)}
				initialScrollIndex={initialIndex}
				getItemLayout={(data, index) => ({
					length: screenWidth,
					offset: screenWidth * index,
					index,
				})}
				onMomentumScrollEnd={(event) => {
					const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
					setCurrentIndex(index);
					memoriser(coursesGroup, index);
				}}
				renderItem={({ item, index: cardIndex }) => (
					/*
					  * Pas de `flex-start` ici : chaque page s'etire a la hauteur de la rangee —
					  * celle du cours au contenu le plus haut — et la carte la remplit (CourseRow,
					  * carouselMode). Cale en haut, un cours plus court laissait un trou de fond de
					  * page sous sa carte, a cote de voisines pleines.
					  */
					<View style={{ width: screenWidth }}>
						<View style={{ flex: 1, width: '100%' }}>
							<CourseRowWithNavigation data={item} theme={theme} carouselMode={true} />

							<View
								style={{
									position: 'absolute',
									bottom: 10,
									right: 28,
									flexDirection: 'row',
									justifyContent: 'center',
									alignItems: 'center',
									pointerEvents: 'none',
									zIndex: 10,
									elevation: 5,
								}}
							>
								<View
									style={{
										flexDirection: 'row',
										backgroundColor: theme.eventBackground,
										// eslint-disable-next-line ukit/no-style-literals -- 6 : ecart mesure a l'inventaire visuel, hors echelle assume ; la passe 6.1-C ne deplace pas un pixel
										paddingHorizontal: 6,
										paddingVertical: tokens.space.xs,
										borderRadius: tokens.radius.sm,
										borderWidth: 1,
										borderColor: theme.eventBorder,
									}}
								>
									{coursesGroup.map((_, dotIndex) => (
										<View
											key={dotIndex}
											style={{
												height: 5,
												width: cardIndex === dotIndex ? 12 : 5,
												// Une puce : le rayon se calcule, il ne s'ecrit pas (docs/theme.md).
												borderRadius: tokens.radius.pill,
												backgroundColor: cardIndex === dotIndex ? (theme.accent ?? theme.primary) : theme.fontSecondary,
												opacity: cardIndex === dotIndex ? 1 : 0.4,
												marginHorizontal: tokens.space.xxs,
											}}
										/>
									))}
								</View>
							</View>
						</View>
					</View>
				)}
			/>
		</View>
	);
}
