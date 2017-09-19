const log4js = require('log4js');
const chalk = require('chalk');
const path = require('path');

log4js.configure({
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

module.exports = class Log {
    constructor() {
        this._withStack = false;
        this._caller = this.getCaller.call(this);

        this._logger = log4js.getLogger(this._caller.file.base);
        this._logger.level = global.DEVMODE ? 'trace' : 'info';
    }

    getCaller(n) {
        n = n || 2; // eslint-disable-line no-param-reassign

        let stack = new Error().stack;
        stack = stack.split('at ');
        stack.splice(1, 1);

        const fullStack = stack.join('at ');

        stack = stack[n].trim();
        stack = stack.match(/([\w.<>]+)\s?(\[[\w ]+\])?\s?\(([\w./-]+\.js):([0-9]+):([0-9]+)\)/);


        return {
            stack: fullStack,
            function: stack[1] + stack[2],
            file: path.parse(stack[3]),
            line: [stack[4], stack[5]],
        };
    }

    get withStack() {
        this._withStack = true;

        return this;
    }

    success(text, ...args) {
        return this.info(chalk.bold.green(`> ${text}`), ...args);
    }

    caller(name, ...args) {
        if (this._withStack) { args.push(this.getCaller.call(this).stack); this._withStack = false; }
        return this._logger[name](...args);
    }

    all(...args) { return this.caller('all', ...args); }
    trace(...args) { return this.caller('trace', ...args); }
    debug(...args) { return this.caller('debug', ...args); }
    info(...args) { return this.caller('info', ...args); }
    warn(...args) { return this.caller('warn', ...args); }
    mark(...args) { return this.caller('mark', ...args); }
    off(...args) { return this.caller('off', ...args); }

    error(...args) {
        args.push(this.getCaller.call(this).stack);
        return this._logger.error(...args);
    }

    fatal(...args) {
        args.push(this.getCaller.call(this).stack);
        return this._logger.fatal(...args);
    }
};
