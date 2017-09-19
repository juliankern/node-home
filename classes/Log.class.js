const log4js = require('log4js');
const chalk = require('chalk');
const path = require('path');

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
        stack = stack.match(/([\w.<>]+) \(([\w./-]+\.js):([0-9]+):([0-9]+)\)/);

        return {
            stack: fullStack,
            function: stack[1],
            file: path.parse(stack[2]),
            line: [stack[3], stack[4]],
        };
    }

    get withStack() {
        this._withStack = true;

        return this;
    }

    success(text, ...args) {
        return this.info(chalk.bold.green(`> ${text}`), ...args);
    }

    all(...args) {
        if (this._withStack) { args.push(this.getCaller.call(this).stack); this._withStack = false; }
        return this._logger.all(...args);
    }

    trace(...args) {
        if (this._withStack) { args.push(this.getCaller.call(this).stack); this._withStack = false; }
        return this._logger.trace(...args);
    }

    debug(...args) {
        if (this._withStack) { args.push(this.getCaller.call(this).stack); this._withStack = false; }
        return this._logger.debug(...args);
    }

    info(...args) {
        if (this._withStack) { args.push(this.getCaller.call(this).stack); this._withStack = false; }
        return this._logger.info(...args);
    }

    warn(...args) {
        if (this._withStack) { args.push(this.getCaller.call(this).stack); this._withStack = false; }
        return this._logger.warn(...args);
    }

    error(...args) {
        args.push(this.getCaller.call(this).stack);
        return this._logger.error(...args);
    }

    fatal(...args) {
        args.push(this.getCaller.call(this).stack);
        return this._logger.fatal(...args);
    }

    mark(...args) {
        if (this._withStack) { args.push(this.getCaller.call(this).stack); this._withStack = false; }
        return this._logger.mark(...args);
    }

    off(...args) {
        if (this._withStack) { args.push(this.getCaller.call(this).stack); this._withStack = false; }
        return this._logger.off(...args);
    }
};
