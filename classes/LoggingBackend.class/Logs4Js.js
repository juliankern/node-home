const LoggingAdapter = require('./LoggingAdapter');
const log4js = require('log4js');

log4js.configure({
    levels: {
        SUCCESS: { value: 19999, colour: 'green' },
    },
    appenders: {
        out: { type: 'stdout' },
        errors: {
            type: 'file',
            // TODO: globally define log file
            filename: 'logs/error.log',
            maxLogSize: 1024,
            backups: 5,
        },
        debugs: {
            type: 'file',
            // TODO: globally define log file
            filename: 'logs/debug.log',
            maxLogSize: 1024,
            backups: 5,
        },
        infos: {
            type: 'file',
            // TODO: globally define log file
            filename: 'logs/info.log',
            maxLogSize: 1024,
            backups: 5,
        },
        'just-errors': { type: 'logLevelFilter', appender: 'errors', level: 'warn' },
        'just-debug': { type: 'logLevelFilter', appender: 'debugs', level: 'debug', maxLevel: 'debug' },
        'just-info': { type: 'logLevelFilter', appender: 'infos', level: 'info', maxLevel: 'info' },
    },
    categories: {
        default: {
            appenders: ['out', 'just-errors', 'just-debug', 'just-info'],
            level: 'trace',
        },
    },
});

class Log4JSLoggingAdapter extends LoggingAdapter {
    constructor() {
        super();

        const caller = getCaller.call(this);
        const description = `${caller.file.dir.split(path.sep).pop()}/${this._caller.file.base}`;

        this._logger = log4js.getLogger(description);

        function getCaller(n) {
            n = n || 2; // eslint-disable-line no-param-reassign

            let stack = new Error().stack;
            stack = stack.split('at ');
            stack.splice(1, 1);

            const fullStack = stack.join('at ');

            stack = stack[n].trim();
            stack = stack.match(/([\w.<>]+)\s?(\[[\w ]+\])?\s?\(([\w:.\\/-]+\.js):([0-9]+):([0-9]+)\)/);

            return {
                stack: fullStack,
                function: stack[1] + stack[2],
                file: path.parse(stack[3]),
                line: [stack[4], stack[5]],
            };
        }
    }
}

module.exports = Log4JSLoggingAdapter;
