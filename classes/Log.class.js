const log4js = require('log4js');
const chalk = require('chalk');

log4js.configure({
    appenders: {
        out: { type: 'stdout' },
        errors: {
            type: 'file',
            filename: 'error.log',
            maxLogSize: 1024,
            backups: 5,
        },
        'just-errors': { type: 'logLevelFilter', appender: 'errors', level: 'warn' },
    },
    categories: {
        default: {
            appenders: ['out', 'just-errors'],
            level: 'trace',
        },
    },
});

module.exports = class Log {
    constructor() {
        this._logger = log4js.getLogger();
        this._logger.level = global.DEVMODE ? 'trace' : 'info';
    }

    success(text, ...args) {
        return this.info(chalk.bold.green(`> ${text}`), ...args);
    }

    trace(...args) {
        return this._logger.trace(...args);
    }

    debug(...args) {
        return this._logger.debug(...args);
    }

    info(...args) {
        return this._logger.info(...args);
    }

    warn(...args) {
        return this._logger.warn(...args);
    }

    error(...args) {
        return this._logger.error(...args);
    }

    fatal(...args) {
        return this._logger.fatal(...args);
    }
};
