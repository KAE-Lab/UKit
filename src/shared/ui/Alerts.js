import Toast from 'react-native-root-toast';

export class ErrorAlert {
    constructor(message, duration = Toast.durations.LONG, position = Toast.positions.BOTTOM, shadow = true, animation = true, hideOnPress = true, delay = 0) {
        this._delay = delay;
        this._message = message;
        this._duration = duration;
        this._position = position;
        this._shadow = shadow;
        this._animation = animation;
        this._hideOnPress = hideOnPress;
    }

    show() {
        Toast.show(this._message, {
            duration: this._duration,
            position: this._position,
            shadow: this._shadow,
            animation: this._animation,
            hideOnPress: this._hideOnPress,
            delay: this._delay,
        });
    }

    static durations = { ...Toast.durations };
    static positions = { ...Toast.positions };
}

export const RequestError = {
    handle: (error) => {
        let errorDialog;
        if (error.response) {
            errorDialog = new ErrorAlert(`Le serveur a répondu par une erreur ${error.response.status}`);
        } else if (error.request) {
            errorDialog = new ErrorAlert(`Pas de connexion internet`, ErrorAlert.durations.SHORT);
        } else {
            errorDialog = new ErrorAlert(`Erreur : ${error.message}`);
        }
        errorDialog.show();
    }
};