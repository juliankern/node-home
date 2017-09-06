const chalk = require('chalk');
const path = require('path');

// add global functions
Object.assign(global, {
    approot: path.resolve('./'),
    /**
     * require() wrapper for requires always based on approot
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string} modulepath path to module
     *
     * @return {object}            required module
     */
    req: (modulepath) => {
        // custom require to handle relative paths from project root
        return require(path.resolve('./', modulepath));   
    },
    /**
     * output function for success
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    success: (arg1, ...args) => {
        // custom success logger with fancy arrows and green color
        /* eslint-disable no-console */
        console.log(chalk.bold.green('> ' + arg1), ...args);
        /* eslint-enable no-console */
    },
    /**
     * output function for log
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    log: (arg1, ...args) => {
        // custom info logger with color
        /* eslint-disable no-console */
        console.log(chalk.bold.cyan(arg1), ...args);
        /* eslint-enable no-console */
    },
    /**
     * output function for warnings
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    warn: (arg1, ...args) => {
        // custom info logger with color
        /* eslint-disable no-console */
        console.log(chalk.bold.yellowBright('!! ' + arg1), ...args);
        /* eslint-enable no-console */
    },
    /**
     * output function for errors
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    error: (arg1, ...args) => {
        // custom error logger with red color
        /* eslint-disable no-console */
        console.log(chalk.bold.redBright('>> ' + arg1), ...args);
        /* eslint-enable no-console */
    },
    /**
     * output function for muted messages
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    muted: (arg1, ...args) => {
        // custom error logger with gray color
        /* eslint-disable no-console */
        console.log(chalk.gray(arg1), ...args);
        /* eslint-enable no-console */
    },
    /**
     * output function for debug messages
     *
     * @author Julian Kern <mail@juliankern.com>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    debug: (arg1, ...args) => {
        // custom error logger with gray color
        // TODO add DEBUG flag here
        /* eslint-disable no-console */
        console.log(chalk.gray(arg1), ...args);
        /* eslint-enable no-console */
    }
});

global.log('');

//////////////////////////////////////////////////////////
// System checks


if (process.title === 'npm' && require('os').type().includes('Windows')) {
    global.warn('If you want to see the fontend, you\'ll need to run "npm run watch-scss" as well to compile CSS!');
    global.log('');
}

if (+process.version.replace('v', '').split('.')[0] < 8) {
    global.error('You need to upgrade to NodeJS 8 to run this application!');
    process.exit(1);
}

////////////////////////////////////////////////////////

process.on('unhandledRejection', function (err) { global.error('Unhandeled rejection caught!'); throw err; });
