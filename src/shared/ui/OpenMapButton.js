import React from 'react';
import { Text, TouchableOpacity, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { URL } from '../services/DataService';
import { tokens } from '../theme/Theme';

const locations = require('../../../assets/locations.json');

export default class OpenMapButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            location: this.props.location.split('/')[0],
        };
    }

    isLocationKnown() {
        return locations.hasOwnProperty(this.state.location);
    }

    getGMapsLocation() {
        let location = locations[this.state.location];
        if (location.hasOwnProperty('placeID')) {
            return URL.MAP + `search/?api=1&query=${location.lat},${location.lng}&query_place_id=${location.placeID}`;
        }
        return URL.MAP + `search/?api=1&query=${location.lat},${location.lng}`;
    }

    openURL = () => {
        const url = this.getGMapsLocation();
        Linking.canOpenURL(url).then((supported) => {
            if (supported) Linking.openURL(url);
        });
    };

    render() {
        const { theme } = this.props;

        if (this.isLocationKnown()) {
            return (
                <TouchableOpacity onPress={this.openURL} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: theme.primary, fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.medium, marginRight: tokens.space.xs }}>
                        {this.props.location}
                    </Text>
                    <MaterialCommunityIcons name="open-in-new" size={16} color={theme.primary} />
                </TouchableOpacity>
            );
        }

        return (
            <Text style={{ color: theme.fontSecondary, fontSize: tokens.fontSize.md }}>
                {this.props.location}
            </Text>
        );
    }
}