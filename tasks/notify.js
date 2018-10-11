/**
 * Notify user of happenings with system notifications.
 */

import plumber from 'gulp-plumber';
import log from 'fancy-log';
import colors from 'ansi-colors';
import beeper from 'beeper';

class Notify {
    // By default, only logs if in watch mode
    // unless force = true
    log(title, message = '', force) {
        if (force || this.isWatch) {
            log(title, message);
        }
    }

    onLog(title, message = '') {
        return () => {
            this.log(title, message);
        };
    }

    error(title, error) {
        const message = [title, error.fileName, error.lineNumber, error.message, error.codeFrame]
            .filter(part => part != null)
            .join('\n');

        log(colors.red(message));

        if (process.env.BEEP_ON_ERROR === 'true') {
            beeper();
        }
    }

    onError(title) {
        return plumber({
            errorHandler: error => { this.error(title, error); },
        });
    }

    get isWatch() {
        return process.env.WATCH === 'true' && process.env.watchStarted === 'true';
    }
}

export default new Notify();
