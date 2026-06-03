import React, { Component } from 'react';
import { View, Text, TouchableOpacity, PanResponder, Animated, Dimensions, Image, Platform, DeviceEventEmitter } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import moment from 'moment';

import style, { tokens } from '../theme/Theme';
import { TimeMockService } from '../services/TimeMockService';
import { AppContext } from '../services/AppCore';

const { width, height } = Dimensions.get('window');
const ICON_SIZE = 60;
const MENU_WIDTH = 300;

export interface ModMenuProps {}
export interface ModMenuState {
    isVisible: boolean;
    isExpanded: boolean;
    isActive: boolean;
    currentTime: moment.Moment;
    selectedDate: Date;
    showPicker: boolean;
    pickerMode: 'date' | 'time' | 'datetime';
}

export default class ModMenu extends Component<ModMenuProps, ModMenuState> {
    static contextType = AppContext;
    // @ts-ignore
    context!: React.ContextType<typeof AppContext>;
    pan: Animated.ValueXY;
    panResponder: import('react-native').PanResponderInstance;
    toggleListener: import('react-native').EmitterSubscription | null = null;
    mockListener: import('react-native').EmitterSubscription | null = null;
    clockInterval: NodeJS.Timeout | null = null;

    constructor(props: ModMenuProps) {
        super(props);

        this.state = {
            isVisible: false,
            isExpanded: false,
            isActive: TimeMockService.isMockActive(),
            currentTime: moment(),
            selectedDate: new Date(),
            showPicker: false,
            pickerMode: "date" as "date",
        };

        this.pan = new Animated.ValueXY({ x: width - ICON_SIZE - 20, y: height / 2 });
        
        this.panResponder = PanResponder.create({
            onMoveShouldSetPanResponder: (e, gestureState) => {
                // Only drag if we moved a bit, to not interfere with taps
                return (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2);
            },
            onPanResponderGrant: () => {
                this.pan.setOffset({
                    x: (this.pan.x as unknown as { _value: number })._value,
                    y: (this.pan.y as unknown as { _value: number })._value,
                });
                this.pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: this.pan.x, dy: this.pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                this.pan.flattenOffset();
                
                // Optional: Snap to edges
                Animated.spring(this.pan, {
                    toValue: {
                        x: Math.max(0, Math.min((this.pan.x as unknown as { _value: number })._value, width - (this.state.isExpanded ? MENU_WIDTH : ICON_SIZE))),
                        y: Math.max(0, Math.min((this.pan.y as unknown as { _value: number })._value, height - 100)),
                    },
                    useNativeDriver: false,
                }).start();
            },
        });
    }

    componentDidMount() {
        this.toggleListener = DeviceEventEmitter.addListener('toggleModMenu', () => {
            this.setState({ isVisible: !this.state.isVisible });
        });

        this.mockListener = DeviceEventEmitter.addListener('timeMockChanged', (isActive) => {
            this.setState({ isActive });
        });

        this.clockInterval = setInterval(() => {
            if (this.state.isVisible) {
                this.setState({ currentTime: moment() });
            }
        }, 1000);
    }

    componentWillUnmount() {
        if (this.toggleListener) this.toggleListener.remove();
        if (this.mockListener) this.mockListener.remove();
        if (this.clockInterval) clearInterval(this.clockInterval);
    }

    expandMenu = () => {
        this.setState({ isExpanded: true, selectedDate: TimeMockService.getFakeDate() });
    }

    minimizeMenu = () => {
        this.setState({ isExpanded: false });
    }

    closeMenu = () => {
        TimeMockService.resetFakeTime();
        this.setState({ isVisible: false, isExpanded: false });
    }

    applyFakeTime = () => {
        TimeMockService.setFakeTime(this.state.selectedDate);
    }

    resetTime = () => {
        TimeMockService.resetFakeTime();
        this.setState({ selectedDate: new Date() });
    }

    showPicker = (mode: string) => {
        this.setState({ showPicker: true, pickerMode: Platform.OS === 'ios' ? 'datetime' : mode as 'date' | 'time' });
    }

    onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            this.setState({ showPicker: false });
        }
        if (selectedDate) {
            this.setState({ selectedDate });
        }
    }

    renderIndicator = (isActive: boolean, customStyle = {}) => {
        return (
            <View style={[{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: isActive ? '#4ade80' : '#f87171',
            }, customStyle]} />
        );
    }

    renderExpandedHeader = (theme: import('../theme/Theme').AppThemeType, isActive: boolean) => (
        // Navbar (Draggable Area)
        <View 
            {...this.panResponder.panHandlers}
            style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: theme.greyBackground, paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.sm,
                borderBottomWidth: 1, borderBottomColor: theme.border
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {this.renderIndicator(isActive, { marginRight: tokens.space.sm })}
                <Text style={{ color: theme.font, fontWeight: 'bold', fontSize: tokens.fontSize.sm }}>Dev Menu</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={this.minimizeMenu} style={{ padding: 4, marginRight: 8 }}>
                    <MaterialCommunityIcons name="minus" size={20} color={theme.fontSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={this.closeMenu} style={{ padding: 4 }}>
                    <MaterialCommunityIcons name="close" size={20} color={theme.fontSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    renderLiveClock = (theme: import('../theme/Theme').AppThemeType, isActive: boolean, currentTime: moment.Moment) => (
        // Live Clock
        <View style={{ alignItems: 'center', marginBottom: tokens.space.md, backgroundColor: theme.cardBackground, padding: tokens.space.md, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: isActive ? '#4ade80' : theme.fontSecondary, fontWeight: 'bold', marginBottom: tokens.space.xs }}>
                {isActive ? 'FAKE TIME ACTIVE' : 'REAL TIME'}
            </Text>
            <Text style={{ color: theme.font, fontSize: 32, fontWeight: 'bold', fontVariant: ['tabular-nums'], textAlign: 'center', width: '100%' }}>
                {currentTime.format('HH:mm:ss')}
            </Text>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.sm, marginTop: 4, textAlign: 'center' }}>
                {currentTime.format('dddd DD MMMM YYYY')}
            </Text>
        </View>
    );

    renderTimeSelectors = (theme: import('../theme/Theme').AppThemeType, selectedDate: Date) => (
        <>
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.xs, marginBottom: tokens.space.xs, fontWeight: 'bold' }}>SET FAKE TIME</Text>
            
            {/* DateTime selectors */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: tokens.space.md }}>
                <TouchableOpacity 
                    onPress={() => this.showPicker('date')}
                    style={{ flex: 1, backgroundColor: theme.cardBackground, padding: tokens.space.sm, borderRadius: tokens.radius.md, marginRight: tokens.space.xs, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}
                >
                    <MaterialCommunityIcons name="calendar" size={20} color={theme.primary} style={{ marginBottom: 4 }} />
                    <Text style={{ color: theme.font, fontSize: tokens.fontSize.sm }}>{moment(selectedDate).format('DD/MM/YYYY')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => this.showPicker('time')}
                    style={{ flex: 1, backgroundColor: theme.cardBackground, padding: tokens.space.sm, borderRadius: tokens.radius.md, marginLeft: tokens.space.xs, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}
                >
                    <MaterialCommunityIcons name="clock" size={20} color={theme.primary} style={{ marginBottom: 4 }} />
                    <Text style={{ color: theme.font, fontSize: tokens.fontSize.sm }}>{moment(selectedDate).format('HH:mm')}</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    renderActionButtons = (theme: import('../theme/Theme').AppThemeType) => (
        // Actions
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity 
                onPress={this.resetTime}
                style={{ flex: 1, backgroundColor: '#ef4444', paddingVertical: tokens.space.sm, borderRadius: tokens.radius.md, marginRight: tokens.space.xs, alignItems: 'center' }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                onPress={this.applyFakeTime}
                style={{ flex: 1, backgroundColor: theme.primary, paddingVertical: tokens.space.sm, borderRadius: tokens.radius.md, marginLeft: tokens.space.xs, alignItems: 'center' }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply</Text>
            </TouchableOpacity>
        </View>
    );

    renderDateTimePicker = (theme: import('../theme/Theme').AppThemeType) => {
        if (!this.state.showPicker) return null;
        return (
            <View style={{ backgroundColor: theme.cardBackground, padding: tokens.space.sm, borderRadius: tokens.radius.md, marginTop: tokens.space.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
                <DateTimePicker
                    value={this.state.selectedDate}
                    mode={this.state.pickerMode}
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? "spinner" : "default"}
                    onChange={this.onPickerChange}
                    style={{ width: Platform.OS === 'ios' ? 240 : 'auto', height: Platform.OS === 'ios' ? 120 : 'auto' }}
                />
                {Platform.OS === 'ios' && (
                    <TouchableOpacity onPress={() => this.setState({ showPicker: false })} style={{ alignItems: 'center', paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.lg, backgroundColor: theme.primary, borderRadius: tokens.radius.md, marginTop: tokens.space.md }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Valider</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    render() {
        if (!this.state.isVisible) return null;

        const { isExpanded, isActive, currentTime, selectedDate } = this.state;
        const theme = style.Theme[this.context?.themeName || 'light'];

        if (!isExpanded) {
            return (
                <Animated.View
                    {...this.panResponder.panHandlers}
                    style={[this.pan.getLayout(), {
                        position: 'absolute',
                        zIndex: 9999,
                        width: ICON_SIZE, height: ICON_SIZE,
                        backgroundColor: theme.cardBackground,
                        borderRadius: tokens.radius.md,
                        justifyContent: 'center', alignItems: 'center',
                        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3, shadowRadius: 5, elevation: 8,
                        borderWidth: 1, borderColor: theme.border
                    }]}
                >
                    <TouchableOpacity onPress={this.expandMenu} style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        {this.renderIndicator(isActive, { position: 'absolute', top: -4, right: -4, borderWidth: 2, borderColor: theme.cardBackground, zIndex: 10 })}
                        <Image source={require('../../../assets/icons/logo.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
                    </TouchableOpacity>
                </Animated.View>
            );
        }

        return (
            <Animated.View
                style={[this.pan.getLayout(), {
                    position: 'absolute',
                    zIndex: 9999,
                    width: MENU_WIDTH,
                    backgroundColor: theme.background,
                    borderRadius: tokens.radius.md,
                    overflow: 'hidden',
                    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3, shadowRadius: 10, elevation: 15,
                    borderWidth: 1, borderColor: theme.border
                }]}
            >
                {this.renderExpandedHeader(theme, isActive)}

                {/* Content */}
                <View style={{ padding: tokens.space.md }}>
                    {this.renderLiveClock(theme, isActive, currentTime)}
                    {this.renderTimeSelectors(theme, selectedDate)}
                    {this.renderActionButtons(theme)}
                    {this.renderDateTimePicker(theme)}
                </View>
            </Animated.View>
        );
    }
}
