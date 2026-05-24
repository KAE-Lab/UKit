import Toast from 'react-native-root-toast';

export class ErrorAlert {
    _delay: number;
    _message: string;
    _duration: number;
    _position: number;
    _shadow: boolean;
    _animation: boolean;
    _hideOnPress: boolean;

    constructor(message: string, duration = Toast.durations.LONG, position = Toast.positions.BOTTOM, shadow = true, animation = true, hideOnPress = true, delay = 0) {
        this._delay = delay;
        this._message = message;
        this._duration = duration;
        this._position = position;
        this._shadow = shadow;
        this._animation = animation;
        this._hideOnPress = hideOnPress;
    }

    show(): void {
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
    handle: (error: unknown) => {
        const err = error as { response?: { status: number }, request?: unknown, message?: string };
        let errorDialog;
        if (err.response) {
            errorDialog = new ErrorAlert(`Le serveur a répondu par une erreur ${err.response.status}`);
        } else if (err.request) {
            errorDialog = new ErrorAlert(`Pas de connexion internet`, ErrorAlert.durations.SHORT);
        } else {
            errorDialog = new ErrorAlert(`Erreur : ${err.message}`);
        }
        errorDialog.show();
    }
};