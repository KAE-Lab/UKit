import React, { useState } from 'react';
import { Dimensions, FlatList, View } from 'react-native';

import { CourseData } from './CourseCard';
import { CourseRowWithNavigation } from './CourseRow';

const screenWidth = Dimensions.get('window').width;
const savedCarouselIndices = new Map<string, number>();

export function CourseGroupCarousel({ coursesGroup, theme }: { coursesGroup: CourseData[], theme: import('../../../shared/theme/Theme').AppThemeType }) {
	const groupKey = coursesGroup.length > 0 ? `${coursesGroup[0].starttime}-${coursesGroup[0].subject}` : 'default';
	const initialIndex = savedCarouselIndices.get(groupKey) || 0;

	const [currentIndex, setCurrentIndex] = useState(initialIndex);

	if (!coursesGroup || coursesGroup.length === 0) return null;

	if (coursesGroup.length === 1) {
		return <CourseRowWithNavigation data={coursesGroup[0]} theme={theme} />;
	}

	return (
		<View>
			<FlatList
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
					savedCarouselIndices.set(groupKey, index);
				}}
				renderItem={({ item, index: cardIndex }) => (
					<View style={{ width: screenWidth, justifyContent: 'flex-start' }}>
						<View style={{ width: '100%', alignSelf: 'flex-start', position: 'relative' }}>
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
										paddingHorizontal: 6,
										paddingVertical: 4,
										borderRadius: 8,
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
												borderRadius: 3,
												backgroundColor: cardIndex === dotIndex ? (theme.accent ?? theme.primary) : theme.fontSecondary,
												opacity: cardIndex === dotIndex ? 1 : 0.4,
												marginHorizontal: 2,
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
