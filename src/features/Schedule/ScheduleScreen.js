import React from 'react';
import DayView from './DayView';

export default function ScheduleScreen(props) {
    const groupName = props.route?.params?.name || props.groupName;
    return <DayView {...props} groupName={groupName} />;
}