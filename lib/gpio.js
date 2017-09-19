const Logger = global.req('classes/Log.class');
const logger = new Logger();

let gpio;

try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies, import/no-unresolved
    gpio = require('rpi-gpio');
} catch (e) {
    logger.warn('Fake GPIO!');
    gpio = {
        DIR_HIGH: 'high',
        setup: (chan, mode, cb) => { logger.debug(`Setup GPIO ${chan} for mode ${mode}`); if (cb) { cb(); } },
        on: () => {},
        destroy: () => {},
        write: (chan, value, cb) => { logger.debug(`Set GPIO ${chan} to value ${value}`); if (cb) { cb(); } },
    };
}

module.exports = gpio;
