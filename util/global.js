const chalk = require('chalk');
const path = require('path');

// add global functions
Object.assign(global, {
    approot: path.resolve('./'),
    req: (modulepath) => {
        // custom require to handle relative paths from project root
        return require(path.resolve('./', modulepath));   
    },
    success: (arg1, ...args) => {
        // custom success logger with fancy arrows and green color
        console.log(chalk.bold.green('> ' + arg1), ...args);
    },
    log: (arg1, ...args) => {
        // custom info logger with color
        console.log(chalk.bold.cyan(arg1), ...args);
    },
    warn: (arg1, ...args) => {
        // custom info logger with color
        console.log(chalk.bold.yellowBright('!! ' + arg1), ...args);
    },
    error: (arg1, ...args) => {
        // custom error logger with red color
        console.log(chalk.bold.redBright('>> ' + arg1), ...args);
    },
    muted: (arg1, ...args) => {
        // custom error logger with gray color
        console.log(chalk.gray(arg1), ...args);
    },
    debug: (arg1, ...args) => {
        // custom error logger with gray color
        // TODO add DEBUG flag here
        console.log(chalk.gray(arg1), ...args);
    }
});

global.log('');