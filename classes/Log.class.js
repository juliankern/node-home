const log4js = require('log4js');

log4js.configure({
    appenders: {
        out: { type: 'stdout' },
        errors: {
            type: 'dateFile',
            filename: 'error.log',
            pattern: '-yyyy-MM',
            alwaysIncludePattern: true,
        },
        'just-errors': { type: 'logLevelFilter', appender: 'errors', level: 'error' },
    },
    categories: {
        default: {
            appenders: ['out'],
            level: 'info',
        },
    },
});

module.exports = class Log {
    constructor() {
        this._logger = log4js.getLogger();
    }
};
