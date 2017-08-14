const chalk = require('chalk');
const path = require('path');

// add global functions
Object.assign(global, {
    approot: path.resolve('./'),
    /**
     * require() wrapper for requires always based on approot
     *
     * @author Julian Kern <julian.kern@dmc.de>
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
     * @author Julian Kern <julian.kern@dmc.de>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    success: (arg1, ...args) => {
        // custom success logger with fancy arrows and green color
        console.log(chalk.bold.green('> ' + arg1), ...args);
    },
    /**
     * output function for log
     *
     * @author Julian Kern <julian.kern@dmc.de>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    log: (arg1, ...args) => {
        // custom info logger with color
        console.log(chalk.bold.cyan(arg1), ...args);
    },
    /**
     * output function for warnings
     *
     * @author Julian Kern <julian.kern@dmc.de>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    warn: (arg1, ...args) => {
        // custom info logger with color
        console.log(chalk.bold.yellowBright('!! ' + arg1), ...args);
    },
    /**
     * output function for errors
     *
     * @author Julian Kern <julian.kern@dmc.de>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    error: (arg1, ...args) => {
        // custom error logger with red color
        console.log(chalk.bold.redBright('>> ' + arg1), ...args);
    },
    /**
     * output function for muted messages
     *
     * @author Julian Kern <julian.kern@dmc.de>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    muted: (arg1, ...args) => {
        // custom error logger with gray color
        console.log(chalk.gray(arg1), ...args);
    },
    /**
     * output function for debug messages
     *
     * @author Julian Kern <julian.kern@dmc.de>
     *
     * @param  {string}    arg1 Words for message
     * @param  {...object} args parameters which should be examined
     */
    debug: (arg1, ...args) => {
        // custom error logger with gray color
        // TODO add DEBUG flag here
        console.log(chalk.gray(arg1), ...args);
    }
});

global.log('');